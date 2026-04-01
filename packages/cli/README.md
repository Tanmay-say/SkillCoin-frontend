# Skillcoin CLI

**The npm for AI Agent Skills.** A decentralized package manager built on Filecoin/IPFS that lets you discover, install, publish, and generate AI skills — stored permanently on-chain.

[![npm version](https://img.shields.io/npm/v/skillcoin.svg)](https://www.npmjs.com/package/skillcoin)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## Quick Start

Run commands directly with `npx` — no global install needed:

```bash
npx skillcoin search seo
npx skillcoin install seo-blog-writer
```

Or install globally:

```bash
npm install -g skillcoin
```

---

## Commands

### `skillcoin search [query]`

Search the decentralized marketplace for AI skills.

```
$ skillcoin search seo

  Skillcoin Marketplace
  ─────────────────────────
  2 skill(s) on marketplace

  Name                     Version   Category    Price       Downloads
  ────────────────────────────────────────────────────────────────────────
  seo-blog-writer          1.0.0     marketing   0.5 USDC    12
  example-seo              1.0.0     coding      0.5 USDC    3
```

### `skillcoin install <name>`

Download and install a skill from Filecoin/IPFS to `~/.skillcoin/skills/`.

```
$ skillcoin install seo-blog-writer

  Skillcoin Installer
  ─────────────────────────
  Found seo-blog-writer v1.0.0
  Downloaded 4.2 KB from IPFS/Filecoin

  Installed seo-blog-writer@1.0.0
    Path:    ~/.skillcoin/skills/seo-blog-writer
    CID:     QmZiZEVNbFGwpBUGPDCS1YMKNba6W1AHwbzdC4M3hudStJ
    Storage: Filecoin (IPFS)
    IPFS:    https://ipfs.io/ipfs/QmZiZEVN...
```

Options:
- `--force`, `-f` — Force reinstall even if already installed
- `--no-payment` — Skip the payment prompt (free skills only)

#### Paid Skills

If a skill has a price, the CLI opens a browser payment page at `localhost:7402`. Connect MetaMask, pay in the listed currency on the correct network, and the CLI resumes automatically after confirmation.

### `skillcoin publish <file>`

Publish a `.md`, `.txt`, or `.zip` skill file to the marketplace. The file is uploaded to Filecoin via the Synapse SDK and stored permanently with IPFS-compatible CIDs.

```
$ skillcoin publish my-skill.md --price 0.5 --category coding

  Skillcoin Publisher
  ─────────────────────────
  File:     my-skill.md (4.2 KB)
  Skill:    my-skill
  Version:  1.0.0
  Price:    0.5 USDC

  Skill stored on Filecoin permanently

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

Options:
- `-n, --name <name>` — Custom skill name (defaults to filename)
- `-d, --desc <description>` — Skill description
- `-c, --category <category>` — Category (coding, marketing, research, etc.)
- `-p, --price <price>` — Price amount (default: 0.5)
- `--currency <currency>` — `USDC`, `TFIL`, or `FREE` (default: `USDC`)
- `-t, --tags <tags>` — Comma-separated tags
- `-v, --version <version>` — Version string (default: 1.0.0)
- `-s, --storage <method>` — `api` (default) or `filecoin-pin` for direct Filecoin upload

### `skillcoin list`

View all locally installed skills.

```
$ skillcoin list

  Installed Skills
  ─────────────────────────
  Name                     Version     Category       Installed
  ─────────────────────────────────────────────────────────────────
  seo-blog-writer          1.0.0       marketing      3/11/2026
  data-visualizer          1.0.0       analytics      3/15/2026

  2 skill(s) installed
```

### `skillcoin chat`

Interactive AI chat REPL for skill development. Supports streaming responses, slash commands, and inline skill generation.

```
$ skillcoin chat

  Skillcoin v0.3.0  |  npm for AI Agent Skills

  Connected to gemini (gemini-2.0-flash)

  > Create a skill for writing technical docs
  ...AI streams response...

  /generate   Generate a new AI skill from description
  /publish    Publish current skill to marketplace
  /install    Install a skill by name
  /list       Browse marketplace skills
  /status     Show wallet and config status
  /help       Show all commands
  /exit       Exit the session
```

Requires an AI API key. Configure with:

```bash
skillcoin config --provider gemini --ai-key YOUR_KEY
```

Supported providers: `gemini`, `openai`, `groq`

### `skillcoin agent`

Create, manage, and run AI agents with custom skill configurations.

```bash
skillcoin agent create     # Interactive agent creation wizard
skillcoin agent list       # List saved agents
skillcoin agent run <name> # Start an agent chat session
skillcoin agent delete <name>
```

### `skillcoin register-agent`

Register SkillCoin as an ERC-8004 AI agent on Base Sepolia. Uploads an agent card to Filecoin via filecoin-pin and mints an NFT on the on-chain registry.

```bash
skillcoin register-agent
```

Requires `FILECOIN_PRIVATE_KEY` and `BASE_SEPOLIA_RPC` environment variables.

### `skillcoin config`

View or update CLI configuration (stored in `~/.skillcoin/config.json`).

```bash
skillcoin config                                    # View current config
skillcoin config --provider gemini --ai-key KEY      # Set AI provider
skillcoin config --wallet 0xYourAddress              # Set wallet
skillcoin config --gateway https://ipfs.io/ipfs      # Set IPFS gateway
```

---

## How It Works

1. **Storage** — Skills are uploaded to Filecoin via the `@filoz/synapse-sdk` with PDP (Provable Data Possession) proofs. Each upload returns an IPFS-compatible Root CID and a Filecoin Piece CID. Files are accessible through any IPFS gateway.

2. **Retrieval** — When you `install`, the CLI fetches metadata from the Skillcoin API, then downloads the file from multiple IPFS gateways (`ipfs.io`, `w3s.link`, `cloudflare-ipfs.com`) with automatic fallback.

3. **Payments** — Paid skills use an x402 micropayment flow. The CLI opens a browser-based payment page, you approve the transaction via MetaMask, and the CLI resumes after on-chain confirmation.

4. **AI Generation** — The `chat` command connects to Gemini, OpenAI, or Groq to generate skill files interactively, which can be published directly from the REPL.

---

## Local Data

```
~/.skillcoin/
├── config.json               # CLI settings (API key, wallet, provider)
├── agents/                   # Saved agent profiles
└── skills/
    └── seo-blog-writer/      # Installed skill
        ├── SKILL.md           # AI agent instructions
        ├── seo-blog-writer.md # Original file
        └── manifest.json      # Metadata, CID, version
```

---

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `apiBase` | Skillcoin API server URL | (must be set) |
| `ipfsGateway` | IPFS gateway for downloads | `https://ipfs.io/ipfs` |
| `wallet` | Your wallet address | — |
| `aiProvider` | AI provider (`gemini`, `openai`, `groq`) | `gemini` |
| `aiApiKey` | API key for AI provider | — |
| `network` | Filecoin network | `calibration` |

---

## Contributing

```bash
git clone https://github.com/Tanmay-say/skillcoin-frontend.git
cd skillcoin-frontend/packages/cli
pnpm install
pnpm run build
node dist/bin/skillcoin.js --version
```

---

## License

MIT
