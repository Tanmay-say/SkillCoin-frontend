import fs from "fs";
import path from "path";
import type { UploadResult } from "../types";

const LIGHTHOUSE_API_KEY = process.env.LIGHTHOUSE_API_KEY || "";
const IPFS_GATEWAY = "https://gateway.lighthouse.storage/ipfs";

// The CORRECT upload endpoint per Lighthouse docs:
// https://docs.lighthouse.storage/how-to/upload-data/file
const LIGHTHOUSE_UPLOAD_URL = "https://upload.lighthouse.storage/api/v0/add";

export class LighthouseService {
  /**
   * Upload a file buffer to IPFS via Lighthouse
   * Simple and direct: one endpoint, one try, with local fallback
   */
  static async uploadFile(
    buffer: Buffer,
    filename: string
  ): Promise<UploadResult> {
    if (!LIGHTHOUSE_API_KEY) {
      console.warn("[Lighthouse] No API key — using local storage");
      return this._localFallback(buffer, filename);
    }

    try {
      console.log(`[Lighthouse] Uploading ${filename} (${buffer.length} bytes)...`);
      const result = await this._uploadToLighthouse(buffer, filename);
      console.log(`[Lighthouse] ✅ Uploaded! CID: ${result.cid}`);
      return result;
    } catch (error: any) {
      console.warn(`[Lighthouse] Upload failed: ${error.message}`);
      console.log("[Lighthouse] Falling back to local storage...");
      return this._localFallback(buffer, filename);
    }
  }

  /**
   * Upload to Lighthouse using their REST API
   * Endpoint: https://upload.lighthouse.storage/api/v0/add
   */
  private static async _uploadToLighthouse(
    buffer: Buffer,
    filename: string
  ): Promise<UploadResult> {
    const FormData = (await import("form-data")).default;
    const axios = (await import("axios")).default;

    const form = new FormData();
    form.append("file", buffer, {
      filename,
      contentType: "application/octet-stream",
    });

    const response = await axios.post(LIGHTHOUSE_UPLOAD_URL, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${LIGHTHOUSE_API_KEY}`,
      },
      timeout: 30000, // 30 second timeout
      maxContentLength: 100 * 1024 * 1024,
      maxBodyLength: 100 * 1024 * 1024,
    });

    const data = response.data;

    if (!data?.Hash) {
      throw new Error("No CID returned from Lighthouse");
    }

    const cid = data.Hash;
    return {
      cid,
      size: parseInt(data.Size) || buffer.length,
      uploadedAt: new Date(),
      gatewayUrl: `${IPFS_GATEWAY}/${cid}`,
    };
  }

  /**
   * Local storage fallback when Lighthouse is unreachable.
   * Saves file to disk with a content hash as CID.
   */
  private static async _localFallback(
    buffer: Buffer,
    filename: string
  ): Promise<UploadResult> {
    const crypto = await import("crypto");

    const hash = crypto.createHash("sha256").update(buffer).digest("hex");
    const cid = `local_${hash.substring(0, 48)}`;

    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, `${cid}_${filename}`);
    fs.writeFileSync(filePath, buffer);

    console.log(`[Lighthouse] ✓ Saved locally: ${filePath}`);
    console.log(`[Lighthouse] ⚠ Re-upload to IPFS when connectivity is restored`);

    return {
      cid,
      size: buffer.length,
      uploadedAt: new Date(),
      gatewayUrl: `http://localhost:${process.env.PORT || 3001}/uploads/${cid}_${filename}`,
    };
  }

  /**
   * Upload manifest.json as separate IPFS object
   */
  static async uploadManifest(manifest: object): Promise<{ cid: string }> {
    const buffer = Buffer.from(JSON.stringify(manifest, null, 2));
    const result = await this.uploadFile(buffer, "manifest.json");
    return { cid: result.cid };
  }

  /**
   * Get the IPFS gateway URL for a CID
   */
  static getFileUrl(cid: string): string {
    if (cid.startsWith("local_")) {
      return `http://localhost:${process.env.PORT || 3001}/uploads/${cid}`;
    }
    return `${IPFS_GATEWAY}/${cid}`;
  }

  /**
   * Verify that a CID is accessible
   */
  static async verifyUpload(cid: string): Promise<boolean> {
    if (cid.startsWith("local_")) {
      return true;
    }
    try {
      const url = `${IPFS_GATEWAY}/${cid}`;
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default LighthouseService;
