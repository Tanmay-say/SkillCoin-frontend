import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { createAiChat } from "./ai-provider";
import { readConfig } from "./config";
import {
  buildDecisionRecords,
  buildIdeBundle,
  buildProjectSkillsManifest,
} from "./project-adapters";
import {
  maxSkillsForMode,
  selectProjectSkills,
  type ProjectBundleMode,
} from "./project-selection";

export type TargetIde = "cursor" | "claude-code";

export interface ClarificationQuestion {
  id: string;
  question: string;
  why: string;
  defaultAnswer: string;
}

export interface ClarificationAnswer {
  id: string;
  question: string;
  answer: string;
  usedDefault: boolean;
}

export interface ProjectSpec {
  name: string;
  summary: string;
  productGoal: string;
  targetIde: TargetIde;
  audience: string;
  primaryStack: string[];
  deliverables: string[];
  features: string[];
  architecture: {
    frontend: string[];
    backend: string[];
    data: string[];
    integrations: string[];
  };
  constraints: string[];
  acceptanceCriteria: string[];
  assumptions: string[];
  openQuestions: string[];
}

export interface BundleManifest {
  version: string;
  ide: TargetIde;
  mode: ProjectBundleMode;
  generatedAt: string;
  outputDir: string;
  source: {
    briefFile?: string;
    briefInline?: boolean;
  };
  files: string[];
}

interface JsonEnvelope<T> {
  data: T;
}

const SUPPORTED_IDES: TargetIde[] = ["cursor", "claude-code"];

const PROJECT_SPEC_SCHEMA_NOTE = `Return strict JSON only.
{
  "data": {
    "name": "kebab-case-project-name",
    "summary": "short summary",
    "productGoal": "primary goal",
    "targetIde": "cursor or claude-code",
    "audience": "who this is for",
    "primaryStack": ["item"],
    "deliverables": ["item"],
    "features": ["item"],
    "architecture": {
      "frontend": ["item"],
      "backend": ["item"],
      "data": ["item"],
      "integrations": ["item"]
    },
    "constraints": ["item"],
    "acceptanceCriteria": ["item"],
    "assumptions": ["item"],
    "openQuestions": ["item"]
  }
}`;

const QUESTIONS_SCHEMA_NOTE = `Return strict JSON only.
{
  "data": [
    {
      "id": "short-kebab-id",
      "question": "clarifying question",
      "why": "why the answer matters",
      "defaultAnswer": "safe default"
    }
  ]
}`;

export function getSupportedIdes(): TargetIde[] {
  return [...SUPPORTED_IDES];
}

export function isTargetIde(value: string): value is TargetIde {
  return SUPPORTED_IDES.includes(value as TargetIde);
}

export function isProjectBundleMode(value: string): value is ProjectBundleMode {
  return value === "lean" || value === "standard" || value === "full";
}

export async function loadBrief(briefFile?: string, inlinePrompt?: string): Promise<{
  brief: string;
  sourceFile?: string;
}> {
  if (briefFile) {
    const resolved = path.resolve(briefFile);
    return { brief: fs.readFileSync(resolved, "utf8"), sourceFile: resolved };
  }

  if (inlinePrompt?.trim()) {
    return { brief: inlinePrompt.trim() };
  }

  throw new Error("Provide either a brief file or an inline prompt.");
}

export async function generateClarificationQuestions(
  brief: string,
  targetIde: TargetIde
): Promise<ClarificationQuestion[]> {
  try {
    const ai = await createAiChat();
    const prompt = [
      "You are preparing a project implementation bundle for an AI coding IDE.",
      `Target IDE: ${targetIde}`,
      "Read the brief and identify up to 5 high-impact missing decisions.",
      "Only ask questions that materially affect architecture, stack, scope, auth, data model, payments, deployment, or integrations.",
      "If the brief is already complete, return an empty array.",
      QUESTIONS_SCHEMA_NOTE,
      "",
      "Brief:",
      brief,
    ].join("\n");

    const response = await ai.send([{ role: "user", content: prompt }]);
    const parsed = parseJsonEnvelope<ClarificationQuestion[]>(response.content);
    if (!parsed || !Array.isArray(parsed.data)) {
      return fallbackQuestionsFromBrief(brief);
    }

    return parsed.data
      .filter((item) => item && item.id && item.question)
      .slice(0, 5)
      .map((item) => ({
        id: sanitizeId(item.id),
        question: item.question.trim(),
        why: (item.why || "Needed to lock the implementation.").trim(),
        defaultAnswer: (item.defaultAnswer || "Use a pragmatic default.").trim(),
      }));
  } catch {
    return fallbackQuestionsFromBrief(brief);
  }
}

