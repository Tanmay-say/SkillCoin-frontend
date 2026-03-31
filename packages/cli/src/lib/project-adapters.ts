import * as path from "path";
import type { ClarificationAnswer, ProjectSpec, TargetIde } from "./project";
import type { ProjectBundleMode, SelectedProjectSkill } from "./project-selection";

export interface IdeBundleFile {
  relativePath: string;
  content: string;
}

export interface IdeBundle {
  ide: TargetIde;
  files: IdeBundleFile[];
  headlinePath: string;
}

export function buildIdeBundle(args: {
  spec: ProjectSpec;
  mode: ProjectBundleMode;
  selectedSkills: SelectedProjectSkill[];
  projectRule: string;
  planPrompt: string;
  implementationPrompt: string;
  reviewPrompt: string;
}): IdeBundle {
  if (args.spec.targetIde === "claude-code") {
    return buildClaudeCodeBundle(args);
  }
  return buildCursorBundle(args);
}

export function buildDecisionRecords(answers: ClarificationAnswer[]) {
  return answers.map((item) => ({
    id: item.id,
    question: item.question,
    answer: item.answer,
    source: item.usedDefault ? "default" : "user",
  }));
}

export function buildProjectSkillsManifest(
  spec: ProjectSpec,
  mode: ProjectBundleMode,
  selectedSkills: SelectedProjectSkill[]
) {
  return {
    generatedForIde: spec.targetIde,
    bundleMode: mode,
    projectName: spec.name,
    selectedSkills,
    notes: [
      "This manifest is the projection layer for project-specific skills.",
      "Replace generated placeholders with marketplace skills as IDE adapters mature.",
    ],
  };
}

export function listBundlePaths(outputDir: string, bundle: IdeBundle): string[] {
  return bundle.files.map((file) => path.join(outputDir, file.relativePath));
}

function buildCursorBundle(args: {
  spec: ProjectSpec;
  mode: ProjectBundleMode;
  selectedSkills: SelectedProjectSkill[];
  projectRule: string;
  planPrompt: string;
  implementationPrompt: string;
  reviewPrompt: string;
}): IdeBundle {
  const backendRule = renderScopedRule(args.spec, "Backend");
  const frontendRule = renderScopedRule(args.spec, "Frontend");
  return {
    ide: "cursor",
    headlinePath: ".cursor/rules/project.mdc",
    files: [
      { relativePath: ".cursor/rules/project.mdc", content: renderCursorFrontmatter(args.projectRule) },
      ...(args.mode === "lean"
        ? []
        : [
            { relativePath: ".cursor/rules/backend.mdc", content: renderCursorFrontmatter(backendRule) },
            { relativePath: ".cursor/rules/frontend.mdc", content: renderCursorFrontmatter(frontendRule) },
          ]),
      { relativePath: ".cursor/prompts/plan.md", content: args.planPrompt },
      { relativePath: ".cursor/prompts/implement.md", content: args.implementationPrompt },
      ...(args.mode === "lean"
        ? []
        : [{ relativePath: ".cursor/prompts/review.md", content: args.reviewPrompt }]),
    ],
  };
}

function buildClaudeCodeBundle(args: {
  spec: ProjectSpec;
  mode: ProjectBundleMode;
  selectedSkills: SelectedProjectSkill[];
  projectRule: string;
  planPrompt: string;
  implementationPrompt: string;
  reviewPrompt: string;
}): IdeBundle {
  return {
    ide: "claude-code",
    headlinePath: "CLAUDE.md",
    files: [
      { relativePath: "CLAUDE.md", content: renderClaudeRootFile(args.spec) },
      { relativePath: "CLAUDE.local.md", content: renderClaudeLocalFile() },
      { relativePath: ".claude/settings.json", content: JSON.stringify(renderClaudeSettings(args.spec), null, 2) },
      { relativePath: ".claude/settings.local.json", content: JSON.stringify(renderClaudeLocalSettings(), null, 2) },
      { relativePath: ".claude/commands/plan.md", content: args.planPrompt },
      { relativePath: ".claude/commands/implement.md", content: args.implementationPrompt },
      ...(args.mode === "lean" ? [] : [{ relativePath: ".claude/commands/review.md", content: args.reviewPrompt }]),
      { relativePath: ".claude/rules/project.md", content: args.projectRule },
      ...(args.mode === "lean"
        ? []
        : [
            { relativePath: ".claude/rules/testing.md", content: renderTestingRule(args.spec) },
            { relativePath: ".claude/rules/architecture.md", content: renderArchitectureRule(args.spec) },
            { relativePath: ".claude/agents/architect.md", content: renderAgentPersona("architect", args.spec) },
            { relativePath: ".claude/agents/frontend.md", content: renderAgentPersona("frontend", args.spec) },
            { relativePath: ".claude/agents/backend.md", content: renderAgentPersona("backend", args.spec) },
          ]),
      { relativePath: ".claude/skills/skillcoin-project-context/SKILL.md", content: renderSelectedSkill(args.spec) },
      ...args.selectedSkills
        .filter((skill) => skill.name !== `${args.spec.name}-project-context`)
        .slice(0, args.mode === "full" ? 6 : 2)
        .map((skill) => ({
          relativePath: `.claude/skills/${skill.name}/SKILL.md`,
          content: renderMarketplaceSkillProjection(skill),
        })),
    ],
  };
}

