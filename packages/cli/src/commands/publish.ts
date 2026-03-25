import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import * as fs from "fs";
import * as path from "path";
import { uploadSkill } from "../lib/api";
import { readConfig } from "../lib/config";
import { uploadWithFilecoinPin, isFilecoinPinAvailable } from "../lib/filecoin-pin";

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
    .option("-s, --storage <method>", "Storage method: api (default) or filecoin-pin", "api")
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

      const tags = options.tags
        ? options.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
        : [];

      if (options.storage === "filecoin-pin") {
        // Direct upload via filecoin-pin (no API server needed)
        const spinner = ora({
          text: chalk.dim("Uploading to Filecoin via filecoin-pin..."),
          color: "cyan",
        }).start();

        try {
          const fpAvailable = await isFilecoinPinAvailable();
          if (!fpAvailable) {
            throw new Error("filecoin-pin not available. Run: pnpm add filecoin-pin");
          }

          const result = await uploadWithFilecoinPin(filePath);
          spinner.stop();

          console.log();
          console.log(chalk.bold.green("  ✓ Skill stored on Filecoin permanently"));
          console.log();
          console.log(chalk.white("  Storage Details"));
          console.log(chalk.dim("  ───────────────────────────────────"));
          console.log(chalk.dim(`  Root CID:    ${chalk.white(result.rootCid)}`));
          if (result.pieceCid) {
            console.log(chalk.dim(`  Piece CID:   ${chalk.white(result.pieceCid)}`));
          }
          if (result.dataSetId) {
            console.log(chalk.dim(`  Dataset ID:  ${chalk.white(String(result.dataSetId))}`));
          }
          console.log(chalk.dim(`  Network:     ${chalk.white(result.network || "calibration")}`));
          console.log();
          console.log(chalk.white("  Access URLs (use any to download)"));
          console.log(chalk.dim("  ───────────────────────────────────"));
          console.log(chalk.dim(`  IPFS:     ${chalk.cyan(`https://ipfs.io/ipfs/${result.rootCid}`)}`));
          console.log(chalk.dim(`  W3S:      ${chalk.cyan(`https://w3s.link/ipfs/${result.rootCid}`)}`));
          console.log(chalk.dim(`  CF:       ${chalk.cyan(`https://cloudflare-ipfs.com/ipfs/${result.rootCid}`)}`));
          if (result.dataSetId) {
            console.log();
            console.log(chalk.white("  Filecoin Proof"));
            console.log(chalk.dim("  ───────────────────────────────────"));
            console.log(chalk.dim(`  Explorer: ${chalk.cyan(`https://pdp.vxb.ai/calibration/dataset/${result.dataSetId}`)}`));
          }
          console.log();
          console.log(chalk.dim("  Install:  ") + chalk.cyan(`skillcoin install ${skillName}`));
          console.log();
        } catch (error: any) {
          spinner.fail(chalk.red("Upload failed"));
          console.log(chalk.dim(`  Error: ${error.message}`));
          console.log();
        }
      } else {
        // Default: upload via the API server
        const spinner = ora({
          text: chalk.dim("Uploading to marketplace via API server..."),
          color: "cyan",
        }).start();

        try {
          const result = await uploadSkill(
            fileBuffer,
            filename,
            {
              name: skillName,
              description,
              category: options.category,
              tags,
              price: parseFloat(options.price) || 0,
              currency: "USDC",
              version: options.version,
              creatorAddress: config.wallet || "0x0000000000000000000000000000000000000000",
            },
            config.authToken || undefined
          );

          spinner.stop();

          console.log(chalk.bold.green("  ✓ Skill stored on Filecoin permanently"));
          console.log();
          console.log(chalk.white("  Storage Details"));
          console.log(chalk.dim("  ───────────────────────────────────"));
          console.log(chalk.dim(`  CID:         ${chalk.white(result.cid)}`));
          console.log(chalk.dim(`  Storage:     ${chalk.white(result.storageType)}`));
          console.log(chalk.dim(`  Skill ID:    ${chalk.white(result.skillId)}`));
          if (result.dealId) {
            console.log(chalk.dim(`  Deal ID:     ${chalk.white(result.dealId)}`));
          }
          if (result.pieceCid) {
            console.log(chalk.dim(`  Piece CID:   ${chalk.white(result.pieceCid)}`));
          }

          console.log();
          console.log(chalk.white("  Access URLs (use any to download)"));
          console.log(chalk.dim("  ───────────────────────────────────"));
          if (result.gateways && result.gateways.length > 0) {
            const labels = ["IPFS", "W3S", "CF"];
            result.gateways.forEach((url: string, i: number) => {
              const label = (labels[i] || `GW${i + 1}`).padEnd(7);
              console.log(chalk.dim(`  ${label} ${chalk.cyan(url)}`));
            });
          } else if (result.gatewayUrl) {
            console.log(chalk.dim(`  URL:     ${chalk.cyan(result.gatewayUrl)}`));
          }

          if (result.explorerUrl) {
            console.log();
            console.log(chalk.white("  Filecoin Proof"));
            console.log(chalk.dim("  ───────────────────────────────────"));
            console.log(chalk.dim(`  Explorer: ${chalk.cyan(result.explorerUrl)}`));
          }

          console.log();
          console.log(chalk.dim("  Install:  ") + chalk.cyan(result.installCmd || `skillcoin install ${result.slug || skillName}`));
          console.log(chalk.dim("  View:     ") + chalk.cyan(`${config.apiBase}${result.marketplaceUrl}`));
          console.log();
        } catch (error: any) {
          spinner.fail(chalk.red("Upload failed"));
          console.log(chalk.dim(`  Error: ${error.message}`));
          console.log();
        }
      }
    });
}
