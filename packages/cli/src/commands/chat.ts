import { Command } from "commander";
import chalk from "chalk";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import { showBanner, showHelp, showStatus, showSeparator } from "../ui/banner";
import { t, icons } from "../ui/theme";
import { createAiChat, type AiChat, type AiMessage } from "../lib/ai-provider";
import { readConfig, writeConfig } from "../lib/config";
import { listMarketplaceSkills, uploadSkill } from "../lib/api";

export function chatCommand(program: Command) {
  program
    .command("chat")
    .description("Interactive AI chat — Claude Code-style REPL for skill development")
    .option("--provider <provider>", "AI provider override (gemini | openai | groq)")
    .option("--api-key <key>", "API key override")
    .option("--model <model>", "Model override")
    .action(async (options: any) => {
      if (options.provider) writeConfig({ aiProvider: options.provider });
      if (options.apiKey) writeConfig({ aiApiKey: options.apiKey });
      if (options.model) writeConfig({ aiModel: options.model });

      await startChat();
    });
}

async function startChat() {
  showBanner("chat");

  let ai: AiChat;
  try {
    ai = await createAiChat();
    console.log(
      `  ${icons.check} ${t.dim("Connected to")} ${t.brandBold(ai.provider)} ${t.dim(`(${ai.model})`)}`
    );
  } catch (err: any) {
    console.log(`  ${icons.cross} ${t.error(err.message)}`);
    console.log();
    console.log(`  ${t.dim("Quick setup:")}`);
    console.log(`  ${t.cyan("skillcoin config --provider gemini --ai-key YOUR_KEY")}`);
    console.log();
    return;
  }

  showSeparator();
  showHelp();
  showSeparator();
  console.log();

  const history: AiMessage[] = [];
  let lastGeneratedSkill = "";

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `  ${t.brand("❯")} `,
    terminal: true,
  });

  rl.prompt();

  rl.on("line", async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) {
      rl.prompt();
      return;
    }

    if (trimmed.startsWith("/")) {
      await handleSlashCommand(trimmed, rl, ai, history, {
        get lastSkill() { return lastGeneratedSkill; },
        set lastSkill(v) { lastGeneratedSkill = v; },
      });
      rl.prompt();
      return;
    }

    history.push({ role: "user", content: trimmed });

    console.log();
    process.stdout.write(`  ${icons.ai} `);

    try {
      const response = await ai.sendStream(history, (chunk) => {
        process.stdout.write(chunk);
      });
      console.log();
      console.log();

      history.push({ role: "assistant", content: response.content });

      if (response.content.includes("---\nname:") || response.content.startsWith("---")) {
        lastGeneratedSkill = response.content;
        console.log(
          `  ${icons.check} ${t.dim("Skill detected! Use")} ${t.cyan("/save <filename>")} ${t.dim("to save it.")}`
        );
        console.log();
      }
    } catch (err: any) {
      console.log();
      console.log(`  ${icons.cross} ${t.error(err.message)}`);
      console.log();
      history.pop();
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log();
    console.log(`  ${t.dim("Goodbye!")} ${icons.filecoin}`);
    console.log();
    process.exit(0);
  });
}

