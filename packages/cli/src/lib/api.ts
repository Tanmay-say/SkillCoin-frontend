import { ethers } from "ethers";
import { readConfig, writeConfig } from "./config";

function requireApiBase(): string {
  const config = readConfig();
  if (!config.apiBase) {
    throw new Error(
      "API server not configured. Run: skillcoin config --api-base <url>"
    );
  }
  return config.apiBase;
}

async function readJson(res: Response): Promise<any> {
  return res.json().catch(() => ({}));
}

function getDerivedWallet(config = readConfig()) {
  if (!config.privateKey) {
    return null;
  }

  const privateKey = config.privateKey.startsWith("0x")
    ? config.privateKey
    : `0x${config.privateKey}`;
  return new ethers.Wallet(privateKey);
}

async function getOrCreateAuthToken(required = false, forceRefresh = false): Promise<string> {
  const config = readConfig();
  const derivedWallet = getDerivedWallet(config);

  if (derivedWallet && config.wallet && config.wallet.toLowerCase() !== derivedWallet.address.toLowerCase()) {
    writeConfig({
      wallet: derivedWallet.address,
      authToken: "",
    });
  }

  if (config.authToken && !forceRefresh) {
    return config.authToken;
  }

  if (!derivedWallet) {
    if (required) {
      throw new Error(
        "This action requires authentication. Run `skillcoin config --wallet <address> --key <privateKey>` first."
      );
    }
    return "";
  }

  const apiBase = requireApiBase();
  const address = derivedWallet.address;

  const nonceRes = await fetch(
    `${apiBase}/api/auth/nonce?address=${encodeURIComponent(address)}`
  );
  const nonceJson = await readJson(nonceRes);
  if (!nonceRes.ok || !nonceJson?.data?.nonce) {
    throw new Error(nonceJson.error || "Failed to fetch login nonce");
  }

  const signature = await derivedWallet.signMessage(nonceJson.data.nonce);
  const loginRes = await fetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address,
      signature,
      nonce: nonceJson.data.nonce,
      nonceToken: nonceJson.data.nonceToken,
    }),
  });
  const loginJson = await readJson(loginRes);
  if (!loginRes.ok || !loginJson?.data?.token) {
    throw new Error(loginJson.error || "Wallet login failed");
  }

  writeConfig({
    wallet: loginJson.data.user?.walletAddress || address,
    authToken: loginJson.data.token,
  });

  return loginJson.data.token;
}

