import axios, { type AxiosError } from "axios";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Warn in dev if using fallback
if (typeof window !== "undefined" && !process.env.NEXT_PUBLIC_API_URL) {
  console.warn("[SkillCoin] NEXT_PUBLIC_API_URL not set — using localhost:3001 fallback");
}

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 10000, // 10s timeout so Vercel pages don't hang
});

// ─── Types ─────────────────────────────────────────────

export interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string;
  version: string;
  category: string | null;
  tags: string[];
  zipCid: string | null;
  manifestCid: string | null;
  pieceCid?: string | null;
  filecoinDatasetId?: number | null;
  filecoinDealId: string | null;
  creatorAddress: string;
  priceAmount: string;  // Prisma Decimal serializes as string
  priceCurrency: string;
  downloads: number;
  published: boolean;
  fvmContractId: string | null;
  storageType?: "filecoin" | "local"; // "local" means not yet on-chain
  hasContent?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  skills: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── API Functions ─────────────────────────────────────

export async function fetchSkills(params?: {
  page?: number;
  limit?: number;
  category?: string;
  sort?: string;
}): Promise<PaginatedResponse<Skill>> {
  try {
    const { data } = await api.get("/api/skills", { params });
    return data.data;
  } catch (err) {
    const e = err as AxiosError;
    // Return empty gracefully — Vercel page won't show blank screen
    if (e.code === "ECONNREFUSED" || e.code === "ERR_NETWORK" || e.response?.status === 503) {
      console.warn("[SkillCoin] API unreachable — returning empty skill list");
      return { skills: [], pagination: { page: 1, limit: 6, total: 0, totalPages: 0 } };
    }
    throw err;
  }
}

export async function fetchSkill(slug: string): Promise<Skill> {
  const { data } = await api.get(`/api/skills/${slug}`);
  return data.data;
}

export async function searchSkills(
  q: string,
  page = 1,
  category?: string
): Promise<PaginatedResponse<Skill>> {
  const params: Record<string, any> = { q, page };
  if (category && category !== "all") params.category = category;
  const { data } = await api.get("/api/skills/search", { params });
  return data.data;
}

export async function uploadSkill(formData: FormData, authToken?: string): Promise<any> {
  const headers: Record<string, string> = {
    "Content-Type": "multipart/form-data",
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const { data } = await api.post("/api/skills/upload", formData, {
    headers,
  });
  return data.data;
}

export async function requestAuthNonce(
  address: string
): Promise<{ nonce: string; nonceToken?: string }> {
  const { data } = await api.get("/api/auth/nonce", { params: { address } });
  return data.data;
}

export async function loginWithWallet(
  address: string,
  signature: string,
  nonce: string,
  nonceToken?: string
): Promise<{ token: string; user: { walletAddress: string } }> {
  const { data } = await api.post("/api/auth/login", {
    address,
    signature,
    nonce,
    nonceToken,
  });
  return data.data;
}
