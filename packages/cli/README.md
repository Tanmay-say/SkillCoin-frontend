<p align="center">
  <img src="https://raw.githubusercontent.com/Tanmay-say/SkillCoin-frontend/main/docs/banner.png" alt="SkillCoin CLI" width="100%" />
</p>

<h1 align="center">skillcoin</h1>

<p align="center">
  <b>The npm for AI Agent Skills</b><br/>
  Discover, install, publish, and generate AI skills — stored permanently on Filecoin/IPFS.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/skillcoin"><img src="https://img.shields.io/npm/v/skillcoin.svg?style=flat-square&label=npm&color=00d4ff" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-ffd700.svg?style=flat-square" /></a>
  <a href="https://skillcoin.vercel.app"><img src="https://img.shields.io/badge/Marketplace-Live-00c853.svg?style=flat-square" /></a>
</p>

---

## Installation

```bash
# Install globally (recommended)
npm install -g skillcoin

# Or run without installing
npx skillcoin <command>
```

**Required setup after install:**

```bash
# Point the CLI at the production API
skillcoin config --api-base https://skillcoin-api.vercel.app

# Optional: add a wallet private key for paid skills
skillcoin config --key 0xYOUR_PRIVATE_KEY

# Optional: add an AI key (for chat and project commands)
skillcoin config --provider gemini --ai-key YOUR_GEMINI_KEY
```

---

## Quick Start

```bash
# Browse the marketplace
skillcoin search

# Search by keyword
skillcoin search "code review"

# Install a free skill
skillcoin install data-visualizer

# Install a paid skill (opens MetaMask in your browser)
skillcoin install seo-blog-writer

# See what you have installed
skillcoin list

# Publish your own skill
skillcoin publish my-skill.md --name my-skill --desc "An awesome AI skill" --price 0.5
```

---

## All Commands

### `skillcoin config` — Configure the CLI

Stored at `~/.skillcoin/config.json`.

```bash
skillcoin config                                       # View current config
skillcoin config --api-base https://skillcoin-api.vercel.app
skillcoin config --key 0xYOUR_PRIVATE_KEY              # Auto-derives wallet address
skillcoin config --wallet 0xYourAddress                # Set wallet (no signing)
skillcoin config --provider gemini --ai-key YOUR_KEY   # Gemini AI
skillcoin config --provider openai  --ai-key sk-...    # OpenAI
skillcoin config --provider groq    --ai-key gsk_...   # Groq
skillcoin config --ai-model gemini-2.0-flash           # Override model
skillcoin config --gateway https://ipfs.io/ipfs        # IPFS gateway
skillcoin config --network calibration                 # or mainnet
skillcoin config --default-ide cursor                  # cursor | claude-code | windsurf | vscode
skillcoin config --clarification-rounds 3              # Questions per project init
skillcoin config --project-output-mode full            # lean | standard | full
```

| Option | Description | Default |
|--------|-------------|---------|
| `--api-base` | Skillcoin API URL | *(must be set)* |
| `--key` | Wallet private key | — |
| `--wallet` | Wallet address | — |
| `--provider` | AI provider | `gemini` |
| `--ai-key` | AI provider API key | — |
| `--ai-model` | Model name | *(provider default)* |
| `--gateway` | IPFS gateway | `https://ipfs.io/ipfs` |
| `--network` | Filecoin network | `calibration` |
| `--default-ide` | Default project IDE | `cursor` |
| `--clarification-rounds` | Project wizard questions | `2` |
| `--project-output-mode` | Bundle density | `standard` |

---

### `skillcoin search` — Browse the Marketplace

Aliases: `s`

```bash
skillcoin search               # List all skills
skillcoin search seo           # Search by keyword
skillcoin search "data viz"
```

```
  🔍 Skillcoin Marketplace
  ─────────────────────────

  Name                     Version   Category    Price       Downloads
  ────────────────────────────────────────────────────────────────────────
  seo-blog-writer          1.0.0     marketing   0.5 USDC    12
  data-visualizer          1.0.0     analytics   Free        7
```

---

### `skillcoin install` — Install a Skill

Aliases: `i`

```bash
skillcoin install seo-blog-writer          # Install (free or paid)
skillcoin install seo-blog-writer -f       # Force reinstall
skillcoin install free-tool --no-payment   # Skip payment check
```

