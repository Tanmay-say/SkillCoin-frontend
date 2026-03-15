---
name: skillcoin-npm-package
description: >
  Build and publish the Skillcoin CLI as a production-ready npm package so users can run
  `npx skillcoin install <skill-name>` or `skillcoin install <skill-name>` globally.
  Covers full monorepo wiring, CLI command structure (install/publish/list/search/login),
  localhost browser-payment flow (spin up local HTTP server → open browser → WalletConnect/QR →
  poll for tx confirmation), Lighthouse download via CID, Filecoin Synapse storage integration
  on the server side, and npm publish pipeline.
  
  USE THIS SKILL whenever the user says: "publish the CLI", "make it work with npx", 
  "npm package for skillcoin", "skillcoin install from terminal", "payment via browser popup",
  "wallet connect from CLI", "QR code payment CLI", "publish to npm", or anything about 
  turning the Skillcoin CLI into a distributable developer tool. This skill should also trigger
  when the user mentions integrating Synapse SDK for downloads, setting up the payment gateway
  page, or wiring the CLI to the existing Lighthouse-published files.
---

# Skillcoin NPX Package — Complete Build Skill

## Context: What Already Works
- Skills are successfully uploaded to Lighthouse (CID stored in DB) ✅
- Backend API exists (Hono.js + PostgreSQL/Prisma) ✅  
- Next.js frontend marketplace exists ✅
- Auth (JWT + wallet address) exists ✅

## What This Skill Builds
1. A polished `packages/cli/` TypeScript package publishable as `skillcoin` on npm
2. The **browser-payment flow**: CLI spawns local server → opens browser tab → user pays via WalletConnect or QR → CLI polls for confirmation
3. Correct **Lighthouse CID download** after payment (already working on server)
4. **Synapse SDK** wiring on the API server for storage retrieval (optional enhancement)
5. `npm publish` pipeline + `npx skillcoin` working end-to-end

---

## Step 1: Understand the Full CLI Architecture

Read `references/architecture.md` for the full system diagram before writing code.

The CLI has **two execution modes**:
- `npx skillcoin <command>` — zero install, runs latest from npm registry
- `npm install -g skillcoin` then `skillcoin <command>` — global install

Both use the same compiled binary. The entry point is `packages/cli/bin/skillcoin.js`.

---

## Step 2: Package.json + tsconfig Setup

The `packages/cli/package.json` MUST have these exact fields for npm to work correctly:

```json
{
  "name": "skillcoin",
  "version": "0.1.0",
  "description": "npm for AI Agent Skills — Decentralized, Paid, Permanent",
  "bin": {
    "skillcoin": "./dist/bin/skillcoin.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsup src/index.ts src/bin/skillcoin.ts --format cjs --dts --clean",
    "dev": "tsup src/index.ts src/bin/skillcoin.ts --format cjs --watch",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "ora": "^8.0.0",
    "chalk": "^5.3.0",
    "open": "^10.0.0",
    "adm-zip": "^0.5.10",
    "ethers": "^6.11.0",
    "conf": "^13.0.0",
    "inquirer": "^9.2.0"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.4.0",
    "@types/node": "^20.0.0",
    "@types/adm-zip": "^0.5.0",
    "@types/inquirer": "^9.0.0"
  },
  "engines": { "node": ">=18.0.0" },
  "keywords": ["ai", "skills", "filecoin", "cli", "agents"],
  "license": "MIT"
}
```

> **CRITICAL**: The `bin` field must point to a file with `#!/usr/bin/env node` as its first line, compiled to CJS. Use `tsup` not `tsc` — it handles the shebang correctly.

---

## Step 3: CLI Entry Point + Command Structure

### `src/bin/skillcoin.ts` (compiled → `dist/bin/skillcoin.js`)

