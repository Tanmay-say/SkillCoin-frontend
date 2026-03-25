# Deploying SkillCoin API to Vercel

## Prerequisites

- [Vercel CLI](https://vercel.com/docs/cli) installed: `npm i -g vercel`
- A Vercel account (free tier works)
- Supabase PostgreSQL database (already set up)

## Step 1: Deploy

From the `apps/api` directory:

```bash
cd apps/api
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N** (first time)
- Project name? `skillcoin-api`
- Directory with source code? `./` (current)
- Override settings? **N**

## Step 2: Set Environment Variables

Go to your Vercel dashboard > Project Settings > Environment Variables, and add **all** of these:

### Required

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://postgres:...@db.xxx.supabase.co:5432/postgres` | Your Supabase connection string |
| `DIRECT_URL` | Same as DATABASE_URL | Required by Prisma |
| `JWT_SECRET` | A random 32+ character string | Use `openssl rand -hex 32` to generate |
| `NODE_ENV` | `production` | |
| `CORS_ORIGIN` | `https://your-web-app.vercel.app,http://localhost:3000` | Comma-separated allowed origins |

### Filecoin Storage

| Variable | Value | Notes |
|----------|-------|-------|
| `FILECOIN_PRIVATE_KEY` | `0x...` | Your Filecoin Calibration wallet private key |
| `FILECOIN_WALLET_ADDRESS` | `0x...` | Corresponding wallet address |
| `FILECOIN_RPC_URL` | `https://api.calibration.node.glif.io/rpc/v1` | Calibration testnet RPC |
| `FILECOIN_NETWORK` | `calibration` | |

### AI Generation

| Variable | Value | Notes |
|----------|-------|-------|
| `GEMINI_API_KEY` | `AIzaSy...` | Get from https://aistudio.google.com/apikey |

### Payments

| Variable | Value | Notes |
|----------|-------|-------|
| `ADMIN_VAULT_ADDRESS` | `0x...` | Wallet that receives payments |
| `X402_PAYMENT_AMOUNT` | `0.5` | Default payment amount |
| `X402_PAYMENT_CURRENCY` | `USDC` | |
| `PAYMENT_VERIFY_RPC_URL` | RPC URL for payment verification chain | |

### Smart Contracts (optional)

| Variable | Value | Notes |
|----------|-------|-------|
| `SKILL_REGISTRY_ADDRESS` | `0x30AcdeB5C03F5E02b0E7e9f22B20cBC4dF182690` | Filecoin Calibration |
| `SKILL_LICENSE_NFT_ADDRESS` | `0x7cFaf07016514f5261768Ce991D9E373cBC8d6e9` | Filecoin Calibration |
| `AGENT_REGISTRY_ADDRESS` | `0x8004AA63c570c570eBF15376c0dB199918BFe9Fb` | Base Sepolia |

## Step 3: Deploy to Production

```bash
vercel --prod
```

Your API will be live at something like `https://skillcoin-api.vercel.app`.

## Step 4: Verify

```bash
curl https://skillcoin-api.vercel.app/health
# Should return: {"status":"ok","timestamp":"..."}

curl https://skillcoin-api.vercel.app/api/skills
# Should return skill list from database
```

## Step 5: Update the Web App

Set the `NEXT_PUBLIC_API_URL` env var in the web app's Vercel project to point at your deployed API:

```
NEXT_PUBLIC_API_URL=https://skillcoin-api.vercel.app
```

## Step 6: Update the CLI Default

After confirming the API works on Vercel, update the default `apiBase` in `packages/cli/src/lib/config.ts` to your production URL, rebuild, and publish to npm.

## Deploying the Web App

The Next.js web app deploys natively on Vercel:

```bash
cd apps/web
vercel --prod
```

Set these env vars in the web project:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://skillcoin-api.vercel.app` |

## Notes

- The `/uploads/*` endpoint serves locally stored files. On Vercel (serverless), the filesystem is ephemeral. Skills uploaded without `FILECOIN_PRIVATE_KEY` will not persist across deployments. Always set the Filecoin key in production.
- Vercel serverless functions have a 30-second timeout (configured in `vercel.json`). Large file uploads may need the Pro plan for longer timeouts.
- The `buildCommand` in `vercel.json` runs `npx prisma generate` to generate the Prisma client during build.
