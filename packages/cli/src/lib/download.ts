import * as fs from "fs";
import * as path from "path";
import { getSkillsDir } from "./config";

/**
 * Multi-gateway download from IPFS using CID
 * Tries Lighthouse first, then fallback gateways
 */
const GATEWAYS = [
  "https://gateway.lighthouse.storage/ipfs",
  "https://ipfs.io/ipfs",
  "https://cloudflare-ipfs.com/ipfs",
];

/**
 * Download a file from IPFS by CID, trying multiple gateways
 */
export async function downloadFromCID(cid: string): Promise<Buffer> {
  let lastError: Error | null = null;

  for (const gateway of GATEWAYS) {
    try {
      const url = `${gateway}/${cid}`;
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
    `Failed to download CID ${cid} from all gateways: ${lastError?.message}`
  );
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

  // Create skill directory
  if (!fs.existsSync(skillDir)) {
    fs.mkdirSync(skillDir, { recursive: true });
  }

  // Save the skill file
  const filePath = path.join(skillDir, filename);
  fs.writeFileSync(filePath, buffer);

  // Also save as SKILL.md if it's a markdown file
  if (filename.endsWith(".md") && filename !== "SKILL.md") {
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), buffer);
  }

  // Save manifest
  const manifest = {
    name: skillName,
    version: metadata.version,
    cid: metadata.cid,
    description: metadata.description || "",
    category: metadata.category || "",
    originalFile: filename,
    installedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(skillDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  return skillDir;
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
