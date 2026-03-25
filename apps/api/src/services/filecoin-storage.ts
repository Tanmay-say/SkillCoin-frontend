import type { UploadResult } from "../types";

const IPFS_GATEWAY = "https://ipfs.io/ipfs";
const DEBUG_ENDPOINT = "http://127.0.0.1:7246/ingest/95cbc5a9-44a7-4444-a8b3-3705dcb24c37";
const DEBUG_SESSION_ID = "b98ebe";
const MIN_FILECOIN_UPLOAD_BYTES = 127;

let _synapse: any = null;

// #region agent log
function emitDebug(
  runId: string,
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown> = {}
): void {
  console.log(
    `[DEBUG-b98ebe] ${hypothesisId} ${location} ${message}: ${JSON.stringify(data)}`
  );
  fetch(DEBUG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": DEBUG_SESSION_ID,
    },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
// #endregion

export class FilecoinNotConfiguredError extends Error {
  constructor() {
    super("FILECOIN_PRIVATE_KEY is not set — Filecoin storage unavailable");
    this.name = "FilecoinNotConfiguredError";
  }
}

export class FilecoinInputTooSmallError extends Error {
  constructor(actualBytes: number, minimumBytes: number = MIN_FILECOIN_UPLOAD_BYTES) {
    super(`File too small for Filecoin storage: ${actualBytes} bytes (minimum ${minimumBytes} bytes)`);
    this.name = "FilecoinInputTooSmallError";
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
    const viemAccMod = await import("viem/accounts");
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
    const mod = await import("@filoz/synapse-sdk");
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
    const runId = `upload-${Date.now()}`;
    if (!hasFilecoinKey()) {
      throw new FilecoinNotConfiguredError();
    }
    if (buffer.length < MIN_FILECOIN_UPLOAD_BYTES) {
      // #region agent log
      emitDebug(runId, "H9", "filecoin-storage.ts:upload:validate-size", "file below minimum size", {
        actualBytes: buffer.length,
        minimumBytes: MIN_FILECOIN_UPLOAD_BYTES,
      });
      // #endregion
      throw new FilecoinInputTooSmallError(buffer.length);
    }

    console.log(`[Filecoin] Uploading ${filename} (${buffer.length} bytes) via Synapse SDK...`);
    const synapse = await getSynapse();

    // #region agent log – H5: check allowance and prepare funds before upload
    const dataSize = BigInt(buffer.length);
    console.log(`[DEBUG-b98ebe] H5: calling storage.prepare with dataSize=${dataSize}`);
    const prep = await synapse.storage.prepare({ dataSize });
    console.log(`[DEBUG-b98ebe] H5: prepare result – transaction=${prep.transaction ? 'NEEDED' : 'null'}, depositAmount=${prep.transaction?.depositAmount}, includesApproval=${prep.transaction?.includesApproval}`);

    if (prep.transaction) {
      console.log(`[DEBUG-b98ebe] H5: executing prepare transaction (deposit + approval)...`);
      const txResult = await prep.transaction.execute({
        onHash: (hash: string) => console.log(`[Filecoin] Prepare tx: ${hash}`),
      });
      console.log(`[DEBUG-b98ebe] H5: prepare tx done – hash=${txResult.hash}`);
    }
    // #endregion

    // #region agent log – H6/H7/H8: phase-level upload instrumentation
    emitDebug(runId, "H6", "filecoin-storage.ts:upload:start", "upload start", {
      filename,
      bytes: buffer.length,
    });
    let result: any;
    try {
      result = await synapse.storage.upload(new Uint8Array(buffer), {
        callbacks: {
          onProgress: (bytesUploaded: number) => {
            emitDebug(runId, "H6", "filecoin-storage.ts:upload:onProgress", "bytes uploaded", {
              bytesUploaded,
            });
          },
          onStored: (providerId: bigint, pieceCid: any) => {
            emitDebug(runId, "H6", "filecoin-storage.ts:upload:onStored", "piece stored", {
              providerId: providerId.toString(),
              pieceCid: pieceCid?.toString?.() ?? String(pieceCid),
            });
          },
          onPiecesAdded: (transaction: string, providerId: bigint, pieces: { pieceCid: any }[]) => {
            emitDebug(
              runId,
              "H8",
              "filecoin-storage.ts:upload:onPiecesAdded",
              "pieces added on-chain tx submitted",
              {
                transaction,
                providerId: providerId.toString(),
                piecesCount: pieces.length,
              }
            );
          },
          onPiecesConfirmed: (dataSetId: bigint, providerId: bigint, pieces: { pieceCid: any }[]) => {
            emitDebug(
              runId,
              "H8",
              "filecoin-storage.ts:upload:onPiecesConfirmed",
              "pieces confirmed on-chain",
              {
                dataSetId: dataSetId.toString(),
                providerId: providerId.toString(),
                piecesCount: pieces.length,
              }
            );
          },
          onPullProgress: (providerId: bigint, pieceCid: any, status: string) => {
            emitDebug(
              runId,
              "H7",
              "filecoin-storage.ts:upload:onPullProgress",
              "provider pull progress",
              {
                providerId: providerId.toString(),
                pieceCid: pieceCid?.toString?.() ?? String(pieceCid),
                status,
              }
            );
          },
          onCopyComplete: (providerId: bigint, pieceCid: any) => {
            emitDebug(
              runId,
              "H7",
              "filecoin-storage.ts:upload:onCopyComplete",
              "copy complete",
              {
                providerId: providerId.toString(),
                pieceCid: pieceCid?.toString?.() ?? String(pieceCid),
              }
            );
          },
          onCopyFailed: (providerId: bigint, pieceCid: any, error: Error) => {
            emitDebug(runId, "H7", "filecoin-storage.ts:upload:onCopyFailed", "copy failed", {
              providerId: providerId.toString(),
              pieceCid: pieceCid?.toString?.() ?? String(pieceCid),
              error: error?.message ?? "unknown",
            });
          },
        },
      });
      emitDebug(runId, "H6", "filecoin-storage.ts:upload:done", "upload finished", {
        hasResult: true,
      });
    } catch (e: any) {
      emitDebug(runId, "H6", "filecoin-storage.ts:upload:error", "upload failed", {
        error: e?.message ?? "unknown",
        shortMessage: e?.shortMessage ?? null,
        providerId: e?.providerId ?? null,
        endpoint: e?.endpoint ?? null,
      });
      throw e;
    }
    // #endregion

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
