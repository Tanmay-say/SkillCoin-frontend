import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const SKILLCOIN_DIR = path.join(os.homedir(), ".skillcoin");
const CONFIG_PATH = path.join(SKILLCOIN_DIR, "config.json");
const SKILLS_DIR = path.join(SKILLCOIN_DIR, "skills");

export type AiProvider = "gemini" | "openai" | "groq";

export interface SkillcoinConfig {
  wallet: string;
  privateKey: string;
  authToken: string;
  apiBase: string;
  ipfsGateway: string;
  skillsDir: string;
  network: string;
  aiProvider: AiProvider;
  aiApiKey: string;
  aiModel: string;
}

const DEFAULT_CONFIG: SkillcoinConfig = {
  wallet: "",
  privateKey: "",
  authToken: "",
  apiBase: "",
  ipfsGateway: "https://ipfs.io/ipfs",
  skillsDir: SKILLS_DIR,
  network: "calibration",
  aiProvider: "gemini",
  aiApiKey: "",
  aiModel: "",
};

/**
 * Ensure the .skillcoin directory exists
 */
export function ensureDirectories(): void {
  if (!fs.existsSync(SKILLCOIN_DIR)) {
    fs.mkdirSync(SKILLCOIN_DIR, { recursive: true });
  }
  if (!fs.existsSync(SKILLS_DIR)) {
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
  }
}

/**
 * Read config from ~/.skillcoin/config.json
 */
export function readConfig(): SkillcoinConfig {
  ensureDirectories();

  if (!fs.existsSync(CONFIG_PATH)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Write config to ~/.skillcoin/config.json
 */
export function writeConfig(config: Partial<SkillcoinConfig>): SkillcoinConfig {
  ensureDirectories();

  const existing = readConfig();
  const merged = { ...existing, ...config };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

/**
 * Get the skills installation directory
 */
export function getSkillsDir(): string {
  ensureDirectories();
  return SKILLS_DIR;
}

/**
 * Check if wallet is configured
 */
export function isWalletConfigured(): boolean {
  const config = readConfig();
  return !!config.wallet;
}

export { SKILLCOIN_DIR, CONFIG_PATH, SKILLS_DIR };