export async function askClarificationQuestions(
  questions: ClarificationQuestion[],
  maxRounds: number
): Promise<ClarificationAnswer[]> {
  if (questions.length === 0 || maxRounds <= 0) {
    return [];
  }

  const limited = questions.slice(0, Math.max(1, maxRounds * 3));

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return limited.map((question) => ({
      id: question.id,
      question: question.question,
      answer: question.defaultAnswer,
      usedDefault: true,
    }));
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answers: ClarificationAnswer[] = [];

  try {
    for (const question of limited) {
      const answer = await askLine(
        rl,
        `${question.question}\n  default: ${question.defaultAnswer}\n  answer: `
      );
      const trimmed = answer.trim();
      answers.push({
        id: question.id,
        question: question.question,
        answer: trimmed || question.defaultAnswer,
        usedDefault: trimmed.length === 0,
      });
    }
  } finally {
    rl.close();
  }

  return answers;
}

export async function generateProjectSpec(
  brief: string,
  answers: ClarificationAnswer[],
  targetIde: TargetIde
): Promise<ProjectSpec> {
  try {
    const ai = await createAiChat();
    const prompt = [
      "Turn this project brief into a decision-complete implementation spec for an AI coding bundle.",
      `Target IDE: ${targetIde}`,
      "Use the clarification answers to resolve ambiguity. Apply pragmatic defaults where needed, and record those defaults in assumptions.",
      "The spec should optimize for low-token IDE execution context.",
      PROJECT_SPEC_SCHEMA_NOTE,
      "",
      "Brief:",
      brief,
      "",
      "Clarification answers:",
      JSON.stringify(answers, null, 2),
    ].join("\n");

    const response = await ai.send([{ role: "user", content: prompt }]);
    const parsed = parseJsonEnvelope<ProjectSpec>(response.content);
    if (!parsed?.data) {
      return buildFallbackSpec(brief, answers, targetIde);
    }

    return normalizeSpec(parsed.data, brief, answers, targetIde);
  } catch {
    return buildFallbackSpec(brief, answers, targetIde);
  }
}

export async function generateProjectPlanMarkdown(spec: ProjectSpec): Promise<string> {
  try {
    const ai = await createAiChat();
    const prompt = [
      "Write a concise but implementation-ready project plan in markdown.",
      "Keep sections short and high signal.",
      "Include Summary, Key Changes, Test Plan, and Assumptions.",
      "Do not wrap the result in code fences.",
      "",
      JSON.stringify(spec, null, 2),
    ].join("\n");

    const response = await ai.send([{ role: "user", content: prompt }]);
    return sanitizeMarkdown(response.content) || renderFallbackPlan(spec);
  } catch {
    return renderFallbackPlan(spec);
  }
}

export async function generateContextMarkdown(spec: ProjectSpec): Promise<string> {
  try {
    const ai = await createAiChat();
    const prompt = [
      "Write a compact project context file for an AI coding IDE.",
      "Optimize for minimal tokens and high recall.",
      "Include goal, stack, architecture, constraints, acceptance criteria, and next steps.",
      "Do not wrap the result in code fences.",
      "",
      JSON.stringify(spec, null, 2),
    ].join("\n");

    const response = await ai.send([{ role: "user", content: prompt }]);
    return sanitizeMarkdown(response.content) || renderFallbackContext(spec);
  } catch {
    return renderFallbackContext(spec);
  }
}

export async function generateProjectRule(spec: ProjectSpec): Promise<string> {
  try {
    const ai = await createAiChat();
    const prompt = [
      "Write a durable project rules document in markdown for this project.",
      "Make it durable, repo-specific, and implementation-oriented.",
      "Include coding standards, architecture boundaries, and execution rules.",
      "Do not wrap the result in code fences.",
      "",
      JSON.stringify(spec, null, 2),
    ].join("\n");

    const response = await ai.send([{ role: "user", content: prompt }]);
    return sanitizeMarkdown(response.content) || renderFallbackRule(spec);
  } catch {
    return renderFallbackRule(spec);
  }
}

