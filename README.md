<p align="center">
  <img src="./docs/banner.png" alt="SkillCoin — The npm for AI Agent Skills" width="100%" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/skillcoin"><img src="https://img.shields.io/npm/v/skillcoin.svg?style=flat-square&label=skillcoin&color=00d4ff" alt="npm version" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-ffd700.svg?style=flat-square" alt="License: MIT" /></a>
  <a href="https://skillcoin.vercel.app"><img src="https://img.shields.io/badge/Marketplace-Live-00c853.svg?style=flat-square" alt="Marketplace" /></a>
  <a href="https://calibration.filfox.info/en/address/0x30AcdeB5C03F5E02b0E7e9f22B20cBC4dF182690"><img src="https://img.shields.io/badge/Filecoin-Calibration-blue.svg?style=flat-square" alt="Filecoin" /></a>
  <a href="https://sepolia.basescan.org"><img src="https://img.shields.io/badge/ERC--8004-Base%20Sepolia-purple.svg?style=flat-square" alt="ERC-8004" /></a>
</p>

<p align="center">
  <b>A decentralized marketplace and delivery layer for AI agent skills.</b><br/>
  Publish a SKILL.md. Store it on Filecoin. Let the world install it in one command.
</p>

---

## What is SkillCoin?

SkillCoin is what happens when you take the idea of a package registry — think npm or PyPI — and apply it to AI agent instructions. Instead of shipping JavaScript or Python packages, you ship **skills**: reusable AI instructions, workflow templates, and agent bundles that any developer can discover, purchase, and install in seconds.

Here is the one-line pitch:

> *If you have ever copy-pasted a great prompt into 5 different projects, SkillCoin is what you should have done instead.*

A skill can be:
- A single `SKILL.md` containing system-prompt rules for an AI coding assistant
- A ZIP bundle shipped with templates, manifests, and supporting files
- An entire workflow — like a multi-step research → write → publish agent pipeline

Everything lives on Filecoin with IPFS-compatible CIDs, so your skills are permanently stored, publicly verifiable, and available through any IPFS gateway.

**Live production surfaces:**
| Surface | URL |
|---------|-----|
| 🌐 Marketplace | `https://skillcoin.vercel.app` |
| ⚡ API | `https://skillcoin-api.vercel.app` |
| 📦 CLI Package | `npm install -g skillcoin` |

---

## Quick Start (60 seconds)

```bash
# Install the CLI globally
npm install -g skillcoin

# Point it at production
skillcoin config --api-base https://skillcoin-api.vercel.app

# Browse the marketplace
skillcoin search

# Install any skill
skillcoin install seo-blog-writer

# Done — your skill is in ~/.skillcoin/skills/seo-blog-writer/
```

---

## Use Cases

SkillCoin lives between a prompt library and a package registry. It is for:

- **AI builders** who want to share reusable Claude, Cursor, Codex, or Gemini workflows without a private repo
- **Teams** that are tired of passing that one amazing system prompt around in Slack instead of versioning it
- **Marketplace creators** who want to monetize agent workflows with on-chain payment proof and Filecoin-backed storage
- **Agent developers** who bootstrap new skill projects with one command and AI-assisted clarification

---

## Architecture Overview

The diagram below illustrates the end-to-end SkillCoin use case — from skill authoring and Filecoin storage, all the way through to CLI installation and on-chain verification:

<p align="center">
  <img src="./docs/claude code structure.jpeg" alt="SkillCoin Architecture & Use Case Diagram" width="100%" />
</p>

---

## Repository Layout

```
SkillCoin-frontend/
├── apps/
│   ├── api/                  # Hono backend — skills, auth, payments, Filecoin
│   └── web/                  # Next.js 14 marketplace — browse, publish, generate
├── packages/
│   └── cli/                  # npm package: skillcoin
│       └── src/
│           ├── bin/           # CLI entry point
│           ├── commands/      # All CLI commands (9 total)
│           ├── lib/           # API client, config, download, payment logic
│           └── ui/            # Banner and theme rendering
├── contracts/
│   ├── SkillRegistry.sol      # On-chain skill index (Filecoin FVM)
│   ├── SkillLicenseNFT.sol    # NFT-gated license minting
│   └── deployment.json        # Deployed addresses
├── docs/                      # Documentation and planning files
├── pnpm-workspace.yaml
└── turbo.json
```

---

## How It Works — End to End

### 1 · Authoring

