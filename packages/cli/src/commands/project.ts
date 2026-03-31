import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import * as readline from "readline";
import {
  askClarificationQuestions,
  buildImplementationPrompt,
  buildPlanPrompt,
  buildReviewPrompt,
  exportSkillFromBundle,
  generateClarificationQuestions,
  generateContextMarkdown,
  generateProjectRule,
  generateProjectPlanMarkdown,
  generateProjectSpec,
  getBundleStatus,
  getProjectDefaults,
  getSupportedIdes,
  isProjectBundleMode,
  isTargetIde,
  loadBrief,
  refineProjectBundle,
  writeProjectBundle,
  type ClarificationAnswer,
  type ClarificationQuestion,
  type TargetIde,
} from "../lib/project";
import { showBanner, showBox, showSeparator } from "../ui/banner";
import { icons, t } from "../ui/theme";

export function projectCommand(program: Command) {
  const project = program
    .command("project")
    .description("Create and manage IDE-native project context bundles");

  project
    .command("create [briefFile]")
    .alias("init")
    .description("Generate a project spec, plan, and IDE-native context bundle")
    .option("--prompt <text>", "Inline project brief or PRD summary")
    .option("--ide <ide>", "Target IDE", getProjectDefaults().ide)
    .option("--mode <mode>", "Bundle mode (lean | standard | full)", getProjectDefaults().outputMode)
    .option("--out <dir>", "Output directory", ".")
    .option("--wizard", "Run the interactive project setup wizard")
    .action(async (briefFile: string | undefined, options: any) => {
      const defaults = getProjectDefaults();
      const usedWizard = !!(options.wizard || (!briefFile && !options.prompt));
      const wizardInput =
        usedWizard
          ? await runProjectWizard({
              briefFile,
              prompt: options.prompt,
              ide: options.ide || defaults.ide,
              mode: options.mode || defaults.outputMode,
              out: options.out || ".",
            })
          : {
              briefFile,
              prompt: options.prompt,
              ide: options.ide || defaults.ide,
              mode: options.mode || defaults.outputMode,
              out: options.out || ".",
            };

      if (!wizardInput) {
        console.log();
        console.log(chalk.yellow("  Project setup cancelled"));
        console.log();
        return;
      }

      briefFile = wizardInput.briefFile;
      options.prompt = wizardInput.prompt;

      const rawIde = String(wizardInput.ide || defaults.ide || "cursor");
      if (!isTargetIde(rawIde)) {
        console.log();
        console.log(chalk.red("  Unsupported IDE target"));
        console.log(chalk.dim(`  Supported IDEs: ${getSupportedIdes().join(", ")}`));
        console.log();
        return;
      }
      const ide = rawIde as TargetIde;
      const rawMode = String(wizardInput.mode || defaults.outputMode || "standard");
      if (!isProjectBundleMode(rawMode)) {
        console.log();
        console.log(chalk.red("  Unsupported bundle mode"));
        console.log(chalk.dim("  Supported modes: lean, standard, full"));
        console.log();
        return;
      }
      const mode = rawMode;
      const outputDir = wizardInput.out || ".";

      console.log();
      if (!usedWizard) {
        showBanner("cli");
        console.log(`  ${t.brandBold("Project Init")} ${t.dim("step-by-step project bundle generator")}`);
        showSeparator();
      }
      console.log(chalk.bold.cyan("  Skillcoin Project Creator"));
      console.log(chalk.dim("  ─────────────────────────"));
      console.log();

      try {
        const source = await loadBrief(briefFile, options.prompt);

        console.log(chalk.white(`  Target IDE: ${chalk.cyan(ide)}`));
        console.log(chalk.white(`  Mode:       ${chalk.cyan(mode)}`));
        console.log(chalk.white(`  Output:     ${chalk.cyan(outputDir)}`));
        if (source.sourceFile) {
          console.log(chalk.white(`  Brief:      ${chalk.cyan(source.sourceFile)}`));
        } else {
          console.log(chalk.white("  Brief:      inline prompt"));
        }
        console.log();

        const questionSpinner = ora({
          text: chalk.dim("Analyzing brief and generating clarification questions..."),
          color: "cyan",
        }).start();

        let questions: ClarificationQuestion[] = [];
        try {
          questions = await generateClarificationQuestions(source.brief, ide);
          questionSpinner.succeed(chalk.green(`Prepared ${questions.length} clarification question(s)`));
        } catch (error: any) {
          questionSpinner.warn(chalk.yellow(`Clarification analysis failed: ${error.message}`));
        }

        let answers: ClarificationAnswer[] = [];
        if (questions.length > 0) {
          console.log();
          console.log(chalk.bold.white("  Clarifications"));
          console.log(chalk.dim("  Press Enter to accept the default answer."));
          console.log();
          answers = await askClarificationQuestions(questions, defaults.clarificationRounds);
          console.log();
        }

        const specSpinner = ora({
          text: chalk.dim("Generating project spec and bundle artifacts..."),
          color: "cyan",
        }).start();

        const spec = await generateProjectSpec(source.brief, answers, ide);
        const [planMarkdown, contextMarkdown, projectRule] = await Promise.all([
          generateProjectPlanMarkdown(spec),
          generateContextMarkdown(spec),
          generateProjectRule(spec),
        ]);

        const manifest = await writeProjectBundle({
          outputDir,
          briefFile: source.sourceFile,
          usedInlineBrief: !source.sourceFile,
          spec,
          mode,
          planMarkdown,
          contextMarkdown,
          answers,
          projectRule,
          planPrompt: buildPlanPrompt(spec),
          implementationPrompt: buildImplementationPrompt(spec),
          reviewPrompt: buildReviewPrompt(spec),
        });

        specSpinner.succeed(chalk.green("Project bundle generated"));
        console.log();
        console.log(chalk.bold.green(`  ✓ Created ${chalk.cyan(spec.name)}`));
        console.log(chalk.dim(`    Summary: ${spec.summary}`));
        console.log(chalk.dim(`    Files:   ${manifest.files.length}`));
        console.log(chalk.dim("    Spec:    .skillcoin/project-spec.json"));
        console.log(chalk.dim(`    IDE:     ${ide}`));
        console.log(chalk.dim(`    Mode:    ${mode}`));
        console.log(chalk.dim(`    Entry:   ${ide === "claude-code" ? "CLAUDE.md" : ".cursor/rules/project.mdc"}`));
        console.log();
      } catch (error: any) {
        console.log(chalk.red("  Project generation failed"));
        console.log(chalk.dim(`  Error: ${error.message}`));
        console.log();
      }
    });

  project
    .command("refine [specFile]")
    .description("Regenerate project bundle files from an existing spec")
    .option("--out <dir>", "Output directory", ".")
    .action(async (specFile: string | undefined, options: any) => {
      const outputDir = options.out || ".";
      const resolvedSpec = specFile || `${outputDir}/.skillcoin/project-spec.json`;

      console.log();
      console.log(chalk.bold.cyan("  Skillcoin Project Refine"));
      console.log(chalk.dim("  ───────────────────────"));
      console.log();

      const spinner = ora({
        text: chalk.dim("Regenerating bundle files from project spec..."),
        color: "cyan",
      }).start();

      try {
        const refined = await refineProjectBundle(resolvedSpec);
        const answers = readExistingAnswers(outputDir);
        const defaults = getProjectDefaults();
        const mode = isProjectBundleMode(defaults.outputMode) ? defaults.outputMode : "standard";
        const manifest = await writeProjectBundle({
          outputDir,
          usedInlineBrief: false,
          spec: refined.spec,
          mode,
          planMarkdown: refined.planMarkdown,
          contextMarkdown: refined.contextMarkdown,
          answers,
          projectRule: refined.projectRule,
          planPrompt: refined.planPrompt,
          implementationPrompt: refined.implementationPrompt,
          reviewPrompt: refined.reviewPrompt,
        });
        spinner.succeed(chalk.green("Bundle regenerated"));
        console.log();
        console.log(chalk.dim(`  Files updated: ${manifest.files.length}`));
        console.log();
      } catch (error: any) {
        spinner.fail(chalk.red("Refine failed"));
        console.log(chalk.dim(`  Error: ${error.message}`));
        console.log();
      }
    });

  project
    .command("status")
    .description("Show status of the generated project bundle in the current repo")
    .option("--out <dir>", "Project directory", ".")
    .action(async (options: any) => {
      const outputDir = options.out || ".";
      const status = getBundleStatus(outputDir);

      console.log();
      console.log(chalk.bold.cyan("  Skillcoin Project Status"));
      console.log(chalk.dim("  ───────────────────────"));
      console.log();

      if (!status.exists || !status.spec || !status.manifest) {
        console.log(chalk.yellow("  No generated project bundle found."));
        console.log(chalk.dim("  Run `skillcoin project create --prompt \"...\"` in this repo."));
        console.log();
        return;
      }

      console.log(chalk.white(`  Root:       ${chalk.cyan(status.root)}`));
      console.log(chalk.white(`  Project:    ${chalk.cyan(status.spec.name)}`));
      console.log(chalk.white(`  IDE:        ${chalk.cyan(status.spec.targetIde)}`));
      console.log(chalk.white(`  Mode:       ${chalk.cyan((status.manifest as any).mode || "standard")}`));
      console.log(chalk.white(`  Generated:  ${chalk.cyan(status.manifest.generatedAt)}`));
      console.log(chalk.white(`  Files:      ${chalk.cyan(String(status.manifest.files.length))}`));
      console.log();
      console.log(chalk.dim(`  Summary: ${status.spec.summary}`));
      console.log(chalk.dim(`  Entry:   ${status.spec.targetIde === "claude-code" ? "CLAUDE.md" : ".cursor/rules/project.mdc"}`));
      console.log();
    });

  project
    .command("export-skill")
    .description("Export the generated project bundle into a reusable skill package")
    .option("--out <dir>", "Project directory", ".")
    .action(async (options: any) => {
      const outputDir = options.out || ".";

      console.log();
      console.log(chalk.bold.cyan("  Skillcoin Export Skill"));
      console.log(chalk.dim("  ─────────────────────"));
      console.log();

      try {
        const exportDir = exportSkillFromBundle(outputDir);
        console.log(chalk.green("  ✓ Exported reusable skill bundle"));
        console.log(chalk.dim(`    Path: ${exportDir}`));
        console.log(chalk.dim("    Files: SKILL.md, manifest.json"));
        console.log();
      } catch (error: any) {
        console.log(chalk.red("  Export failed"));
        console.log(chalk.dim(`  Error: ${error.message}`));
        console.log();
      }
    });
}

