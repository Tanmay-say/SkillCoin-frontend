import { readConfig } from "./config";

export interface SkillMeta {
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
  priceAmount: number;
  priceCurrency: string;
  downloads: number;
  published: boolean;
}

export interface DownloadResponse {
  cid: string;
  downloadUrl: string;
  token?: string;
  expiresIn?: number;
  free?: boolean;
}

export interface PaymentChallenge {
  amount: number;
  currency: string;
  recipient: string;
  skillSlug: string;
}

/**
 * Fetch skill metadata from the API
 */
export async function fetchSkill(name: string): Promise<SkillMeta> {
  const config = readConfig();
  const res = await fetch(`${config.apiBase}/api/skills/${name}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as any;
    throw new Error(body.error || `Skill '${name}' not found on marketplace`);
  }

  const json = (await res.json()) as any;
  return json.data;
}

/**
 * Request download — handles 402 payment flow
 */
export async function requestDownload(
  slug: string,
  paymentProof?: string
): Promise<{
  status: number;
  data?: DownloadResponse;
  challenge?: PaymentChallenge;
}> {
  const config = readConfig();
  const headers: Record<string, string> = {};

  if (paymentProof) {
    headers["X-Payment-Proof"] = paymentProof;
  }

  const res = await fetch(`${config.apiBase}/api/skills/${slug}/download`, {
    headers,
  });

  const json = (await res.json()) as any;

  if (res.status === 402) {
    return {
      status: 402,
      challenge: {
        amount: json.amount,
        currency: json.currency,
        recipient: json.recipient,
        skillSlug: json.skillSlug,
      },
    };
  }

  if (res.status === 200 && json.success) {
    return { status: 200, data: json.data };
  }

  throw new Error(json.error || "Download request failed");
}

/**
 * Upload a skill .md file to the API
 */
export async function uploadSkill(
  fileBuffer: Buffer,
  filename: string,
  metadata: Record<string, any>
): Promise<any> {
  const config = readConfig();

  // Use native FormData + Blob (Node 20+)
  const blob = new Blob([fileBuffer], { type: "text/markdown" });
  const form = new FormData();
  form.append("file", blob, filename);
  form.append("metadata", JSON.stringify(metadata));

  const res = await fetch(`${config.apiBase}/api/skills/upload`, {
    method: "POST",
    body: form,
  });

  const json = (await res.json()) as any;

  if (!res.ok) {
    throw new Error(json.error || "Upload failed");
  }

  return json.data;
}

/**
 * List skills from the marketplace
 */
export async function listMarketplaceSkills(
  page = 1,
  limit = 20
): Promise<{ skills: SkillMeta[]; total: number }> {
  const config = readConfig();
  const res = await fetch(
    `${config.apiBase}/api/skills?page=${page}&limit=${limit}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch skills from marketplace");
  }

  const json = (await res.json()) as any;
  return {
    skills: json.data.skills,
    total: json.data.pagination.total,
  };
}

/**
 * Server-side search via /api/skills/search?q=
 */
export async function searchMarketplaceSkills(
  query: string,
  page = 1,
  limit = 20
): Promise<{ skills: SkillMeta[]; total: number }> {
  const config = readConfig();
  const res = await fetch(
    `${config.apiBase}/api/skills/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
  );

  if (!res.ok) {
    throw new Error("Search request failed");
  }

  const json = (await res.json()) as any;
  return {
    skills: json.data.skills,
    total: json.data.pagination.total,
  };
}