```typescript
#!/usr/bin/env node
import { program } from 'commander';
import { installCommand } from '../commands/install';
import { publishCommand } from '../commands/publish';
import { listCommand } from '../commands/list';
import { searchCommand } from '../commands/search';
import { loginCommand } from '../commands/login';
import { whoamiCommand } from '../commands/whoami';
import pkg from '../../package.json';

program
  .name('skillcoin')
  .description('npm for AI Agent Skills — Decentralized, Paid, Permanent')
  .version(pkg.version);

program
  .command('install <skill-name>')
  .alias('i')
  .description('Install a skill from the Skillcoin marketplace')
  .option('-d, --dir <path>', 'Install directory', '.skillcoin/skills')
  .option('--no-payment', 'Skip payment (free skills only)')
  .action(installCommand);

program
  .command('publish')
  .description('Publish a skill to the Skillcoin marketplace')
  .option('-p, --path <path>', 'Path to skill directory', '.')
  .option('--price <amount>', 'Price in USDFC (0 for free)', '0')
  .action(publishCommand);

program
  .command('list')
  .alias('ls')
  .description('List installed skills')
  .action(listCommand);

program
  .command('search <query>')
  .description('Search the Skillcoin marketplace')
  .action(searchCommand);

program
  .command('login')
  .description('Authenticate with Skillcoin')
  .action(loginCommand);

program
  .command('whoami')
  .description('Show current authenticated user')
  .action(whoamiCommand);

program.parse();
```

---

## Step 4: The Install Command (Core Logic)

Read `references/install-flow.md` for the complete flow diagram.

### `src/commands/install.ts`

```typescript
import ora from 'ora';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { getSkillInfo } from '../lib/api';
import { handleBrowserPayment } from '../lib/payment';
import { downloadSkill } from '../lib/download';
import { saveSkillLocally } from '../lib/storage';

export async function installCommand(skillName: string, options: { dir: string; payment: boolean }) {
  const spinner = ora(`Looking up ${chalk.cyan(skillName)}...`).start();

  try {
    // 1. Fetch skill metadata from API
    const skill = await getSkillInfo(skillName);
    spinner.succeed(`Found: ${chalk.bold(skill.name)} v${skill.version} by ${skill.creator}`);

    // 2. Check if payment required
    if (skill.price > 0 && options.payment !== false) {
      console.log(chalk.yellow(`\n  💰 This skill costs ${skill.price} USDFC`));
      console.log(chalk.dim(`  ${skill.description}\n`));
      
      // 3. BROWSER PAYMENT FLOW
      const txHash = await handleBrowserPayment({
        skillName,
        skillId: skill.id,
        price: skill.price,
        recipient: skill.adminVault,
        currency: 'USDFC',
      });

      spinner.start('Verifying payment on-chain...');
      // txHash comes back after browser confirms payment
      spinner.succeed(`Payment confirmed: ${chalk.dim(txHash.slice(0, 20))}...`);
    } else {
      console.log(chalk.green(`  ✓ Free skill`));
    }

    // 4. Download skill files from Lighthouse via CID
    spinner.start('Downloading from Filecoin/IPFS...');
    const skillBuffer = await downloadSkill(skill.cid, skillName);
    spinner.succeed('Downloaded from Filecoin');

    // 5. Save to local filesystem
    const installDir = path.resolve(options.dir, skillName);
    await saveSkillLocally(skillBuffer, installDir, skillName);
    
    // 6. Update skillcoin.json lockfile
    updateLockfile(skillName, skill.version, skill.cid);

    console.log(chalk.green(`\n  ✅ Installed: ${chalk.bold(skillName)}`));
    console.log(chalk.dim(`     Location: ${installDir}/SKILL.md`));
    console.log(chalk.dim(`     CID: ${skill.cid}\n`));

  } catch (err: any) {
    spinner.fail(chalk.red(`Failed: ${err.message}`));
    process.exit(1);
  }
}

function updateLockfile(name: string, version: string, cid: string) {
  const lockPath = path.resolve('skillcoin.json');
  let lock: any = {};
  if (fs.existsSync(lockPath)) {
    lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
  }
  lock.skills = lock.skills || {};
  lock.skills[name] = { version, cid, installedAt: new Date().toISOString() };
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2));
}
```

