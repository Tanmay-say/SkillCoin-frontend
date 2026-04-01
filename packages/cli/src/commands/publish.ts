import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import * as fs from "fs";
import * as path from "path";
import { registerUploadedSkill, uploadSkill } from "../lib/api";
import { readConfig } from "../lib/config";
import { uploadWithFilecoinPin, isFilecoinPinAvailable } from "../lib/filecoin-pin";

export function publishCommand(program: Command) {
  program
    .command("publish <file>")
    .description("Publish a .md, .txt, or .zip skill file to the Skillcoin marketplace")
    .option("-n, --name <name>", "Skill name (defaults to filename)")
    .option("-d, --desc <description>", "Skill description")
    .option("-c, --category <category>", "Category (coding, marketing, research, etc.)", "coding")
    .option("-t, --tags <tags>", "Comma-separated tags", "")
    .option("-p, --price <price>", "Price amount", "0.5")
    .option("--currency <currency>", "Price currency (USDC | TFIL | FREE)", "USDC")
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

      if (!filePath.endsWith(".md") && !filePath.endsWith(".txt") && !filePath.endsWith(".zip")) {
        console.log(chalk.red("  ✗ Only .md, .txt, and .zip files are supported"));
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
      console.log(chalk.white(`  Price:    ${options.price} ${options.currency}`));
      console.log(chalk.white(`  Category: ${options.category}`));
      console.log();

      const tags = options.tags
        ? options.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
        : [];

      if (options.storage === "filecoin-pin") {
        // Upload via filecoin-pin, then register the uploaded CID with the marketplace if API is configured.
        const spinner = ora({
          text: chalk.dim("Uploading to Filecoin via filecoin-pin..."),
          color: "cyan",
        }).start();

        try {
          const fpAvailable = await isFilecoinPinAvailable();
          if (!fpAvailable) {
            throw new Error("filecoin-pin not available. Run: pnpm add filecoin-pin");
          }

          const uploadResult = await uploadWithFilecoinPin(filePath);
          const metadata = {
            name: skillName,
            description,
            category: options.category,
            tags,
            price: parseFloat(options.price) || 0,
            currency: options.currency,
            version: options.version,
            creatorAddress: config.wallet || "0x0000000000000000000000000000000000000000",
          };

          let result: any = {
            cid: uploadResult.rootCid,
            pieceCid: uploadResult.pieceCid,
            filecoinDatasetId: uploadResult.dataSetId,
            filecoinDealId: uploadResult.dataSetId ? `dataset-${uploadResult.dataSetId}` : undefined,
            storageType: "filecoin",
            slug: skillName,
            installCmd: `skillcoin install ${skillName}`,
            network: uploadResult.network,
            gateways: [
              `https://ipfs.io/ipfs/${uploadResult.rootCid}`,
              `https://w3s.link/ipfs/${uploadResult.rootCid}`,
              `https://cloudflare-ipfs.com/ipfs/${uploadResult.rootCid}`,
            ],
          };

          if (config.apiBase) {
            try {
              const registered = await registerUploadedSkill({
                cid: uploadResult.rootCid,
                pieceCid: uploadResult.pieceCid,
                filecoinDatasetId: uploadResult.dataSetId || undefined,
                filecoinDealId: uploadResult.dataSetId
                  ? `dataset-${uploadResult.dataSetId}`
                  : undefined,
                storageType: "filecoin",
                metadata,
              });
              result = { ...result, ...registered };
            } catch (registrationError: any) {
              spinner.warn(chalk.yellow("Uploaded to Filecoin, but marketplace registration failed"));
              console.log(chalk.dim(`  Registration error: ${registrationError.message}`));
              console.log();
            }
          }
          spinner.stop();

          console.log();
          console.log(chalk.bold.green("  ✓ Skill stored on Filecoin permanently"));
          console.log();
          console.log(chalk.white("  Storage Details"));
          console.log(chalk.dim("  ───────────────────────────────────"));
          console.log(chalk.dim(`  Root CID:    ${chalk.white(result.cid || uploadResult.rootCid)}`));
          if (result.pieceCid) {
            console.log(chalk.dim(`  Piece CID:   ${chalk.white(result.pieceCid)}`));
          }
          if (result.filecoinDatasetId || uploadResult.dataSetId) {
            console.log(
              chalk.dim(
                `  Dataset ID:  ${chalk.white(String(result.filecoinDatasetId || uploadResult.dataSetId))}`
              )
            );
          }
          console.log(chalk.dim(`  Network:     ${chalk.white(result.network || uploadResult.network || "calibration")}`));
          console.log();
          console.log(chalk.white("  Access URLs (use any to download)"));
          console.log(chalk.dim("  ───────────────────────────────────"));
          console.log(chalk.dim(`  IPFS:     ${chalk.cyan(`https://ipfs.io/ipfs/${result.cid || uploadResult.rootCid}`)}`));
          console.log(chalk.dim(`  W3S:      ${chalk.cyan(`https://w3s.link/ipfs/${result.cid || uploadResult.rootCid}`)}`));
          console.log(chalk.dim(`  CF:       ${chalk.cyan(`https://cloudflare-ipfs.com/ipfs/${result.cid || uploadResult.rootCid}`)}`));
          if (result.filecoinDatasetId || uploadResult.dataSetId) {
            console.log();
            console.log(chalk.white("  Filecoin Proof"));
            console.log(chalk.dim("  ───────────────────────────────────"));
            console.log(
              chalk.dim(
                `  Explorer: ${chalk.cyan(`https://pdp.vxb.ai/calibration/dataset/${result.filecoinDatasetId || uploadResult.dataSetId}`)}`
              )
            );
          }
          console.log();
          console.log(chalk.dim("  Install:  ") + chalk.cyan(result.installCmd || `skillcoin install ${skillName}`));
          if (result.marketplaceUrl && config.apiBase) {
            console.log(chalk.dim("  View:     ") + chalk.cyan(`${config.apiBase}${result.marketplaceUrl}`));
          }
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
              currency: options.currency,
              version: options.version,
              creatorAddress: config.wallet || "0x0000000000000000000000000000000000000000",
            },
            config.authToken || undefined
          );

          spinner.stop();

          const storedMessage =
            result.storageType === "local"
              ? "  ✓ Skill stored in local development storage"
              : "  ✓ Skill stored on Filecoin permanently";
          console.log(chalk.bold.green(storedMessage));
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
            const labels = result.storageType === "local" ? ["LOCAL"] : ["IPFS", "W3S", "CF"];
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