export function buildPlanPrompt(spec: ProjectSpec): string {
  return [
    "# Skillcoin Planning Prompt",
    "",
    "Use `.skillcoin/project-spec.json` as the source of truth.",
    "Before writing code:",
    "1. Read `.skillcoin/context.md`.",
    "2. Confirm the requested task against the acceptance criteria.",
    "3. Create or update a short implementation plan.",
    "4. Keep changes aligned with the architecture and constraints below.",
    "",
    "## Project Summary",
    spec.summary,
    "",
    "## Core Deliverables",
    ...spec.deliverables.map((item) => `- ${item}`),
    "",
    "## Constraints",
    ...spec.constraints.map((item) => `- ${item}`),
  ].join("\n");
}

export function buildImplementationPrompt(spec: ProjectSpec): string {
  return [
    "# Skillcoin Implementation Prompt",
    "",
    "Implement the next scoped task using the project spec and context files.",
    "Prefer small, verifiable edits and preserve the project constraints.",
    "",
    "## Features",
    ...spec.features.map((item) => `- ${item}`),
    "",
    "## Acceptance Criteria",
    ...spec.acceptanceCriteria.map((item) => `- ${item}`),
    "",
    "## Assumptions",
    ...spec.assumptions.map((item) => `- ${item}`),
  ].join("\n");
}

export function buildReviewPrompt(spec: ProjectSpec): string {
  return [
    "# Skillcoin Review Prompt",
    "",
    "Review the implementation against the canonical project bundle.",
    "Focus on regressions, architecture drift, missing tests, and acceptance-criteria gaps.",
    "",
    "## Acceptance Criteria",
    ...spec.acceptanceCriteria.map((item) => `- ${item}`),
    "",
    "## Constraints",
    ...spec.constraints.map((item) => `- ${item}`),
  ].join("\n");
}

export async function writeProjectBundle(args: {
  outputDir: string;
  briefFile?: string;
  usedInlineBrief: boolean;
  spec: ProjectSpec;
  mode: ProjectBundleMode;
  planMarkdown: string;
  contextMarkdown: string;
  answers: ClarificationAnswer[];
  projectRule: string;
  planPrompt: string;
  implementationPrompt: string;
  reviewPrompt: string;
}): Promise<BundleManifest> {
  const outputDir = path.resolve(args.outputDir);
  const skillcoinDir = path.join(outputDir, ".skillcoin");

  ensureDir(skillcoinDir);
  const decisions = buildDecisionRecords(args.answers);
  const selectedSkills = await selectProjectSkills(args.spec, args.mode);
  const skillsManifest = buildProjectSkillsManifest(args.spec, args.mode, selectedSkills);

  const files = [
    writeJson(path.join(skillcoinDir, "project-spec.json"), args.spec),
    writeMarkdown(path.join(skillcoinDir, "project-plan.md"), args.planMarkdown),
    writeMarkdown(path.join(skillcoinDir, "context.md"), args.contextMarkdown),
    writeJson(path.join(skillcoinDir, "answers.json"), args.answers),
    writeJson(path.join(skillcoinDir, "decisions.json"), decisions),
    writeJson(path.join(skillcoinDir, "skills-manifest.json"), skillsManifest),
  ];

  const ideBundle = buildIdeBundle({
    spec: args.spec,
    mode: args.mode,
    selectedSkills,
    projectRule: args.projectRule,
    planPrompt: args.planPrompt,
    implementationPrompt: args.implementationPrompt,
    reviewPrompt: args.reviewPrompt,
  });

  for (const ideFile of ideBundle.files) {
    files.push(writeMarkdown(path.join(outputDir, ideFile.relativePath), ideFile.content));
  }

  const manifest: BundleManifest = {
    version: "2.0.0",
    ide: args.spec.targetIde,
    mode: args.mode,
    generatedAt: new Date().toISOString(),
    outputDir,
    source: {
      briefFile: args.briefFile,
      briefInline: args.usedInlineBrief,
    },
    files: [
      ...files.map((file) => path.relative(outputDir, file).replace(/\\/g, "/")),
      ".skillcoin/bundle-manifest.json",
    ],
  };

  writeJson(path.join(skillcoinDir, "bundle-manifest.json"), manifest);
  return manifest;
}

