/**
 * Simple in-memory rate limiter
 * Production: replace with Redis-based solution
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes (skip in serverless — each invocation is fresh)
if (!process.env.VERCEL) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export function rateLimiter(options: {
  maxRequests: number;
  windowMs: number;
  keyPrefix: string;
}) {
  return async (c: any, next: any) => {
    // Use wallet address or IP as key
    const user = c.get("user");
    const identifier = user?.address || c.req.header("x-forwarded-for") || "anon";
    const key = `${options.keyPrefix}:${identifier}`;
    const now = Date.now();

    const entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + options.windowMs });
      await next();
      return;
    }

    if (entry.count >= options.maxRequests) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      c.header("Retry-After", String(retryAfterSec));
      return c.json(
        {
          success: false,
          error: "Rate limit exceeded",
          retryAfter: retryAfterSec,
        },
        429
      );
    }

    entry.count++;
    await next();
  };
}

/**
 * Pre-configured rate limiters
 */
export const uploadRateLimit = rateLimiter({
  maxRequests: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: "upload",
});

export const downloadRateLimit = rateLimiter({
  maxRequests: 100,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: "download",
});

export const generateRateLimit = rateLimiter({
  maxRequests: 20,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: "generate",
});
