import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { fetchSkill } from "../lib/api";
import { downloadFromCID, saveSkill, isSkillInstalled } from "../lib/download";
import { handleBrowserPayment } from "../lib/payment";

export function installCommand(program: Command) {
  program
    .command("install <name>")
    .alias("i")
    .description("Install an AI skill from the Skillcoin marketplace")
    .option("-f, --force", "Force reinstall even if already installed")
    .option("--no-payment", "Skip payment prompt (free skills only)")
    .action(async (name: string, options: any) => {
      console.log();
      console.log(chalk.bold.cyan("  ⚡ Skillcoin Installer"));
      console.log(chalk.dim("  ─────────────────────────"));
      console.log();

      // Check if already installed
      if (!options.force && isSkillInstalled(name)) {
        console.log(
          chalk.yellow(`  ⚠  '${name}' is already installed.`)
        );
        console.log(
          chalk.dim(
            `     Run ${chalk.white(
              `skillcoin install ${name} --force`
            )} to reinstall.`
          )
        );
        console.log();
        return;
      }

      // Step 1: Fetch skill metadata from API
      const spinner = ora({
        text: chalk.dim("Fetching skill metadata..."),
        color: "cyan",
      }).start();

      let skill: any;
      try {
        skill = await fetchSkill(name);
        spinner.succeed(
          chalk.green(
            `Found ${chalk.bold(skill.name)} v${skill.version}`
          )
        );
      } catch (error: any) {
        spinner.fail(chalk.red(`Skill '${name}' not found`));
        console.log(chalk.dim(`  Error: ${error.message}`));
        if (error.message.includes("fetch") || error.message.includes("ECONNREFUSED")) {
          console.log();
          console.log(chalk.yellow("  Could not connect to the Skillcoin API."));
          console.log(chalk.dim("  Set your API URL: skillcoin config --api-base https://your-api.vercel.app"));
        }
        console.log();
        return;
      }

      // Show skill info
      console.log(
        chalk.dim(`  Description: ${skill.description?.substring(0, 80) || "—"}`)
      );
      const price = Number(skill.priceAmount) || 0;
      const isFree = price === 0;
      console.log(
        chalk.dim(
          `  Price:   ${isFree ? chalk.green("Free") : chalk.yellow(`${price} ${skill.priceCurrency}`)}`
        )
      );
      console.log(
        chalk.dim(`  Storage: ${chalk.green("filecoin")}`)
      );
      if (skill.zipCid) {
        console.log(
          chalk.dim(`  CID:     ${chalk.white(skill.zipCid)}`)
        );
      }
      console.log();

      // Step 2: Handle payment if required
      if (!isFree && options.payment !== false) {
        console.log(
          chalk.yellow(`  This skill costs ${price} ${skill.priceCurrency}`)
        );
        console.log();

        const { requestDownload } = await import("../lib/api");
        let recipient = process.env.ADMIN_VAULT_ADDRESS || "";

        if (!recipient) {
          try {
            const dlResult = await requestDownload(name);
            if (dlResult.status === 402 && dlResult.challenge?.recipient) {
              recipient = dlResult.challenge.recipient;
            }
          } catch {
            // Fall through — payment page will show error if no recipient
          }
        }

        if (!recipient) {
          console.log(chalk.red("  Could not determine payment recipient from API."));
          console.log(chalk.dim("  Set ADMIN_VAULT_ADDRESS env var or contact the marketplace operator."));
          console.log();
          return;
        }

        try {
          const txHash = await handleBrowserPayment({
            skillName: name,
            skillId: skill.id,
            price: price,
            recipient,
            currency: skill.priceCurrency || "USDC",
          });

          console.log(
            chalk.green(
              `  ✓ Payment confirmed: ${chalk.dim(txHash.substring(0, 24))}...`
            )
          );
          console.log();
        } catch (error: any) {
          console.log(chalk.red(`  ✗ Payment failed: ${error.message}`));
          console.log();
          return;
        }
      } else if (isFree) {
        console.log(chalk.green("  ✓ Free skill — no payment needed"));
        console.log();
      }

      // Step 3: Download from IPFS/Filecoin
      const dlSpinner = ora({
        text: chalk.dim("Downloading from IPFS/Filecoin..."),
        color: "cyan",
      }).start();

      let fileBuffer: Buffer;
      try {
        fileBuffer = await downloadFromCID(skill.zipCid);
        dlSpinner.succeed(
          chalk.green(
            `Downloaded ${(fileBuffer.length / 1024).toFixed(1)} KB`
          )
        );
      } catch (error: any) {
        dlSpinner.fail(chalk.red("Download failed"));
        console.log(chalk.dim(`  Error: ${error.message}`));
        console.log(chalk.dim(`  Tried gateways: ipfs.io, w3s.link, cloudflare-ipfs.com`));
        console.log();
        return;
      }

      // Step 4: Save locally
      const saveSpinner = ora({
        text: chalk.dim("Installing skill files..."),
        color: "cyan",
      }).start();

      try {
        const filename = `${skill.slug || skill.name}.md`;
        const installPath = saveSkill(
          fileBuffer,
          skill.slug || skill.name,
          filename,
          {
            version: skill.version,
            cid: skill.zipCid,
            description: skill.description,
            category: skill.category || undefined,
          }
        );

        saveSpinner.succeed(chalk.green("Skill installed"));

        console.log();
        console.log(
          chalk.bold.green(
            `  ✓ Installed ${chalk.cyan(skill.name)}@${chalk.dim(skill.version)}`
          )
        );
        console.log(chalk.dim(`    Path:    ${installPath}`));
        if (skill.zipCid) {
          console.log(chalk.dim(`    CID:     ${skill.zipCid}`));
          console.log(chalk.dim(`    IPFS:    ${chalk.cyan(`https://ipfs.io/ipfs/${skill.zipCid}`)}`));
        }
        if (skill.filecoinDatasetId) {
          console.log(chalk.dim(`    Proof:   ${chalk.cyan(`https://pdp.vxb.ai/calibration/dataset/${skill.filecoinDatasetId}`)}`));
        }
        console.log();
      } catch (error: any) {
        saveSpinner.fail(chalk.red("Installation failed"));
        console.log(chalk.dim(`  Error: ${error.message}`));
        console.log();
      }
    });
}
