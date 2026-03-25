import { Hono } from "hono";
import { PaymentService } from "../services/payment";
import { SkillService } from "../services/skill";
import { FilecoinStorageService } from "../services/filecoin-storage";
import { generateDownloadToken, type AuthUser } from "../middleware/auth";
import { VerifyPaymentSchema } from "../types";

const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs",
  "https://w3s.link/ipfs",
  "https://cloudflare-ipfs.com/ipfs",
];

function buildAccessInfo(skill: any) {
  const cid = skill.zipCid;
  const downloadUrl = FilecoinStorageService.getFileUrl(cid);
  const gateways = IPFS_GATEWAYS.map((gw) => `${gw}/${cid}`);

  const access: Record<string, any> = {
    cid,
    downloadUrl,
    storageType: skill.storageType || "filecoin",
    gateways,
  };

  if (skill.pieceCid) access.pieceCid = skill.pieceCid;
  if (skill.filecoinDatasetId) {
    access.filecoinDatasetId = skill.filecoinDatasetId;
    access.proofUrl = `https://pdp.vxb.ai/calibration/dataset/${skill.filecoinDatasetId}`;
  }
  if (skill.filecoinDealId) access.dealId = skill.filecoinDealId;

  return access;
}

type Variables = { user: AuthUser };
const download = new Hono<{ Variables: Variables }>();

/**
 * GET /api/skills/:slug/download
 *
 * x402 Payment Gate:
 * - Free skills: return download URL directly
 * - Paid skills: require auth + payment proof
 */
download.get("/:slug/download", async (c) => {
  try {
    const slug = c.req.param("slug");
    const skill = await SkillService.getSkillBySlug(slug);

    if (!skill) {
      return c.json({ success: false, error: "Skill not found" }, 404);
    }

    const access = buildAccessInfo(skill);

    // Free skill — no auth required
    if (Number(skill.priceAmount) === 0 || skill.priceCurrency === "FREE") {
      await SkillService.incrementDownloads(skill.id);
      return c.json({
        success: true,
        data: {
          ...access,
          free: true,
        },
      });
    }

    // CRIT-03 FIX: Require authentication for paid downloads
    const user = c.get("user");
    if (!user?.userId) {
      return c.json(
        { success: false, error: "Authentication required for paid downloads" },
        401
      );
    }

    // Check if already purchased
    const alreadyPurchased = await PaymentService.isAlreadyPurchased(
      user.userId,
      skill.id
    );
    if (alreadyPurchased) {
      await SkillService.incrementDownloads(skill.id);
      const token = generateDownloadToken(skill.id, user.userId, skill.zipCid);
      return c.json({
        success: true,
        data: {
          ...access,
          token,
          expiresIn: 300,
          alreadyPurchased: true,
        },
      });
    }

    // Check for payment proof header
    const paymentProof = c.req.header("X-Payment-Proof");

    if (!paymentProof) {
      // Return 402 Payment Required
      const challenge = PaymentService.createChallenge(
        skill.slug,
        skill.priceAmount.toString(),
        skill.priceCurrency
      );

      const challengeBase64 = Buffer.from(JSON.stringify(challenge)).toString("base64");
      c.header("X-Payment-Request", challengeBase64);

      return c.json(
        {
          error: "payment_required",
          amount: Number(skill.priceAmount),
          currency: skill.priceCurrency,
          recipient: process.env.ADMIN_VAULT_ADDRESS,
          skillSlug: skill.slug,
          skillName: skill.name,
        },
        402
      );
    }

    // Verify payment proof
    const txHash = paymentProof;

    const txParsed = VerifyPaymentSchema.safeParse({ txHash });
    if (!txParsed.success) {
      return c.json(
        { success: false, error: "Invalid transaction hash format" },
        400
      );
    }

    const isReplay = await PaymentService.isReplayAttack(txHash);
    if (isReplay) {
      return c.json({ success: false, error: "Payment already used" }, 400);
    }

    const verification = await PaymentService.verifyPayment(
      txHash,
      Number(skill.priceAmount),
      skill.priceCurrency
    );

    if (!verification.valid) {
      const challenge = PaymentService.createChallenge(
        skill.slug,
        skill.priceAmount.toString(),
        skill.priceCurrency
      );
      const challengeBase64 = Buffer.from(JSON.stringify(challenge)).toString("base64");
      c.header("X-Payment-Request", challengeBase64);

      return c.json(
        {
          error: "payment_invalid",
          message: "Payment verification failed. Please try again.",
          amount: Number(skill.priceAmount),
          currency: skill.priceCurrency,
          recipient: process.env.ADMIN_VAULT_ADDRESS,
        },
        402
      );
    }

    // Payment verified — record purchase with real userId
    await PaymentService.markPurchased(
      user.userId,
      skill.id,
      txHash,
      Number(skill.priceAmount),
      skill.priceCurrency
    );

    await SkillService.incrementDownloads(skill.id);

    const token = generateDownloadToken(skill.id, user.userId, skill.zipCid);

    return c.json({
      success: true,
      data: {
        ...access,
        token,
        expiresIn: 300,
      },
    });
  } catch (error: any) {
    console.error("[Download] Error:", error);
    const msg = process.env.NODE_ENV === "development" ? error.message : "Internal server error";
    return c.json({ success: false, error: msg }, 500);
  }
});

/**
 * POST /api/skills/:slug/verify-payment
 *
 * Requires authentication for paid skill verification.
 */
download.post("/:slug/verify-payment", async (c) => {
  try {
    const slug = c.req.param("slug");
    const body = await c.req.json();

    const parsed = VerifyPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { success: false, error: "Invalid request", details: parsed.error.flatten() },
        400
      );
    }

    const skill = await SkillService.getSkillBySlug(slug);
    if (!skill) {
      return c.json({ success: false, error: "Skill not found" }, 404);
    }

    // CRIT-03: Require auth for payment verification
    const user = c.get("user");
    if (!user?.userId) {
      return c.json(
        { success: false, error: "Authentication required" },
        401
      );
    }

    const isReplay = await PaymentService.isReplayAttack(parsed.data.txHash);
    if (isReplay) {
      return c.json({ success: false, error: "Payment already used" }, 400);
    }

    const verification = await PaymentService.verifyPayment(
      parsed.data.txHash,
      Number(skill.priceAmount),
      skill.priceCurrency
    );

    if (!verification.valid) {
      return c.json(
        { success: false, error: "Payment verification failed" },
        400
      );
    }

    await PaymentService.markPurchased(
      user.userId,
      skill.id,
      parsed.data.txHash,
      Number(skill.priceAmount),
      skill.priceCurrency
    );

    await SkillService.incrementDownloads(skill.id);

    const access = buildAccessInfo(skill);
    const token = generateDownloadToken(skill.id, user.userId, skill.zipCid);

    return c.json({
      success: true,
      data: {
        ...access,
        token,
        expiresIn: 300,
      },
    });
  } catch (error: any) {
    console.error("[VerifyPayment] Error:", error);
    const msg = process.env.NODE_ENV === "development" ? error.message : "Internal server error";
    return c.json({ success: false, error: msg }, 500);
  }
});

export default download;
