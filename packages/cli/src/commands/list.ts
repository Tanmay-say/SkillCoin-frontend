import { Command } from "commander";
import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import { getSkillsDir } from "../lib/config";
import { getInstalledManifest } from "../lib/download";

export function listCommand(program: Command) {
  program
    .command("list")
    .alias("ls")
    .description("List all installed skills")
    .action(async () => {
      console.log();
      console.log(chalk.bold.cyan("  📦 Installed Skills"));
      console.log(chalk.dim("  ─────────────────────────"));
      console.log();

      const skillsDir = getSkillsDir();

      if (!fs.existsSync(skillsDir)) {
        console.log(chalk.dim("  No skills installed yet."));
        console.log(
          chalk.dim(`  Run ${chalk.white("skillcoin install <name>")} to get started.`)
        );
        console.log();
        return;
      }

      const entries = fs
        .readdirSync(skillsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory());

      if (entries.length === 0) {
        console.log(chalk.dim("  No skills installed yet."));
        console.log(
          chalk.dim(`  Run ${chalk.white("skillcoin install <name>")} to get started.`)
        );
        console.log();
        return;
      }

      // Table header
      console.log(
        chalk.dim("  ") +
          chalk.bold(
            padRight("Name", 25) +
              padRight("Version", 12) +
              padRight("Category", 15) +
              "Installed"
          )
      );
      console.log(chalk.dim("  " + "─".repeat(65)));

      for (const entry of entries) {
        const manifest = getInstalledManifest(entry.name);
        const skillPath = path.join(skillsDir, entry.name);
        const stat = fs.statSync(skillPath);
        const installedDate = manifest?.installedAt
          ? new Date(manifest.installedAt).toLocaleDateString()
          : stat.mtime.toLocaleDateString();

        const name = manifest?.name || entry.name;
        const version = manifest?.version || "unknown";
        const category = manifest?.category || "—";

        console.log(
          "  " +
            chalk.cyan(padRight(name, 25)) +
            chalk.white(padRight(version, 12)) +
            chalk.dim(padRight(category, 15)) +
            chalk.dim(installedDate)
        );
      }

      console.log();
      console.log(chalk.dim(`  ${entries.length} skill(s) installed`));
      console.log(chalk.dim(`  Location: ${skillsDir}`));
      console.log();
    });
}

function padRight(str: string, length: number): string {
  return str.length >= length
    ? str.substring(0, length - 1) + " "
    : str + " ".repeat(length - str.length);
}
