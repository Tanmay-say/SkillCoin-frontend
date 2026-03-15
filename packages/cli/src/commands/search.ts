import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { listMarketplaceSkills } from "../lib/api";

export function searchCommand(program: Command) {
  program
    .command("search [query]")
    .alias("s")
    .description("Search the Skillcoin marketplace")
    .action(async (query?: string) => {
      console.log();
      console.log(chalk.bold.cyan("  🔍 Skillcoin Marketplace"));
      console.log(chalk.dim("  ─────────────────────────"));
      console.log();

      const spinner = ora({
        text: chalk.dim(query ? `Searching for "${query}"...` : "Fetching skills..."),
        color: "cyan",
      }).start();

      try {
        const { skills, total } = await listMarketplaceSkills(1, 20);

        if (skills.length === 0) {
          spinner.info(chalk.yellow("No skills found on the marketplace"));
          console.log(
            chalk.dim(
              `  Run ${chalk.white("skillcoin publish skill.md")} to publish one!`
            )
          );
          console.log();
          return;
        }

        spinner.succeed(chalk.green(`${total} skill(s) on marketplace`));
        console.log();

        // Filter by query if provided
        let filtered = skills;
        if (query) {
          const q = query.toLowerCase();
          filtered = skills.filter(
            (s) =>
              s.name.toLowerCase().includes(q) ||
              s.slug.toLowerCase().includes(q) ||
              (s.description || "").toLowerCase().includes(q) ||
              (s.tags || []).some((t) => t.toLowerCase().includes(q))
          );

          if (filtered.length === 0) {
            console.log(chalk.yellow(`  No skills match "${query}"`));
            console.log();
            return;
          }
        }

        // Table header
        console.log(
          chalk.dim("  ") +
            chalk.bold(
              padRight("Name", 25) +
                padRight("Version", 10) +
                padRight("Category", 12) +
                padRight("Price", 12) +
                "Downloads"
            )
        );
        console.log(chalk.dim("  " + "─".repeat(72)));

        for (const s of filtered) {
          const price =
            Number(s.priceAmount) === 0
              ? chalk.green("Free")
              : `${s.priceAmount} ${s.priceCurrency}`;

          console.log(
            "  " +
              chalk.cyan(padRight(s.slug, 25)) +
              chalk.white(padRight(s.version || "—", 10)) +
              chalk.dim(padRight(s.category || "—", 12)) +
              padRight(price, 12) +
              chalk.dim(String(s.downloads || 0))
          );
        }

        console.log();
        console.log(
          chalk.dim(
            `  Install: ${chalk.white("skillcoin install <name>")}`
          )
        );
        console.log();
      } catch (error: any) {
        spinner.fail(chalk.red("Failed to fetch marketplace"));
        console.log(chalk.dim(`  Error: ${error.message}`));
        console.log(
          chalk.dim(
            "  Make sure the API server is running on localhost:3001"
          )
        );
        console.log();
      }
    });
}

function padRight(str: string, length: number): string {
  if (str.length >= length) return str.substring(0, length - 1) + " ";
  return str + " ".repeat(length - str.length);
}
