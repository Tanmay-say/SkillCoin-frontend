import { Hono } from "hono";
import { ethers } from "ethers";
import prisma from "../db/client";
import { generateToken } from "../middleware/auth";
import { LoginSchema } from "../types";

const auth = new Hono();

// HIGH-01: In-memory nonce store — TODO: replace with Prisma DB or Redis for production
// This does NOT survive server restarts or work across multiple instances
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();

// Periodically clean expired nonces (skip in serverless — each invocation is fresh)
if (!process.env.VERCEL) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of nonceStore.entries()) {
      if (value.expiresAt < now) {
        nonceStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * GET /api/auth/nonce?address=0x...
 * Generate a nonce for wallet sign-in
 */
auth.get("/nonce", async (c) => {
  const address = c.req.query("address");
  if (!address) {
    return c.json({ success: false, error: "Address required" }, 400);
  }

  const nonce = `Sign this message to log in to Skillcoin.\n\nNonce: ${Date.now()}-${Math.random().toString(36).substring(7)}`;
  nonceStore.set(address.toLowerCase(), {
    nonce,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 min
  });

  return c.json({ success: true, data: { nonce } });
});

/**
 * POST /api/auth/login
 * Wallet-based sign-in with ECDSA signature verification
 */
auth.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { success: false, error: "Invalid request", details: parsed.error.flatten() },
        400
      );
    }

    const { address, signature, nonce } = parsed.data;

    // Verify nonce exists and is not expired
    const stored = nonceStore.get(address.toLowerCase());
    if (!stored || stored.nonce !== nonce || stored.expiresAt < Date.now()) {
      return c.json(
        { success: false, error: "Invalid or expired nonce" },
        401
      );
    }

    // Verify ECDSA signature
    try {
      const recoveredAddress = ethers.verifyMessage(nonce, signature);
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        return c.json(
          { success: false, error: "Signature verification failed" },
          401
        );
      }
    } catch {
      return c.json(
        { success: false, error: "Invalid signature" },
        401
      );
    }

    // Clean up nonce (single-use)
    nonceStore.delete(address.toLowerCase());

    // Upsert user
    const user = await prisma.user.upsert({
      where: { walletAddress: address.toLowerCase() },
      create: { walletAddress: address.toLowerCase() },
      update: {},
    });

    // Generate JWT
    const token = generateToken(user.id, user.walletAddress);

    return c.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          displayName: user.displayName,
          isCreator: user.isCreator,
        },
      },
    });
  } catch (error: any) {
    console.error("[Auth] Login error:", error);
    const msg = process.env.NODE_ENV === "development" ? error.message : "Login failed";
    return c.json({ success: false, error: msg }, 500);
  }
});

/**
 * GET /api/auth/users/:address - Get user profile (public)
 * API-03 FIX: Added pagination for skills list
 */
auth.get("/users/:address", async (c) => {
  try {
    const address = c.req.param("address").toLowerCase();
    const page = parseInt(c.req.query("page") || "1");
    const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
    const skip = (page - 1) * limit;

    const user = await prisma.user.findUnique({
      where: { walletAddress: address },
    });

    if (!user) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    // API-03: Paginated skills list
    const [skills, totalSkills] = await Promise.all([
      prisma.skill.findMany({
        where: { creatorAddress: address, published: true },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.skill.count({
        where: { creatorAddress: address, published: true },
      }),
    ]);

    return c.json({
      success: true,
      data: {
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          displayName: user.displayName,
          isCreator: user.isCreator,
        },
        skills,
        stats: {
          totalSkills,
          totalDownloads: skills.reduce((sum: number, s: any) => sum + s.downloads, 0),
        },
        pagination: {
          page,
          limit,
          total: totalSkills,
          totalPages: Math.ceil(totalSkills / limit),
        },
      },
    });
  } catch (error: any) {
    const msg = process.env.NODE_ENV === "development" ? error.message : "Internal server error";
    return c.json({ success: false, error: msg }, 500);
  }
});

/**
 * GET /api/auth/users/:address/purchases - Purchase history
 * API-02 FIX: Requires authentication — user can only view their own purchases
 */
auth.get("/users/:address/purchases", async (c) => {
  try {
    const address = c.req.param("address").toLowerCase();

    // API-02 FIX: Require auth and verify requester matches the queried address
    const authUser = (c as any).get("user") as { userId: string; address: string } | undefined;
    if (!authUser?.address) {
      return c.json({ success: false, error: "Authentication required" }, 401);
    }
    if (authUser.address.toLowerCase() !== address) {
      return c.json({ success: false, error: "Cannot view another user's purchases" }, 403);
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: address },
    });

    if (!user) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    const purchases = await prisma.purchase.findMany({
      where: { userId: user.id },
      include: { skill: true },
      orderBy: { createdAt: "desc" },
      take: 50, // DB-03: cap results
    });

    return c.json({ success: true, data: purchases });
  } catch (error: any) {
    const msg = process.env.NODE_ENV === "development" ? error.message : "Internal server error";
    return c.json({ success: false, error: msg }, 500);
  }
});

export default auth;
