# Hackathon Demo Script — 5 Minutes

## 0:00 – 0:30 | The Pitch

> "Skillcoin is npm for AI agent skills. Creators publish reusable AI workflows — skills — and they're stored permanently on Filecoin. Developers install them with one command and pay via x402 micropayments. It's the missing infrastructure for the AI agent ecosystem."

## 0:30 – 1:30 | Creator Flow

1. Open `skillcoin.xyz/create`
2. Fill in: name = `seo-writer`, description, category, price = 0.5 USDC
3. Upload the ZIP file (manifest.json + SKILL.md)
4. Watch the progress: Validating → Uploading to Filecoin → Creating Deal → Published
5. Show the CID and Filecoin deal ID
6. Click the Calibration explorer link to verify the storage deal

## 1:30 – 2:30 | Marketplace

1. Navigate to `skillcoin.xyz/explore`
2. Search for "seo" — show instant search
3. Filter by "Marketing" category
4. Click into the skill detail page
5. Point out: CID, Filecoin deal link, creator address, install count, price
6. Show the copy-paste install command

## 2:30 – 3:30 | CLI Install

```bash
# Configure wallet
skillcoin config --wallet 0x742d35Cc6634C0532925a3b844Bc9e7595f2BD23

# Install a skill
skillcoin install seo-writer
# → Fetching metadata... ✓
# → Payment required: 0.5 USDC
# → Processing x402 payment... ✓
# → Downloading from Filecoin... ✓
# → Content verified ✓
# → Installed seo-writer@1.0.0 (bafybeig...)

# List installed
skillcoin list
# → seo-writer  1.0.0  marketing  2026-03-09
```

## 3:30 – 4:30 | Architecture Deep Dive

- Show the FVM smart contract on Calibration testnet
- Show the Lighthouse SDK upload flow in the backend code
- Show the x402 payment verification service
- Show the Prisma schema and Supabase PostgreSQL

## 4:30 – 5:00 | Close

> "Skills are permanent on Filecoin, payments are instant via x402, and the install is as simple as npm. Every AI developer is our target user. Skillcoin is the npm registry for the AI agent era."