export function getBundleStatus(outputDir: string) {
  const root = path.resolve(outputDir);
  const specPath = path.join(root, ".skillcoin", "project-spec.json");
  const manifestPath = path.join(root, ".skillcoin", "bundle-manifest.json");

  const spec = readJson<ProjectSpec>(specPath);
  const manifest = readJson<BundleManifest>(manifestPath);

  return {
    root,
    specPath,
    manifestPath,
    spec,
    manifest,
    exists: !!spec && !!manifest,
  };
}

export async function refineProjectBundle(specPath: string): Promise<{
  spec: ProjectSpec;
  planMarkdown: string;
  contextMarkdown: string;
  projectRule: string;
  planPrompt: string;
  implementationPrompt: string;
  reviewPrompt: string;
}> {
  const existing = readJson<ProjectSpec>(path.resolve(specPath));
  if (!existing) {
    throw new Error(`Spec file not found or invalid: ${specPath}`);
  }

  const targetIde = isTargetIde(existing.targetIde) ? existing.targetIde : "cursor";
  const spec = normalizeSpec(existing, existing.summary, [], targetIde);
  const planMarkdown = await generateProjectPlanMarkdown(spec);
  const contextMarkdown = await generateContextMarkdown(spec);
  const projectRule = await generateProjectRule(spec);
  return {
    spec,
    planMarkdown,
    contextMarkdown,
    projectRule,
    planPrompt: buildPlanPrompt(spec),
    implementationPrompt: buildImplementationPrompt(spec),
    reviewPrompt: buildReviewPrompt(spec),
  };
}

export function exportSkillFromBundle(outputDir: string): string {
  const status = getBundleStatus(outputDir);
  if (!status.exists || !status.spec || !status.manifest) {
    throw new Error("No generated project bundle found in this directory.");
  }

  const exportDir = path.join(status.root, ".skillcoin", "exported-skill");
  ensureDir(exportDir);

  const skillMd = renderExportedSkill(status.spec);
  const manifest = {
    name: `${status.spec.name}-project-bundle`,
    version: "1.0.0",
    description: status.spec.summary,
    entry: "SKILL.md",
    author: "Skillcoin CLI",
    license: "per-user",
    price: {
      amount: 0,
      currency: "FREE",
    },
    category: "coding",
    tags: ["skillcoin", status.spec.targetIde, "project-planning", "bundle"],
    encrypted: false,
    agentCompatibility: [status.spec.targetIde],
    skillcoinVersion: "1",
  };

  writeMarkdown(path.join(exportDir, "SKILL.md"), skillMd);
  writeJson(path.join(exportDir, "manifest.json"), manifest);
  return exportDir;
}

export function getProjectDefaults() {
  const config = readConfig();
  const defaultIde = isTargetIde(config.defaultIde) ? config.defaultIde : "cursor";
  const outputMode = isProjectBundleMode(config.projectOutputMode)
    ? config.projectOutputMode
    : "standard";
  return {
    ide: defaultIde,
    clarificationRounds: Math.max(1, Number(config.clarificationRounds || 2)),
    outputMode,
  };
}

function fallbackQuestionsFromBrief(brief: string): ClarificationQuestion[] {
  const lower = brief.toLowerCase();
  const questions: ClarificationQuestion[] = [];

  if (!/react|next|vue|svelte|frontend/.test(lower)) {
    questions.push({
      id: "frontend-stack",
      question: "Which frontend stack should this project use?",
      why: "The UI stack changes architecture, build tooling, and file layout.",
      defaultAnswer: "Use Next.js with TypeScript.",
    });
  }
  if (!/node|api|backend|server|express|hono|nestjs/.test(lower)) {
    questions.push({
      id: "backend-stack",
      question: "Does the project need a backend service or API layer?",
      why: "This determines runtime boundaries and deployment shape.",
      defaultAnswer: "Use a lightweight API layer only if needed.",
    });
  }
  if (!/postgres|mysql|sqlite|database|prisma|supabase/.test(lower)) {
    questions.push({
      id: "data-layer",
      question: "What persistence layer should the project use?",
      why: "Data model choices affect schema, auth, and deployment.",
      defaultAnswer: "Use PostgreSQL with Prisma if persistent data is needed.",
    });
  }
  if (!/auth|login|wallet|signin/.test(lower)) {
    questions.push({
      id: "auth-model",
      question: "Does the product need authentication or wallet sign-in?",
      why: "Auth changes route protection, data ownership, and UX.",
      defaultAnswer: "No auth unless the brief clearly needs user-specific data.",
    });
  }

  return questions.slice(0, 5);
}

