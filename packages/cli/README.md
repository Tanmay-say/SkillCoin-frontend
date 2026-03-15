# ⚡ Skillcoin CLI

**The npm for AI Agent Skills.** A decentralized package manager built on Filecoin/IPFS that allows you to discover, install, and publish AI skills permanently.

[![npm version](https://img.shields.io/npm/v/skillcoin.svg)](https://www.npmjs.com/package/skillcoin)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## 🚀 Quick Start

You don't need to install anything globally. You can run Skillcoin commands directly using `npx`:

```bash
# Browse the marketplace
npx skillcoin search

# Install a skill
npx skillcoin install seo-blog-writer
```

If you prefer to install it globally:
```bash
npm install -g skillcoin
```

---

## 📖 Command Reference

### `skillcoin search [query]`
Search the decentralized marketplace for AI skills.

```bash
$ npx skillcoin search "seo"

  🔍 Skillcoin Marketplace
  ─────────────────────────
  ✔ 4 skill(s) on marketplace

  Name                     Version   Category    Price       Downloads 
  ────────────────────────────────────────────────────────────────────────
  seo-blog-writer          1.0.0     marketing   Free        120       
  example-seo              1.0.0     coding      0.5 tFIL    45        
```

### `skillcoin install <name>`
Download and install a skill directly from IPFS to your local `~/.skillcoin/skills/` directory.

```bash
$ npx skillcoin install seo-blog-writer

  ⚡ Skillcoin Installer
  ─────────────────────────
  ✔ Found seo-blog-writer v1.0.0
  ✔ Downloaded from IPFS/Filecoin...
  ✔ Skill installed

  ✓ Installed seo-blog-writer@1.0.0
    CID:  QmZiZEVNbFGwpBUGPDCS1YMKNba6W1AHwbzdC4M3hudStJ
    Path: /Users/you/.skillcoin/skills/seo-blog-writer
```

#### 💳 Paid Skills
If a skill has a price, the CLI will automatically launch a secure browser payment page (`localhost:7402`).
1. Connect your **MetaMask** wallet.
2. The page auto-switches to the **Filecoin Calibration** testnet.
3. Pay the exact amount in native `tFIL` (Test FIL).
4. Once the transaction confirms, the CLI automatically resumes the IPFS download.

*(Get free `tFIL` for testing from the [Calibration Faucet](https://faucet.calibnet.chainsafe-fil.io/))*

Options:
- `--force`, `-f`: Force reinstall even if already installed.
- `--no-payment`: Skip the payment prompt (useful for testing or if you've already paid).

### `skillcoin publish <file.md>`
Publish your own AI skill to the decentralized marketplace. The file is uploaded to IPFS via Lighthouse, meaning it is **uncensorable and permanently available**.

```bash
$ npx skillcoin publish my-awesome-skill.md --price 1.5 --category coding

  📥 Skillcoin Publisher
  ─────────────────────────
  File:     my-awesome-skill.md (4.2 KB)
  Skill:    my-awesome-skill
  Version:  1.0.0
  Price:    1.5 tFIL
  Category: coding

  ✔ Published to Filecoin!

  ✓ Skill published successfully!
  CID:      QmYourNewSkillIPFSCIDHashHere...
  Deal ID:  1234567
```

Options:
- `-n, --name <name>`: Custom skill name (defaults to the filename)
- `-d, --desc <description>`: Skill description
- `-c, --category <category>`: Category (e.g., coding, marketing)
- `-p, --price <price>`: Price in tFIL (default: 0.5)
- `-t, --tags <tags>`: Comma-separated tags
- `-v, --version <version>`: Version string (default: 1.0.0)

### `skillcoin list`
View all skills currently installed on your local machine.

```bash
$ npx skillcoin list

  📦 Installed Skills
  ─────────────────────────
  Name                     Version     Category       Installed
  ─────────────────────────────────────────────────────────────────
  seo-blog-writer          1.0.0       marketing      3/11/2026
```

### `skillcoin config`
Manage your local CLI configuration (stored in `~/.skillcoin/config.json`).

```bash
# View current config
$ npx skillcoin config

# Set custom API or IPFS gateway
$ npx skillcoin config --gateway "https://ipfs.io/ipfs" --network mainnet
```

---

## 🏗️ How It Works (Architecture)

1. **Storage (Lighthouse & IPFS)**
   When you `publish`, the `.md` file represents your AI agent's instructions. It is pinned to IPFS and backed up on the Filecoin network using Lighthouse. This guarantees the file can never be deleted or altered (immutable CID).

2. **Retrieval (Multi-Gateway)**
   When you `install`, the CLI fetches the CID metadata from the Skillcoin API, then aggressively attempts to download the file from multiple IPFS gateways simultaneously (`gateway.lighthouse.storage`, `ipfs.io`, `cloudflare-ipfs.com`) to ensure maximum speed and reliability.

3. **Payments (Ethers.js & MetaMask)**
   If a skill costs money, the CLI spawns a temporary lightweight HTTP server (`localhost:7402`) and opens a self-contained payment UI in your default browser. Once you approve the `tFIL` transfer via MetaMask, the browser securely posts the transaction hash back to the CLI server, which shuts down and resumes the download.

---

## 📁 Local Data Directory

All Skillcoin data is stored safely in your home directory:

```text
~/.skillcoin/
├── config.json               # CLI settings
└── skills/
    └── seo-blog-writer/      # Installed skill
        ├── SKILL.md          # The actual AI instructions
        ├── seo-blog-writer.md# (Original filename)
        └── manifest.json     # Metadata, CID, and version tracking
```

---

## 🤝 Contributing
Built for the Filecoin / ETHGlobal ecosystem. To run locally from source:

```bash
git clone https://github.com/your-repo/skillcoin.git
cd skillcoin/packages/cli
pnpm install
pnpm run build
node dist/bin/skillcoin.js --version
```
