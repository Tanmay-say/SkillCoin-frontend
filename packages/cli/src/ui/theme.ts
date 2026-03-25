import chalk from "chalk";

export const t = {
  brand: chalk.hex("#7b61ff"),
  brandBold: chalk.hex("#7b61ff").bold,
  cyan: chalk.hex("#00d4ff"),
  cyanBold: chalk.hex("#00d4ff").bold,
  success: chalk.hex("#10b981"),
  successBold: chalk.hex("#10b981").bold,
  warn: chalk.hex("#f59e0b"),
  warnBold: chalk.hex("#f59e0b").bold,
  error: chalk.hex("#ef4444"),
  errorBold: chalk.hex("#ef4444").bold,
  dim: chalk.dim,
  dimItalic: chalk.dim.italic,
  bold: chalk.bold,
  white: chalk.white,
  muted: chalk.hex("#6b7280"),
  label: chalk.hex("#9ca3af"),
  separator: chalk.hex("#374151"),
};

export const icons = {
  check: t.success("\u2713"),
  cross: t.error("\u2717"),
  warn: t.warn("!"),
  arrow: t.brand("\u203A"),
  dot: t.muted("\u00B7"),
  bullet: t.brand("\u25B8"),
  filecoin: t.cyan("\u25C6"),
  ai: t.brand("\u25C6"),
  skill: t.cyan("\u25CF"),
  chain: t.success("\u2192"),
};
