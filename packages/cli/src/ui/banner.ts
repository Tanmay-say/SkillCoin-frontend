import chalk from "chalk";
import { t, icons } from "./theme";
import { readConfig } from "../lib/config";

const VERSION = "0.3.0";

const LOGO = `
  ${t.brand("███████")}${t.cyan("╗")} ${t.brand("██")}${t.cyan("╗  ")}${t.brand("██")}${t.cyan("╗")} ${t.brand("██")}${t.cyan("╗")} ${t.brand("██")}${t.cyan("╗")} ${t.brand("██")}${t.cyan("╗")}
  ${t.brand("██")}${t.cyan("╔════╝")} ${t.brand("██")}${t.cyan("║ ")} ${t.brand("██")}${t.cyan("╔╝")} ${t.brand("██")}${t.cyan("║")} ${t.brand("██")}${t.cyan("║")} ${t.brand("██")}${t.cyan("║")}
  ${t.brand("███████")}${t.cyan("╗")} ${t.brand("█████")}${t.cyan("╔╝ ")} ${t.brand("██")}${t.cyan("║")} ${t.brand("██")}${t.cyan("║")} ${t.brand("██")}${t.cyan("║")}
  ${t.cyan("╚════")}${t.brand("██")}${t.cyan("║")} ${t.brand("██")}${t.cyan("╔══")}${t.brand("██")}${t.cyan("╗")} ${t.brand("██")}${t.cyan("║")} ${t.brand("██")}${t.cyan("║")} ${t.brand("██")}${t.cyan("║")}
  ${t.brand("███████")}${t.cyan("║")} ${t.brand("██")}${t.cyan("║  ")}${t.brand("██")}${t.cyan("╗")} ${t.brand("██")}${t.cyan("║")} ${t.brand("███████")}${t.cyan("╗")}
  ${t.cyan("╚══════╝ ╚═╝  ╚═╝ ╚═╝ ╚══════╝")}
`;

export function showBanner(mode: "cli" | "chat" | "agent" = "cli") {
  console.log(LOGO);
  console.log(
    `  ${t.white("Skill")}${t.brand("coin")} ${t.dim(`v${VERSION}`)}  ${t.separator("│")}  ${t.dim("npm for AI Agent Skills")}`
  );
  console.log(
    `  ${t.dim("Decentralized")} ${t.separator("·")} ${t.dim("Paid")} ${t.separator("·")} ${t.dim("Permanent on Filecoin")}`
  );
  console.log();

  if (mode === "chat") {
    console.log(
      `  ${icons.ai} ${t.brandBold("Interactive Mode")}  ${t.dim("— type a message or use /commands")}`
    );
  } else if (mode === "agent") {
    console.log(
      `  ${icons.skill} ${t.brandBold("Agent Mode")}  ${t.dim("— manage and run AI agents")}`
    );
  }

  console.log();
}

export function showStatus() {
  const config = readConfig();
  const hasWallet = !!config.wallet;
  const hasApi = config.apiBase !== "http://localhost:3001";
  const hasAiKey = !!(config as any).aiApiKey;

  console.log(`  ${t.label("Status")}`);
  console.log(
    `  ${hasWallet ? icons.check : icons.cross} ${t.dim("Wallet:")}    ${hasWallet ? t.cyan(config.wallet.substring(0, 8) + "..." + config.wallet.slice(-4)) : t.muted("not configured")}`
  );
  console.log(
    `  ${icons.check} ${t.dim("API:")}       ${t.white(config.apiBase)}`
  );
  console.log(
    `  ${hasAiKey ? icons.check : t.muted("○")} ${t.dim("AI:")}        ${hasAiKey ? t.success((config as any).aiProvider || "gemini") : t.muted("not configured")}`
  );
  console.log(
    `  ${icons.filecoin} ${t.dim("Network:")}   ${t.cyan(config.network)}`
  );
  console.log();
}

export function showSeparator(label?: string) {
  const width = 50;
  if (label) {
    const pad = Math.max(2, Math.floor((width - label.length - 2) / 2));
    console.log(
      `  ${t.separator("─".repeat(pad))} ${t.label(label)} ${t.separator("─".repeat(pad))}`
    );
  } else {
    console.log(`  ${t.separator("─".repeat(width))}`);
  }
}

export function showBox(title: string, lines: string[]) {
  const maxLen = Math.max(title.length, ...lines.map((l) => l.length));
  const width = Math.min(maxLen + 4, 60);

  console.log(`  ${t.separator("┌" + "─".repeat(width) + "┐")}`);
  console.log(
    `  ${t.separator("│")} ${t.brandBold(title.padEnd(width - 1))}${t.separator("│")}`
  );
  console.log(`  ${t.separator("├" + "─".repeat(width) + "┤")}`);
  for (const line of lines) {
    console.log(
      `  ${t.separator("│")} ${line.padEnd(width - 1)}${t.separator("│")}`
    );
  }
  console.log(`  ${t.separator("└" + "─".repeat(width) + "┘")}`);
}

export function showHelp() {
  console.log(`  ${t.brandBold("Commands")}`);
  console.log();
  console.log(`  ${t.cyan("/generate")}  ${t.dim("Generate a new AI skill from description")}`);
  console.log(`  ${t.cyan("/publish")}   ${t.dim("Publish current skill to marketplace")}`);
  console.log(`  ${t.cyan("/install")}   ${t.dim("Install a skill by name")}`);
  console.log(`  ${t.cyan("/list")}      ${t.dim("Browse marketplace skills")}`);
  console.log(`  ${t.cyan("/status")}    ${t.dim("Show wallet and config status")}`);
  console.log(`  ${t.cyan("/help")}      ${t.dim("Show this help message")}`);
  console.log(`  ${t.cyan("/exit")}      ${t.dim("Exit the session")}`);
  console.log();
}

export { VERSION };
