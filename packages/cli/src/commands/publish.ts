import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import * as fs from "fs";
import * as path from "path";
import { uploadSkill } from "../lib/api";
import { readConfig } from "../lib/config";

export function publishCommand(program: Command) {
  program
    .command("publish <file>")
    .description("Publish a .md skill file to the Skillcoin marketplace")
    .option("-n, --name <name>", "Skill name (defaults to filename)")
    .option("-d, --desc <description>", "Skill description")
    .option("-c, --category <category>", "Category (coding, marketing, research, etc.)", "coding")
    .option("-t, --tags <tags>", "Comma-separated tags", "")
    .option("-p, --price <price>", "Price in USDC", "0.5")
    .option("-v, --version <version>", "Skill version", "1.0.0")
    .action(async (file: string, options: any) => {
      console.log();
      console.log(chalk.bold.cyan("  📤 Skillcoin Publisher"));
      console.log(chalk.dim("  ─────────────────────────"));
      console.log();

      const filePath = path.resolve(file);

      // Validate file exists and is .md
      if (!fs.existsSync(filePath)) {
        console.log(chalk.red(`  ✗ File not found: ${filePath}`));
        console.log();
        return;
      }

      if (!filePath.endsWith(".md") && !filePath.endsWith(".txt")) {
        console.log(chalk.red("  ✗ Only .md and .txt files are supported"));
        console.log();
        return;
      }

      const config = readConfig();
      const filename = path.basename(filePath);
      const skillName = options.name || filename.replace(/\.(md|txt)$/i, "").toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const description = options.desc || `AI skill instructions from ${filename}`;

      // Read file
      const fileBuffer = fs.readFileSync(filePath);
      const fileSize = (fileBuffer.length / 1024).toFixed(1);

      console.log(chalk.white(`  File:     ${chalk.cyan(filename)} (${fileSize} KB)`));
      console.log(chalk.white(`  Skill:    ${chalk.cyan(skillName)}`));
      console.log(chalk.white(`  Version:  ${options.version}`));
      console.log(chalk.white(`  Price:    ${options.price} USDC`));
      console.log(chalk.white(`  Category: ${options.category}`));
      console.log();

      // Upload
      const spinner = ora({
        text: chalk.dim("Uploading to IPFS via Lighthouse..."),
        color: "cyan",
      }).start();

      try {
        const tags = options.tags
          ? options.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
          : [];

        const result = await uploadSkill(fileBuffer, filename, {
          name: skillName,
          description,
          category: options.category,
          tags,
          price: parseFloat(options.price) || 0.5,
          currency: "USDC",
          version: options.version,
          creatorAddress: config.wallet || "0x0000000000000000000000000000000000000000",
        });

        spinner.succeed(chalk.green("Published to Filecoin!"));

        console.log();
        console.log(chalk.bold.green("  ✓ Skill published successfully!"));
        console.log();
        console.log(chalk.dim(`  CID:      ${chalk.white(result.cid)}`));
        console.log(chalk.dim(`  Deal ID:  ${chalk.white(result.dealId)}`));
        console.log(chalk.dim(`  Skill ID: ${chalk.white(result.skillId)}`));
        if (result.gatewayUrl) {
          console.log(chalk.dim(`  Gateway:  ${chalk.cyan(result.gatewayUrl)}`));
        }
        console.log();
        console.log(
          chalk.dim("  Install:  ") +
            chalk.cyan(`skillcoin install ${skillName}`)
        );
        console.log();
      } catch (error: any) {
        spinner.fail(chalk.red("Upload failed"));
        console.log(chalk.dim(`  Error: ${error.message}`));
        console.log();
      }
    });
}
