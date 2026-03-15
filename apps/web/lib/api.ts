import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
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
  zipCid: string;
  manifestCid: string | null;
  filecoinDealId: string | null;
  creatorAddress: string;
  priceAmount: string;  // Prisma Decimal serializes as string
  priceCurrency: string;
  downloads: number;
  published: boolean;
  fvmContractId: string | null;
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
  const { data } = await api.get("/api/skills", { params });
  return data.data;
}

export async function fetchSkill(slug: string): Promise<Skill> {
  const { data } = await api.get(`/api/skills/${slug}`);
  return data.data;
}

export async function searchSkills(
  q: string,
  page = 1,
  category?: string  // MED-BUG-02: server-side category filtering
): Promise<PaginatedResponse<Skill>> {
  const params: Record<string, any> = { q, page };
  if (category && category !== "all") params.category = category;
  const { data } = await api.get("/api/skills/search", { params });
  return data.data;
}

export async function uploadSkill(formData: FormData): Promise<any> {
  const { data } = await api.post("/api/skills/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}
