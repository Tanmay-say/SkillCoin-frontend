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
    version: "1.0.0",
    tagline: "npm for AI Agent Skills — Decentralized, Paid, Permanent",
    status: "running",
    endpoints: {
      skills: "/api/skills",
      upload: "/api/skills/upload",
      download: "/api/skills/:slug/download",
      auth: "/api/auth",
    },
  });
});

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Local Uploads (Lighthouse fallback) ───────────────

import { serveStatic } from "@hono/node-server/serve-static";
import path from "path";
import fs from "fs";

// Serve local fallback upload files at /uploads/*
app.get("/uploads/:filename", async (c) => {
  const filename = c.req.param("filename");
  const filePath = path.resolve(process.cwd(), "uploads", filename);

  // Security: prevent path traversal
  if (!filePath.startsWith(path.resolve(process.cwd(), "uploads"))) {
    return c.json({ error: "Invalid path" }, 400);
  }

  if (!fs.existsSync(filePath)) {
    return c.json({ error: "File not found" }, 404);
  }

  const fileBuffer = fs.readFileSync(filePath);
  c.header("Content-Type", "application/zip");
  c.header("Content-Disposition", `attachment; filename="${filename}"`);
  return c.body(fileBuffer);
});

// ─── Routes ────────────────────────────────────────────────

// BUG-01 FIX: Upload route registered FIRST to avoid /:slug conflict
app.use("/api/skills/upload", uploadRateLimit);
app.route("/api/skills/upload", uploadRouter);

// Download with rate limiting
app.use("/api/skills/:slug/download", downloadRateLimit);
app.route("/api/skills", downloadRouter);

// Skills CRUD (generic /:slug comes last)
app.route("/api/skills", skillsRouter);

// Auth — mounted ONLY at /api/auth
// BUG-02 FIX: Removed duplicate `app.route("/api", authRouter)` that created hidden endpoints
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
