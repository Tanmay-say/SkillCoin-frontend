import { Hono } from "hono";
import { GoogleGenerativeAI } from "@google/generative-ai";

const generate = new Hono();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const SKILL_SYSTEM_PROMPT = `You are an expert at writing Claude/AI skill files (SKILL.md).
A SKILL.md file is a structured markdown file that teaches an AI agent how to perform a specific task.

You MUST output ONLY valid SKILL.md content — no preamble, no explanation, no markdown code fences.
The output starts with the YAML frontmatter block (---) and ends with the last line of markdown.

Required frontmatter fields:
- name: kebab-case identifier
- description: when to trigger this skill (verbose, include synonyms and contexts)
- version: "1.0.0"
- tags: array of relevant keywords

Required body sections:
## Overview
## When to Use This Skill
## Step-by-Step Instructions (numbered, actionable)
## Examples
  - At least one concrete input → output pair
## Common Mistakes to Avoid

Constraints:
- Max 400 lines
- Steps must be specific and actionable
- Examples must show concrete input and output`;

/**
 * POST /api/skills/generate
 * Body: { description: string, category?: string }
 *
 * Generates a SKILL.md using Gemini AI from a plain-English description.
 */
generate.post("/", async (c) => {
  try {
    if (!GEMINI_API_KEY) {
      return c.json({ success: false, error: "GEMINI_API_KEY not configured" }, 500);
    }

    const body = await c.req.json();
    const { description, category } = body;

    if (!description || description.length < 10) {
      return c.json({ success: false, error: "Description must be at least 10 characters" }, 400);
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SKILL_SYSTEM_PROMPT,
    });

    const prompt = `Create a professional SKILL.md for the following:\n\nDescription: ${description}${
      category ? `\nCategory: ${category}` : ""
    }\n\nGenerate the complete SKILL.md now:`;

    const result = await model.generateContent(prompt);
    let skillMd = result.response.text().trim();

    // Strip accidental code fences if Gemini adds them
    skillMd = skillMd.replace(/^```(?:markdown)?\n?/i, "").replace(/\n?```$/i, "").trim();

    // Validate basic structure
    if (!skillMd.startsWith("---") || !skillMd.includes("## ")) {
      // One retry with explicit correction
      const retry = await model.generateContent(
        `${prompt}\n\nIMPORTANT: The response MUST start with --- (YAML frontmatter). Output ONLY the SKILL.md, nothing else.`
      );
      skillMd = retry.response.text().trim()
        .replace(/^```(?:markdown)?\n?/i, "").replace(/\n?```$/i, "").trim();
    }

    // Extract name from frontmatter
    const nameMatch = skillMd.match(/^name:\s*(.+)$/m);
    const name = nameMatch?.[1]?.trim() ?? "generated-skill";

    return c.json({
      success: true,
      data: {
        skillMd,
        name,
        isAiGenerated: true,
        model: "gemini-2.0-flash",
      },
    });
  } catch (error: any) {
    console.error("[Generate] Error:", error);
    return c.json(
      { success: false, error: process.env.NODE_ENV === "development" ? error.message : "Generation failed" },
      500
    );
  }
});

/**
 * POST /api/skills/generate/modify
 * Body: { existingSkillMd: string, instruction: string }
 *
 * Modifies an existing SKILL.md based on a natural language instruction.
 */
generate.post("/modify", async (c) => {
  try {
    if (!GEMINI_API_KEY) {
      return c.json({ success: false, error: "GEMINI_API_KEY not configured" }, 500);
    }

    const { existingSkillMd, instruction } = await c.req.json();

    if (!existingSkillMd || !instruction) {
      return c.json({ success: false, error: "existingSkillMd and instruction are required" }, 400);
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are an expert at editing AI skill files (SKILL.md).
The user will give you an existing SKILL.md and describe a modification.
Output the COMPLETE modified SKILL.md followed by ---CHANGES--- then a brief bullet list of what changed.
Do not output anything else.

Existing SKILL.md:

${existingSkillMd}

---
Modification request: ${instruction}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const [skillMdPart, changesPart] = text.split("---CHANGES---");

    return c.json({
      success: true,
      data: {
        skillMd: skillMdPart?.trim() ?? text,
        changesSummary: changesPart?.trim() ?? "Skill modified as requested.",
      },
    });
  } catch (error: any) {
    console.error("[Modify] Error:", error);
    return c.json(
      { success: false, error: process.env.NODE_ENV === "development" ? error.message : "Modification failed" },
      500
    );
  }
});

export default generate;
