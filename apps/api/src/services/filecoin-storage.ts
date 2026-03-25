import type { UploadResult } from "../types";

const IPFS_GATEWAY = "https://ipfs.io/ipfs";

let _synapse: any = null;

export class FilecoinNotConfiguredError extends Error {
  constructor() {
    super("FILECOIN_PRIVATE_KEY is not set — Filecoin storage unavailable");
    this.name = "FilecoinNotConfiguredError";
  }
}

export function hasFilecoinKey(): boolean {
  return !!process.env.FILECOIN_PRIVATE_KEY;
}

export async function getSynapse(): Promise<any> {
  if (_synapse) return _synapse;

  const key = process.env.FILECOIN_PRIVATE_KEY;
  if (!key) {
    throw new FilecoinNotConfiguredError();
  }

  const hexKey = (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`;

  // #region agent log – H1/H2/H3: diagnose module resolution on Vercel
  const fs = require("fs");
  const path = require("path");
  const diagPaths = [
    path.resolve(__dirname, "../../node_modules/viem"),
    path.resolve(__dirname, "../../../node_modules/viem"),
    path.resolve(__dirname, "../../../../node_modules/viem"),
    "/var/task/node_modules/viem",
    "/var/task/apps/api/node_modules/viem",
    "/var/task/apps/node_modules/viem",
  ];
  const diagResults: Record<string, boolean> = {};
  for (const p of diagPaths) {
    diagResults[p] = fs.existsSync(p);
  }
  console.log(`[DEBUG-b98ebe] viem paths: ${JSON.stringify(diagResults)}`);

  const viemAccountsPaths = [
    path.resolve(__dirname, "../../node_modules/viem/accounts"),
    path.resolve(__dirname, "../../node_modules/viem/_cjs/accounts"),
    "/var/task/node_modules/viem/package.json",
    "/var/task/apps/api/node_modules/viem/package.json",
  ];
  const viemAccDiag: Record<string, any> = {};
  for (const p of viemAccountsPaths) {
    viemAccDiag[p] = fs.existsSync(p);
    if (p.endsWith("package.json") && fs.existsSync(p)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(p, "utf8"));
        viemAccDiag[p + ":exports"] = pkg.exports?.["./accounts"] ?? "NOT_FOUND";
      } catch {}
    }
  }
  console.log(`[DEBUG-b98ebe] viem/accounts paths: ${JSON.stringify(viemAccDiag)}`);

  let pnpmViemDir = "NOT_FOUND";
  const pnpmBase = path.resolve(__dirname, "../../../../node_modules/.pnpm");
  if (fs.existsSync(pnpmBase)) {
    try {
      const dirs = fs.readdirSync(pnpmBase).filter((d: string) => d.startsWith("viem"));
      pnpmViemDir = JSON.stringify(dirs.slice(0, 5));
    } catch {}
  }
  console.log(`[DEBUG-b98ebe] .pnpm viem dirs: ${pnpmViemDir}`);
  // #endregion

  // #region agent log – H1: try import, capture detailed error
  let privateKeyToAccount: any;
  try {
    const viemAccMod = await import("viem/accounts" as any);
    privateKeyToAccount = viemAccMod.privateKeyToAccount;
    console.log(`[DEBUG-b98ebe] H1: viem/accounts import SUCCESS`);
  } catch (e: any) {
    console.log(`[DEBUG-b98ebe] H1: viem/accounts import FAILED: ${e.message}`);
    console.log(`[DEBUG-b98ebe] H1: error code: ${e.code}, require stack: ${JSON.stringify(e.requireStack)}`);
    throw new Error(`Filecoin init failed: cannot load viem/accounts – ${e.message}`);
  }
  // #endregion

  const account = privateKeyToAccount(hexKey);

  // #region agent log – H2: try synapse-sdk import
  let Synapse: any;
  try {
    const mod = await import("@filoz/synapse-sdk" as any);
    Synapse = mod.Synapse;
    console.log(`[DEBUG-b98ebe] H2: synapse-sdk import SUCCESS`);
  } catch (e: any) {
    console.log(`[DEBUG-b98ebe] H2: synapse-sdk import FAILED: ${e.message}`);
    throw new Error(`Filecoin init failed: cannot load @filoz/synapse-sdk – ${e.message}`);
  }
  // #endregion

  _synapse = Synapse.create({
    account,
    source: "skillcoin-api",
  });

  return _synapse;
}

export interface FilecoinUploadResult extends UploadResult {
  pieceCid: string;
  filecoinDatasetId: number;
}

export class FilecoinStorageService {
  /**
   * Upload a file buffer to Filecoin via Synapse SDK v0.40+.
   * Throws FilecoinNotConfiguredError if FILECOIN_PRIVATE_KEY is missing.
   * Throws on any Synapse/upload failure — no silent fallback.
   */
  static async uploadFile(
    buffer: Buffer,
    filename: string
  ): Promise<FilecoinUploadResult> {
    if (!hasFilecoinKey()) {
      throw new FilecoinNotConfiguredError();
    }

    console.log(`[Filecoin] Uploading ${filename} (${buffer.length} bytes) via Synapse SDK...`);
    const synapse = await getSynapse();

    const result = await synapse.storage.upload(new Uint8Array(buffer));

    const pieceCid = result.pieceCid?.toString() || "";
    const primaryCopy = result.copies?.[0];
    const dataSetId = primaryCopy?.dataSetId ? Number(primaryCopy.dataSetId) : 0;

    console.log(`[Filecoin] Uploaded: Piece CID ${pieceCid}, Dataset ${dataSetId}`);

    return {
      cid: pieceCid,
      pieceCid,
      filecoinDatasetId: dataSetId,
      size: buffer.length,
      uploadedAt: new Date(),
      gatewayUrl: pieceCid ? `${IPFS_GATEWAY}/${pieceCid}` : "",
      storageType: "filecoin",
    };
  }

  static getFileUrl(cid: string): string {
    return `${IPFS_GATEWAY}/${cid}`;
  }

  static async uploadManifest(manifest: object): Promise<{ cid: string }> {
    const buffer = Buffer.from(JSON.stringify(manifest, null, 2));
    const result = await this.uploadFile(buffer, "manifest.json");
    return { cid: result.cid };
  }

  static async verifyStorage(filecoinDatasetId: number): Promise<{
    isLive: boolean;
    status: string;
    piecesCount: number;
    proofUrl: string;
  }> {
    if (!hasFilecoinKey()) {
      return { isLive: false, status: "not-configured", piecesCount: 0, proofUrl: "" };
    }
    try {
      const synapse = await getSynapse();
      const datasets = await synapse.storage.findDataSets();
      const ds = datasets.find((d: any) => Number(d.dataSetId) === filecoinDatasetId);
      return {
        isLive: !!ds?.isLive,
        status: ds?.isLive ? "live" : "unknown",
        piecesCount: ds?.activePieceCount ? Number(ds.activePieceCount) : 0,
        proofUrl: `https://pdp.vxb.ai/calibration/dataset/${filecoinDatasetId}`,
      };
    } catch {
      return { isLive: false, status: "error", piecesCount: 0, proofUrl: "" };
    }
  }

  static async verifyCidAccessible(cid: string): Promise<boolean> {
    try {
      const response: any = await fetch(`${IPFS_GATEWAY}/${cid}`, { method: "HEAD" });
      return response.status >= 200 && response.status < 300;
    } catch {
      return false;
    }
  }
}

export default FilecoinStorageService;