You write a skill as either:
- A **markdown file** (`SKILL.md`, `.md`, `.txt`) — plain AI instructions
- A **ZIP bundle** — instructions plus supporting templates, configs, and assets

Or you use the CLI to generate one:

```bash
skillcoin project init --prompt "Build an agent skill for code review"
```

The CLI asks clarifying questions, then generates a full project bundle with a spec, plan, and IDE-native context files.

### 2 · Publishing

Publishing uploads your file and registers marketplace metadata:

```bash
skillcoin publish my-skill.md \
  --name my-skill \
  --desc "AI code review skill for Claude" \
  --category coding \
  --tags "review,claude,agent" \
  --price 0.5 \
  --currency USDC
```

Under the hood:
1. The file is sent to the API (or directly to Filecoin via `--storage filecoin-pin`)
2. The Synapse SDK uploads it to Filecoin with **PDP (Provable Data Possession)** proofs
3. A root IPFS CID + Filecoin Piece CID are returned
4. Marketplace metadata is written to PostgreSQL / Supabase
5. The skill appears on the public marketplace by slug

### 3 · Discovery

Users find skills in two ways:

- **Web marketplace** at `skillcoin.vercel.app` — browse by category, filter by price, view Filecoin proof
- **CLI search** — `skillcoin search <query>` pulls live results from the API

### 4 · Purchase & Access

For paid skills, SkillCoin uses an **x402 micropayment flow**:

1. CLI fetches a payment challenge from the API (includes recipient, chain, currency, token address)
2. CLI opens a local payment page at `localhost:7402` in the browser
3. User connects MetaMask and approves the transaction
4. CLI polls for the transaction hash, then calls the verify endpoint
5. API returns a short-lived signed download token
6. CLI downloads the actual content using that token

**Supported payment modes:**
| Mode | Currency | Chain |
|------|----------|-------|
| Native | TFIL | Filecoin Calibration (chainId 314159) |
| ERC-20 | USDC | Base Sepolia / any configured EVM chain |

### 5 · Installation

```bash
skillcoin install <skill-name>
```

- Free skills download directly — no wallet needed
- Paid skills open a browser payment page, then resume automatically
- Markdown skills are written to `~/.skillcoin/skills/<name>/`
- ZIP skills are extracted into the same directory
- A `manifest.json` is saved alongside with version, CID, and category

### 6 · Verification

Every skill stored on Filecoin has a publicly verifiable proof:

```
https://pdp.vxb.ai/calibration/dataset/<datasetId>
```

The on-chain `SkillRegistry` contract (deployed on Filecoin FVM Calibration) stores name, CID, creator address, and price for every registered skill — making piracy prevention and purchase auditability on-chain.

---

## CLI Reference — A to Z

Install the CLI:

```bash
# Global install (recommended)
npm install -g skillcoin

# Or run without installing
npx skillcoin <command>
```

### `skillcoin config`

View or update CLI configuration. Config is stored at `~/.skillcoin/config.json`.

```bash
# View current configuration
skillcoin config

# Set the API server (required for most commands)
skillcoin config --api-base https://skillcoin-api.vercel.app

# Set your wallet private key (auto-derives wallet address)
skillcoin config --key 0xYOUR_PRIVATE_KEY

# Set just the wallet address (for display only, no signing)
skillcoin config --wallet 0xYourAddress

# Set AI provider and key
skillcoin config --provider gemini --ai-key YOUR_GEMINI_KEY

# Set a specific AI model
skillcoin config --ai-model gemini-2.0-flash

# Use OpenAI
skillcoin config --provider openai --ai-key sk-...

# Use Groq
skillcoin config --provider groq --ai-key gsk_...

# Set IPFS gateway
skillcoin config --gateway https://ipfs.io/ipfs

# Set Filecoin network
skillcoin config --network calibration   # or mainnet

# Set default IDE for project bundles
skillcoin config --default-ide cursor         # cursor | claude-code | windsurf | vscode

# Set clarification rounds for project creation
skillcoin config --clarification-rounds 3

# Set project output mode
skillcoin config --project-output-mode standard   # lean | standard | full
```

