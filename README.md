# SKILLCOIN

### npm for AI Agent Skills — Decentralized, Paid, Permanent

> A decentralized marketplace and runtime for AI Agent Skills — portable `.md` workflow files that extend AI agents (Claude, Cursor, Copilot, Codex, Gemini).

```
┌────────────────────────────────────────────────────────────┐
│                    SKILLCOIN SYSTEM                         │
├────────────────────────────────────────────────────────────┤
│  CLI (npm)          │  Next.js Marketplace (website)       │
├────────────────────────────────────────────────────────────┤
│  Hono.js API — skills, upload, download, auth              │
├────────────────────────────────────────────────────────────┤
│  Lighthouse + Synapse (Filecoin)  │  x402 Payments         │
├────────────────────────────────────────────────────────────┤
│  PostgreSQL (Neon)  │  IPFS / Filecoin Calibration         │
└────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# 1. Clone & install
git clone https://github.com/your-org/skillcoin.git
cd skillcoin
pnpm install

# 2. Start PostgreSQL
docker-compose up -d

# 3. Set up database
cp .env.example apps/api/.env
pnpm db:push && pnpm db:generate

# 4. Run everything
pnpm dev
# API → http://localhost:3001
# Web → http://localhost:3000
```

## Monorepo Structure

```
skillcoin/
├── apps/
│   ├── web/           → Next.js marketplace
│   └── api/           → Hono.js backend
├── packages/
│   └── cli/           → skillcoin npm package
├── contracts/         → Cadence smart contracts
├── docs/              → Architecture + demo script
└── docker-compose.yml
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 20, Hono.js, Prisma, PostgreSQL |
| Frontend | Next.js 14, Tailwind CSS, shadcn/ui, Framer Motion |
| CLI | Commander.js, Ora, Chalk |
| Storage | Lighthouse SDK, Filecoin Calibration |
| Payments | x402 HTTP micropayments (USDC) |
| Blockchain | Flow testnet (optional license NFTs) |

## License

MIT