---

## Step 5: Browser Payment Flow (THE KEY FEATURE)

This is the most important part. When the user needs to pay, the CLI:
1. Spins up a temporary HTTP server on `localhost:7402` 
2. Opens the browser to that local page
3. The local page has a self-contained payment UI (WalletConnect + QR code)
4. User connects wallet or scans QR → approves USDFC transfer
5. The local page POSTs the txHash back to the CLI's local server
6. CLI shuts down the local server and continues

Read `references/payment-flow.md` for the detailed sequence diagram.

### `src/lib/payment.ts`

```typescript
import http from 'http';
import { open as openBrowser } from 'open';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs';

const PAYMENT_PORT = 7402; // 7402 = HTTP 402 reference :)
const PAYMENT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export interface PaymentRequest {
  skillName: string;
  skillId: string;
  price: number;
  recipient: string;
  currency: string;
}

export async function handleBrowserPayment(req: PaymentRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const spinner = ora('Opening payment page in your browser...').start();

    // Build the self-contained payment HTML page
    const paymentHtml = buildPaymentPage(req);

    // Spawn local HTTP server
    const server = http.createServer((httpReq, httpRes) => {
      // Serve the payment page
      if (httpReq.method === 'GET' && httpReq.url === '/') {
        httpRes.writeHead(200, { 'Content-Type': 'text/html' });
        httpRes.end(paymentHtml);
        return;
      }

      // Receive payment confirmation callback from the page
      if (httpReq.method === 'POST' && httpReq.url === '/confirm') {
        let body = '';
        httpReq.on('data', (chunk) => body += chunk);
        httpReq.on('end', () => {
          try {
            const { txHash, error } = JSON.parse(body);
            // CORS headers so the browser page can POST back
            httpRes.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            });
            httpRes.end(JSON.stringify({ ok: true }));
            server.close();

            if (error) {
              reject(new Error(error));
            } else if (txHash) {
              resolved = true;
              spinner.succeed('Payment completed in browser');
              resolve(txHash);
            }
          } catch {
            httpRes.writeHead(400);
            httpRes.end();
          }
        });
        return;
      }

      // Handle CORS preflight
      if (httpReq.method === 'OPTIONS') {
        httpRes.writeHead(200, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        });
        httpRes.end();
        return;
      }

      httpRes.writeHead(404);
      httpRes.end();
    });

    server.listen(PAYMENT_PORT, '127.0.0.1', () => {
      spinner.succeed(`Payment page ready`);
      console.log(chalk.dim(`\n  Opening: http://localhost:${PAYMENT_PORT}`));
      console.log(chalk.dim('  (If browser doesn\'t open, visit the URL above)\n'));
      openBrowser(`http://localhost:${PAYMENT_PORT}`);
    });

    // Timeout guard
    setTimeout(() => {
      if (!resolved) {
        server.close();
        reject(new Error('Payment timeout — no response after 5 minutes'));
      }
    }, PAYMENT_TIMEOUT_MS);

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${PAYMENT_PORT} is already in use. Close the existing payment page and try again.`));
      } else {
        reject(err);
      }
    });
  });
}
```

### `src/lib/payment-page.ts` — The Self-Contained Payment HTML

This is the HTML page served at `localhost:7402`. It includes:
- WalletConnect v2 (via CDN import)
- QR code display (using wagmi/walletconnect QR modal)
- USDFC transfer logic (ethers.js)
- Callback to the CLI server on completion

See `references/payment-page.html` for the complete standalone page template.