**All configuration options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--api-base <url>` | Skillcoin API base URL | *(must be set)* |
| `--key <privateKey>` | Wallet private key for payments | — |
| `--wallet <address>` | Wallet address (display only) | — |
| `--provider <name>` | AI provider: `gemini`, `openai`, `groq` | `gemini` |
| `--ai-key <key>` | API key for your AI provider | — |
| `--ai-model <model>` | Model name override | *(provider default)* |
| `--gateway <url>` | IPFS gateway URL | `https://ipfs.io/ipfs` |
| `--network <name>` | Filecoin network: `calibration` or `mainnet` | `calibration` |
| `--auth-token <jwt>` | Manual JWT token for API auth | — |
| `--default-ide <ide>` | Default IDE for project bundles | `cursor` |
| `--clarification-rounds <n>` | Questions per project init | `2` |
| `--project-output-mode <mode>` | Bundle mode: `lean`, `standard`, `full` | `standard` |

---

### `skillcoin search`

Search the marketplace. Aliases: `s`

```bash
# Browse all skills
skillcoin search

# Search by keyword
skillcoin search seo
skillcoin search "code review"
skillcoin search data
```

**Example output:**
```
  🔍 Skillcoin Marketplace
  ─────────────────────────

  Name                     Version   Category    Price       Downloads
  ────────────────────────────────────────────────────────────────────────
  seo-blog-writer          1.0.0     marketing   0.5 USDC    12
  data-visualizer          1.0.0     analytics   Free        7
```

---

### `skillcoin install`

Install a skill from the marketplace. Aliases: `i`

```bash
# Install by name
skillcoin install seo-blog-writer

# Force reinstall (overwrite existing)
skillcoin install seo-blog-writer --force
skillcoin install seo-blog-writer -f

# Install free skill, skipping payment prompt
skillcoin install free-skill --no-payment
```

**What happens:**
1. Fetches skill metadata from the API
2. If paid: opens browser payment page at `localhost:7402`, waits for MetaMask confirmation
3. Downloads from Filecoin/IPFS (tries `ipfs.io`, `w3s.link`, `cloudflare-ipfs.com` in order)
4. Extracts ZIPs automatically; saves markdown files directly
5. Writes `manifest.json` with CID, version, and category

**Installed skill location:**
```
~/.skillcoin/skills/
└── seo-blog-writer/
    ├── seo-blog-writer.md    # The skill file
    └── manifest.json          # Metadata: CID, version, category
```

---

### `skillcoin publish`

Publish a skill file to the marketplace. Accepts `.md`, `.txt`, and `.zip` files.

```bash
# Publish a markdown skill (default: via API server)
skillcoin publish my-skill.md

# Full publish with all metadata
skillcoin publish my-skill.md \
  --name my-skill \
  --desc "A skill for writing SEO-optimized blog posts" \
  --category marketing \
  --tags "seo,blog,writing,content" \
  --price 0.5 \
  --currency USDC \
  --version 1.0.0

# Publish a free skill
skillcoin publish my-skill.md --price 0 --currency FREE

# Pay with TFIL (Filecoin native token)
skillcoin publish my-skill.md --price 0.1 --currency TFIL

# Publish a ZIP bundle
skillcoin publish my-skill-bundle.zip --name my-skill-bundle

# Direct Filecoin upload (bypasses API, still registers on marketplace)
skillcoin publish my-skill.md --storage filecoin-pin
```

**Publish options:**
| Option | Description | Default |
|--------|-------------|---------|
| `-n, --name <name>` | Skill slug/name | filename without extension |
| `-d, --desc <text>` | Description | auto-generated |
| `-c, --category <cat>` | Category | `coding` |
| `-t, --tags <tags>` | Comma-separated tags | — |
| `-p, --price <amount>` | Price number | `0.5` |
| `--currency <cur>` | `USDC`, `TFIL`, or `FREE` | `USDC` |
| `-v, --version <ver>` | Version string | `1.0.0` |
| `-s, --storage <method>` | `api` (default) or `filecoin-pin` | `api` |

**Available categories:** `coding`, `marketing`, `research`, `analytics`, `writing`, `automation`, `data`, `design`

---

### `skillcoin list`

List all locally installed skills. Aliases: `ls`

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

### `skillcoin chat`

Interactive AI chat REPL for skill development. Streams responses from Gemini, OpenAI, or Groq. Supports slash commands for skill generation and publishing.

```bash
# Start with configured provider
skillcoin chat

# Override provider for this session
skillcoin chat --provider openai --api-key sk-...
skillcoin chat --provider groq --api-key gsk_...

# Override model
skillcoin chat --model gemini-2.0-pro
```

