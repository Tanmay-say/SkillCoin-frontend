import { Hono } from "hono";
import { SkillService } from "../services/skill";
import { SkillQuerySchema, SearchQuerySchema } from "../types";

const skills = new Hono();

/**
 * GET /api/skills - List skills with pagination and filters
 */
skills.get("/", async (c) => {
  try {
    const rawQuery = {
      page: c.req.query("page"),
      limit: c.req.query("limit"),
      category: c.req.query("category"),
      tags: c.req.query("tags"),
      sort: c.req.query("sort"),
    };

    const parsed = SkillQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.flatten() }, 400);
    }

    const result = await SkillService.getSkills(parsed.data);
    return c.json({ success: true, data: result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /api/skills/search - Full-text search
 */
skills.get("/search", async (c) => {
  try {
    const rawQuery = {
      q: c.req.query("q"),
      page: c.req.query("page"),
      limit: c.req.query("limit"),
    };

    const parsed = SearchQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.flatten() }, 400);
    }

    const result = await SkillService.searchSkills(
      parsed.data.q,
      parsed.data.page,
      parsed.data.limit
    );
    return c.json({ success: true, data: result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /api/skills/:slug - Get skill detail
 */
skills.get("/:slug", async (c) => {
  try {
    const slug = c.req.param("slug");
    const skill = await SkillService.getSkillBySlug(slug);

    if (!skill) {
      return c.json({ success: false, error: "Skill not found" }, 404);
    }

    return c.json({ success: true, data: skill });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * PUT /api/skills/:id - Update skill metadata (creator only)
 */
skills.put("/:id", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ success: false, error: "Authentication required" }, 401);
    }

    const id = c.req.param("id");
    const body = await c.req.json();

    const updated = await SkillService.updateSkill(id, user.address, body);
    return c.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.message.includes("Unauthorized")) {
      return c.json({ success: false, error: error.message }, 403);
    }
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * DELETE /api/skills/:id - Unpublish skill (creator only)
 */
skills.delete("/:id", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ success: false, error: "Authentication required" }, 401);
    }

    const id = c.req.param("id");
    await SkillService.unpublishSkill(id, user.address);
    return c.json({ success: true, message: "Skill unpublished" });
  } catch (error: any) {
    if (error.message.includes("Unauthorized")) {
      return c.json({ success: false, error: error.message }, 403);
    }
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default skills;