function buildFallbackSpec(
  brief: string,
  answers: ClarificationAnswer[],
  targetIde: TargetIde
): ProjectSpec {
  const name = toKebabCase(extractProjectName(brief) || "skillcoin-project");
  const stackHints = collectStackHints(brief, answers);
  return normalizeSpec(
    {
      name,
      summary: firstSentence(brief),
      productGoal: firstSentence(brief),
      targetIde,
      audience: "Developers using AI coding IDEs",
      primaryStack: stackHints,
      deliverables: [
        "A working implementation plan",
        "An IDE-native project context bundle",
        "Clear acceptance criteria for the first build pass",
      ],
      features: extractListishItems(brief, 6),
      architecture: {
        frontend: stackHints.filter((item) => /react|next|frontend|tailwind/i.test(item)),
        backend: stackHints.filter((item) => /api|node|backend|server|hono|express/i.test(item)),
        data: stackHints.filter((item) => /postgres|mysql|sqlite|prisma|database/i.test(item)),
        integrations: extractIntegrationHints(brief),
      },
      constraints: [
        "Optimize generated context for low token usage.",
        "Preserve a decision-complete implementation spec.",
        "Write bundle files into the current project.",
      ],
      acceptanceCriteria: [
        "The generated bundle defines architecture, constraints, and next steps.",
        "A coding agent can start implementation from the bundle without re-asking core questions.",
        "Artifacts remain concise and reusable.",
      ],
      assumptions: answers.map((item) =>
        `${item.question} -> ${item.answer}${item.usedDefault ? " (default)" : ""}`
      ),
      openQuestions: [],
    },
    brief,
    answers,
    targetIde
  );
}

function normalizeSpec(
  spec: Partial<ProjectSpec>,
  brief: string,
  answers: ClarificationAnswer[],
  targetIde: TargetIde
): ProjectSpec {
  const name = toKebabCase(spec.name || extractProjectName(brief) || "skillcoin-project");
  const fallback = buildFallbackSpecBase(brief, answers, targetIde, name);
  return {
    name,
    summary: spec.summary?.trim() || fallback.summary,
    productGoal: spec.productGoal?.trim() || fallback.productGoal,
    targetIde,
    audience: spec.audience?.trim() || fallback.audience,
    primaryStack: normalizeStringArray(spec.primaryStack, fallback.primaryStack),
    deliverables: normalizeStringArray(spec.deliverables, fallback.deliverables),
    features: normalizeStringArray(spec.features, fallback.features),
    architecture: {
      frontend: normalizeStringArray(spec.architecture?.frontend, fallback.architecture.frontend),
      backend: normalizeStringArray(spec.architecture?.backend, fallback.architecture.backend),
      data: normalizeStringArray(spec.architecture?.data, fallback.architecture.data),
      integrations: normalizeStringArray(
        spec.architecture?.integrations,
        fallback.architecture.integrations
      ),
    },
    constraints: normalizeStringArray(spec.constraints, fallback.constraints),
    acceptanceCriteria: normalizeStringArray(
      spec.acceptanceCriteria,
      fallback.acceptanceCriteria
    ),
    assumptions: normalizeStringArray(spec.assumptions, fallback.assumptions),
    openQuestions: normalizeStringArray(spec.openQuestions, []),
  };
}