**In-chat slash commands:**
| Command | Description |
|---------|-------------|
| `/generate <description>` | Generate a SKILL.md from a description |
| `/save <filename>` | Save the last generated skill to a file |
| `/publish <file.md>` | Publish a skill file (or use CLI command) |
| `/install <name>` | Get the install command for a skill |
| `/list` | Browse marketplace skills interactively |
| `/status` | Show current wallet and config |
| `/clear` | Clear the conversation history |
| `/help` | Show all available commands |
| `/exit` | Exit the session |

**Example session:**
```
  > Create a skill for writing technical documentation

  ✦ Here is your SKILL.md:
  ---
  name: tech-docs-writer
  ...

  ✓ Skill detected! Use /save tech-docs.md to save it.

  > /save tech-docs.md
  ✓ Saved to /home/user/tech-docs.md
    Publish with: skillcoin publish tech-docs.md
```

---

### `skillcoin project`

Generate IDE-native project context bundles powered by AI. Great for bootstrapping new projects with structured plans, specs, and rule files ready for Cursor, Claude Code, or Windsurf.

#### `skillcoin project create` / `skillcoin project init`

```bash
# Interactive wizard (no args = wizard mode)
skillcoin project init

# From an inline prompt
skillcoin project init --prompt "Build a REST API for managing tasks with auth"

# From a PRD markdown file
skillcoin project create prd.md

# Specify IDE and bundle mode
skillcoin project init \
  --prompt "E-commerce checkout flow" \
  --ide cursor \
  --mode standard \
  --out ./my-project

# Supported IDEs
# cursor | claude-code | windsurf | vscode

# Bundle modes
# lean     — minimal context files
# standard — spec + plan + context rules (default)
# full     — everything above + review prompt + implementation scaffold
```

The wizard asks up to 3 clarifying questions (configurable with `skillcoin config --clarification-rounds`), then generates:

| File | Description |
|------|-------------|
| `.skillcoin/project-spec.json` | Structured project spec |
| `.cursor/rules/project.mdc` | Cursor rule file (for Cursor IDE) |
| `CLAUDE.md` | Claude Code project context |
| `PROJECT-PLAN.md` | Human-readable implementation plan |
| `CONTEXT.md` | Project context and architecture notes |

#### `skillcoin project refine`

Regenerate bundle files from an existing spec (useful after editing the spec manually):

```bash
skillcoin project refine
skillcoin project refine .skillcoin/project-spec.json
```

#### `skillcoin project status`

Check what was generated for the current project:

```bash
skillcoin project status
```

#### `skillcoin project export-skill`

Export the project bundle into a reusable `SKILL.md` + `manifest.json` package that can be published to the marketplace:

```bash
skillcoin project export-skill
```

---

### `skillcoin agent`

Create, save, and run custom AI agents with specific skill configurations, AI providers, and system prompts.

#### `skillcoin agent create`

Interactive wizard to define a new agent:

```bash
skillcoin agent create
```

Asks for: name, description, AI provider, model, skills to load, custom system prompt. Saves to `~/.skillcoin/agents/<name>.json`.

#### `skillcoin agent list`

List all saved agents:

```bash
skillcoin agent list
```

#### `skillcoin agent run <name>`

Start an interactive chat session with a saved agent. The agent is pre-loaded with its skills and system prompt:

```bash
skillcoin agent run my-seo-agent
```

Type `/exit` to end the session.

#### `skillcoin agent delete <name>`

Remove a saved agent profile:

```bash
skillcoin agent delete my-seo-agent
```

---

### `skillcoin register-agent`

Register SkillCoin as an **ERC-8004** AI agent on Base Sepolia. This mints an NFT on the on-chain agent identity registry and uploads the agent card to Filecoin with daily PDP proofs.

```bash
# Requires FILECOIN_PRIVATE_KEY in your environment
export FILECOIN_PRIVATE_KEY=0xYourPrivateKey
export FILECOIN_WALLET_ADDRESS=0xYourAddress

skillcoin register-agent
```

**What it does:**
1. Builds an agent card JSON with capabilities, endpoints, and contract addresses
2. Uploads the agent card to Filecoin Pin (gets a root CID with daily proofs)
3. Calls `registerAgent(tokenURI)` on the ERC-8004 Registry at `0x8004AA63...` on Base Sepolia
4. Saves `agent-registration.json` with the token ID, tx hash, and CIDs

