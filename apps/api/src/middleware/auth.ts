import { Hono } from "hono";
import jwt, { type SignOptions } from "jsonwebtoken";

// Lazy accessor so the module can load before env vars are populated (Vercel serverless)
function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) {
    throw new Error("FATAL: JWT_SECRET environment variable is required. Set it in your .env file.");
  }
  return s;
}

function getExpiry(): string {
  const raw = process.env.JWT_EXPIRY || "24h";
  return /^\d+[smhd]$/.test(raw) ? raw : "24h";
}

export interface AuthUser {
  userId: string;
  address: string;
}

/**
 * Auth middleware - verifies JWT and attaches user to context.
 * Returns 401 if token is missing or invalid.
 */
export function authMiddleware() {
  return async (c: any, next: any) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ success: false, error: "Missing or invalid authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");

    try {
      const decoded = jwt.verify(token, getSecret()) as {
        userId: string;
        address: string;
      };
      c.set("user", { userId: decoded.userId, address: decoded.address });
      await next();
    } catch (error) {
      return c.json({ success: false, error: "Invalid or expired token" }, 401);
    }
  };
}

/**
 * Optional auth - attaches user if token present, continues regardless.
 * Does NOT block unauthenticated requests.
 */
export function optionalAuth() {
  return async (c: any, next: any) => {
    const authHeader = c.req.header("Authorization");

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const decoded = jwt.verify(token, getSecret()) as {
          userId: string;
          address: string;
        };
        c.set("user", { userId: decoded.userId, address: decoded.address });
      } catch {
        // Token invalid, continue without user
      }
    }

    await next();
  };
}

/**
 * Generate a session JWT
 */
export function generateToken(userId: string, address: string): string {
  const opts: SignOptions = { expiresIn: getExpiry() as any };
  return jwt.sign({ userId, address }, getSecret(), opts);
}

/**
 * Generate a short-lived download token (5 minutes)
 */
export function generateDownloadToken(
  skillId: string,
  userId: string,
  cid: string
): string {
  const opts: SignOptions = { expiresIn: "5m" };
  return jwt.sign({ skillId, userId, cid, purpose: "download" }, getSecret(), opts);
}
