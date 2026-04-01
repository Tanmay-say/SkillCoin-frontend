import * as fs from "fs";
import * as path from "path";
import { getSkillsDir, readConfig } from "./config";

const GATEWAYS = [
  "https://ipfs.io/ipfs",
  "https://w3s.link/ipfs",
  "https://cloudflare-ipfs.com/ipfs",
];

function normalizeId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  if (!normalized || normalized === "null" || normalized === "undefined") {
    return null;
  }
  return normalized;
}

/**
 * Download a file by CID. Local CIDs (local_*) are fetched from the API server;
 * real IPFS CIDs are fetched through public gateways with fallback.
 */
export async function downloadFromCID(cid: string): Promise<Buffer> {
  const normalizedCid = normalizeId(cid);
  if (!normalizedCid) {
    throw new Error("Skill content CID is missing");
  }

  if (normalizedCid.startsWith("local_")) {
    return downloadFromLocalAPI(normalizedCid);
  }

  let lastError: Error | null = null;

  for (const gateway of GATEWAYS) {
    try {
      const url = `${gateway}/${normalizedCid}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${gateway}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      return buffer;
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }

  throw new Error(
    `Failed to download CID ${normalizedCid} from all gateways: ${lastError?.message}`
  );
}

export async function downloadFromUrl(url: string): Promise<Buffer> {
  const config = readConfig();
  const normalizedUrl = normalizeId(url);
  if (!normalizedUrl) {
    throw new Error("Skill download URL is missing");
  }

  const finalUrl = /^https?:\/\//i.test(normalizedUrl)
    ? normalizedUrl
    : `${config.apiBase?.replace(/\/$/, "")}${normalizedUrl.startsWith("/") ? "" : "/"}${normalizedUrl}`;

  const response = await fetch(finalUrl, {
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    let body = "";
    try {
      body = await response.text();
    } catch {}
    throw new Error(
      `HTTP ${response.status} from download URL${body ? `: ${body.slice(0, 200)}` : ""}`
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

async function downloadFromLocalAPI(cid: string): Promise<Buffer> {
  const config = readConfig();
  if (!config.apiBase) {
    throw new Error(
      "API server not configured. Run: skillcoin config --api-base <url>"
    );
  }

  const response = await fetch(`${config.apiBase}/uploads/${cid}`, {
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Local download failed: HTTP ${response.status} from API server`);
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Save a downloaded skill to the local skills directory
 */
export function saveSkill(
  buffer: Buffer,
  skillName: string,
  filename: string,
  metadata: {
    version: string;
    cid: string;
    description?: string;
    category?: string;
  }
): string {
  const skillsDir = getSkillsDir();
  const skillDir = path.join(skillsDir, skillName);
  const isZip = isZipArchive(buffer) || filename.toLowerCase().endsWith(".zip");

  // Create skill directory
  if (!fs.existsSync(skillDir)) {
    fs.mkdirSync(skillDir, { recursive: true });
  }

  let originalFile = filename;
  let extractedFiles: string[] = [];

  if (isZip) {
    const archiveName = filename.toLowerCase().endsWith(".zip")
      ? filename
      : `${skillName}.zip`;
    const archivePath = path.join(skillDir, archiveName);
    fs.writeFileSync(archivePath, buffer);
    originalFile = archiveName;

    try {
      // Use sync extraction so installs remain deterministic from the CLI.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AdmZip = require("adm-zip");
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();
      extractedFiles = entries
        .filter((entry: any) => !entry.isDirectory)
        .map((entry: any) => entry.entryName);
      zip.extractAllTo(skillDir, true);
    } catch (error: any) {
      throw new Error(`Downloaded ZIP could not be extracted: ${error.message || "unknown error"}`);
    }
  } else {
    const filePath = path.join(skillDir, filename);
    fs.writeFileSync(filePath, buffer);

    if (filename.endsWith(".md") && filename !== "SKILL.md") {
      fs.writeFileSync(path.join(skillDir, "SKILL.md"), buffer);
    }
  }

  // Save manifest
  const manifest = {
    name: skillName,
    version: metadata.version,
    cid: metadata.cid,
    description: metadata.description || "",
    category: metadata.category || "",
    originalFile,
    packageType: isZip ? "zip" : "markdown",
    extractedFiles,
    installedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(skillDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  return skillDir;
}

function isZipArchive(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  );
}

/**
 * Check if a skill is already installed
 */
export function isSkillInstalled(name: string): boolean {
  const skillDir = path.join(getSkillsDir(), name);
  return fs.existsSync(skillDir) && fs.existsSync(path.join(skillDir, "manifest.json"));
}

/**
 * Get installed skill manifest
 */
export function getInstalledManifest(name: string): any | null {
  const manifestPath = path.join(getSkillsDir(), name, "manifest.json");
  if (!fs.existsSync(manifestPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    return null;
  }
}