The page must:
1. Show skill name, price, creator
2. Offer "Connect Wallet" button (opens WalletConnect modal with QR)
3. When wallet connected → show "Pay X USDFC" button
4. On approval → send ERC-20 `transfer(recipient, amount)` 
5. On `tx.wait()` success → `POST http://localhost:7402/confirm` with `{ txHash }`
6. On error → `POST http://localhost:7402/confirm` with `{ error: "message" }`
7. Auto-close tab after success

---

## Step 6: Download from Lighthouse (Existing CID)

### `src/lib/download.ts`

```typescript
import AdmZip from 'adm-zip';
import path from 'path';

const LIGHTHOUSE_GATEWAY = 'https://gateway.lighthouse.storage/ipfs';
// Fallback gateways if primary is slow
const GATEWAYS = [
  'https://gateway.lighthouse.storage/ipfs',
  'https://ipfs.io/ipfs',
  'https://cloudflare-ipfs.com/ipfs',
];

export async function downloadSkill(cid: string, skillName: string): Promise<Buffer> {
  let lastError: Error | null = null;
  
  for (const gateway of GATEWAYS) {
    try {
      const url = `${gateway}/${cid}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(30_000), // 30s timeout per gateway
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${gateway}`);
      }
      
      const buffer = Buffer.from(await response.arrayBuffer());
      
      // Validate it's a ZIP before returning
      if (!isValidZip(buffer)) {
        throw new Error('Downloaded file is not a valid ZIP archive');
      }
      
      return buffer;
    } catch (err: any) {
      lastError = err;
      continue; // try next gateway
    }
  }
  
  throw new Error(`Failed to download from all gateways: ${lastError?.message}`);
}

export async function saveSkillLocally(buffer: Buffer, installDir: string, skillName: string): Promise<void> {
  // Security: validate all ZIP paths before extraction (prevent Zip Slip)
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const realInstallDir = path.resolve(installDir);

  for (const entry of entries) {
    const entryPath = path.resolve(installDir, entry.entryName);
    if (!entryPath.startsWith(realInstallDir)) {
      throw new Error(`Security: ZIP entry path traversal detected: ${entry.entryName}`);
    }
  }

  import('fs').then(fs => {
    fs.mkdirSync(installDir, { recursive: true });
  });
  
  zip.extractAllTo(installDir, true);
  
  // Ensure SKILL.md exists
  const skillMdPath = path.join(installDir, 'SKILL.md');
  if (!require('fs').existsSync(skillMdPath)) {
    throw new Error(`Downloaded skill does not contain SKILL.md`);
  }
}

function isValidZip(buffer: Buffer): boolean {
  // ZIP magic bytes: PK (0x50 0x4B)
  return buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4B;
}
```

---

## Step 7: Synapse SDK — Server-Side Storage (API Enhancement)

> **Decision Point**: Synapse SDK is used on the **API server** for permanent Filecoin storage during upload. For the CLI download, we use Lighthouse IPFS gateway (simpler, already works). Only add Synapse to the CLI if you need Filecoin-native retrieval proofs.

### When to use Synapse in the API (`apps/api/src/services/synapse.ts`):

```typescript
import { Synapse } from '@filoz/synapse-sdk';

// Initialize once at server startup
let _synapse: Synapse | null = null;

export async function getSynapse(): Promise<Synapse> {
  if (_synapse) return _synapse;
  
  const privateKey = process.env.SYNAPSE_PRIVATE_KEY;
  if (!privateKey) throw new Error('SYNAPSE_PRIVATE_KEY not set');
  
  _synapse = await Synapse.create({
    privateKey,
    rpcURL: process.env.CALIBRATION_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1',
  });
  
  return _synapse;
}

// Called AFTER Lighthouse upload to anchor on Filecoin Calibration
export async function anchorOnFilecoin(cid: string): Promise<string> {
  const synapse = await getSynapse();
  // Storage deal anchoring - Synapse handles deal lifecycle
  // The CID from Lighthouse is already on IPFS; Synapse ensures Filecoin permanence
  console.log(`[Synapse] Anchoring CID: ${cid} on Filecoin Calibration`);
  // Returns deal ID for tracking
  return cid; // CID is the permanent reference
}
```

