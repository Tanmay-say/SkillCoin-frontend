import type { UploadResult } from "../types";

const FILECOIN_RPC_URL =
  process.env.FILECOIN_RPC_URL || "https://api.calibration.node.glif.io/rpc/v1";
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

  const mod = await import("@filoz/synapse-sdk");
  const { Synapse } = mod;
  _synapse = await Synapse.create({
    privateKey: key,
    rpcURL: FILECOIN_RPC_URL,
  });
  return _synapse;
}

export interface FilecoinUploadResult extends UploadResult {
  pieceCid: string;
  filecoinDatasetId: number;
}

export class FilecoinStorageService {
  /**
   * Upload a file buffer to Filecoin via Synapse SDK.
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

    const rootCid = result.rootCID.toString();
    const pieceCid = result.pieceCID.toString();
    const filecoinDatasetId = result.dataSetId;

    console.log(`[Filecoin] Uploaded: Root CID ${rootCid}, Piece CID ${pieceCid}, Dataset ${filecoinDatasetId}`);

    return {
      cid: rootCid,
      pieceCid,
      filecoinDatasetId,
      size: buffer.length,
      uploadedAt: new Date(),
      gatewayUrl: `${IPFS_GATEWAY}/${rootCid}`,
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

  /**
   * Verify that a skill's Filecoin storage is still live (has active PDP proofs).
   */
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
      const datasets = await synapse.storage.listDataSets();
      const ds = datasets.find((d: any) => d.id === filecoinDatasetId);
      return {
        isLive: ds?.status === "live",
        status: ds?.status ?? "unknown",
        piecesCount: ds?.pieces?.length ?? 0,
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
