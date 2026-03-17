import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import dotenv from "dotenv";

// Load environment variables BEFORE importing anything that reads process.env
dotenv.config();

import prisma from "./db/client";
import skillsRouter from "./routes/skills";
import uploadRouter from "./routes/upload";
import downloadRouter from "./routes/download";
import authRouter from "./routes/auth";
import generateRouter from "./routes/generate";
import { optionalAuth } from "./middleware/auth";
import { uploadRateLimit, downloadRateLimit } from "./middleware/rateLimit";

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
    tagline: "npm for AI Agent Skills — Decentralized, Paid, Permanent",
    status: "running",
    storage: "Filecoin Pin + Synapse SDK (PDP proofs)",
    ai: "Gemini 2.0 Flash (skill generation)",
    endpoints: {
      skills: "/api/skills",
      upload: "/api/skills/upload",
      download: "/api/skills/:slug/download",
      generate: "/api/skills/generate",
      modifySkill: "/api/skills/generate/modify",
      verify: "/api/skills/:slug/verify",
      auth: "/api/auth",
    },
  });
});

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Local Uploads (Filecoin/Synapse local fallback) ───────────────

import { serveStatic } from "@hono/node-server/serve-static";
import path from "path";
import fs from "fs";

// Serve local fallback upload files at /uploads/*
// Supports exact filename match and CID-prefix lookup for backwards compat.
app.get("/uploads/:filename", async (c) => {
  const requested = c.req.param("filename");
  const uploadsDir = path.resolve(process.cwd(), "uploads");

  let filePath = path.resolve(uploadsDir, requested);

  // Security: prevent path traversal
  if (!filePath.startsWith(uploadsDir)) {
    return c.json({ error: "Invalid path" }, 400);
  }

  // If exact file doesn't exist, try CID-prefix lookup (handles old `cid_name` and new `cid.ext` formats)
  if (!fs.existsSync(filePath) && requested.startsWith("local_")) {
    const files = fs.readdirSync(uploadsDir);
    const match = files.find((f) => f.startsWith(requested));
    if (match) {
      filePath = path.resolve(uploadsDir, match);
    }
  }

  if (!fs.existsSync(filePath)) {
    return c.json({ error: "File not found" }, 404);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".md": "text/markdown",
    ".zip": "application/zip",
    ".json": "application/json",
    ".txt": "text/plain",
  };
  c.header("Content-Type", mimeTypes[ext] || "application/octet-stream");
  c.header("Content-Disposition", `attachment; filename="${path.basename(filePath)}"`);
  return c.body(fileBuffer);
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

// ─── Start Server ──────────────────────────────────────────

const port = parseInt(process.env.PORT || "3001");

async function start() {
  // DEV-05: Verify database connection before starting
  try {
    await prisma.$connect();
    console.log("[DB] ✓ Database connected");
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

start();

export default app;
