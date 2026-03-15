import { Command } from "commander";
import { installCommand } from "../commands/install";
import { publishCommand } from "../commands/publish";
import { listCommand } from "../commands/list";
import { searchCommand } from "../commands/search";
import { configCommand } from "../commands/config";

const program = new Command();

program
  .name("skillcoin")
  .description("npm for AI Agent Skills — Decentralized, Paid, Permanent")
  .version("0.2.1");

// Register commands
installCommand(program);
publishCommand(program);
listCommand(program);
searchCommand(program);
configCommand(program);

program.parse();
