import { Command } from "commander";
import chalk from "chalk";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import { showBanner, showSeparator } from "../ui/banner";
import { t, icons } from "../ui/theme";
import { readConfig, writeConfig, SKILLCOIN_DIR } from "../lib/config";
import { createAiChat, type AiChat, type AiMessage } from "../lib/ai-provider";

const AGENTS_DIR = path.join(SKILLCOIN_DIR, "agents");

interface AgentProfile {
  name: string;
  description: string;
  provider: string;
  model: string;
  skills: string[];
  systemPrompt: string;
  createdAt: string;
}

function ensureAgentsDir() {
  if (!fs.existsSync(AGENTS_DIR)) {
    fs.mkdirSync(AGENTS_DIR, { recursive: true });
  }
}

function loadAgent(name: string): AgentProfile | null {
  const agentPath = path.join(AGENTS_DIR, `${name}.json`);
  if (!fs.existsSync(agentPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(agentPath, "utf8"));
  } catch {
    return null;
  }
}

function saveAgent(agent: AgentProfile) {
  ensureAgentsDir();
  const agentPath = path.join(AGENTS_DIR, `${agent.name}.json`);
  fs.writeFileSync(agentPath, JSON.stringify(agent, null, 2), "utf8");
}

function listAgents(): AgentProfile[] {
  ensureAgentsDir();
  const files = fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".json"));
  return files
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(AGENTS_DIR, f), "utf8"));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`  ${t.brand("?")} ${t.white(question)} `, (answer) => {
      resolve(answer.trim());
    });
  });
}

