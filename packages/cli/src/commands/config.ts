import { Command } from "commander";
import chalk from "chalk";
import { readConfig, writeConfig } from "../lib/config";

export function configCommand(program: Command) {
  program
    .command("config")
    .description("Configure Skillcoin CLI settings")
    .option("-w, --wallet <address>", "Set wallet address")
    .option("-k, --key <privateKey>", "Set private key for payments")
    .option("-a, --api <url>", "Set API base URL (alias: --api-base)")
    .option("--api-base <url>", "Set API base URL")
    .option("-g, --gateway <url>", "Set IPFS gateway URL")
    .option("-n, --network <network>", "Set network (calibration | mainnet)")
    .option("--provider <provider>", "Set AI provider (gemini | openai | claude | groq)")
    .option("--ai-key <apiKey>", "Set AI provider API key")
    .option("--ai-model <model>", "Set AI model name")
    .action(async (options: any) => {
      console.log();
      console.log(chalk.bold.cyan("  ⚙️  Skillcoin Config"));
      console.log(chalk.dim("  ─────────────────────────"));
      console.log();

      const apiUrl = options.api || options.apiBase;
      const hasUpdates =
        options.wallet || options.key || apiUrl || options.gateway ||
        options.network || options.provider || options.aiKey || options.aiModel;

      if (hasUpdates) {
        const updates: Record<string, string> = {};
        if (options.wallet) updates.wallet = options.wallet;
        if (options.key) updates.privateKey = options.key;
        if (apiUrl) updates.apiBase = apiUrl;
        if (options.gateway) updates.ipfsGateway = options.gateway;
        if (options.network) updates.network = options.network;
        if (options.provider) updates.aiProvider = options.provider;
        if (options.aiKey) updates.aiApiKey = options.aiKey;
        if (options.aiModel) updates.aiModel = options.aiModel;

        const config = writeConfig(updates);
        console.log(chalk.green("  ✓ Configuration updated"));
        console.log();
        displayConfig(config);
      } else {
        const config = readConfig();
        displayConfig(config);
      }
    });
}

function displayConfig(config: any) {
  const mask = (val: string) => {
    if (!val) return chalk.dim("(not set)");
    if (val.startsWith("0x") && val.length > 16) {
      return val.substring(0, 8) + "..." + val.substring(val.length - 6);
    }
    return val;
  };

  console.log(chalk.dim("  ── Wallet & Network ──"));
  console.log(
    `  ${chalk.dim("Wallet:")}       ${config.wallet ? chalk.cyan(mask(config.wallet)) : chalk.dim("(not set)")}`
  );
  console.log(
    `  ${chalk.dim("Private Key:")}  ${config.privateKey ? chalk.yellow("••••••" + config.privateKey.slice(-4)) : chalk.dim("(not set)")}`
  );
  console.log(
    `  ${chalk.dim("Network:")}      ${chalk.white(config.network)}`
  );
  console.log();
  console.log(chalk.dim("  ── API & Storage ──"));
  console.log(
    `  ${chalk.dim("API Base:")}     ${chalk.white(config.apiBase)}`
  );
  console.log(
    `  ${chalk.dim("IPFS Gateway:")} ${chalk.white(config.ipfsGateway)}`
  );
  console.log(
    `  ${chalk.dim("Skills Dir:")}   ${chalk.white(config.skillsDir)}`
  );
  console.log();
  console.log(chalk.dim("  ── AI Provider ──"));
  console.log(
    `  ${chalk.dim("Provider:")}     ${chalk.white(config.aiProvider || "gemini")}`
  );
  console.log(
    `  ${chalk.dim("AI Key:")}       ${config.aiApiKey ? chalk.yellow("••••••" + config.aiApiKey.slice(-4)) : chalk.dim("(not set)")}`
  );
  console.log(
    `  ${chalk.dim("AI Model:")}     ${config.aiModel ? chalk.white(config.aiModel) : chalk.dim("(default)")}`
  );
  console.log();
}
