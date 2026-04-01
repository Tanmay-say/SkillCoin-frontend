import { Hono } from "hono";
import {
  FilecoinStorageService,
  FilecoinNotConfiguredError,
  FilecoinInputTooSmallError,
} from "../services/filecoin-storage";
import { SynapseService } from "../services/synapse";
import { SkillService } from "../services/skill";
import { RegisterUploadedSkillSchema, UploadMetadataSchema } from "../types";
import { type AuthUser } from "../middleware/auth";

type Variables = { user: AuthUser };
const upload = new Hono<{ Variables: Variables }>();

const MAX_SIZE = 10 * 1024 * 1024;

function buildUploadResponse(args: {
  skill: any;
  cid: string;
  pieceCid?: string | null;
  filecoinDatasetId?: number | null;
  storageType: "filecoin" | "local";
  gatewayUrl?: string;
}) {
  const gateways = args.gatewayUrl
    ? args.storageType === "filecoin"
      ? [
          `https://ipfs.io/ipfs/${args.cid}`,
          `https://w3s.link/ipfs/${args.cid}`,
          `https://cloudflare-ipfs.com/ipfs/${args.cid}`,
        ]
      : [args.gatewayUrl]
    : [];

  const datasetId = args.filecoinDatasetId || null;
  const explorerUrl = datasetId
    ? `https://pdp.vxb.ai/calibration/dataset/${datasetId}`
    : null;

  return {
    skillId: args.skill.id,
    slug: args.skill.slug,
    cid: args.cid,
    pieceCid: args.pieceCid || null,
    filecoinDatasetId: datasetId,
    dealId: args.skill.filecoinDealId,
    status: "uploaded",
    storageType: args.storageType,
    gatewayUrl: args.gatewayUrl || "",
    gateways,
    explorerUrl,
    proofBadge: datasetId
      ? { dataSetId: datasetId, verified: true }
      : null,
    marketplaceUrl: `/skills/${args.skill.slug}`,
    installCmd: `skillcoin install ${args.skill.slug}`,
  };
}

/**
 * POST /api/skills/upload - Upload a skill (.md file)
 *
 * Uploads to Filecoin via Synapse SDK when configured.
 * In localhost dev mode, uploads fall back to local disk storage.
 */
upload.post("/", async (c) => {
  try {
    const formData: any = await c.req.formData();
    const file = formData.get("file") as File | null;
    const metadataStr = formData.get("metadata") as string | null;

    if (!file) {
      return c.json({ success: false, error: "File is required" }, 400);
    }

    if (file.size > MAX_SIZE) {
      return c.json(
        { success: false, error: "File too large. Maximum size is 10MB" },
        400
      );
    }

    const filename = file.name.toLowerCase();
    const isMarkdown = filename.endsWith(".md") || filename.endsWith(".txt");
    const isZip = filename.endsWith(".zip");

    if (!isMarkdown && !isZip) {
      return c.json(
        { success: false, error: "Only .md, .txt, and .zip files are supported" },
        400
      );
    }

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

    const slug = metadata.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");

    if (!slug) {
      return c.json({ success: false, error: "Skill name produces an empty slug" }, 400);
    }

    const existingSkill = await SkillService.getSkillBySlugInternal(slug);
    if (existingSkill) {
      return c.json(
        { success: false, error: `A skill named "${metadata.name}" already exists` },
        409
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await FilecoinStorageService.uploadFile(buffer, file.name);

    const deal =
      uploadResult.storageType === "filecoin"
        ? await SynapseService.lookupDataset(uploadResult.cid)
        : null;

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
        : deal?.dealId || undefined,
      pieceCid: uploadResult.pieceCid || undefined,
      filecoinDatasetId: uploadResult.filecoinDatasetId || undefined,
      creatorAddress,
      priceAmount: metadata.price,
      priceCurrency: metadata.currency,
      storageType: uploadResult.storageType,
    });

    return c.json({
      success: true,
      data: buildUploadResponse({
        skill,
        cid: uploadResult.cid,
        pieceCid: uploadResult.pieceCid || null,
        filecoinDatasetId: uploadResult.filecoinDatasetId || null,
        storageType: uploadResult.storageType,
        gatewayUrl: uploadResult.gatewayUrl,
      }),
    });
  } catch (error: any) {
    console.error("[Upload] Error:", error);

    if (error instanceof FilecoinNotConfiguredError) {
      return c.json(
        {
          success: false,
          error: "Filecoin storage is not configured on this server. Set FILECOIN_PRIVATE_KEY to enable uploads.",
        },
        503
      );
    }
    if (error instanceof FilecoinInputTooSmallError) {
      return c.json({ success: false, error: error.message }, 400);
    }

    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /api/skills/register-upload
 *
 * Register a pre-uploaded Filecoin asset in the marketplace DB.
 * Used by the CLI `filecoin-pin` flow after obtaining a real root CID/piece CID.
 */
upload.post("/register-upload", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = RegisterUploadedSkillSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { success: false, error: "Invalid metadata", details: parsed.error.flatten() },
        400
      );
    }

    const metadata = parsed.data;
    const user = c.get("user");
    let creatorAddress: string;
    if (user?.address) {
      creatorAddress = user.address;
    } else if (process.env.NODE_ENV === "development") {
      creatorAddress = metadata.creatorAddress;
    } else {
      return c.json({ success: false, error: "Authentication required" }, 401);
    }

    const slug = metadata.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");

    if (!slug) {
      return c.json({ success: false, error: "Skill name produces an empty slug" }, 400);
    }

    const existingSkill = await SkillService.getSkillBySlugInternal(slug);
    if (existingSkill) {
      return c.json(
        { success: false, error: `A skill named "${metadata.name}" already exists` },
        409
      );
    }

    const skill = await SkillService.createSkill({
      name: metadata.name,
      slug,
      description: metadata.description,
      version: metadata.version,
      category: metadata.category,
      tags: metadata.tags,
      zipCid: metadata.cid,
      filecoinDealId:
        metadata.filecoinDealId ||
        (metadata.filecoinDatasetId ? `dataset-${metadata.filecoinDatasetId}` : undefined),
      pieceCid: metadata.pieceCid || metadata.cid,
      filecoinDatasetId: metadata.filecoinDatasetId,
      creatorAddress,
      priceAmount: metadata.price,
      priceCurrency: metadata.currency,
      storageType: metadata.storageType,
    });

    return c.json({
      success: true,
      data: buildUploadResponse({
        skill,
        cid: metadata.cid,
        pieceCid: metadata.pieceCid || metadata.cid,
        filecoinDatasetId: metadata.filecoinDatasetId || null,
        storageType: metadata.storageType,
        gatewayUrl: metadata.storageType === "filecoin" ? "" : `/uploads/${metadata.cid}`,
      }),
    });
  } catch (error: any) {
    console.error("[RegisterUpload] Error:", error);
    return c.json(
      { success: false, error: process.env.NODE_ENV === "development" ? error.message : "Internal server error" },
      500
    );
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
