# SkillCoin — Complete Project Documentation

> **The npm for AI Agent Skills.** A decentralized marketplace for publishing, discovering, and installing AI agent instructions, powered by Filecoin/IPFS storage and on-chain payment verification.

---

## Table of Contents

1. [What is SkillCoin?](#1-what-is-skillcoin)
2. [Architecture Overview](#2-architecture-overview)
3. [Quickstart](#3-quickstart)
4. [Installation & Setup](#4-installation--setup)
5. [Publishing Skills](#5-publishing-skills)
6. [Discovering Skills](#6-discovering-skills)
7. [Installing Skills](#7-installing-skills)
8. [Verifying Skills](#8-verifying-skills)
9. [CLI Reference — A to Z](#9-cli-reference--a-to-z)
10. [Web App](#10-web-app)
11. [API Reference](#11-api-reference)
12. [Smart Contracts](#12-smart-contracts)
13. [Local Development](#13-local-development)
14. [Production Deployment](#14-production-deployment)
15. [Environment Variables](#15-environment-variables)
16. [Future Scope](#16-future-scope)

---

## 1. What is SkillCoin?

SkillCoin is a **decentralized marketplace and delivery layer for AI skills** — reusable instruction files, workflow templates, and agent bundles that any developer or AI assistant can install and run.

Think of it like this:
- **npm** installs JavaScript packages
- **pip** installs Python libraries
- **SkillCoin** installs AI agent skills

A skill can be:
- A single `SKILL.md` — a markdown file containing rules and instructions for Claude, Cursor, Gemini, Codex, or any prompt-following AI
- A `.txt` file with custom AI instructions
- A `.zip` bundle — a complete agent kit with instructions, templates, manifests, and supporting assets

Every skill is:
- **Stored permanently on Filecoin** with cryptographic PDP (Provable Data Possession) proofs
- **Accessible via IPFS** from any gateway
- **Listed on a public marketplace** with pricing, versioning, and download counts
- **Purchasable on-chain** with USDC (ERC-20) or TFIL (Filecoin native), no intermediary

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        Users / Agents                        │
│              Web Browser ←→ CLI ←→ Any HTTP client            │
└────────────┬──────────────────────────┬─────────────────────┘
             │                          │
             ▼                          ▼
  ┌──────────────────┐       ┌──────────────────────┐
  │   Web App        │       │   CLI (npm: skillcoin)│
  │   Next.js 14     │       │   Commander + Ethers  │
  │   skillcoin.     │       │   Gemini AI           │
  │   vercel.app     │       │                       │
  └────────┬─────────┘       └──────────┬────────────┘
           │                            │
           └──────────┬─────────────────┘
                      │
                      ▼
           ┌──────────────────────┐
           │      API Server      │
           │   Hono + Prisma      │
           │   skillcoin-api.     │
           │   vercel.app         │
           └──┬───────────────┬───┘
              │               │
     ┌────────▼────┐  ┌───────▼──────┐
     │  PostgreSQL  │  │   Filecoin   │
     │  (Supabase)  │  │   Synapse    │
     │  Metadata    │  │   Storage +  │
     │  Auth + JWT  │  │ IPFS Gateways│
     └─────────────┘  └───────┬──────┘
                              │
                    ┌─────────▼──────────┐
                    │   Smart Contracts  │
                    │  SkillRegistry.sol │
                    │  SkillLicenseNFT   │
                    │ Filecoin FVM (FVM) │
                    │  chainId: 314159   │
                    └────────────────────┘
```

### Component Roles

| Component | Technology | Responsibility |
|-----------|-----------|----------------|
| **Web App** | Next.js 14, React 18, Tailwind | Marketplace browsing, publish UI, AI skill generation |
| **API** | Hono, Prisma, PostgreSQL | Skill metadata, auth, uploads, payment verification, access control |
| **CLI** | Commander, Ethers, Chalk | Operator interface: config, search, install, publish, chat, agents |
| **Filecoin** | Synapse SDK, filecoin-pin | Permanent content-addressed storage with PDP proofs |
| **Contracts** | Solidity, FVM | On-chain skill registry, license NFTs, purchase recording |
| **ERC-8004** | Base Sepolia | Agent identity registration (agent card with capability claims) |

---

## 3. Quickstart

### As a Skill Consumer

```bash
# 1. Install the CLI
npm install -g skillcoin

# 2. Point at production
skillcoin config --api-base https://skillcoin-api.vercel.app

# 3. Browse
skillcoin search

# 4. Install
skillcoin install seo-blog-writer

# 5. Use the skill in your AI assistant
# The SKILL.md is now at ~/.skillcoin/skills/seo-blog-writer/
```

### As a Skill Creator

```bash
# 1. Install and configure
npm install -g skillcoin
skillcoin config --api-base https://skillcoin-api.vercel.app
skillcoin config --key 0xYOUR_PRIVATE_KEY

# 2. Write your skill
cat > my-skill.md << 'EOF'
---
name: my-skill
version: 1.0.0
description: My awesome AI skill
---
# My Skill

You are an expert at...
EOF

# 3. Publish
skillcoin publish my-skill.md \
  --name my-skill \
  --desc "An awesome AI skill" \
  --category coding \
  --price 0.5

# 4. Share the install command with your users
#    → skillcoin install my-skill
```

### Using the Web App

1. Go to [https://skillcoin.vercel.app](https://skillcoin.vercel.app)
2. Browse skills or use the search bar
3. Click any skill to view details, download count, and Filecoin proof
4. Connect your wallet and visit `/create` to publish a skill
5. Use the Gemini-powered generator to auto-create skill content

---

## 4. Installation & Setup

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ (20+ recommended) | `node --version` |
| npm or pnpm | any | pnpm used for monorepo |
| Git | any | for cloning |
| MetaMask | latest | for paid skill purchases |
| Supabase/PostgreSQL | any | for running the API locally |

### Install the CLI

```bash
# Global install
npm install -g skillcoin

# Verify
skillcoin --version

# View help
skillcoin --help
```

### Initial Configuration

```bash
# Required: set the API server
skillcoin config --api-base https://skillcoin-api.vercel.app

# For paid skills / publishing: set your private key
# WARNING: this stores your key in ~/.skillcoin/config.json
skillcoin config --key 0xYOUR_PRIVATE_KEY

# For AI features (chat, project generation)
skillcoin config --provider gemini --ai-key YOUR_GEMINI_API_KEY
# Get a Gemini key: https://aistudio.google.com/apikey

# Verify your config
skillcoin config
```

---

## 5. Publishing Skills

SkillCoin accepts three file types: `.md`, `.txt`, and `.zip`

### Step 1: Author Your Skill

A well-structured `SKILL.md` looks like:

```markdown
---
name: code-review-assistant
version: 1.0.0
description: Reviews pull requests for bugs, style issues, and security vulnerabilities
category: coding
tags: [review, code, security, PR]
---

# Code Review Assistant

You are a senior software engineer with expertise in code review. When reviewing code, you:

## Your Responsibilities
- Check for logic errors and edge cases
- Identify potential security vulnerabilities (SQL injection, XSS, etc.)
- Suggest better variable and function naming
- Flag missing tests or incomplete error handling
- Provide specific, actionable feedback with code examples

## Output Format
Structure every review as:
1. **Summary** (2-3 sentences)
2. **Critical Issues** (blockers)
3. **Improvements** (suggestions)
4. **Positives** (what was done well)
```

### Step 2: Publish

```bash
# Basic publish (free)
skillcoin publish code-review-assistant.md

# Paid publish with full metadata
skillcoin publish code-review-assistant.md \
  --name code-review-assistant \
  --desc "Reviews PRs for bugs, style, and security" \
  --category coding \
  --tags "review,security,claude,cursor" \
  --price 2.0 \
  --currency USDC \
  --version 1.0.0

# Direct to Filecoin (no API dependency)
skillcoin publish code-review-assistant.md --storage filecoin-pin

# Publish a ZIP bundle
skillcoin publish my-agent-kit.zip --name my-agent-kit --price 5.0
```

### Step 3: Get Your Install Command

After publish, the CLI prints:
```
  Install:  skillcoin install code-review-assistant
  View:     https://skillcoin-api.vercel.app/api/skills/code-review-assistant
```

Share this with your users.

### Storage Methods

| Method | How | Best For |
|--------|-----|---------|
| `api` (default) | File → API → Synapse SDK → Filecoin | Most skills, no extra setup |
| `filecoin-pin` | File → filecoin-pin CLI → Filecoin directly | Maximum decentralization, API-optional |

Both methods produce permanent Filecoin storage with IPFS-compatible CIDs.

### Publishing from the Web

1. Connect your wallet at [skillcoin.vercel.app](https://skillcoin.vercel.app)
2. Navigate to `/create`
3. Use the Gemini AI generator to create skill content, or paste your own
4. Fill in metadata (name, category, price, tags)
5. Click Publish — the file is uploaded directly from your browser

---

## 6. Discovering Skills

### CLI Search

```bash
# Browse all skills
skillcoin search

# Filter by keyword
skillcoin search "blog writing"
skillcoin search research
skillcoin search code

# Install directly after finding a skill
skillcoin install <name>
```

### Web Marketplace

Visit [skillcoin.vercel.app](https://skillcoin.vercel.app) to:
- Browse by category (coding, marketing, research, analytics…)
- See price, download count, version, storage type
- View Filecoin proof links for stored skills
- Preview skill descriptions

### API Search (programmatic)

```bash
# Get all skills
curl https://skillcoin-api.vercel.app/api/skills

# Search
curl "https://skillcoin-api.vercel.app/api/skills?search=seo"

# Get a specific skill
curl https://skillcoin-api.vercel.app/api/skills/seo-blog-writer
```

---

## 7. Installing Skills

### Free Skills

Free skills download immediately — no wallet needed:

```bash
skillcoin install my-free-skill
```

### Paid Skills

For paid skills, the CLI opens a browser payment page:

```bash
skillcoin install seo-blog-writer
# → CLI shows price and opens localhost:7402
# → Connect MetaMask
# → Approve transaction (USDC or TFIL)
# → CLI detects confirmation and resumes download
```

**Payment flow:**
1. CLI requests a payment challenge from the API (`POST /api/skills/:name/download`)
2. API returns: recipient address, chainId, RPC URL, amount, token contract
3. CLI opens `localhost:7402` with a payment page
4. User connects MetaMask and approves
5. CLI calls `POST /api/skills/:name/verify-payment` with the tx hash
6. API returns a signed download URL
7. CLI downloads and installs the skill

**Supported payment options:**
- **USDC** — ERC-20 on Base Sepolia (or any configured chain)
- **TFIL** — Native Filecoin token on Calibration testnet

### Force Reinstall

```bash
skillcoin install seo-blog-writer --force
```

### What Gets Installed

```
~/.skillcoin/skills/<name>/
├── <name>.md          # Markdown skill (or extracted ZIP contents)
└── manifest.json      # Metadata
```

`manifest.json` example:
```json
{
  "name": "seo-blog-writer",
  "version": "1.0.0",
  "cid": "QmZiZEVNbFGwpBUGPDCS1YMKNba6W1AHwbzdC4M3hudStJ",
  "category": "marketing",
  "description": "Writes SEO-optimized blog posts",
  "installedAt": "2026-03-11T14:22:01.000Z"
}
```

---

## 8. Verifying Skills

Every skill stored on Filecoin has cryptographic, publicly verifiable proof of storage.

### Via CLI

After install, the CLI prints the proof URL:

```
  Proof:   https://pdp.vxb.ai/calibration/dataset/12345
```

### Via On-Chain Contract

The `SkillRegistry` contract (Filecoin FVM Calibration) stores every registered skill:

```bash
# Using ethers.js or cast
cast call 0x30AcdeB5C03F5E02b0E7e9f22B20cBC4dF182690 \
  "getSkillByName(string)(uint256,string,string,address,uint256,string,uint256,bool)" \
  "seo-blog-writer" \
  --rpc-url https://api.calibration.node.glif.io/rpc/v1
```

Returns: `id, name, cid, creator, price, version, createdAt, active`

### Via IPFS

Any CID can be verified through any IPFS gateway:

```
https://ipfs.io/ipfs/<CID>
https://w3s.link/ipfs/<CID>
https://cloudflare-ipfs.com/ipfs/<CID>
```

### Via API

```bash
curl https://skillcoin-api.vercel.app/api/skills/seo-blog-writer
# Returns: cid, storageType, filecoinDatasetId, version, createdAt, ...
```

---

## 9. CLI Reference — A to Z

### Installation

```bash
npm install -g skillcoin          # Global
npx skillcoin <command>           # Without installing
```

---

### `config` — Configure the CLI

```bash
skillcoin config                              # View config
skillcoin config --api-base <url>             # Set API URL
skillcoin config --key <privateKey>           # Set private key + auto-derive address
skillcoin config --wallet <address>           # Set address only
skillcoin config --provider gemini            # gemini | openai | groq
skillcoin config --ai-key <apiKey>
skillcoin config --ai-model <model>
skillcoin config --gateway <ipfsGatewayUrl>
skillcoin config --network <calibration|mainnet>
skillcoin config --auth-token <jwt>
skillcoin config --default-ide <cursor|claude-code|windsurf|vscode>
skillcoin config --clarification-rounds <n>
skillcoin config --project-output-mode <lean|standard|full>
```

---

### `search` / `s` — Browse Marketplace

```bash
skillcoin search                  # All skills
skillcoin search <query>          # Filter by keyword
```

---

### `install` / `i` — Install a Skill

```bash
skillcoin install <name>          # Install (free or paid)
skillcoin install <name> -f       # Force reinstall
skillcoin install <name> --force
skillcoin install <name> --no-payment   # Skip payment (free only)
```

---

### `publish` — Publish a Skill

```bash
skillcoin publish <file>
  [-n, --name <name>]
  [-d, --desc <description>]
  [-c, --category <category>]     # coding|marketing|research|analytics|writing|...
  [-t, --tags <tag1,tag2>]
  [-p, --price <amount>]          # numeric, e.g. 0.5
  [--currency <USDC|TFIL|FREE>]
  [-v, --version <semver>]        # e.g. 1.0.0
  [-s, --storage <api|filecoin-pin>]
```

---

### `list` / `ls` — List Installed Skills

```bash
skillcoin list
```

---

### `chat` — AI Chat REPL

```bash
skillcoin chat
skillcoin chat --provider <gemini|openai|groq>
skillcoin chat --api-key <key>
skillcoin chat --model <model-name>
```

**In-chat slash commands:**
`/generate <desc>` · `/save <file>` · `/publish <file>` · `/install <name>` · `/list` · `/status` · `/clear` · `/help` · `/exit`

---

### `project` — AI Project Bundle

```bash
skillcoin project init [briefFile]
  [--prompt <text>]
  [--ide <cursor|claude-code|windsurf|vscode>]
  [--mode <lean|standard|full>]
  [--out <dir>]
  [--wizard]

skillcoin project refine [specFile]
  [--out <dir>]

skillcoin project status
  [--out <dir>]

skillcoin project export-skill
  [--out <dir>]
```

---

### `agent` — Manage AI Agents

```bash
skillcoin agent create                      # Interactive wizard
skillcoin agent list                        # List saved agents
skillcoin agent run <name>                  # Start agent chat
skillcoin agent delete <name>               # Remove agent
```

---

### `register-agent` — ERC-8004 Registration

```bash
# Env required: FILECOIN_PRIVATE_KEY, FILECOIN_WALLET_ADDRESS
skillcoin register-agent
```

---

### Global flags

```bash
skillcoin --version        # Print version
skillcoin --help           # Help for any command
skillcoin <cmd> --help     # Help for a specific command
```

---

## 10. Web App

The web app is built with **Next.js 14** and lives in `apps/web/`.

### Pages

| Route | Description |
|-------|-------------|
| `/` | Marketplace homepage — featured skills, search |
| `/skills` | Full skill listing with filters |
| `/skills/[slug]` | Skill detail page — description, CID, proof, install command |
| `/create` | Publish new skill (wallet required) |
| `/generate` | Gemini AI-powered skill generator |

### Running Locally

```bash
cp apps/web/.env.example apps/web/.env
# Set NEXT_PUBLIC_API_URL=http://localhost:3001

pnpm -C apps/web dev
# → http://localhost:3000
```

### Key Environment Variables

```env
NEXT_PUBLIC_API_URL=https://skillcoin-api.vercel.app   # API server URL
```

---

## 11. API Reference

The API is built with **Hono** and lives in `apps/api/`. Base URL: `https://skillcoin-api.vercel.app`

### Authentication

Most write operations require a wallet signature. The API uses JWT tokens:

```bash
# Sign in (returns JWT)
POST /api/auth/nonce
POST /api/auth/verify
```

### Skills

```bash
GET  /api/skills                          # List all skills (paginated)
GET  /api/skills?search=<query>           # Search
GET  /api/skills/:slug                    # Get skill by slug
POST /api/skills                          # Upload + register skill (auth required)
POST /api/skills/:slug/download           # Request download (initiates payment flow)
POST /api/skills/:slug/verify-payment     # Verify tx and get download token
```

### Upload

```bash
POST /api/upload/register                 # Register an externally uploaded skill (filecoin-pin flow)
```

### AI Generation

```bash
POST /api/skills/generate                 # Generate skill content with Gemini
```

### Running the API Locally

```bash
cp apps/api/.env.example apps/api/.env
# Fill in DATABASE_URL, JWT_SECRET, GEMINI_API_KEY, FILECOIN_PRIVATE_KEY...

pnpm -C apps/api exec prisma migrate dev
pnpm -C apps/api dev
# → http://localhost:3001
```

---

## 12. Smart Contracts

Deployed on **Filecoin FVM Calibration Testnet** (chainId: `314159`):

| Contract | Address | Explorer |
|----------|---------|---------|
| `SkillRegistry` | `0x30AcdeB5C03F5E02b0E7e9f22B20cBC4dF182690` | [filfox ↗](https://calibration.filfox.info/en/address/0x30AcdeB5C03F5E02b0E7e9f22B20cBC4dF182690) |
| `SkillLicenseNFT` | `0x7cFaf07016514f5261768Ce991D9E373cBC8d6e9` | [filfox ↗](https://calibration.filfox.info/en/address/0x7cFaf07016514f5261768Ce991D9E373cBC8d6e9) |

ERC-8004 registry on **Base Sepolia**:

| Contract | Address |
|----------|---------|
| ERC-8004 Agent Registry | `0x8004AA63c570c570eBF15376c0dB199918BFe9Fb` |

### SkillRegistry Key Functions

```solidity
registerSkill(name, cid, price, version)   // Register a new skill
updateSkill(skillId, newCid, newVersion)   // Update CID/version
deactivateSkill(skillId)                   // Remove from marketplace
recordPurchase(skillId, buyer)             // Record purchase on-chain
getSkill(skillId)                          // Fetch by ID
getSkillByName(name)                       // Fetch by name
```

### SkillLicenseNFT

An ERC-721 NFT minted for each purchase. The NFT serves as a transferable, verifiable license for a skill.

### Deploying Contracts

```bash
cd contracts
npm install
cp ../.env.example .env
# Fill: FILECOIN_PRIVATE_KEY, FILECOIN_RPC_URL

npx hardhat run scripts/deploy.js --network filecoinCalibration
```

---

## 13. Local Development

### Full Stack Setup

```bash
# 1. Clone
git clone https://github.com/Tanmay-say/SkillCoin-frontend.git
cd SkillCoin-frontend

# 2. Install all dependencies
pnpm install

# 3. Configure env files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Edit apps/api/.env with your values:
#    DATABASE_URL, JWT_SECRET, GEMINI_API_KEY, FILECOIN_PRIVATE_KEY...

# 5. Run database migrations
pnpm -C apps/api exec prisma migrate dev

# 6. Start API (terminal 1)
pnpm -C apps/api dev      # → http://localhost:3001

# 7. Start web app (terminal 2)
pnpm -C apps/web dev      # → http://localhost:3000

# 8. Point CLI at local API (terminal 3)
skillcoin config --api-base http://localhost:3001
skillcoin search
```

### CLI Dev Mode

```bash
cd packages/cli
pnpm install
pnpm run dev              # Rebuild on file changes
node dist/bin/skillcoin.js --version
```

### Building

```bash
pnpm -C apps/api build
pnpm -C apps/web build
pnpm -C packages/cli build
```

---

## 14. Production Deployment

### Web + API on Vercel

1. Push to GitHub
2. Import repo into Vercel — one project for `apps/api`, one for `apps/web`
3. Set root directories respectively: `apps/api` / `apps/web`
4. Add all environment variables (see Section 15)
5. Deploy

### Database on Supabase

1. Create a Supabase project
2. Copy the `DATABASE_URL` and `DIRECT_URL` from Supabase project settings
3. Run migrations:
   ```bash
   pnpm -C apps/api exec prisma migrate deploy
   ```

### CLI on npm

```bash
cd packages/cli
npm publish
# (requires npm account + `prepublishOnly` script runs `build`)
```

---

## 15. Environment Variables

### Root / API

| Variable | Description | Required |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `DIRECT_URL` | Direct Postgres URL (Supabase) | ✅ |
| `JWT_SECRET` | Secret for JWT signing (32+ chars) | ✅ |
| `FILECOIN_PRIVATE_KEY` | Wallet private key for uploads | ✅ |
| `FILECOIN_WALLET_ADDRESS` | Corresponding public address | ✅ |
| `FILECOIN_NETWORK` | `calibration` or `mainnet` | ✅ |
| `FILECOIN_RPC_URL` | Filecoin RPC endpoint | ✅ |
| `GEMINI_API_KEY` | Google Gemini API key | ✅ |
| `ADMIN_VAULT_ADDRESS` | Vault receiving payments | ✅ |
| `CORS_ORIGIN` | Web app URL for CORS | ✅ |
| `SKILL_REGISTRY_ADDRESS` | Deployed SkillRegistry | ⬜ |
| `SKILL_LICENSE_NFT_ADDRESS` | Deployed SkillLicenseNFT | ⬜ |
| `AGENT_REGISTRY_ADDRESS` | ERC-8004 registry address | ⬜ |
| `BASE_SEPOLIA_RPC` | Base Sepolia RPC | ⬜ |
| `NEXT_PUBLIC_API_URL` | API URL exposed to web browser | ✅ |
| `PORT` | API listen port (default: 3001) | ⬜ |
| `NODE_ENV` | `development` or `production` | ⬜ |

### Payment (Native — TFIL)

| Variable | Value |
|----------|-------|
| `PAYMENT_NATIVE_CHAIN_ID` | `314159` |
| `PAYMENT_NATIVE_RPC_URL` | `https://api.calibration.node.glif.io/rpc/v1` |
| `PAYMENT_NATIVE_VERIFY_RPC_URL` | same as above |
| `PAYMENT_NATIVE_BLOCK_EXPLORER_URL` | `https://calibration.filfox.info/en` |

### Payment (USDC — ERC-20)

| Variable | Value |
|----------|-------|
| `PAYMENT_USDC_CHAIN_ID` | `84532` (Base Sepolia) |
| `PAYMENT_USDC_RPC_URL` | `https://sepolia.base.org` |
| `PAYMENT_USDC_VERIFY_RPC_URL` | same as above |
| `PAYMENT_USDC_BLOCK_EXPLORER_URL` | `https://sepolia.basescan.org` |
| `PAYMENT_USDC_ADDRESS` | Your USDC contract address |

---

## 16. Future Scope

### Short-term (Next 3 months)

| Feature | Description |
|---------|-------------|
| **Skill ratings** | 1-5 star ratings + written reviews per install |
| **Version history** | Multiple published versions of a skill, pinnable |
| **Skill updates** | Creator can push a new version; installs can self-update |
| **Skill verification badges** | Creator verification with ENS or GitHub OAuth |

### Medium-term (3-12 months)

| Feature | Description |
|---------|-------------|
| **Filecoin mainnet** | Move from Calibration testnet to production Filecoin |
| **Skill dependencies** | `requires: [web-researcher, summarizer]` in manifests |
| **Revenue analytics** | Creator dashboard showing earnings, installs, geography |
| **Agent-to-agent purchases** | Autonomous agents buying skills via delegated wallets |
| **React SDK** | `<SkillMarketplace />` component for embedding in any Next.js app |
| **Skill bundles** | Curated packs (e.g., "Full-Stack AI Workflow Kit") |

### Long-term (12+ months)

| Feature | Description |
|---------|-------------|
| **Skill composability** | Chain skills into pipelines with a visual editor |
| **On-chain revenue sharing** | Automatic splits for collaborative skills |
| **AI-powered skill matching** | Describe your use case, get matched skills with scores |
| **SkillCoin DAO** | Community governance for featured skills and treasury |
| **Multi-chain support** | Ethereum mainnet, Polygon, Arbitrum payment options |
| **Skill execution environment** | Serverless runtime that runs skills as API endpoints |

---

## Useful Links

| Resource | URL |
|---------|-----|
| Marketplace | https://skillcoin.vercel.app |
| API | https://skillcoin-api.vercel.app |
| npm Package | https://www.npmjs.com/package/skillcoin |
| GitHub | https://github.com/Tanmay-say/SkillCoin-frontend |
| SkillRegistry (Filfox) | https://calibration.filfox.info/en/address/0x30AcdeB5C03F5E02b0E7e9f22B20cBC4dF182690 |
| Filecoin Calibration Faucet | https://faucet.calibration.fildev.network |
| Gemini API Keys | https://aistudio.google.com/apikey |
| Base Sepolia Faucet | https://faucet.quicknode.com/base/sepolia |

---

*Last updated: April 2026 · Built by [Tanmay](https://github.com/Tanmay-say) · MIT License*
