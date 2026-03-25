import fs from "fs";
import path from "path";
import type { UploadResult } from "../types";

/**
 * FilecoinStorageService — primary storage backend via @filoz/synapse-sdk.
 * Uses @filoz/synapse-sdk for permanent Filecoin storage with PDP proofs.
 * Falls back to local storage when private key is not configured.
 */

const FILECOIN_PRIVATE_KEY = process.env.FILECOIN_PRIVATE_KEY || "";
const FILECOIN_RPC_URL =
  process.env.FILECOIN_RPC_URL || "https://api.calibration.node.glif.io/rpc/v1";
const IPFS_GATEWAY = "https://ipfs.io/ipfs";

let _synapse: any = null;

export function hasFilecoinKey(): boolean {
  return !!FILECOIN_PRIVATE_KEY;
}

export async function getSynapse(): Promise<any> {
  if (_synapse) return _synapse;

  if (!FILECOIN_PRIVATE_KEY) {
    throw new Error("FILECOIN_PRIVATE_KEY not set — cannot connect to Filecoin");
  }

  const { Synapse } = await import("@filoz/synapse-sdk" as any);
  _synapse = await Synapse.create({
    privateKey: FILECOIN_PRIVATE_KEY,
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
   * Returns IPFS-compatible Root CID + Filecoin Piece CID for proof verification.
   */
  static async uploadFile(
    buffer: Buffer,
    filename: string
  ): Promise<FilecoinUploadResult> {
    if (!FILECOIN_PRIVATE_KEY) {
      console.warn("[Filecoin] No private key — using local storage fallback");
      return this._localFallback(buffer, filename);
    }

    try {
      console.log(`[Filecoin] Uploading ${filename} (${buffer.length} bytes) via Synapse SDK...`);
      const synapse = await getSynapse();
      const result = await synapse.storage.upload(new Uint8Array(buffer));

      const rootCid = result.rootCID.toString();
      const pieceCid = result.pieceCID.toString();
      const filecoinDatasetId = result.dataSetId;

      console.log(`[Filecoin] ✅ Uploaded! Root CID: ${rootCid}, Piece CID: ${pieceCid}`);

      return {
        cid: rootCid,
        pieceCid,
        filecoinDatasetId,
        size: buffer.length,
        uploadedAt: new Date(),
        gatewayUrl: `${IPFS_GATEWAY}/${rootCid}`,
        storageType: "filecoin",
      };
    } catch (error: any) {
      console.warn(`[Filecoin] Upload failed: ${error.message}`);
      console.log("[Filecoin] Falling back to local storage...");
      return this._localFallback(buffer, filename);
    }
  }

  /**
   * Get the download URL for a CID.
   * Local CIDs resolve to the server's /uploads/ endpoint;
   * real CIDs resolve to IPFS gateways.
   */
  static getFileUrl(cid: string): string {
    if (cid.startsWith("local_")) {
      const resolvedName = this.resolveLocalFilename(cid);
      return `http://localhost:${process.env.PORT || 3001}/uploads/${resolvedName}`;
    }
    return `${IPFS_GATEWAY}/${cid}`;
  }

  /**
   * Resolve a local CID to its actual filename on disk.
   * Handles both new format (cid.ext) and legacy format (cid_filename).
   */
  static resolveLocalFilename(cid: string): string {
    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) return cid;

    const files = fs.readdirSync(uploadsDir);
    const match = files.find((f) => f.startsWith(cid));
    return match || cid;
  }

  /**
   * Upload manifest.json snippet.
   */
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
    if (!FILECOIN_PRIVATE_KEY) {
      return { isLive: true, status: "local", piecesCount: 0, proofUrl: "" };
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

  /**
   * Verify that a CID is accessible (HEAD check).
   */
  static async verifyCidAccessible(cid: string): Promise<boolean> {
    if (cid.startsWith("local_")) return true;
    try {
      const response: any = await fetch(`${IPFS_GATEWAY}/${cid}`, { method: "HEAD" });
      return response.status >= 200 && response.status < 300;
    } catch {
      return false;
    }
  }

  /**
   * Local fallback for when Filecoin is unavailable.
   * Files are saved with the CID as the filename so getFileUrl() can find them.
   */
  private static async _localFallback(
    buffer: Buffer,
    filename: string
  ): Promise<FilecoinUploadResult> {
    const crypto = await import("crypto");
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");
    const ext = path.extname(filename) || ".md";
    const cid = `local_${hash.substring(0, 48)}`;

    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const savedName = `${cid}${ext}`;
    const filePath = path.join(uploadsDir, savedName);
    fs.writeFileSync(filePath, buffer);

    console.log(`[Filecoin] ✓ Saved locally: ${filePath}`);

    return {
      cid,
      pieceCid: "",
      filecoinDatasetId: 0,
      size: buffer.length,
      uploadedAt: new Date(),
      gatewayUrl: `http://localhost:${process.env.PORT || 3001}/uploads/${savedName}`,
      storageType: "local",
    };
  }
}

export default FilecoinStorageService;