async function handleSlashCommand(
  input: string,
  rl: readline.Interface,
  ai: AiChat,
  history: AiMessage[],
  state: { lastSkill: string }
) {
  const parts = input.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const arg = parts.slice(1).join(" ");

  switch (cmd) {
    case "/help":
      showHelp();
      break;

    case "/status":
      showStatus();
      break;

    case "/exit":
    case "/quit":
      rl.close();
      break;

    case "/clear":
      history.length = 0;
      state.lastSkill = "";
      console.log(`  ${icons.check} ${t.dim("Conversation cleared")}`);
      console.log();
      break;

    case "/generate": {
      if (!arg) {
        console.log(`  ${t.dim("Usage:")} ${t.cyan("/generate <description of the skill>")}`);
        console.log();
        break;
      }

      console.log();
      process.stdout.write(`  ${icons.ai} ${t.dim("Generating skill...")} `);

      const prompt = `Generate a complete SKILL.md for: ${arg}\n\nOutput ONLY the SKILL.md content, starting with --- frontmatter.`;
      history.push({ role: "user", content: prompt });

      try {
        const response = await ai.sendStream(history, (chunk) => {
          process.stdout.write(chunk);
        });
        console.log();
        console.log();

        history.push({ role: "assistant", content: response.content });
        state.lastSkill = response.content;

        console.log(
          `  ${icons.check} ${t.dim("Skill generated! Use")} ${t.cyan("/save <filename>")} ${t.dim("to save it.")}`
        );
        console.log();
      } catch (err: any) {
        console.log();
        console.log(`  ${icons.cross} ${t.error(err.message)}`);
        console.log();
        history.pop();
      }
      break;
    }

    case "/save": {
      if (!state.lastSkill) {
        console.log(`  ${t.dim("No skill to save. Use")} ${t.cyan("/generate")} ${t.dim("first.")}`);
        console.log();
        break;
      }

      const filename = arg || "SKILL.md";
      const savePath = path.resolve(filename);

      try {
        let content = state.lastSkill;
        content = content.replace(/^```(?:markdown)?\n?/i, "").replace(/\n?```$/i, "").trim();

        fs.writeFileSync(savePath, content, "utf8");
        console.log(`  ${icons.check} ${t.dim("Saved to")} ${t.cyan(savePath)}`);
        console.log(
          `  ${t.dim("Publish with:")} ${t.cyan(`skillcoin publish ${filename}`)}`
        );
        console.log();
      } catch (err: any) {
        console.log(`  ${icons.cross} ${t.error(`Failed to save: ${err.message}`)}`);
        console.log();
      }
      break;
    }

    case "/publish": {
      if (!arg && !state.lastSkill) {
        console.log(`  ${t.dim("Usage:")} ${t.cyan("/publish <file.md>")}`);
        console.log(`  ${t.dim("Or generate a skill first with")} ${t.cyan("/generate")}`);
        console.log();
        break;
      }

      let filePath = arg;
      if (!filePath && state.lastSkill) {
        const tmpPath = path.join(process.cwd(), ".skillcoin-temp-skill.md");
        fs.writeFileSync(tmpPath, state.lastSkill, "utf8");
        filePath = tmpPath;
      }

      console.log(`  ${t.dim("Publishing")} ${t.cyan(filePath)}${t.dim("...")}`);
      console.log(
        `  ${t.dim("Use the CLI for full publish:")} ${t.cyan(`skillcoin publish ${filePath}`)}`
      );
      console.log();
      break;
    }

    case "/install": {
      if (!arg) {
        console.log(`  ${t.dim("Usage:")} ${t.cyan("/install <skill-name>")}`);
        console.log();
        break;
      }
      console.log(
        `  ${t.dim("Run in your terminal:")} ${t.cyan(`skillcoin install ${arg}`)}`
      );
      console.log();
      break;
    }

    case "/list": {
      console.log(`  ${t.dim("Fetching marketplace skills...")}`);
      try {
        const { skills, total } = await listMarketplaceSkills(1, 10);
        console.log();
        console.log(`  ${t.brandBold("Marketplace")} ${t.dim(`(${total} skills)`)}`);
        console.log();

        for (const s of skills) {
          const price = Number(s.priceAmount) === 0 ? t.success("FREE") : t.warn(`${s.priceAmount} ${s.priceCurrency}`);
          console.log(
            `  ${icons.bullet} ${t.bold(s.name)} ${t.dim(`v${s.version}`)}  ${price}  ${t.dim(`${s.downloads} downloads`)}`
          );
          console.log(`    ${t.muted(s.description?.substring(0, 70) || "")}`);
        }
        console.log();
      } catch (err: any) {
        console.log(`  ${icons.cross} ${t.error(err.message)}`);
        console.log();
      }
      break;
    }

    default:
      console.log(`  ${t.dim("Unknown command:")} ${t.warn(cmd)}`);
      console.log(`  ${t.dim("Type")} ${t.cyan("/help")} ${t.dim("for available commands")}`);
      console.log();
      break;
  }
}
