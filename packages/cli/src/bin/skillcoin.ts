import { Command } from "commander";
import { installCommand } from "../commands/install";
import { publishCommand } from "../commands/publish";
import { listCommand } from "../commands/list";
import { searchCommand } from "../commands/search";
import { configCommand } from "../commands/config";
import { registerAgentCommand } from "../commands/register-agent";

const program = new Command();

program
  .name("skillcoin")
  .description("npm for AI Agent Skills — Decentralized, Paid, Permanent")
  .version("0.2.2");

// Register commands
installCommand(program);
publishCommand(program);
listCommand(program);
searchCommand(program);
configCommand(program);

// ERC-8004 agent registration
program
  .command("register-agent")
  .description("Register SkillCoin as an ERC-8004 AI agent on Base Sepolia (NFT on-chain)")
  .action(registerAgentCommand);

program.parse();