async function buildAuthHeaders(required = false): Promise<Record<string, string>> {
  const token = await getOrCreateAuthToken(required);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function refreshAuthHeaders(required = false): Promise<Record<string, string>> {
  const token = await getOrCreateAuthToken(required, true);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface SkillMeta {
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
  priceAmount: number;
  priceCurrency: string;
  downloads: number;
  published: boolean;
  storageType?: string;
}

export interface DownloadResponse {
  cid: string;
  downloadUrl: string;
  token?: string;
  expiresIn?: number;
  free?: boolean;
  alreadyPurchased?: boolean;
  pieceCid?: string;
  filecoinDatasetId?: number;
}

export interface PaymentChallenge {
  token: string;
  amount: string;
  currency: string;
  recipient: string;
  skillSlug: string;
  skillId: string;
  userId: string;
  payerAddress: string;
  expiresAt: string;
  paymentType: "native" | "erc20";
  tokenAddress?: string;
  tokenDecimals?: number;
  chainId: number;
  rpcUrl: string;
  blockExplorerUrl: string;
}

export async function fetchSkill(name: string): Promise<SkillMeta> {
  const apiBase = requireApiBase();
  const res = await fetch(`${apiBase}/api/skills/${name}`);
  const json = await readJson(res);

  if (!res.ok) {
    throw new Error(json.error || `Skill '${name}' not found on marketplace`);
  }

  return json.data;
}

export async function requestDownload(
  slug: string
): Promise<{
  status: number;
  data?: DownloadResponse;
  challenge?: PaymentChallenge;
}> {
  const apiBase = requireApiBase();
  let headers = await buildAuthHeaders(false);
  let res = await fetch(`${apiBase}/api/skills/${slug}/download`, {
    headers,
  });
  let json = await readJson(res);

  if (res.status === 401 && readConfig().privateKey) {
    headers = await refreshAuthHeaders(false);
    res = await fetch(`${apiBase}/api/skills/${slug}/download`, {
      headers,
    });
    json = await readJson(res);
  }

  if (res.status === 402) {
    return {
      status: 402,
      challenge: json.challenge,
    };
  }

  if (res.status === 200 && json.success) {
    return { status: 200, data: json.data };
  }

  throw new Error(json.error || "Download request failed");
}

export async function verifyDownloadPayment(
  slug: string,
  txHash: string,
  challengeToken: string
): Promise<DownloadResponse> {
  const apiBase = requireApiBase();
  let headers = {
    "Content-Type": "application/json",
    ...(await buildAuthHeaders(true)),
  };

  let res = await fetch(`${apiBase}/api/skills/${slug}/verify-payment`, {
    method: "POST",
    headers,
    body: JSON.stringify({ txHash, challengeToken }),
  });
  let json = await readJson(res);
  if (res.status === 401 && readConfig().privateKey) {
    headers = {
      "Content-Type": "application/json",
      ...(await refreshAuthHeaders(true)),
    };
    res = await fetch(`${apiBase}/api/skills/${slug}/verify-payment`, {
      method: "POST",
      headers,
      body: JSON.stringify({ txHash, challengeToken }),
    });
    json = await readJson(res);
  }
  if (!res.ok) {
    throw new Error(json.error || "Payment verification failed");
  }
  return json.data;
}

export async function uploadSkill(
  fileBuffer: Buffer,
  filename: string,
  metadata: Record<string, any>,
  authToken?: string
): Promise<any> {
  const apiBase = requireApiBase();
  const mimeType = filename.toLowerCase().endsWith(".zip")
    ? "application/zip"
    : "text/markdown";
  const blob = new Blob([fileBuffer], { type: mimeType });
  const form = new FormData();
  form.append("file", blob, filename);
  form.append("metadata", JSON.stringify(metadata));

  let headers = authToken
    ? { Authorization: `Bearer ${authToken}` }
    : await buildAuthHeaders(false);

  let res = await fetch(`${apiBase}/api/skills/upload`, {
    method: "POST",
    body: form,
    headers,
  });
  let json = await readJson(res);

  if (res.status === 401 && !authToken && readConfig().privateKey) {
    headers = await refreshAuthHeaders(false);
    res = await fetch(`${apiBase}/api/skills/upload`, {
      method: "POST",
      body: form,
      headers,
    });
    json = await readJson(res);
  }

  if (!res.ok) {
    throw new Error(json.error || "Upload failed");
  }

  return json.data;
}

export async function registerUploadedSkill(args: {
  cid: string;
  pieceCid?: string;
  filecoinDatasetId?: number;
  filecoinDealId?: string;
  storageType?: "filecoin" | "local";
  metadata: Record<string, any>;
}): Promise<any> {
  const apiBase = requireApiBase();
  let headers = {
    "Content-Type": "application/json",
    ...(await buildAuthHeaders(false)),
  };

  let res = await fetch(`${apiBase}/api/skills/upload/register-upload`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...args.metadata,
      cid: args.cid,
      pieceCid: args.pieceCid,
      filecoinDatasetId: args.filecoinDatasetId,
      filecoinDealId: args.filecoinDealId,
      storageType: args.storageType || "filecoin",
    }),
  });
  let json = await readJson(res);

  if (res.status === 401 && readConfig().privateKey) {
    headers = {
      "Content-Type": "application/json",
      ...(await refreshAuthHeaders(false)),
    };
    res = await fetch(`${apiBase}/api/skills/upload/register-upload`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...args.metadata,
        cid: args.cid,
        pieceCid: args.pieceCid,
        filecoinDatasetId: args.filecoinDatasetId,
        filecoinDealId: args.filecoinDealId,
        storageType: args.storageType || "filecoin",
      }),
    });
    json = await readJson(res);
  }

  if (!res.ok) {
    throw new Error(json.error || "Marketplace registration failed");
  }

  return json.data;
}

export async function listMarketplaceSkills(
  page = 1,
  limit = 20
): Promise<{ skills: SkillMeta[]; total: number }> {
  const apiBase = requireApiBase();
  const res = await fetch(`${apiBase}/api/skills?page=${page}&limit=${limit}`);
  const json = await readJson(res);

  if (!res.ok) {
    throw new Error(json.error || "Failed to fetch skills from marketplace");
  }

  return {
    skills: json.data.skills,
    total: json.data.pagination.total,
  };
}

export async function searchMarketplaceSkills(
  query: string,
  page = 1,
  limit = 20
): Promise<{ skills: SkillMeta[]; total: number }> {
  const apiBase = requireApiBase();
  const res = await fetch(
    `${apiBase}/api/skills/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
  );
  const json = await readJson(res);

  if (!res.ok) {
    throw new Error(json.error || "Search request failed");
  }

  return {
    skills: json.data.skills,
    total: json.data.pagination.total,
  };
}
