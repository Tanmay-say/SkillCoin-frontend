import chalk from "chalk";
import { t, icons } from "./theme";
import { readConfig } from "../lib/config";

import { version as VERSION } from "../../package.json";

const LOGO_ROWS = [
  "\u2584\u2580\u2580\u2580 \u2588 \u2584\u2580 \u2580 \u2588 \u2588 \u2584\u2580\u2580\u2580 \u2584\u2580\u2580\u2584 \u2580 \u2584\u2580\u2580\u2584",
  " \u2580\u2580\u2584 \u2588\u2588   \u2588 \u2588 \u2588 \u2588    \u2588  \u2588 \u2588 \u2588  \u2588",
  "\u2584\u2584\u2584\u2580 \u2588 \u2580\u2584 \u2588 \u2588 \u2588 \u2580\u2584\u2584\u2584 \u2580\u2584\u2584\u2580 \u2588 \u2588  \u2588",
];

function gradientLine(text: string): string {
  const r1 = 0x7b, g1 = 0x61, b1 = 0xff;
  const r2 = 0x00, g2 = 0xd4, b2 = 0xff;
  const len = text.length;
  return [...text]
    .map((ch, i) => {
      if (ch === " ") return ch;
      const ratio = len > 1 ? i / (len - 1) : 0;
      const r = Math.round(r1 + (r2 - r1) * ratio);
      const g = Math.round(g1 + (g2 - g1) * ratio);
      const b = Math.round(b1 + (b2 - b1) * ratio);
      return chalk.rgb(r, g, b)(ch);
    })
    .join("");
}

export function showBanner(mode: "cli" | "chat" | "agent" = "cli") {
  console.log();
  for (const row of LOGO_ROWS) {
    console.log("  " + gradientLine(row));
  }
  console.log(
    `  ${t.white("skillcoin")} ${t.dim(`v${VERSION}`)}  ${t.separator("|")}  ${t.dim("npm for AI Agent Skills")}`
  );
  if (mode === "chat") {
    console.log(
      `  ${t.brandBold("Interactive")} ${t.dim("\u2014 type a message or use /commands")}`
    );
  } else if (mode === "agent") {
    console.log(
      `  ${t.brandBold("Agent")} ${t.dim("\u2014 manage and run AI agents")}`
    );
  }
  console.log();
}

export function showStatus() {
  const config = readConfig();
  const hasWallet = !!config.wallet;
  const hasAiKey = !!(config as any).aiApiKey;

  console.log(
    `  ${hasWallet ? icons.check : icons.cross} ${t.dim("Wallet")}    ${hasWallet ? t.cyan(config.wallet.substring(0, 8) + "..." + config.wallet.slice(-4)) : t.muted("not configured")}`
  );
  console.log(
    `  ${icons.check} ${t.dim("API")}       ${t.white(config.apiBase)}`
  );
  console.log(
    `  ${hasAiKey ? icons.check : t.muted("\u25CB")} ${t.dim("AI")}        ${hasAiKey ? t.success((config as any).aiProvider || "gemini") : t.muted("not configured")}`
  );
  console.log(
    `  ${icons.filecoin} ${t.dim("Network")}   ${t.cyan(config.network)}`
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
  console.log(`  ${t.cyan("/generate")}   ${t.dim("Generate a new AI skill")}`);
  console.log(`  ${t.cyan("/publish")}    ${t.dim("Publish to marketplace")}`);
  console.log(`  ${t.cyan("/install")}    ${t.dim("Install a skill by name")}`);
  console.log(`  ${t.cyan("/list")}       ${t.dim("Browse marketplace")}`);
  console.log(`  ${t.cyan("/status")}     ${t.dim("Show config status")}`);
  console.log(`  ${t.cyan("/help")}       ${t.dim("Show commands")}`);
  console.log(`  ${t.cyan("/exit")}       ${t.dim("Exit")}`);
  console.log();
}

export { VERSION };
