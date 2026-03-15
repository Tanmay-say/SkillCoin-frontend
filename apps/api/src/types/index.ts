import { z } from "zod";

// ─── Skill Schemas ─────────────────────────────────────────

export const ManifestSchema = z.object({
  name: z.string().regex(/^[a-z0-9-]+$/, "Name must be lowercase with hyphens only"),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Must follow semver (x.x.x)"),
  description: z.string().min(10).max(1000),
  entry: z.string().default("SKILL.md"),
  author: z.string(),
  license: z.string().default("per-user"),
  price: z.object({
    amount: z.number().min(0),
    currency: z.enum(["USDC", "FLOW", "FREE"]),
  }),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  encrypted: z.boolean().default(false),
  agentCompatibility: z.array(z.string()).default([]),
  skillcoinVersion: z.string().default("1"),
});

export const UploadMetadataSchema = z.object({
  name: z.string().regex(/^[a-z0-9-]+$/, "Name must be lowercase with hyphens only"),
  description: z.string().min(10).max(1000),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  price: z.number().min(0).default(0.5),
  currency: z.enum(["USDC", "FLOW", "FREE"]).default("USDC"),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).default("1.0.0"),
  creatorAddress: z.string(),
});

export const SkillQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  category: z.string().optional(),
  tags: z.string().optional(),
  sort: z.enum(["newest", "popular", "price_asc", "price_desc"]).default("newest"),
});

export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// ─── Auth Schemas ──────────────────────────────────────────

export const LoginSchema = z.object({
  address: z.string(),
  signature: z.string(),
  nonce: z.string(),
});

// ─── Payment Schemas ───────────────────────────────────────

export const VerifyPaymentSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash"),
});

// ─── Types ─────────────────────────────────────────────────

export type Manifest = z.infer<typeof ManifestSchema>;
export type UploadMetadata = z.infer<typeof UploadMetadataSchema>;
export type SkillQuery = z.infer<typeof SkillQuerySchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export interface PaymentChallenge {
  amount: string;
  currency: string;
  recipient: string;
  skillSlug: string;
  nonce: string;
  expiresAt: string;
}

export interface UploadResult {
  cid: string;
  size: number;
  uploadedAt: Date;
  gatewayUrl: string;
}

export interface DealResult {
  dealId: string;
  cid: string;
  provider: string;
  status: "pending" | "active" | "failed";
  explorerUrl: string;
}

export interface VerifyResult {
  valid: boolean;
  actualAmount: number;
  paidAt: Date;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