**What happens step by step:**
1. Fetches metadata from the marketplace API
2. If paid: opens `localhost:7402` for MetaMask payment (USDC or TFIL)
3. Downloads from Filecoin/IPFS (`ipfs.io` → `w3s.link` → `cloudflare-ipfs.com`)
4. Extracts ZIPs, saves markdown files
5. Writes `manifest.json` with CID, version, and install date

**Installed at:** `~/.skillcoin/skills/<name>/`

Options:
- `-f, --force` — Overwrite if already installed
- `--no-payment` — Skip payment (only works for free skills)

---

### `skillcoin publish` — Publish a Skill

Accepts `.md`, `.txt`, and `.zip` files.

```bash
# Minimal publish
skillcoin publish my-skill.md

# Full publish
skillcoin publish my-skill.md \
  --name my-skill \
  --desc "Writes SEO-optimized blog posts in markdown" \
  --category marketing \
  --tags "seo,blog,writing" \
  --price 0.5 \
  --currency USDC \
  --version 1.2.0

# Publish free skill
skillcoin publish my-skill.md --price 0 --currency FREE

# Publish ZIP bundle
skillcoin publish agent-kit.zip --name agent-kit

# Direct Filecoin upload (no API dependency)
skillcoin publish my-skill.md --storage filecoin-pin
```

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `-n, --name` | Skill slug | filename stem |
| `-d, --desc` | Description | auto |
| `-c, --category` | Category | `coding` |
| `-t, --tags` | Comma-separated tags | — |
| `-p, --price` | Price amount | `0.5` |
| `--currency` | `USDC` / `TFIL` / `FREE` | `USDC` |
| `-v, --version` | Semver string | `1.0.0` |
| `-s, --storage` | `api` or `filecoin-pin` | `api` |

**After publish you get:**
```
  ✓ Skill stored on Filecoin permanently

  Storage Details
  ───────────────────────────────────
  CID:         QmYourRootCIDHere...
  Storage:     filecoin
  Skill ID:    abc123

  Access URLs (use any to download)
  ───────────────────────────────────
  IPFS     https://ipfs.io/ipfs/QmYour...
  W3S      https://w3s.link/ipfs/QmYour...
  CF       https://cloudflare-ipfs.com/ipfs/QmYour...

  Install:  skillcoin install my-skill
```

---

### `skillcoin list` — View Installed Skills

Aliases: `ls`

```bash
skillcoin list
```

```
  📦 Installed Skills
  ─────────────────────────

  Name                     Version     Category       Installed
  ─────────────────────────────────────────────────────────────────
  seo-blog-writer          1.0.0       marketing      3/11/2026
  data-visualizer          1.0.0       analytics      3/15/2026

  2 skill(s) installed
  Location: ~/.skillcoin/skills
```

---

### `skillcoin chat` — AI Chat REPL

Interactive skill development with streaming AI responses.

```bash
skillcoin chat                                # Use configured provider
skillcoin chat --provider openai             # Override provider
skillcoin chat --api-key sk-... --model gpt-4o
```

**In-REPL slash commands:**
| Command | What it does |
|---------|-------------|
| `/generate <desc>` | Generate a SKILL.md from a prompt |
| `/save <filename>` | Save the last generated skill to disk |
| `/publish <file>` | Quick publish from the REPL |
| `/install <name>` | Get the install command |
| `/list` | Browse marketplace skills |
| `/status` | Show wallet and provider info |
| `/clear` | Clear conversation history |
| `/help` | List all slash commands |
| `/exit` | Quit |

**Example workflow:**
```bash
skillcoin chat

> Create a skill for writing user interview reports

  ✦ [AI streams a SKILL.md]

  ✓ Skill detected! Use /save to save it.

> /save interview-report.md
  ✓ Saved to ./interview-report.md
    Publish with: skillcoin publish interview-report.md

> /exit
```

---

### `skillcoin project` — AI Project Bundle Generator

Generate IDE-native context files for Cursor, Claude Code, Windsurf, or VS Code.

#### `skillcoin project init` / `create`

```bash
# Interactive wizard (no args)
skillcoin project init

# Inline prompt
skillcoin project init --prompt "Build a SaaS analytics dashboard with auth"

# From a PRD/brief file
skillcoin project create brief.md

# Full options
skillcoin project init \
  --prompt "E-commerce checkout" \
  --ide cursor \
  --mode full \
  --out ./my-project
```

