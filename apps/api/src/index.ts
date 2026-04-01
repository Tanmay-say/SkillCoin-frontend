import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import dotenv from "dotenv";

// Load environment variables BEFORE importing anything that reads process.env
dotenv.config();

import prisma, { usingLocalDevStore } from "./db/client";
import skillsRouter from "./routes/skills";
import uploadRouter from "./routes/upload";
import downloadRouter from "./routes/download";
import authRouter from "./routes/auth";
import generateRouter from "./routes/generate";
import { optionalAuth } from "./middleware/auth";
import { uploadRateLimit, downloadRateLimit } from "./middleware/rateLimit";
import { FilecoinStorageService } from "./services/filecoin-storage";

const app = new Hono();

// ─── Global Middleware ─────────────────────────────────────

app.use("*", logger());

app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()) || [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Payment-Proof",
      "X-Payment-Request",
      "X-Payment-Challenge",
      "X-Download-Token",
    ],
    exposeHeaders: ["X-Payment-Request"],
    credentials: true,
  })
);

// Optional auth on all routes (attaches user if token present)
app.use("*", optionalAuth());

// ─── Health Check ──────────────────────────────────────────

app.get("/", (c) => {
  return c.json({
    name: "Skillcoin API",
    version: "2.0.0",
    status: "running",
  });
});

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    storage: usingLocalDevStore ? "local-dev" : "database",
  });
});

app.get("/uploads/:cid", async (c) => {
  try {
    const cid = c.req.param("cid");
    if (!FilecoinStorageService.isLocalCid(cid)) {
      return c.json({ success: false, error: "Only local development uploads are served here" }, 404);
    }

    const data = await FilecoinStorageService.downloadLocalFile(cid);
    c.header("Content-Type", "application/octet-stream");
    c.header("Cache-Control", "private, max-age=300");
    return c.body(Buffer.from(data));
  } catch (error: any) {
    return c.json({ success: false, error: error.message || "Upload not found" }, 404);
  }
});

// ─── Routes ────────────────────────────────────────────────

// Upload route registered FIRST to avoid /:slug conflict
app.use("/api/skills/upload", uploadRateLimit);
app.route("/api/skills/upload", uploadRouter);

// AI Skill Generation (Gemini)
app.route("/api/skills/generate", generateRouter);

// Download with rate limiting
app.use("/api/skills/:slug/download", downloadRateLimit);
app.route("/api/skills", downloadRouter);

// Skills CRUD (generic /:slug comes last)
app.route("/api/skills", skillsRouter);

// Auth
app.route("/api/auth", authRouter);

// ─── 404 handler ───────────────────────────────────────────

app.notFound((c) => {
  return c.json({ success: false, error: "Endpoint not found" }, 404);
});

// ─── Global Error Handler ──────────────────────────────────

app.onError((err, c) => {
  console.error("[Error]", err.message);
  return c.json(
    {
      success: false,
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    },
    500
  );
});

// ─── Start Server (local dev only — skipped on Vercel) ─────

const port = parseInt(process.env.PORT || "3001");

async function start() {
  try {
    await prisma.$connect();
    console.log(usingLocalDevStore ? "[DB] ✓ Local JSON dev store ready" : "[DB] ✓ Database connected");
  } catch (error: any) {
    console.error("[DB] ✗ Database connection failed:", error.message);
    console.warn("[DB] Server starting without database — DB-backed endpoints will fail");
  }

  console.log(`
╔═══════════════════════════════════════════════╗
║              SKILLCOIN API v1.0               ║
║  npm for AI Agent Skills — Decentralized      ║
╠═══════════════════════════════════════════════╣
║  Server:  http://localhost:${port}              ║
║  Health:  http://localhost:${port}/health        ║
║  Skills:  http://localhost:${port}/api/skills    ║
╚═══════════════════════════════════════════════╝
  `);

  serve({ fetch: app.fetch, port });
}

if (!process.env.VERCEL) {
  start();
}

export default app;