export function agentCommand(program: Command) {
  const agent = program
    .command("agent")
    .description("Create, manage, and run AI agents with custom skills");

  agent
    .command("create")
    .description("Create a new AI agent with an interactive wizard")
    .action(async () => {
      showBanner("agent");
      console.log(`  ${t.brandBold("Agent Creation Wizard")}`);
      showSeparator();
      console.log();

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      try {
        const name = await ask(rl, "Agent name (kebab-case):");
        if (!name || !/^[a-z0-9-]+$/.test(name)) {
          console.log(`  ${icons.cross} ${t.error("Name must be lowercase letters, numbers, and hyphens only")}`);
          rl.close();
          return;
        }

        const existing = loadAgent(name);
        if (existing) {
          console.log(`  ${icons.warn} ${t.warn(`Agent '${name}' already exists. It will be overwritten.`)}`);
        }

        const description = await ask(rl, "What does this agent do?");
        const config = readConfig();
        const providerInput = await ask(rl, `AI provider (${t.dim(`default: ${config.aiProvider || "gemini"}`)}):`);
        const provider = providerInput || config.aiProvider || "gemini";

        const modelInput = await ask(rl, `Model name (${t.dim("leave blank for default")}):`);
        const model = modelInput || "";

        const skillsInput = await ask(rl, "Skills to load (comma-separated skill names, or blank):");
        const skills = skillsInput ? skillsInput.split(",").map((s) => s.trim()).filter(Boolean) : [];

        const systemPrompt = await ask(
          rl,
          `Custom system prompt (${t.dim("leave blank for default")}):`
        );

        const agent: AgentProfile = {
          name,
          description: description || `AI agent: ${name}`,
          provider,
          model,
          skills,
          systemPrompt: systemPrompt || "",
          createdAt: new Date().toISOString(),
        };

        saveAgent(agent);

        console.log();
        console.log(`  ${icons.check} ${t.successBold(`Agent '${name}' created!`)}`);
        console.log();
        console.log(`  ${t.dim("Run it:")} ${t.cyan(`skillcoin agent run ${name}`)}`);
        console.log(`  ${t.dim("List all:")} ${t.cyan("skillcoin agent list")}`);
        console.log();

        rl.close();
      } catch (err: any) {
        console.log(`  ${icons.cross} ${t.error(err.message)}`);
        rl.close();
      }
    });

  agent
    .command("list")
    .description("List all saved agents")
    .action(async () => {
      const agents = listAgents();

      console.log();
      console.log(`  ${t.brandBold("Saved Agents")} ${t.dim(`(${agents.length})`)}`);
      showSeparator();
      console.log();

      if (agents.length === 0) {
        console.log(`  ${t.dim("No agents created yet.")}`);
        console.log(`  ${t.dim("Create one with:")} ${t.cyan("skillcoin agent create")}`);
        console.log();
        return;
      }

      for (const a of agents) {
        console.log(
          `  ${icons.ai} ${t.bold(a.name)}  ${t.dim(a.provider)}${a.model ? t.dim(`/${a.model}`) : ""}`
        );
        console.log(`    ${t.muted(a.description)}`);
        if (a.skills.length > 0) {
          console.log(
            `    ${t.dim("Skills:")} ${a.skills.map((s) => t.cyan(s)).join(", ")}`
          );
        }
        console.log(`    ${t.dim("Created:")} ${new Date(a.createdAt).toLocaleDateString()}`);
        console.log();
      }
    });

  agent
    .command("run <name>")
    .description("Run a saved agent in interactive chat mode")
    .action(async (name: string) => {
      const agentProfile = loadAgent(name);
      if (!agentProfile) {
        console.log();
        console.log(`  ${icons.cross} ${t.error(`Agent '${name}' not found`)}`);
        console.log(`  ${t.dim("Create it with:")} ${t.cyan("skillcoin agent create")}`);
        console.log();
        return;
      }

      showBanner("agent");
      console.log(
        `  ${icons.ai} ${t.brandBold(agentProfile.name)}  ${t.dim(agentProfile.description)}`
      );
      console.log(
        `  ${t.dim("Provider:")} ${t.white(agentProfile.provider)}  ${t.dim("Model:")} ${t.white(agentProfile.model || "default")}`
      );

      if (agentProfile.skills.length > 0) {
        console.log(
          `  ${t.dim("Skills:")} ${agentProfile.skills.map((s) => t.cyan(s)).join(", ")}`
        );
      }

      showSeparator();
      console.log();

      if (agentProfile.provider) {
        writeConfig({ aiProvider: agentProfile.provider as any });
      }
      if (agentProfile.model) {
        writeConfig({ aiModel: agentProfile.model });
      }

      let ai: AiChat;
      try {
        ai = await createAiChat();
        console.log(
          `  ${icons.check} ${t.dim("Connected to")} ${t.brandBold(ai.provider)} ${t.dim(`(${ai.model})`)}`
        );
      } catch (err: any) {
        console.log(`  ${icons.cross} ${t.error(err.message)}`);
        console.log();
        return;
      }

      console.log(
        `  ${t.dim("Type your message or")} ${t.cyan("/exit")} ${t.dim("to stop.")}`
      );
      console.log();

      const history: AiMessage[] = [];

      if (agentProfile.systemPrompt) {
        history.push({ role: "user", content: `[System context] ${agentProfile.systemPrompt}` });
        history.push({ role: "assistant", content: "Understood. I'm ready with that context." });
      }

      if (agentProfile.skills.length > 0) {
        const skillContext = `I have access to these SkillCoin marketplace skills: ${agentProfile.skills.join(", ")}. I can help with tasks related to these skills.`;
        history.push({ role: "user", content: `[Skill context] ${skillContext}` });
        history.push({ role: "assistant", content: "I'm aware of those skills and can assist with them." });
      }

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: `  ${t.brand(agentProfile.name)} ${t.brand("❯")} `,
        terminal: true,
      });

      rl.prompt();

      rl.on("line", async (input: string) => {
        const trimmed = input.trim();
        if (!trimmed) { rl.prompt(); return; }

        if (trimmed === "/exit" || trimmed === "/quit") {
          rl.close();
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
        console.log(`  ${t.dim(`Agent '${agentProfile.name}' session ended.`)} ${icons.filecoin}`);
        console.log();
        process.exit(0);
      });
    });

  agent
    .command("delete <name>")
    .description("Delete a saved agent")
    .action(async (name: string) => {
      const agentPath = path.join(AGENTS_DIR, `${name}.json`);
      if (!fs.existsSync(agentPath)) {
        console.log();
        console.log(`  ${icons.cross} ${t.error(`Agent '${name}' not found`)}`);
        console.log();
        return;
      }

      fs.unlinkSync(agentPath);
      console.log();
      console.log(`  ${icons.check} ${t.success(`Agent '${name}' deleted`)}`);
      console.log();
    });
}