function buildFallbackSpecBase(
  brief: string,
  answers: ClarificationAnswer[],
  targetIde: TargetIde,
  name: string
): ProjectSpec {
  const stackHints = collectStackHints(brief, answers);
  return {
    name,
    summary: firstSentence(brief),
    productGoal: firstSentence(brief),
    targetIde,
    audience: "Developers using AI coding IDEs",
    primaryStack: stackHints,
    deliverables: [
      "Decision-complete project spec",
      "IDE-native project context bundle",
      "Implementation-ready plan and prompts",
    ],
    features: extractListishItems(brief, 6),
    architecture: {
      frontend: stackHints.filter((item) => /react|next|frontend|tailwind/i.test(item)),
      backend: stackHints.filter((item) => /api|node|backend|server|hono|express/i.test(item)),
      data: stackHints.filter((item) => /postgres|mysql|sqlite|prisma|database/i.test(item)),
      integrations: extractIntegrationHints(brief),
    },
    constraints: [
      "Optimize artifacts for low token usage in the target IDE.",
      "Keep planning and implementation guidance concise and reusable.",
      "Write all generated artifacts into the current project tree.",
    ],
    acceptanceCriteria: [
      "The project spec is sufficient for an AI coding agent to start implementation.",
      "The generated prompts and rules align with the architecture and constraints.",
      "The bundle can be regenerated without losing core decisions.",
    ],
    assumptions: answers.map((item) =>
      `${item.question} -> ${item.answer}${item.usedDefault ? " (default)" : ""}`
    ),
    openQuestions: [],
  };
}

function renderFallbackPlan(spec: ProjectSpec): string {
  return [
    "# Project Plan",
    "",
    "## Summary",
    spec.summary,
    "",
    "## Key Changes",
    ...spec.features.map((item) => `- ${item}`),
    "",
    "## Architecture",
    ...[
      ...spec.architecture.frontend.map((item) => `- Frontend: ${item}`),
      ...spec.architecture.backend.map((item) => `- Backend: ${item}`),
      ...spec.architecture.data.map((item) => `- Data: ${item}`),
      ...spec.architecture.integrations.map((item) => `- Integration: ${item}`),
    ],
    "",
    "## Test Plan",
    ...spec.acceptanceCriteria.map((item) => `- ${item}`),
    "",
    "## Assumptions",
    ...spec.assumptions.map((item) => `- ${item}`),
  ].join("\n");
}

function renderFallbackContext(spec: ProjectSpec): string {
  return [
    "# Project Context",
    "",
    `Goal: ${spec.productGoal}`,
    `Audience: ${spec.audience}`,
    `Target IDE: ${spec.targetIde}`,
    "",
    "## Stack",
    ...spec.primaryStack.map((item) => `- ${item}`),
    "",
    "## Features",
    ...spec.features.map((item) => `- ${item}`),
    "",
    "## Constraints",
    ...spec.constraints.map((item) => `- ${item}`),
    "",
    "## Acceptance Criteria",
    ...spec.acceptanceCriteria.map((item) => `- ${item}`),
  ].join("\n");
}

function renderFallbackRule(spec: ProjectSpec): string {
  return [
    "# Project Rules",
    "",
    `Follow the project spec for \`${spec.name}\`.`,
    "",
    "## Constraints",
    ...spec.constraints.map((item) => `- ${item}`),
    "",
    "## Architecture",
    ...[
      ...spec.architecture.frontend.map((item) => `- Frontend: ${item}`),
      ...spec.architecture.backend.map((item) => `- Backend: ${item}`),
      ...spec.architecture.data.map((item) => `- Data: ${item}`),
      ...spec.architecture.integrations.map((item) => `- Integration: ${item}`),
    ],
    "",
    "## Acceptance Criteria",
    ...spec.acceptanceCriteria.map((item) => `- ${item}`),
  ].join("\n");
}

function renderExportedSkill(spec: ProjectSpec): string {
  return [
    "---",
    `name: ${spec.name}-project-bundle`,
    "version: 1.0.0",
    `description: Reusable project planning bundle for ${spec.summary}`,
    "tags:",
    ...["skillcoin", spec.targetIde, "project-planning", "bundle"].map((item) => `  - ${item}`),
    "---",
    "",
    "# Skillcoin Project Bundle",
    "",
    "Use the generated `.skillcoin` files and IDE-native context files as the working context for project implementation.",
    "",
    "## Summary",
    spec.summary,
    "",
    "## Core Features",
    ...spec.features.map((item) => `- ${item}`),
    "",
    "## Constraints",
    ...spec.constraints.map((item) => `- ${item}`),
    "",
    "## Acceptance Criteria",
    ...spec.acceptanceCriteria.map((item) => `- ${item}`),
  ].join("\n");
}

function parseJsonEnvelope<T>(content: string): JsonEnvelope<T> | null {
  const cleaned = stripCodeFence(content).trim();
  const candidates = extractJsonCandidates(cleaned);
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as JsonEnvelope<T>;
    } catch {}
  }
  return null;
}