function readExistingAnswers(outputDir: string) {
  try {
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const full = fs.readFileSync(
      path.join(path.resolve(outputDir), ".skillcoin", "answers.json"),
      "utf8"
    );
    return JSON.parse(full);
  } catch {
    return [];
  }
}

async function runProjectWizard(seed: {
  briefFile?: string;
  prompt?: string;
  ide: string;
  mode: string;
  out: string;
}): Promise<{
  briefFile?: string;
  prompt?: string;
  ide: string;
  mode: string;
  out: string;
} | null> {
  showBanner("cli");
  console.log(`  ${t.brandBold("Project Init Wizard")} ${t.dim("interactive setup similar to a project scaffold")}`);
  showSeparator();
  console.log();
  console.log(`  ${icons.ai} ${t.dim("Answer step by step, or press Enter to accept the default.")}`);
  console.log();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const sourceKind = (await askLine(
      rl,
      `  ${t.brand("1.")} Use ${t.cyan("prompt")} or ${t.cyan("file")} for the brief? ${t.dim("(default: prompt)")} `
    )).trim().toLowerCase() || "prompt";

    let briefFile = seed.briefFile;
    let prompt = seed.prompt;

    if (sourceKind === "file") {
      briefFile = (await askLine(
        rl,
        `  ${t.brand("2.")} PRD file path ${t.dim("(example: prd.md)")} `
      )).trim();
      prompt = undefined;
    } else {
      prompt = (await askLine(
        rl,
        `  ${t.brand("2.")} Describe the project ${t.dim("(one line or short paragraph)")} `
      )).trim();
      briefFile = undefined;
    }

    const ide = (await askLine(
      rl,
      `  ${t.brand("3.")} Target IDE ${t.dim(`(${getSupportedIdes().join(" | ")}, default: ${seed.ide})`)} `
    )).trim() || seed.ide;

    const mode = (await askLine(
      rl,
      `  ${t.brand("4.")} Bundle mode ${t.dim(`(lean | standard | full, default: ${seed.mode})`)} `
    )).trim() || seed.mode;

    const out = (await askLine(
      rl,
      `  ${t.brand("5.")} Output directory ${t.dim(`(default: ${seed.out})`)} `
    )).trim() || seed.out;

    const confirm = (await askLine(
      rl,
      `  ${t.brand("6.")} Continue? ${t.dim("(Y/n)")} `
    )).trim().toLowerCase();

    if (confirm === "n" || confirm === "no") {
      return null;
    }

    console.log();
    showBox("Project Summary", [
      `Brief Source : ${briefFile ? "file" : "prompt"}`,
      `IDE Target   : ${ide}`,
      `Bundle Mode  : ${mode}`,
      `Output Dir   : ${out}`,
      `Entry Point  : ${ide === "claude-code" ? "CLAUDE.md" : ".cursor/rules/project.mdc"}`,
    ]);
    console.log();

    return { briefFile, prompt, ide, mode, out };
  } finally {
    rl.close();
  }
}

function askLine(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer));
  });
}
