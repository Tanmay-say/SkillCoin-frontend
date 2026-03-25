import type { UploadResult } from "../types";

const IPFS_GATEWAY = "https://ipfs.io/ipfs";
const MIN_FILECOIN_UPLOAD_BYTES = 127;

let _synapse: any = null;

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

  static async downloadPiece(pieceCid: string): Promise<Uint8Array> {
    const synapse = await getSynapse();
    return synapse.storage.download({ pieceCid });
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
