import { Command } from "commander";
import { installCommand } from "../commands/install";
import { publishCommand } from "../commands/publish";
import { listCommand } from "../commands/list";
import { searchCommand } from "../commands/search";
import { configCommand } from "../commands/config";
import { chatCommand } from "../commands/chat";
import { agentCommand } from "../commands/agent";
import { registerAgentCommand } from "../commands/register-agent";

const program = new Command();

program
  .name("skillcoin")
  .description("npm for AI Agent Skills — Decentralized, Paid, Permanent on Filecoin")
  .version("0.3.0");

installCommand(program);
publishCommand(program);
listCommand(program);
searchCommand(program);
configCommand(program);
chatCommand(program);
agentCommand(program);

program
  .command("register-agent")
  .description("Register SkillCoin as an ERC-8004 AI agent on Base Sepolia (NFT on-chain)")
  .action(registerAgentCommand);

program.parse();