**Requirements:**
- `FILECOIN_PRIVATE_KEY` env variable (or in `.env`)
- Wallet must have Base Sepolia ETH (faucet: https://faucet.quicknode.com/base/sepolia)

---

## Local Development

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| pnpm | 8+ |
| Git | any |
| PostgreSQL / Supabase | for real metadata |
| Filecoin Calibration wallet | for Filecoin flows |
| Gemini API key | for AI generation |

### 1 · Clone and Install

```bash
git clone https://github.com/Tanmay-say/SkillCoin-frontend.git
cd SkillCoin-frontend
pnpm install
```

### 2 · Configure Environment

Copy the example env files:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

**Key values for local development:**

```env
# Database (Supabase or local Postgres)
DATABASE_URL=postgresql://postgres:password@localhost:5432/skillcoin
DIRECT_URL=postgresql://postgres:password@localhost:5432/skillcoin

# Filecoin
FILECOIN_PRIVATE_KEY=0xYourPrivateKey
FILECOIN_WALLET_ADDRESS=0xYourWalletAddress

# AI
GEMINI_API_KEY=your_gemini_key

# Auth
JWT_SECRET=at_least_32_characters_long

# Web → API link
NEXT_PUBLIC_API_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3000
```

### 3 · Run the Database Migrations

```bash
pnpm -C apps/api exec prisma migrate dev
```

### 4 · Start the API Server

```bash
pnpm -C apps/api dev
# Runs at http://localhost:3001
```

### 5 · Start the Web App

```bash
pnpm -C apps/web dev
# Runs at http://localhost:3000
```

### 6 · Use the CLI in Dev Mode

```bash
# Point CLI at local API
skillcoin config --api-base http://localhost:3001

# Now all CLI commands hit your local API
skillcoin search
skillcoin publish ./my-skill.md
```

### 7 · Build Everything

```bash
pnpm -C apps/api build
pnpm -C apps/web build
pnpm -C packages/cli build
```

---

## Tech Stack

### Web App (`apps/web`)
| Technology | Role |
|-----------|------|
| Next.js 14 | Framework + routing |
| React 18 | UI components |
| Tailwind CSS | Styling |
| Axios | HTTP client |

### API (`apps/api`)
| Technology | Role |
|-----------|------|
| Hono | Fast HTTP framework |
| Prisma | ORM |
| PostgreSQL / Supabase | Metadata storage |
| Ethers v6 | Wallet auth + payment verification |
| Synapse SDK (`@filoz/synapse-sdk`) | Filecoin PDP uploads |
| filecoin-pin | Direct Filecoin pinning |
| Gemini API | AI skill generation endpoint |

### CLI (`packages/cli`)
| Technology | Role |
|-----------|------|
| Commander | Argument parsing |
| Chalk + Ora | Terminal UI |
| Ethers v6 | Wallet operations |
| adm-zip | ZIP extraction |
| `@google/generative-ai` | Gemini streaming |
| open | Browser-based payment page |

---

## Smart Contracts

Both contracts are deployed on **Filecoin Virtual Machine (FVM) — Calibration Testnet** (chainId 314159):

| Contract | Address | Explorer |
|----------|---------|---------|
| `SkillRegistry` | `0x30AcdeB5C03F5E02b0E7e9f22B20cBC4dF182690` | [View ↗](https://calibration.filfox.info/en/address/0x30AcdeB5C03F5E02b0E7e9f22B20cBC4dF182690) |
| `SkillLicenseNFT` | `0x7cFaf07016514f5261768Ce991D9E373cBC8d6e9` | [View ↗](https://calibration.filfox.info/en/address/0x7cFaf07016514f5261768Ce991D9E373cBC8d6e9) |

The ERC-8004 Agent Registry lives on **Base Sepolia**:

| Contract | Address |
|----------|---------|
| `ERC8004 Registry` | `0x8004AA63c570c570eBF15376c0dB199918BFe9Fb` |

### SkillRegistry

- Stores skill name, CID, creator address, price, and version on-chain
- Prevents CID and name duplication (piracy guard)
- Emits `SkillRegistered`, `SkillUpdated`, `SkillDeactivated`, and `PurchaseRecorded` events
- Anyone can call `getSkill(id)` or `getSkillByName(name)` for public lookup

### SkillLicenseNFT

- ERC-721 NFT minted on purchase — acts as a transferable license
- Purchase records are verifiable on-chain

---

## Production Deployment

### Current Targets

| Service | Platform |
|---------|---------|
| Web | Vercel |
| API | Vercel |
| Database | Supabase (PostgreSQL) |
| Storage | Filecoin via Synapse / filecoin-pin |

### Environment Variables for Production

Set these in your Vercel project dashboard — **do not commit secrets**:

```env
# Core
DATABASE_URL=
DIRECT_URL=
JWT_SECRET=
CORS_ORIGIN=https://skillcoin.vercel.app
NEXT_PUBLIC_API_URL=https://skillcoin-api.vercel.app

# Filecoin
FILECOIN_PRIVATE_KEY=
FILECOIN_WALLET_ADDRESS=
FILECOIN_NETWORK=calibration

# Contract Addresses
SKILL_REGISTRY_ADDRESS=0x30AcdeB5C03F5E02b0E7e9f22B20cBC4dF182690
SKILL_LICENSE_NFT_ADDRESS=0x7cFaf07016514f5261768Ce991D9E373cBC8d6e9

# AI
GEMINI_API_KEY=

# Native Payments (TFIL on Filecoin Calibration)
PAYMENT_NATIVE_CHAIN_ID=314159
PAYMENT_NATIVE_RPC_URL=https://api.calibration.node.glif.io/rpc/v1
PAYMENT_NATIVE_VERIFY_RPC_URL=https://api.calibration.node.glif.io/rpc/v1
PAYMENT_NATIVE_BLOCK_EXPLORER_URL=https://calibration.filfox.info/en

# ERC-20 Payments (USDC)
PAYMENT_USDC_CHAIN_ID=84532
PAYMENT_USDC_RPC_URL=https://sepolia.base.org
PAYMENT_USDC_VERIFY_RPC_URL=https://sepolia.base.org
PAYMENT_USDC_BLOCK_EXPLORER_URL=https://sepolia.basescan.org
PAYMENT_USDC_ADDRESS=0xYourUsdcTokenAddress

# Payment Recipient
ADMIN_VAULT_ADDRESS=0xYourAdminVault
```

---

## Local Data Directory

Everything the CLI stores lives in `~/.skillcoin/`:

```
~/.skillcoin/
├── config.json               # CLI settings (API URL, wallet, provider, AI key)
├── agents/
│   └── my-seo-agent.json     # Saved agent profiles
└── skills/
    └── seo-blog-writer/
        ├── seo-blog-writer.md # The skill content
        └── manifest.json      # CID, version, category, install date
```

---

## Future Scope

SkillCoin is early but the foundation is solid. Here is what is on the roadmap:

### Near-term
- **Skill ratings and reviews** — community quality signals on the marketplace
- **Version history and changelogs** — multiple versions of a skill available for install
- **Skill dependencies** — a skill that declares `requires: [web-researcher, summarizer]`
- **Skill verification badges** — creator verification with ENS or social proof

### Medium-term
- **Agent-to-agent skill trading** — autonomous agents buying skills on behalf of users with delegated wallets
- **Mainnet deployment** — contracts and storage on Filecoin mainnet for production use
- **Skill collections/bundles** — curated packs (e.g., "Full-stack AI workflow kit")
- **SDK for web apps** — embed SkillCoin into any Next.js app with a React component

### Long-term
- **Skill composability** — chain multiple skills into pipelines with a visual editor
- **Revenue sharing** — automatic on-chain splits for collaborative skills
- **AI-generated skill discovery** — describe your problem, get matched skills with confidence scores
- **SkillCoin DAO** — community governance over featured skills, categories, and treasury

---

## Contributing

We welcome contributions from the community.

```bash
# Clone and install
git clone https://github.com/Tanmay-say/SkillCoin-frontend.git
cd SkillCoin-frontend
pnpm install

# Work on the CLI
cd packages/cli
pnpm run build
node dist/bin/skillcoin.js --version

# Work on the API
pnpm -C apps/api dev

# Work on the web app
pnpm -C apps/web dev
```

To add a new CLI command:
1. Create `packages/cli/src/commands/your-command.ts`
2. Export a function `yourCommand(program: Command)`
3. Register it in `packages/cli/src/index.ts`
4. Run `pnpm run build` in `packages/cli`

---

## License

MIT — see [LICENSE](./packages/cli/LICENSE)

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/Tanmay-say">Tanmay</a> · Powered by Filecoin, IPFS, and Gemini AI
</p>