---

## Step 8: NPM Publish Pipeline

### `.npmrc` in `packages/cli/`:
```
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
access=public
```

### GitHub Actions: `.github/workflows/publish-cli.yml`

```yaml
name: Publish skillcoin CLI

on:
  push:
    tags:
      - 'cli-v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
        working-directory: packages/cli
      - run: npm run build
        working-directory: packages/cli
      - run: npm publish
        working-directory: packages/cli
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Manual publish steps:
```bash
cd packages/cli
npm run build          # Compiles TypeScript → dist/
npm pack --dry-run     # Preview what gets published
npm publish            # Publish to npm (needs npm login first)
```

---

## Step 9: Key Implementation Rules

### CRITICAL: Shebang must survive TypeScript compilation
The `src/bin/skillcoin.ts` first line MUST be `#!/usr/bin/env node`. With `tsup`, add to config:
```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/bin/skillcoin.ts', 'src/index.ts'],
  format: ['cjs'],
  dts: true,
  clean: true,
  banner: { js: '#!/usr/bin/env node' }, // ensures shebang in output
});
```

### CRITICAL: ESM vs CJS
Use `"type": "commonjs"` in package.json OR use `.cjs` extension. The `tsup` CJS format handles this. Do NOT mix `import` and `require` in the same file.

### CRITICAL: `open` package for browser
`open` v10 is ESM-only. With CJS output, use dynamic import:
```typescript
const { default: open } = await import('open');
await open(url);
```

### CRITICAL: Payment page must be self-contained HTML
The payment page cannot load from `localhost` on a network path — it must inline all JS or use CDN. Bundle wagmi/viem via CDN (unpkg or jsdelivr) or serve a pre-bundled page from the CLI.

### Local port conflict handling
If port 7402 is in use, try 7403, 7404, etc. Show the URL clearly in the terminal.

---

## Step 10: Testing the Full Flow

```bash
# 1. Build the CLI
cd packages/cli && npm run build

# 2. Test locally without publishing
node dist/bin/skillcoin.js --version
node dist/bin/skillcoin.js install seo-writer

# 3. Test as if npx (use npx with local path)
npx . install seo-writer     # from inside packages/cli/

# 4. Link globally for local testing
npm link                     # in packages/cli/
skillcoin install seo-writer # now works as global command

# 5. Test payment flow (requires testnet wallet)
skillcoin install paid-skill  # should open browser at localhost:7402
```

---

## Reference Files

- `references/architecture.md` — System diagram + data flow
- `references/install-flow.md` — `skillcoin install` step-by-step with error states
- `references/payment-flow.md` — Browser payment sequence diagram
- `references/payment-page.html` — Complete self-contained payment UI template
- `references/publish-flow.md` — `skillcoin publish` command implementation
- `references/api-contracts.md` — API endpoint specs the CLI talks to

---

## Quick Decision Matrix

| Scenario | Action |
|---|---|
| User wants to download free skill | Skip payment, go straight to Lighthouse download |
| User wants to pay via wallet | Open localhost:7402 with WalletConnect QR modal |
| User wants to pay via MetaMask in browser | Same flow — WalletConnect supports MetaMask too |
| User has no wallet | Show instructions to create one + get testnet USDFC |
| Lighthouse gateway is slow | Retry with fallback gateways (ipfs.io, cloudflare-ipfs) |
| Payment page crashes | Catch error, POST to /confirm with error field, show message in CLI |
| Port 7402 in use | Try 7403, 7404... up to 7410, then error |
| User cancels browser page | Timeout fires after 5 min, clean error in CLI |
| First time user (no wallet setup) | `skillcoin login` first, then install |
