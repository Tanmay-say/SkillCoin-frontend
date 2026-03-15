import { Hono } from "hono";
import { FilecoinStorageService } from "../services/filecoin-storage";
import { SynapseService } from "../services/synapse";
import { SkillService } from "../services/skill";
import { UploadMetadataSchema } from "../types";

const upload = new Hono();

// Max upload size: 10MB (for .md files this is very generous)
const MAX_SIZE = 10 * 1024 * 1024;

/**
 * POST /api/skills/upload - Upload a skill (.md file)
 *
 * Expects multipart/form-data with:
 *  - file: .md file (the skill instructions)
 *  - metadata: JSON string with skill info
 *
 * Simplified flow: accepts a single .md file → uploads to Lighthouse → saves to DB
 */
upload.post("/", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const metadataStr = formData.get("metadata") as string | null;

    if (!file) {
      return c.json({ success: false, error: "File is required" }, 400);
    }

    // Size check
    if (file.size > MAX_SIZE) {
      return c.json(
        { success: false, error: "File too large. Maximum size is 10MB" },
        400
      );
    }

    // Validate file type — accept .md, .txt, and .zip for backwards compat
    const filename = file.name.toLowerCase();
    const isMarkdown = filename.endsWith(".md") || filename.endsWith(".txt");
    const isZip = filename.endsWith(".zip");

    if (!isMarkdown && !isZip) {
      return c.json(
        { success: false, error: "Only .md and .txt files are supported" },
        400
      );
    }

    // Parse metadata
    if (!metadataStr) {
      return c.json({ success: false, error: "Metadata JSON is required" }, 400);
    }

    let metadataRaw: any;
    try {
      metadataRaw = JSON.parse(metadataStr);
    } catch {
      return c.json({ success: false, error: "Invalid metadata JSON" }, 400);
    }

    const parsed = UploadMetadataSchema.safeParse(metadataRaw);
    if (!parsed.success) {
      return c.json(
        { success: false, error: "Invalid metadata", details: parsed.error.flatten() },
        400
      );
    }
    const metadata = parsed.data;

    // Get creator address from auth or metadata (dev mode)
    const user = c.get("user");
    let creatorAddress: string;
    if (user?.address) {
      creatorAddress = user.address;
    } else if (process.env.NODE_ENV === "development") {
      creatorAddress = metadata.creatorAddress;
    } else {
      return c.json({ success: false, error: "Authentication required" }, 401);
    }

    if (!creatorAddress) {
      return c.json({ success: false, error: "Creator address is required" }, 400);
    }

    // Generate slug
    const slug = metadata.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");

    if (!slug) {
      return c.json({ success: false, error: "Skill name produces an empty slug" }, 400);
    }

    // Check uniqueness
    const existingSkill = await SkillService.getSkillBySlugInternal(slug);
    if (existingSkill) {
      return c.json(
        { success: false, error: `A skill named "${metadata.name}" already exists` },
        409
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload the .md file to Filecoin via Synapse SDK
    const uploadResult = await FilecoinStorageService.uploadFile(
      buffer,
      file.name
    );

    // Create Filecoin storage deal record (kept for compatibility, skip if Synapse unavailable)
    const deal = await SynapseService.createStorageDeal(uploadResult.cid);

    // Create skill record in database
    const skill = await SkillService.createSkill({
      name: metadata.name,
      slug,
      description: metadata.description,
      version: metadata.version,
      category: metadata.category,
      tags: metadata.tags,
      zipCid: uploadResult.cid,
      filecoinDealId: uploadResult.filecoinDatasetId
        ? `dataset-${uploadResult.filecoinDatasetId}`
        : deal.dealId,
      pieceCid: uploadResult.pieceCid || undefined,
      filecoinDatasetId: uploadResult.filecoinDatasetId || undefined,
      creatorAddress,
      priceAmount: metadata.price,
      priceCurrency: metadata.currency,
    });

    return c.json({
      success: true,
      data: {
        skillId: skill.id,
        cid: uploadResult.cid,
        pieceCid: uploadResult.pieceCid || null,
        filecoinDatasetId: uploadResult.filecoinDatasetId || null,
        dealId: skill.filecoinDealId,
        status: "uploaded",
        gatewayUrl: uploadResult.gatewayUrl,
        explorerUrl: uploadResult.filecoinDatasetId
          ? `https://pdp.vxb.ai/calibration/dataset/${uploadResult.filecoinDatasetId}`
          : deal.explorerUrl,
        proofBadge: uploadResult.filecoinDatasetId
          ? { dataSetId: uploadResult.filecoinDatasetId, verified: true }
          : null,
        marketplaceUrl: `/skills/${slug}`,
      },
    });
  } catch (error: any) {
    console.error("[Upload] Error:", error);
    const msg = process.env.NODE_ENV === "development" ? error.message : "Upload failed";
    return c.json({ success: false, error: msg }, 500);
  }
});

/**
 * POST /api/skills/:id/publish - Make skill visible on marketplace
 */
upload.post("/:id/publish", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ success: false, error: "Authentication required" }, 401);
    }

    const id = c.req.param("id");
    const skill = await SkillService.publishSkill(id, user.address);

    return c.json({
      success: true,
      data: skill,
      message: `Skill "${skill.name}" published successfully`,
    });
  } catch (error: any) {
    if (error.message.includes("Unauthorized")) {
      return c.json({ success: false, error: error.message }, 403);
    }
    const msg = process.env.NODE_ENV === "development" ? error.message : "Internal server error";
    return c.json({ success: false, error: msg }, 500);
  }
});

export default upload;
