import prisma from "../db/client";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

// HIGH-BUG-02: Strict schema for update operations — only whitelisted fields
const UpdateSkillSchema = z.object({
  description: z.string().min(10).max(1000).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  priceAmount: z.number().min(0).optional(),
  priceCurrency: z.enum(["USDC", "FLOW", "FREE"]).optional(),
}).strict(); // strict() rejects any extra fields

export class SkillService {
  /**
   * Create a new skill record
   */
  static async createSkill(data: {
    name: string;
    slug: string;
    description: string;
    version?: string;
    category?: string;
    tags?: string[];
    zipCid: string;
    manifestCid?: string;
    filecoinDealId?: string;
    pieceCid?: string;
    filecoinDatasetId?: number;
    creatorAddress: string;
    priceAmount?: number;
    priceCurrency?: string;
  }) {
    // Upsert the creator user
    await prisma.user.upsert({
      where: { walletAddress: data.creatorAddress },
      create: {
        walletAddress: data.creatorAddress,
        isCreator: true,
      },
      update: { isCreator: true },
    });

    return prisma.skill.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        version: data.version || "1.0.0",
        category: data.category,
        tags: data.tags || [],
        zipCid: data.zipCid,
        manifestCid: data.manifestCid,
        filecoinDealId: data.filecoinDealId,
        pieceCid: data.pieceCid,
        filecoinDatasetId: data.filecoinDatasetId,
        creatorAddress: data.creatorAddress,
        priceAmount: data.priceAmount ?? 0.5,
        priceCurrency: data.priceCurrency || "USDC",
        published: true,
      },
    });
  }

  /**
   * Get paginated skills with filters
   */
  static async getSkills(options: {
    page?: number;
    limit?: number;
    category?: string;
    tags?: string;
    sort?: string;
  }) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100); // DB-03: Cap limit in service layer
    const skip = (page - 1) * limit;

    const where: Prisma.SkillWhereInput = {
      published: true,
    };

    if (options.category) {
      where.category = options.category;
    }

    if (options.tags) {
      where.tags = { hasSome: options.tags.split(",") };
    }

    let orderBy: Prisma.SkillOrderByWithRelationInput = { createdAt: "desc" };
    switch (options.sort) {
      case "popular":
        orderBy = { downloads: "desc" };
        break;
      case "price_asc":
        orderBy = { priceAmount: "asc" };
        break;
      case "price_desc":
        orderBy = { priceAmount: "desc" };
        break;
    }

    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.skill.count({ where }),
    ]);

    return {
      skills,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single skill by slug — only published skills
   * API-01 FIX: Filter by published:true to prevent leaking unpublished/draft skills
   */
  static async getSkillBySlug(slug: string) {
    return prisma.skill.findFirst({
      where: { slug, published: true },
    });
  }

  /**
   * Internal method: get skill by slug without publish filter
   * Used for uniqueness checks during upload
   */
  static async getSkillBySlugInternal(slug: string) {
    return prisma.skill.findUnique({
      where: { slug },
    });
  }

  /**
   * Full-text search skills
   * DB-03: limit is capped at 100 in the service layer
   */
  static async searchSkills(query: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const cappedLimit = Math.min(limit, 100); // DB-03: cap in service layer
    // MED-BUG-01 FIX: removed unused `searchTerm` variable

    const where: Prisma.SkillWhereInput = {
      published: true,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { tags: { hasSome: [query.toLowerCase()] } },
      ],
    };

    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        orderBy: { downloads: "desc" },
        skip,
        take: cappedLimit,
      }),
      prisma.skill.count({ where }),
    ]);

    return {
      skills,
      pagination: { page, limit: cappedLimit, total, totalPages: Math.ceil(total / cappedLimit) },
    };
  }

  /**
   * Update skill metadata — HIGH-BUG-02 FIX: validates against strict Zod schema
   * Only whitelisted fields accepted: description, category, tags, priceAmount, priceCurrency
   */
  static async updateSkill(
    id: string,
    creatorAddress: string,
    rawData: unknown
  ) {
    // HIGH-BUG-02: Validate with strict schema to prevent field injection
    const parsed = UpdateSkillSchema.safeParse(rawData);
    if (!parsed.success) {
      throw new Error(`Invalid update data: ${parsed.error.flatten().formErrors.join(", ")}`);
    }

    // Verify ownership
    const skill = await prisma.skill.findUnique({ where: { id } });
    if (!skill || skill.creatorAddress !== creatorAddress) {
      throw new Error("Unauthorized: not the creator of this skill");
    }

    return prisma.skill.update({ where: { id }, data: parsed.data });
  }

  /**
   * Publish a skill
   */
  static async publishSkill(id: string, creatorAddress: string) {
    const skill = await prisma.skill.findUnique({ where: { id } });
    if (!skill || skill.creatorAddress !== creatorAddress) {
      throw new Error("Unauthorized: not the creator of this skill");
    }

    return prisma.skill.update({
      where: { id },
      data: { published: true },
    });
  }

  /**
   * Unpublish a skill
   */
  static async unpublishSkill(id: string, creatorAddress: string) {
    const skill = await prisma.skill.findUnique({ where: { id } });
    if (!skill || skill.creatorAddress !== creatorAddress) {
      throw new Error("Unauthorized: not the creator of this skill");
    }

    return prisma.skill.update({
      where: { id },
      data: { published: false },
    });
  }

  /**
   * Increment download count
   */
  static async incrementDownloads(id: string) {
    return prisma.skill.update({
      where: { id },
      data: { downloads: { increment: 1 } },
    });
  }
}

export default SkillService;
