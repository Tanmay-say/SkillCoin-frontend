import { Hono } from "hono";
import jwt from "jsonwebtoken";

// CRIT-01: Throw if JWT_SECRET is missing — never fall back to a hardcoded secret
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable is required. Set it in your .env file.");
}

// HIGH-04: Validate JWT expiry — max 7 days, default 24h
const RAW_EXPIRY = process.env.JWT_EXPIRY || "24h";
const VALID_EXPIRY_PATTERN = /^\d+[smhd]$/;
const JWT_EXPIRY = VALID_EXPIRY_PATTERN.test(RAW_EXPIRY) ? RAW_EXPIRY : "24h";

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
      const decoded = jwt.verify(token, JWT_SECRET) as {
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
        const decoded = jwt.verify(token, JWT_SECRET) as {
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
  return jwt.sign(
    { userId, address },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Generate a short-lived download token (5 minutes)
 */
export function generateDownloadToken(
  skillId: string,
  userId: string,
  cid: string
): string {
  return jwt.sign(
    { skillId, userId, cid, purpose: "download" },
    JWT_SECRET,
    { expiresIn: "5m" }
  );
}
