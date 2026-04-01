import { readConfig } from "./config";
import { listMarketplaceSkills, searchMarketplaceSkills, type SkillMeta } from "./api";
import type { ProjectSpec } from "./project";

export type ProjectBundleMode = "lean" | "standard" | "full";

export interface SelectedProjectSkill {
  name: string;
  reason: string;
  source: "marketplace" | "project-generated";
  category?: string | null;
  tags?: string[];
}

export async function selectProjectSkills(
  spec: ProjectSpec,
  mode: ProjectBundleMode
): Promise<SelectedProjectSkill[]> {
  const fallback = buildFallbackSelections(spec, mode);

  const config = readConfig();
  if (!config.apiBase) {
    return fallback;
  }

  try {
    const queryTerms = buildSearchTerms(spec, mode);
    const results = new Map<string, SkillMeta>();

    for (const term of queryTerms) {
      const { skills } = await searchMarketplaceSkills(term, 1, 8);
      for (const skill of skills) {
        results.set(skill.slug, skill);
      }
    }

    if (results.size === 0 && mode !== "lean") {
      const { skills } = await listMarketplaceSkills(1, 12);
      for (const skill of skills) {
        results.set(skill.slug, skill);
      }
    }

    const ranked = [...results.values()]
      .map((skill) => ({
        skill,
        score: scoreSkillForProject(skill, spec),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSkillsForMode(mode))
      .map(({ skill }) => ({
        name: skill.slug,
        reason: buildMarketplaceReason(skill, spec),
        source: "marketplace" as const,
        category: skill.category,
        tags: skill.tags,
      }));

    const combined: SelectedProjectSkill[] = [...ranked];
    if (!combined.some((item) => item.name === `${spec.name}-project-context`)) {
      combined.push(...fallback.slice(0, 1));
    }

    return combined.length > 0 ? combined : fallback;
  } catch {
    return fallback;
  }
}

export function maxSkillsForMode(mode: ProjectBundleMode): number {
  switch (mode) {
    case "lean":
      return 2;
    case "full":
      return 8;
    default:
      return 4;
  }
}

function buildFallbackSelections(spec: ProjectSpec, mode: ProjectBundleMode): SelectedProjectSkill[] {
  const base: SelectedProjectSkill[] = [
    {
      name: `${spec.name}-project-context`,
      reason: "Generated from the project brief to provide durable context for the target IDE.",
      source: "project-generated",
      category: "coding",
      tags: ["project-context", spec.targetIde],
    },
  ];

  if (mode === "lean") {
    return base;
  }

  const extras = spec.primaryStack.slice(0, maxSkillsForMode(mode) - 1).map((item) => ({
    name: item.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    reason: `Placeholder selection derived from the project stack: ${item}.`,
    source: "project-generated" as const,
    category: "coding",
    tags: [item.toLowerCase()],
  }));

  return [...base, ...extras];
}

function buildSearchTerms(spec: ProjectSpec, mode: ProjectBundleMode): string[] {
  const raw = [
    spec.name,
    ...spec.primaryStack,
    ...spec.features.slice(0, mode === "lean" ? 1 : 3),
    spec.architecture.frontend[0],
    spec.architecture.backend[0],
  ].filter(Boolean);

  return [...new Set(raw.map((item) => String(item).trim()).filter(Boolean))].slice(
    0,
    mode === "lean" ? 2 : mode === "standard" ? 4 : 6
  );
}

function scoreSkillForProject(skill: SkillMeta, spec: ProjectSpec): number {
  const haystack = [
    skill.slug,
    skill.name,
    skill.description,
    skill.category || "",
    ...(skill.tags || []),
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  for (const token of buildSpecTokens(spec)) {
    if (haystack.includes(token)) {
      score += 2;
    }
  }
  if (skill.category && buildSpecTokens(spec).includes(skill.category.toLowerCase())) {
    score += 2;
  }
  return score;
}

function buildSpecTokens(spec: ProjectSpec): string[] {
  return [
    spec.name,
    spec.targetIde,
    ...spec.primaryStack,
    ...spec.features,
    ...spec.architecture.frontend,
    ...spec.architecture.backend,
    ...spec.architecture.data,
    ...spec.architecture.integrations,
  ]
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((item) => item.length > 2);
}

function buildMarketplaceReason(skill: SkillMeta, spec: ProjectSpec): string {
  const matchedTag = (skill.tags || []).find((tag) =>
    buildSpecTokens(spec).includes(tag.toLowerCase())
  );
  if (matchedTag) {
    return `Selected from marketplace because it matches the project context tag "${matchedTag}".`;
  }
  if (skill.category) {
    return `Selected from marketplace because its category "${skill.category}" aligns with the project architecture.`;
  }
  return "Selected from marketplace because it overlaps with the project stack and implementation needs.";
}
