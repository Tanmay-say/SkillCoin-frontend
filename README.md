# Skillcoin

Skillcoin is a marketplace and delivery layer for AI agent skills.

The core idea is simple: creators publish reusable agent instructions or bundled agent workflows, Skillcoin stores the content on Filecoin, records marketplace metadata in Postgres, and lets end users discover, buy, and install those skills from the web app or the CLI.

Production:
- Web: `https://skillcoin.vercel.app`
- API: `https://skillcoin-api.vercel.app`
- CLI package: `skillcoin` on npm

## What The Homepage Means

The homepage promise is:

- publish an AI skill from a plain markdown file or ZIP bundle
- store it on Filecoin with verifiable persistence
- put it on a public marketplace with pricing and metadata
- let users install it with one CLI command

In practice, Skillcoin is aimed at agent builders who want something between a prompt library and a package registry.

## Use Cases

- Sell reusable `SKILL.md` files for Claude, Cursor, Codex, Copilot, or Gemini workflows.
- Publish internal team skills as versioned packages instead of passing markdown around in chat.
- Ship ZIP-based agent kits that include instructions, manifests, templates, and supporting assets.
- Build a marketplace of paid skills with wallet-based authentication and on-chain payment proof.
- Use the CLI to bootstrap new skill projects, generate starter skill files with Gemini, publish them, and install them from anywhere.

## How It Works

### 1. Authoring

A creator prepares either:

- a markdown skill file such as `SKILL.md`, `.md`, or `.txt`
- a ZIP bundle that contains a skill plus supporting files

The creator can do this manually or use the CLI project flow to generate a starting bundle.

### 2. Publishing

Publishing can happen from:

- the web app at `/create`
- the CLI with `skillcoin publish ...`

During publishing:

- the creator signs in with a wallet
- the file is uploaded through the API
- the API stores the content on Filecoin through Synapse / Filecoin Pin
- the API writes marketplace metadata to Postgres / Supabase
- the skill is made available by slug in the marketplace

### 3. Discovery

Users can browse skills:

- on the web marketplace
- from the CLI with `skillcoin search`

Skills include metadata such as:

- name
- version
- description
- category
- tags
- storage type
- price currency and amount
- Filecoin dataset / proof metadata where available

### 4. Purchase And Access

For paid skills:

- the buyer authenticates with a wallet
- the API returns a short-lived payment challenge
- payment is verified on-chain
- the API issues a short-lived content token
- the actual content is downloaded only after access is confirmed

Supported payment modes in the current codebase:

- `TFIL` native payments on Filecoin Calibration
- `USDC` ERC-20 payments on the configured USDC chain

### 5. Installation

The CLI installs a skill by slug:

```bash
skillcoin install <name>
```

Install behavior:

- free skills download directly
- paid skills open a local payment page
- markdown skills are saved locally as skill files
- ZIP skills are downloaded, extracted, and written into the installed skill directory

## Product Surfaces

### Web App

The web app is the public product surface for:

- browsing the marketplace
- viewing skill detail pages
- generating starter skill files with Gemini
- connecting a wallet
- publishing skills

Tech stack:

- Next.js 14
- React 18
- Tailwind CSS
- Axios

### API

The API is the backend system of record for:

- skill metadata
- wallet auth
- upload registration
- paid download authorization
- payment verification
- Filecoin / Synapse integration

Tech stack:

- Hono
- Prisma
- PostgreSQL / Supabase
- Ethers
- Synapse SDK

### CLI

The CLI is the operator and consumer interface for:

- configuring wallet and API access
- generating project bundles
- publishing skills
- searching the marketplace
- installing paid or free skills

Tech stack:

- Commander
- Chalk
- Ora
- Ethers

## Repository Structure

```text
.
├── apps
│   ├── api        # Hono API, Prisma, payment + storage logic
│   └── web        # Next.js marketplace and publish UI
├── packages
│   └── cli        # npm package: skillcoin
├── contracts      # optional on-chain contracts and deployment scripts
├── docs           # notes and planning docs
├── pnpm-workspace.yaml
└── turbo.json
```

## Local Development

### Prerequisites

- Node.js 20+
- pnpm
- Supabase/Postgres connection for real metadata
- a Calibration wallet with test funds for Filecoin flows

### Install

```bash
pnpm install
```

### Configure env

Use the example env files as the starting point:

- `.env.example`
- `apps/api/.env.example`
- `apps/web/.env.example`

For local dev, the most important values are:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `FILECOIN_PRIVATE_KEY`
- `FILECOIN_WALLET_ADDRESS`
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_API_URL=http://localhost:3001`

### Run API

```bash
pnpm -C apps/api dev
```

API local URL:

- `http://localhost:3001`

### Run Web

```bash
pnpm -C apps/web dev
```

Web local URL:

- `http://localhost:3000`

### Build Everything

```bash
pnpm -C apps/api build
pnpm -C apps/web build
pnpm -C packages/cli build
```

## CLI Quick Start

Install from npm:

```bash
npm install -g skillcoin
```

Point the CLI at production:

```bash
skillcoin config --api-base https://skillcoin-api.vercel.app
```

Set wallet and AI provider:

```bash
skillcoin config --key 0xYOUR_PRIVATE_KEY --provider gemini --ai-key YOUR_GEMINI_API_KEY
```

Common commands:

```bash
skillcoin search
skillcoin install paid-zip-skill
skillcoin publish ./my-skill.md --name my-skill --desc "..." --category coding --tags agent,workflow --price 0.5 --currency TFIL
skillcoin project init --prompt "Build an agent skill for code review"
```

## Production Deployment

Current deployment targets:

- Web on Vercel
- API on Vercel
- Postgres on Supabase
- Filecoin storage through Synapse / Filecoin Pin

Production env values should be set in Vercel project settings, not relied on from checked-in `.env` files.

Important production variables:

- `NEXT_PUBLIC_API_URL`
- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `FILECOIN_PRIVATE_KEY`
- `FILECOIN_WALLET_ADDRESS`
- `PAYMENT_NATIVE_CHAIN_ID`
- `PAYMENT_NATIVE_RPC_URL`
- `PAYMENT_NATIVE_VERIFY_RPC_URL`
- `PAYMENT_NATIVE_BLOCK_EXPLORER_URL`
- `PAYMENT_USDC_CHAIN_ID`
- `PAYMENT_USDC_RPC_URL`
- `PAYMENT_USDC_VERIFY_RPC_URL`
- `PAYMENT_USDC_BLOCK_EXPLORER_URL`
- `PAYMENT_USDC_ADDRESS`
- `ADMIN_VAULT_ADDRESS`
- `GEMINI_API_KEY`

## Current Capabilities

- Web-based publish flow with wallet auth
- CLI publish flow
- Filecoin-backed uploads
- Paid downloads with challenge-based verification
- Free and paid installs from the CLI
- ZIP extraction during install
- Gemini-assisted skill generation
- Search and marketplace browsing

## Notes

- Paid skills intentionally hide direct public content identifiers from the public marketplace response.
- Some older records may contain legacy storage metadata. The API and CLI now normalize those paths during download.
- `contracts/` exists for on-chain work, but the marketplace today is primarily driven by the web app, API, Filecoin storage, and wallet-based payment verification.

## License

MIT
