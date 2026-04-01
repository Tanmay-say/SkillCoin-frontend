import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import {
  fetchSkill,
  requestDownload,
  verifyDownloadPayment,
} from "../lib/api";
import { downloadFromCID, downloadFromUrl, saveSkill, isSkillInstalled } from "../lib/download";
import { handleBrowserPayment } from "../lib/payment";

function normalizeContentId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  if (!normalized || normalized === "null" || normalized === "undefined") {
    return null;
  }
  return normalized;
}

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
        chalk.dim(`  Storage: ${chalk.green(skill.storageType || "filecoin")}`)
      );
      const visibleCid = normalizeContentId(skill.zipCid) || normalizeContentId(skill.pieceCid);
      if (visibleCid) {
        console.log(
          chalk.dim(`  CID:     ${chalk.white(visibleCid)}`)
        );
      }
      console.log();

      let readyDownload: Awaited<ReturnType<typeof requestDownload>>["data"];

      // Step 2: Handle payment if required
      if (!isFree && options.payment !== false) {
        console.log(
          chalk.yellow(`  This skill costs ${price} ${skill.priceCurrency}`)
        );
        console.log();

        let downloadRequest;

        try {
          downloadRequest = await requestDownload(name);
        } catch (error: any) {
          console.log(chalk.red(`  ✗ Could not initialize payment: ${error.message}`));
          console.log();
          return;
        }

        try {
          if (downloadRequest.status === 200 && downloadRequest.data) {
            readyDownload = downloadRequest.data;
            console.log(chalk.green("  ✓ Purchase already exists for this wallet"));
            console.log();
          } else if (downloadRequest.status === 402 && downloadRequest.challenge) {
            const challenge = downloadRequest.challenge;
            if (challenge.paymentType === "erc20" && !challenge.tokenAddress) {
              throw new Error(
                "The marketplace does not have a USDC token contract configured for this chain."
              );
            }
            const txHash = await handleBrowserPayment({
              skillName: name,
              skillId: skill.id,
              price: price,
              recipient: challenge.recipient,
              currency: skill.priceCurrency || "USDC",
              chainId: challenge.chainId,
              rpcUrl: challenge.rpcUrl,
              paymentType: challenge.paymentType,
              tokenAddress: challenge.tokenAddress,
              tokenDecimals: challenge.tokenDecimals,
              blockExplorerUrl: challenge.blockExplorerUrl,
            });

            readyDownload = await verifyDownloadPayment(
              name,
              txHash,
              challenge.token
            );

            console.log(
              chalk.green(
                `  ✓ Payment confirmed: ${chalk.dim(txHash.substring(0, 24))}...`
              )
            );
            console.log();
          } else {
            throw new Error("Unexpected download challenge response");
          }
        } catch (error: any) {
          console.log(chalk.red(`  ✗ Payment failed: ${error.message}`));
          console.log();
          return;
        }
      } else if (isFree) {
        console.log(chalk.green("  ✓ Free skill — no payment needed"));
        console.log();
      } else {
        console.log(chalk.red("  Paid installs cannot skip payment."));
        console.log(chalk.dim("  Remove --no-payment or install a free skill instead."));
        console.log();
        return;
      }

      // Step 3: Download from IPFS/Filecoin
      const dlSpinner = ora({
        text: chalk.dim("Downloading from IPFS/Filecoin..."),
        color: "cyan",
      }).start();

      let fileBuffer: Buffer;
      try {
        const dl = readyDownload ? { status: 200, data: readyDownload } : await requestDownload(name);
        const downloadUrl = dl.status === 200 ? dl.data?.downloadUrl : undefined;
        const fallbackCid =
          normalizeContentId(dl.status === 200 ? dl.data?.cid : undefined) ||
          normalizeContentId(skill.zipCid) ||
          normalizeContentId(skill.pieceCid);

        if (dl.status === 200 && downloadUrl) {
          fileBuffer = await downloadFromUrl(dl.data.downloadUrl);
        } else if (fallbackCid) {
          fileBuffer = await downloadFromCID(fallbackCid);
        } else {
          throw new Error("Skill content is protected and no download URL was returned");
        }
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
        const isZip =
          fileBuffer.length >= 4 &&
          fileBuffer[0] === 0x50 &&
          fileBuffer[1] === 0x4b &&
          fileBuffer[2] === 0x03 &&
          fileBuffer[3] === 0x04;
        const filename = `${skill.slug || skill.name}.${isZip ? "zip" : "md"}`;
        const storedCid =
          normalizeContentId(skill.zipCid) ||
          normalizeContentId(readyDownload?.cid) ||
          normalizeContentId(skill.pieceCid) ||
          "";
        const installPath = saveSkill(
          fileBuffer,
          skill.slug || skill.name,
          filename,
          {
            version: skill.version,
            cid: storedCid,
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
        if (isZip) {
          console.log(chalk.dim(`    Package:  extracted ZIP archive`));
        }
        if (storedCid) {
          console.log(chalk.dim(`    CID:     ${storedCid}`));
        }
        if (storedCid && !storedCid.startsWith("local_")) {
          console.log(chalk.dim(`    IPFS:    ${chalk.cyan(`https://ipfs.io/ipfs/${storedCid}`)}`));
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