function renderCursorFrontmatter(content: string): string {
  return [
    "---",
    "description: Skillcoin-generated project rules",
    "globs: ['**/*']",
    "alwaysApply: true",
    "---",
    "",
    content.trim(),
  ].join("\n");
}

function renderScopedRule(spec: ProjectSpec, scope: "Backend" | "Frontend"): string {
  const items = scope === "Backend" ? spec.architecture.backend : spec.architecture.frontend;
  const fallback =
    scope === "Backend"
      ? ["Preserve API boundaries and data contracts."]
      : ["Preserve the UI architecture and component boundaries."];

  return [
    `# ${scope} Rules`,
    "",
    ...normalizeStringArray(items, fallback).map((item) => `- ${item}`),
    "",
    "## Constraints",
    ...spec.constraints.map((item) => `- ${item}`),
  ].join("\n");
}

function renderClaudeRootFile(spec: ProjectSpec): string {
  return [
    `# ${spec.name}`,
    "",
    "This repository uses a Skillcoin-generated Claude Code project context bundle.",
    "",
    "Read these files before implementing:",
    "- `.skillcoin/project-spec.json`",
    "- `.skillcoin/context.md`",
    "- `.claude/rules/project.md`",
    "- `.claude/commands/plan.md`",
    "",
    "Project summary:",
    spec.summary,
  ].join("\n");
}

function renderClaudeLocalFile(): string {
  return [
    "# Local Overrides",
    "",
    "Use this file for developer-specific overrides that should not replace the shared project bundle.",
  ].join("\n");
}

function renderClaudeSettings(spec: ProjectSpec) {
  return {
    project: spec.name,
    targetIde: spec.targetIde,
    contextFiles: [".skillcoin/project-spec.json", ".skillcoin/context.md", ".claude/rules/project.md"],
    commandFiles: [".claude/commands/plan.md", ".claude/commands/implement.md", ".claude/commands/review.md"],
  };
}

function renderClaudeLocalSettings() {
  return {
    personalOverrides: [],
    notes: "Add machine-local or developer-local Claude Code settings here.",
  };
}

function renderTestingRule(spec: ProjectSpec): string {
  return [
    "# Testing Rules",
    "",
    "Always verify behavior against the acceptance criteria before marking a task complete.",
    "",
    "## Acceptance Criteria",
    ...spec.acceptanceCriteria.map((item) => `- ${item}`),
  ].join("\n");
}

function renderArchitectureRule(spec: ProjectSpec): string {
  return [
    "# Architecture Rules",
    "",
    "Respect the project architecture and avoid introducing new layers without updating the project spec.",
    "",
    "## Frontend",
    ...normalizeStringArray(spec.architecture.frontend, ["Keep frontend responsibilities isolated."]).map((item) => `- ${item}`),
    "",
    "## Backend",
    ...normalizeStringArray(spec.architecture.backend, ["Keep backend responsibilities isolated."]).map((item) => `- ${item}`),
    "",
    "## Data",
    ...normalizeStringArray(spec.architecture.data, ["Preserve schema boundaries and persistence choices."]).map((item) => `- ${item}`),
  ].join("\n");
}

function renderAgentPersona(role: "architect" | "frontend" | "backend", spec: ProjectSpec): string {
  return [
    `# ${role[0].toUpperCase()}${role.slice(1)} Agent`,
    "",
    `Project: ${spec.name}`,
    `Focus: ${role}`,
    "",
    "Always work from `.skillcoin/project-spec.json` and `.skillcoin/context.md`.",
  ].join("\n");
}

function renderSelectedSkill(spec: ProjectSpec): string {
  return [
    "---",
    `name: ${spec.name}-project-context`,
    "version: 1.0.0",
    `description: Project-specific context skill for ${spec.summary}`,
    "tags:",
    "  - skillcoin",
    "  - project-context",
    `  - ${spec.targetIde}`,
    "---",
    "",
    "# Overview",
    "",
    "Use the generated project bundle instead of repeatedly asking for the full PRD.",
  ].join("\n");
}

function renderMarketplaceSkillProjection(skill: SelectedProjectSkill): string {
  return [
    "---",
    `name: ${skill.name}`,
    "version: 1.0.0",
    `description: Project-selected skill projection for ${skill.name}`,
    "tags:",
    ...(skill.tags || ["skillcoin", "project-selected"]).map((tag) => `  - ${tag}`),
    "---",
    "",
    "# Overview",
    "",
    skill.reason,
  ].join("\n");
}

function normalizeStringArray(value: string[] | undefined, fallback: string[]): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    return fallback;
  }
  return value.map((item) => String(item).trim()).filter(Boolean);
}