function extractJsonCandidates(content: string): string[] {
  const candidates = [content];
  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(content.slice(firstBrace, lastBrace + 1));
  }
  return candidates;
}

function stripCodeFence(content: string): string {
  return content.replace(/^```(?:json|markdown)?\s*/i, "").replace(/\s*```$/i, "");
}

function sanitizeMarkdown(content: string): string {
  return stripCodeFence(content).trim();
}

function normalizeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value.map((item) => String(item).trim()).filter(Boolean);
  return items.length > 0 ? items : fallback;
}

function askLine(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

function sanitizeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-");
}

function toKebabCase(value: string): string {
  return sanitizeId(value).replace(/^-+|-+$/g, "") || "skillcoin-project";
}

function firstSentence(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  const match = normalized.match(/.*?[.!?](\s|$)/);
  return (match?.[0] || normalized || "Project bundle generated from brief.").trim();
}

function extractProjectName(text: string): string | null {
  const match = text.match(/(?:called|named)\s+["']?([a-zA-Z0-9 -]{3,})["']?/i);
  return match?.[1]?.trim() || null;
}

function collectStackHints(brief: string, answers: ClarificationAnswer[]): string[] {
  const joined = `${brief}\n${answers.map((item) => item.answer).join("\n")}`.toLowerCase();
  const hints: string[] = [];
  const known = [
    ["next.js", /next/],
    ["React", /react/],
    ["TypeScript", /typescript|ts\b/],
    ["Tailwind CSS", /tailwind/],
    ["Node.js API", /node|backend|api|server/],
    ["Hono", /hono/],
    ["Express", /express/],
    ["PostgreSQL", /postgres/],
    ["Prisma", /prisma/],
    ["SQLite", /sqlite/],
    ["Supabase", /supabase/],
    ["Authentication", /auth|signin|login|wallet/],
  ] as const;

  for (const [label, pattern] of known) {
    if (pattern.test(joined)) {
      hints.push(label);
    }
  }

  return hints.length > 0 ? hints : ["TypeScript", "Cursor", "Repository-scoped context bundle"];
}

function extractIntegrationHints(brief: string): string[] {
  const lower = brief.toLowerCase();
  const integrations: string[] = [];
  if (/stripe/.test(lower)) integrations.push("Stripe");
  if (/supabase/.test(lower)) integrations.push("Supabase");
  if (/openai/.test(lower)) integrations.push("OpenAI");
  if (/gemini/.test(lower)) integrations.push("Gemini");
  if (/filecoin/.test(lower)) integrations.push("Filecoin");
  if (/vercel/.test(lower)) integrations.push("Vercel");
  return integrations;
}

function extractListishItems(text: string, maxItems: number): string[] {
  const heuristic = buildFeatureHeuristics(text);
  if (heuristic.length > 0) {
    return heuristic.slice(0, maxItems);
  }

  const parts = text
    .split(/\n|,|;/)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter((item) => item.length > 12);
  return [...new Set(parts)].slice(0, maxItems);
}

function buildFeatureHeuristics(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  const lower = normalized.toLowerCase();
  const features: string[] = [];

  if (/dashboard/.test(lower) && /skill/.test(lower)) {
    features.push("Dashboard for managing published AI skills and marketplace activity");
  } else if (normalized) {
    features.push(firstSentence(normalized));
  }

  if (/auth|login|signin|wallet/.test(lower)) {
    features.push("Authentication and user session management");
  }
  if (/billing|payment|checkout|subscription/.test(lower)) {
    features.push("Billing and payment workflows");
  }
  if (/analytics|metrics|reporting|insights/.test(lower)) {
    features.push("Analytics and reporting views for marketplace activity");
  }
  if (/admin|moderation/.test(lower)) {
    features.push("Administrative controls and moderation tools");
  }
  if (/api|backend|server/.test(lower)) {
    features.push("Backend APIs for data access and workflow orchestration");
  }

  return [...new Set(features)].filter(Boolean);
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeJson(filePath: string, data: unknown): string {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  return filePath;
}

function writeMarkdown(filePath: string, data: string): string {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${data.trim()}\n`, "utf8");
  return filePath;
}

function readJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}