**Supported IDEs:** `cursor` · `claude-code` · `windsurf` · `vscode`  
**Bundle modes:** `lean` · `standard` · `full`

**Generated files (standard mode):**
```
.skillcoin/project-spec.json
.cursor/rules/project.mdc    (for Cursor IDE)
CLAUDE.md                    (for Claude Code)
PROJECT-PLAN.md
CONTEXT.md
```

#### `skillcoin project refine`

Regenerate bundle from an existing spec without going through the wizard again:

```bash
skillcoin project refine
```

#### `skillcoin project status`

Check bundle status for the current directory:

```bash
skillcoin project status
```

#### `skillcoin project export-skill`

Package the project bundle as a publishable skill:

```bash
skillcoin project export-skill
# Creates: .skillcoin/exported-skill/SKILL.md + manifest.json
# Then: skillcoin publish .skillcoin/exported-skill/SKILL.md
```

---

### `skillcoin agent` — Custom AI Agents

Create and run personal AI agents with skill context.

```bash
skillcoin agent create           # Interactive agent wizard
skillcoin agent list             # List all saved agents
skillcoin agent run <name>       # Start chat with an agent
skillcoin agent delete <name>    # Remove an agent
```

**Example:**
```bash
skillcoin agent create
  ? Agent name (kebab-case): blog-writer
  ? What does this agent do? Writes SEO content
  ? AI provider: gemini
  ? Skills to load: seo-blog-writer,content-planner
  ? Custom system prompt: Always respond in Markdown

  ✓ Agent 'blog-writer' created!
  Run it: skillcoin agent run blog-writer

skillcoin agent run blog-writer
  ✓ Connected to gemini (gemini-2.0-flash)
  blog-writer ❯ Write a post about decentralized AI
  ✦ [AI streams response...]
```

---

### `skillcoin register-agent` — ERC-8004 On-Chain Registration

Register SkillCoin as a verifiable AI agent on Base Sepolia. Uploads an agent card to Filecoin and mints an NFT on the ERC-8004 Identity Registry.

```bash
export FILECOIN_PRIVATE_KEY=0xYourKey
export FILECOIN_WALLET_ADDRESS=0xYourAddress

skillcoin register-agent
```

**Steps executed:**
1. Builds agent card JSON (capabilities, endpoints, contract addresses)
2. Uploads to Filecoin Pin (gets Root CID + daily PDP proofs)
3. Registers `ipfs://<rootCid>` as NFT on ERC-8004 registry
4. Saves `agent-registration.json`

Requires Base Sepolia ETH: https://faucet.quicknode.com/base/sepolia

---

## How Storage Works

1. **Upload** — Skills are stored via the `@filoz/synapse-sdk` on Filecoin Calibration. Each upload returns an IPFS-compatible Root CID and a Filecoin Piece CID with daily **PDP (Provable Data Possession)** proofs.

2. **Retrieval** — The CLI downloads from multiple IPFS gateways with automatic fallback: `ipfs.io` → `w3s.link` → `cloudflare-ipfs.com`

3. **Verification** — Every Filecoin-stored skill has a public proof URL: `https://pdp.vxb.ai/calibration/dataset/<id>`

4. **Payments** — Paid skills use an x402 micropayment flow. The CLI opens a local browser page for MetaMask approval, then verifies the transaction on-chain before releasing the download.

---

## Local Data

```
~/.skillcoin/
├── config.json               # Settings: API URL, wallet, AI key, provider
├── agents/
│   └── my-agent.json         # Saved agent profiles
└── skills/
    └── seo-blog-writer/
        ├── seo-blog-writer.md # Skill content (or extracted ZIP files)
        └── manifest.json      # CID, version, category, install date
```

---

## Contributing to the CLI

```bash
git clone https://github.com/Tanmay-say/SkillCoin-frontend.git
cd SkillCoin-frontend/packages/cli
pnpm install
pnpm run build
node dist/bin/skillcoin.js --version

# Watch mode for development
pnpm run dev
```

To add a command:
1. Create `src/commands/my-command.ts`
2. Export `myCommand(program: Command)`
3. Register it in `src/index.ts`
4. Run `pnpm run build`

---

## License

MIT
