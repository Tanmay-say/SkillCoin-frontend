import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { UploadResult } from "../types";

const IPFS_GATEWAY = "https://ipfs.io/ipfs";
const MIN_FILECOIN_UPLOAD_BYTES = 127;

let _synapse: any = null;

function isLocalDevMode(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    ["1", "true", "yes"].includes((process.env.LOCAL_DEV_MODE || "").toLowerCase())
  );
}

function getLocalStorageDir(): string {
  return path.resolve(
    process.cwd(),
    process.env.LOCAL_STORAGE_DIR || ".local-dev/storage"
  );
}

function ensureLocalStorageDir(): string {
  const dir = getLocalStorageDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

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
  const viemAccMod = await import("viem/accounts");
  const privateKeyToAccount = viemAccMod.privateKeyToAccount;
  const account = privateKeyToAccount(hexKey);
  const mod = await import("@filoz/synapse-sdk");
  const Synapse = mod.Synapse;

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
  static isLocalCid(cid: string): boolean {
    return typeof cid === "string" && cid.startsWith("local_");
  }

  static async uploadLocalFile(buffer: Buffer, filename: string): Promise<FilecoinUploadResult> {
    const cid = `local_${randomUUID().replace(/-/g, "")}`;
    const dir = ensureLocalStorageDir();
    const contentPath = path.join(dir, `${cid}.bin`);
    const metaPath = path.join(dir, `${cid}.json`);

    fs.writeFileSync(contentPath, buffer);
    fs.writeFileSync(
      metaPath,
      JSON.stringify(
        {
          cid,
          filename,
          size: buffer.length,
          uploadedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      "utf8"
    );

    return {
      cid,
      pieceCid: cid,
      filecoinDatasetId: 0,
      size: buffer.length,
      uploadedAt: new Date(),
      gatewayUrl: `/uploads/${cid}`,
      storageType: "local",
    };
  }

  /**
   * Upload a file buffer to Filecoin via Synapse SDK v0.40+.
   * In localhost dev mode, missing Filecoin config falls back to local disk storage.
   */
  static async uploadFile(
    buffer: Buffer,
    filename: string
  ): Promise<FilecoinUploadResult> {
    if (!hasFilecoinKey()) {
      if (isLocalDevMode()) {
        return this.uploadLocalFile(buffer, filename);
      }
      throw new FilecoinNotConfiguredError();
    }
    if (buffer.length < MIN_FILECOIN_UPLOAD_BYTES) {
      throw new FilecoinInputTooSmallError(buffer.length);
    }

    console.log(`[Filecoin] Uploading ${filename} (${buffer.length} bytes) via Synapse SDK...`);
    const synapse = await getSynapse();
    const dataSize = BigInt(buffer.length);
    const prep = await synapse.storage.prepare({ dataSize });

    if (prep.transaction) {
      const txResult = await prep.transaction.execute({
        onHash: (hash: string) => console.log(`[Filecoin] Prepare tx: ${hash}`),
      });
      console.log(`[Filecoin] Prepare tx done: ${txResult.hash}`);
    }
    const result = await synapse.storage.upload(new Uint8Array(buffer));

    const pieceCid = result.pieceCid?.toString() || "";
    const primaryCopy = result.copies?.[0];
    const dataSetId = primaryCopy?.dataSetId ? Number(primaryCopy.dataSetId) : 0;

    console.log(`[Filecoin] Uploaded: Piece CID ${pieceCid}, Dataset ${dataSetId}`);

    return {
      // Synapse gives us a piece CID for retrieval/proof, not a public IPFS gateway root CID.
      cid: pieceCid,
      pieceCid,
      filecoinDatasetId: dataSetId,
      size: buffer.length,
      uploadedAt: new Date(),
      gatewayUrl: "",
      storageType: "filecoin",
    };
  }

  static getFileUrl(cid: string): string {
    if (this.isLocalCid(cid)) {
      return `/uploads/${cid}`;
    }
    return `${IPFS_GATEWAY}/${cid}`;
  }

  static async downloadPiece(pieceCid: string): Promise<Uint8Array> {
    const synapse = await getSynapse();
    return synapse.storage.download({ pieceCid });
  }

  static async downloadLocalFile(cid: string): Promise<Buffer> {
    const dir = ensureLocalStorageDir();
    const contentPath = path.join(dir, `${cid}.bin`);
    if (!fs.existsSync(contentPath)) {
      throw new Error(`Local content not found for ${cid}`);
    }
    return fs.readFileSync(contentPath);
  }

  static async downloadStoredFile(args: {
    zipCid: string;
    pieceCid?: string | null;
    storageType?: string | null;
  }): Promise<Uint8Array | Buffer> {
    if (args.storageType === "local" || this.isLocalCid(args.zipCid)) {
      return this.downloadLocalFile(args.zipCid);
    }
    return this.downloadPiece(args.pieceCid || args.zipCid);
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
