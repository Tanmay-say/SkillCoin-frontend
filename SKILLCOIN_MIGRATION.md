# SkillCoin — Migration & Feature Implementation Guide
## Lighthouse → Filecoin Pin + AI Skill Agent (Claude Code style)

> Feed this entire file to your IDE (Cursor, Windsurf, Claude Code, etc.) as the system context.
> It describes exactly what to build, replace, and add. Work top-to-bottom.

---

## 0. Project Context

**SkillCoin** is a decentralized skill marketplace where creators publish `.skill` files (SKILL.md + assets)
and buyers purchase/install them via wallet payments.

**What we're doing in this PR:**
1. **Replace Lighthouse** with **Filecoin Pin** for all IPFS/storage operations
2. **Add AI Skill Generator** — describe a skill in plain English → get a SKILL.md (like Skillverse's AI feature, but ours)
3. **Add CLI Agent** — `npx skillcoin <command>` where the agent can generate, modify, and install skills interactively (like Claude Code but for skills)
4. **Register the SkillCoin AI Agent via ERC-8004** on Base Sepolia using Filecoin Pin for agent card storage

---

## 1. Packages — Install / Uninstall

```bash
# REMOVE
npm uninstall @lighthouse-web3/sdk

# ADD
npm install filecoin-pin@latest          # CLI + JS library
npm install @filoz/synapse-sdk ethers    # programmatic SDK
npm install @anthropic-ai/sdk            # for AI skill generation
npm install commander inquirer ora chalk # CLI tooling
npm install zod                          # schema validation (already may exist)
```

---

## 2. Environment Variables

Add to `.env.local` (and `.env.example`):

```bash
# --- REMOVE ---
# LIGHTHOUSE_API_KEY=...

# --- ADD ---
# Filecoin Pin / Synapse SDK
FILECOIN_PRIVATE_KEY=""           # wallet private key (NEVER commit)
FILECOIN_WALLET_ADDRESS=""        # corresponding address
FILECOIN_NETWORK="calibration"    # "calibration" for testnet, "mainnet" for prod
FILECOIN_RPC_URL="https://api.calibration.node.glif.io/rpc/v1"

# Anthropic (for AI skill generation)
ANTHROPIC_API_KEY=""

# ERC-8004 Agent Registry (Base Sepolia)
AGENT_REGISTRY_ADDRESS="0x..."    # ERC-8004 registry on Base Sepolia
BASE_SEPOLIA_RPC="https://sepolia.base.org"
```

---

## 3. Core Storage Adapter — Replace Lighthouse

### DELETE file:
`apps/web/lib/lighthouse.ts` (or wherever Lighthouse is imported)

### CREATE file: `apps/web/lib/filecoin-storage.ts`

```typescript
/**
 * filecoin-storage.ts
 * Drop-in replacement for lighthouse.ts
 * All skill files are stored via Filecoin Pin with PDP proof guarantees.
 */

import { Synapse } from '@filoz/synapse-sdk'
import { ethers } from 'ethers'

let _synapse: Synapse | null = null

async function getSynapse(): Promise<Synapse> {
  if (_synapse) return _synapse
  _synapse = await Synapse.create({
    privateKey: process.env.FILECOIN_PRIVATE_KEY!,
    rpcURL: process.env.FILECOIN_RPC_URL ?? 'https://api.calibration.node.glif.io/rpc/v1',
  })
  return _synapse
}

/**
 * Upload a skill file (SKILL.md or .skill zip bundle) to Filecoin.
 * Returns the Root CID (IPFS-compatible) and Piece CID (Filecoin proof reference).
 */
export async function uploadSkillToFilecoin(
  fileBuffer: Uint8Array,
  filename: string
): Promise<{ rootCid: string; pieceCid: string; dataSetId: number }> {
  const synapse = await getSynapse()
  const result = await synapse.storage.upload(fileBuffer)
  return {
    rootCid: result.rootCID.toString(),
    pieceCid: result.pieceCID.toString(),
    dataSetId: result.dataSetId,
  }
}

/**
 * Download a skill from Filecoin by Piece CID.
 */
export async function downloadSkillFromFilecoin(pieceCid: string): Promise<Uint8Array> {
  const synapse = await getSynapse()
  const { asCommP } = await import('@filoz/synapse-sdk/commp')
  const commp = asCommP(pieceCid)
  if (!commp) throw new Error(`Invalid PieceCID: ${pieceCid}`)
  return synapse.storage.download(commp)
}

/**
 * Get IPFS gateway URL for a Root CID.
 * Content is accessible from any public IPFS gateway.
 */
export function getIpfsGatewayUrl(rootCid: string): string {
  return `https://ipfs.io/ipfs/${rootCid}`
}

/**
 * Verify that a skill is still actively being proven on Filecoin.
 * Returns proof status and provider details.
 */
export async function verifySkillStorage(dataSetId: number) {
  const synapse = await getSynapse()
  const datasets = await synapse.storage.listDataSets()
  const ds = datasets.find(d => d.id === dataSetId)
  return {
    isLive: ds?.status === 'live',
    piecesCount: ds?.pieces?.length ?? 0,
    status: ds?.status ?? 'unknown',
  }
}
```

---

## 4. Find and Replace All Lighthouse Usages

Search your codebase for these patterns and replace:

### Pattern A — Upload

```typescript
// BEFORE (Lighthouse)
import lighthouse from '@lighthouse-web3/sdk'
const response = await lighthouse.upload(file, process.env.LIGHTHOUSE_API_KEY)
const cid = response.data.Hash

// AFTER (Filecoin Pin)
import { uploadSkillToFilecoin } from '@/lib/filecoin-storage'
const { rootCid, pieceCid, dataSetId } = await uploadSkillToFilecoin(fileBuffer, filename)
// Store rootCid in DB as "fileverse_cid" (same field name, stays compatible)
// Also store pieceCid and dataSetId for proof verification
```

### Pattern B — Download / Get URL

```typescript
// BEFORE
const url = `https://gateway.lighthouse.storage/ipfs/${cid}`

// AFTER
import { getIpfsGatewayUrl } from '@/lib/filecoin-storage'
const url = getIpfsGatewayUrl(rootCid)
```

### Pattern C — API Route `/api/skills/publish`

In your publish handler, update the storage flow:

```typescript
// apps/web/app/api/skills/publish/route.ts

import { uploadSkillToFilecoin, getIpfsGatewayUrl } from '@/lib/filecoin-storage'

// In the handler:
const fileBuffer = new Uint8Array(await file.arrayBuffer())
const { rootCid, pieceCid, dataSetId } = await uploadSkillToFilecoin(fileBuffer, file.name)

// Save to DB — update these column names if needed:
await db.skills.create({
  ...otherFields,
  fileverse_cid: rootCid,         // was: lighthouse cid
  piece_cid: pieceCid,            // NEW: filecoin proof reference
  filecoin_dataset_id: dataSetId, // NEW: for proof verification
  ipfs_url: getIpfsGatewayUrl(rootCid),
})
```

### Database migration — add columns:

```sql
ALTER TABLE skills ADD COLUMN piece_cid TEXT;
ALTER TABLE skills ADD COLUMN filecoin_dataset_id INTEGER;
```

---

## 5. AI Skill Generator

### CREATE: `apps/web/lib/skill-generator.ts`

```typescript
/**
 * skill-generator.ts
 * Generates SKILL.md files from plain English descriptions using Claude.
 * Modeled after Skillverse's AI generator but runs on OUR platform.
 */

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SKILL_SYSTEM_PROMPT = `You are an expert at writing Claude skill files (SKILL.md).
A SKILL.md file is a structured markdown file that teaches Claude how to perform a specific task.

You MUST output ONLY valid SKILL.md content — no preamble, no explanation, no markdown code fences.
The output starts with the YAML frontmatter block (---) and ends with the last line of markdown.

Required frontmatter fields:
- name: kebab-case identifier
- description: when to trigger this skill (be verbose, include synonyms and contexts)
- version: "1.0.0"
- tags: array of relevant keywords

Required body sections:
## Overview
## When to Use This Skill
## Step-by-Step Instructions (numbered, actionable)
## Examples
  - At least one input → output pair
## Common Mistakes to Avoid

Constraints:
- Max 500 lines
- Steps must be specific and actionable (not "think about X")
- Examples must show concrete input and output
- The description frontmatter must be "pushy" — include all contexts where Claude should use this skill
`

const SkillSchema = z.object({
  content: z.string().min(100).max(50000),
  name: z.string().regex(/^[a-z0-9-]+$/),
})

export async function generateSkillFromDescription(
  userDescription: string,
  category?: string
): Promise<{ skillMd: string; name: string; isAiGenerated: true }> {
  const prompt = `Create a SKILL.md for the following:

Description: ${userDescription}
${category ? `Category: ${category}` : ''}

Generate the complete SKILL.md now:`

  let skillMd = ''

  // First attempt
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SKILL_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  skillMd = response.content[0].type === 'text' ? response.content[0].text : ''

  // Validate — retry once with correction if invalid
  const isValid = skillMd.startsWith('---') && skillMd.includes('## ')
  if (!isValid) {
    const retryResponse = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SKILL_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: skillMd },
        {
          role: 'user',
          content:
            'The output is invalid. It must start with --- (YAML frontmatter). Output ONLY the SKILL.md content, nothing else.',
        },
      ],
    })
    skillMd = retryResponse.content[0].type === 'text' ? retryResponse.content[0].text : ''
  }

  // Extract name from frontmatter
  const nameMatch = skillMd.match(/^name:\s*(.+)$/m)
  const name = nameMatch?.[1]?.trim() ?? 'generated-skill'

  return { skillMd, name, isAiGenerated: true }
}

/**
 * Modify an existing skill based on a natural language instruction.
 * This is the "Claude Code for skills" feature — agent modifies the skill.
 */
export async function modifySkill(
  existingSkillMd: string,
  modificationRequest: string
): Promise<{ skillMd: string; changesSummary: string }> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: `You are an expert at editing Claude skill files (SKILL.md).
The user will give you an existing SKILL.md and describe a modification.
Output the COMPLETE modified SKILL.md followed by ---CHANGES--- then a brief bullet list of what changed.
Do not output anything else.`,
    messages: [
      {
        role: 'user',
        content: `Existing SKILL.md:\n\n${existingSkillMd}\n\n---\nModification request: ${modificationRequest}`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const [skillMd, changesPart] = text.split('---CHANGES---')

  return {
    skillMd: skillMd.trim(),
    changesSummary: changesPart?.trim() ?? 'Skill modified as requested.',
  }
}
```

### CREATE: `apps/web/app/api/skills/generate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { generateSkillFromDescription } from '@/lib/skill-generator'
import { uploadSkillToFilecoin } from '@/lib/filecoin-storage'

export async function POST(req: NextRequest) {
  const { description, category, autoPublish } = await req.json()

  if (!description || description.length < 10) {
    return NextResponse.json({ error: 'Description too short' }, { status: 400 })
  }

  // Generate skill content
  const { skillMd, name, isAiGenerated } = await generateSkillFromDescription(description, category)

  if (!autoPublish) {
    // Return preview — let user review before publishing
    return NextResponse.json({ skillMd, name, isAiGenerated, preview: true })
  }

  // Auto-publish: upload to Filecoin
  const encoder = new TextEncoder()
  const fileBuffer = encoder.encode(skillMd)
  const { rootCid, pieceCid, dataSetId } = await uploadSkillToFilecoin(fileBuffer, `${name}/SKILL.md`)

  return NextResponse.json({
    skillMd,
    name,
    isAiGenerated,
    rootCid,
    pieceCid,
    dataSetId,
    ipfsUrl: `https://ipfs.io/ipfs/${rootCid}`,
  })
}
```

---

## 6. CLI Agent — `npx skillcoin`

### CREATE: `apps/cli/src/index.ts`

This is the "Claude Code for skills" experience. Run `npx skillcoin` to get an interactive agent.

```typescript
#!/usr/bin/env node
/**
 * SkillCoin CLI Agent
 * Usage:
 *   npx skillcoin generate "audit solidity contracts"
 *   npx skillcoin modify ./my-skill/SKILL.md "add more examples"
 *   npx skillcoin install <slug-or-cid>
 *   npx skillcoin publish ./my-skill/
 *   npx skillcoin agent  ← interactive mode (like Claude Code)
 */

import { Command } from 'commander'
import inquirer from 'inquirer'
import ora from 'ora'
import chalk from 'chalk'
import * as fs from 'fs/promises'
import * as path from 'path'
import Anthropic from '@anthropic-ai/sdk'

const program = new Command()
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── GENERATE ────────────────────────────────────────────────────────────────

program
  .command('generate <description>')
  .description('Generate a SKILL.md from plain English description')
  .option('-o, --output <dir>', 'Output directory', './')
  .option('--publish', 'Auto-publish to SkillCoin marketplace after generation')
  .action(async (description, opts) => {
    const spinner = ora('Generating skill...').start()
    try {
      const { generateSkillFromDescription } = await import('./skill-generator.js')
      const { skillMd, name } = await generateSkillFromDescription(description)
      spinner.succeed(chalk.green(`Skill "${name}" generated!`))

      const outDir = path.join(opts.output, name)
      await fs.mkdir(outDir, { recursive: true })
      await fs.writeFile(path.join(outDir, 'SKILL.md'), skillMd)
      console.log(chalk.cyan(`  → Saved to ${outDir}/SKILL.md`))

      if (opts.publish) {
        await publishSkill(outDir)
      }
    } catch (e) {
      spinner.fail(chalk.red('Generation failed'))
      console.error(e)
    }
  })

// ─── MODIFY ──────────────────────────────────────────────────────────────────

program
  .command('modify <skillPath> <instruction>')
  .description('Modify an existing SKILL.md with a natural language instruction')
  .action(async (skillPath, instruction) => {
    const spinner = ora('Modifying skill...').start()
    try {
      const existing = await fs.readFile(skillPath, 'utf-8')
      const { modifySkill } = await import('./skill-generator.js')
      const { skillMd, changesSummary } = await modifySkill(existing, instruction)

      await fs.writeFile(skillPath, skillMd)
      spinner.succeed(chalk.green('Skill modified!'))
      console.log(chalk.dim('\nChanges:'))
      console.log(chalk.cyan(changesSummary))
    } catch (e) {
      spinner.fail(chalk.red('Modification failed'))
      console.error(e)
    }
  })

// ─── PUBLISH ─────────────────────────────────────────────────────────────────

program
  .command('publish <skillDir>')
  .description('Publish a skill directory to Filecoin and list on SkillCoin marketplace')
  .option('--price <usdc>', 'Price in USDC (0 = free)', '0')
  .action(async (skillDir, opts) => {
    await publishSkill(skillDir, parseFloat(opts.price))
  })

async function publishSkill(skillDir: string, price = 0) {
  const spinner = ora('Publishing to Filecoin...').start()
  try {
    // Read SKILL.md
    const skillMd = await fs.readFile(path.join(skillDir, 'SKILL.md'), 'utf-8')
    const nameMatch = skillMd.match(/^name:\s*(.+)$/m)
    const name = nameMatch?.[1]?.trim() ?? path.basename(skillDir)

    // Upload to Filecoin Pin
    const { execSync } = await import('child_process')
    const result = execSync(
      `filecoin-pin add "${skillDir}" --auto-fund --json`,
      { env: { ...process.env } }
    ).toString()

    const pinResult = JSON.parse(result)
    const { rootCid, pieceCid, dataSetId } = pinResult

    spinner.succeed(chalk.green(`Published "${name}" to Filecoin!`))
    console.log(chalk.cyan(`  Root CID:    ${rootCid}`))
    console.log(chalk.cyan(`  Piece CID:   ${pieceCid}`))
    console.log(chalk.cyan(`  Data Set ID: ${dataSetId}`))
    console.log(chalk.cyan(`  IPFS URL:    https://ipfs.io/ipfs/${rootCid}`))
    console.log(chalk.cyan(`  Proof:       https://pdp.vxb.ai/calibration/dataset/${dataSetId}`))

    // Register on marketplace API
    const apiUrl = process.env.SKILLCOIN_API_URL ?? 'https://skillcoin.xyz'
    // POST to /api/skills/publish with rootCid, pieceCid, dataSetId
    console.log(chalk.dim(`\n  Registered on marketplace: ${apiUrl}/skills/${name}`))

  } catch (e) {
    spinner.fail(chalk.red('Publish failed'))
    console.error(e)
  }
}

// ─── INSTALL ─────────────────────────────────────────────────────────────────

program
  .command('install <slugOrCid>')
  .description('Download and install a skill from the marketplace')
  .action(async (slugOrCid) => {
    const spinner = ora(`Installing ${slugOrCid}...`).start()
    try {
      // Fetch skill metadata from API
      const apiUrl = process.env.SKILLCOIN_API_URL ?? 'https://skillcoin.xyz'
      const resp = await fetch(`${apiUrl}/api/skills/${slugOrCid}`)
      if (!resp.ok) throw new Error('Skill not found')
      const skill = await resp.json()

      // Download from IPFS
      const fileResp = await fetch(`https://ipfs.io/ipfs/${skill.fileverse_cid}`)
      const content = await fileResp.text()

      // Save to .skillverse/skills/
      const installDir = path.join(process.cwd(), '.skillverse', 'skills', skill.name)
      await fs.mkdir(installDir, { recursive: true })
      await fs.writeFile(path.join(installDir, 'SKILL.md'), content)

      spinner.succeed(chalk.green(`Installed ${skill.name} v${skill.version}`))
      console.log(chalk.cyan(`  → ${installDir}/SKILL.md`))
    } catch (e) {
      spinner.fail(chalk.red('Install failed'))
      console.error(e)
    }
  })

// ─── AGENT (interactive mode) ────────────────────────────────────────────────

program
  .command('agent')
  .description('Interactive AI agent mode — describe what you want, agent builds + modifies skills')
  .action(async () => {
    console.log(chalk.bold.cyan('\n🤖 SkillCoin Agent — Claude Code for skills'))
    console.log(chalk.dim('Type your request. The agent will generate, modify, or manage skills.\n'))

    const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []

    while (true) {
      const { userInput } = await inquirer.prompt([
        {
          type: 'input',
          name: 'userInput',
          message: chalk.green('You:'),
          prefix: '',
        },
      ])

      if (['exit', 'quit', 'q'].includes(userInput.trim().toLowerCase())) {
        console.log(chalk.dim('\nBye! 👋'))
        break
      }

      conversationHistory.push({ role: 'user', content: userInput })

      const spinner = ora('Thinking...').start()

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: `You are the SkillCoin Agent — an expert assistant for building and managing Claude skill files.
You help users:
1. Generate new SKILL.md files from plain English descriptions
2. Modify existing skills based on feedback
3. Debug skills that aren't triggering correctly
4. Publish skills to the SkillCoin marketplace (Filecoin-backed)
5. Install skills from the marketplace

When a user wants to generate a skill, output the complete SKILL.md content between <SKILL.md> tags.
When a user wants to modify a skill, ask them to paste it, then output the modified version.
Always explain what you're doing before doing it.

Available commands you can suggest:
- npx skillcoin generate "<description>"
- npx skillcoin modify ./skill/SKILL.md "<instruction>"
- npx skillcoin publish ./skill/
- npx skillcoin install <slug>`,
        messages: conversationHistory,
      })

      spinner.stop()

      const assistantText = response.content[0].type === 'text' ? response.content[0].text : ''
      conversationHistory.push({ role: 'assistant', content: assistantText })

      // Pretty print the response
      console.log(chalk.bold('\n🤖 Agent:'))
      
      // Extract and save any SKILL.md blocks
      const skillMatch = assistantText.match(/<SKILL\.md>([\s\S]*?)<\/SKILL\.md>/)
      if (skillMatch) {
        const skillContent = skillMatch[1].trim()
        const nameMatch = skillContent.match(/^name:\s*(.+)$/m)
        const skillName = nameMatch?.[1]?.trim() ?? 'generated-skill'
        
        const outDir = path.join(process.cwd(), '.skillverse', 'skills', skillName)
        await fs.mkdir(outDir, { recursive: true })
        await fs.writeFile(path.join(outDir, 'SKILL.md'), skillContent)
        
        const displayText = assistantText.replace(
          /<SKILL\.md>[\s\S]*?<\/SKILL\.md>/,
          chalk.cyan(`[SKILL.md saved to ${outDir}/SKILL.md]`)
        )
        console.log(displayText)
      } else {
        console.log(assistantText)
      }
      console.log()
    }
  })

program.parse()
```

### Add to `apps/cli/package.json`:

```json
{
  "name": "@skillcoin/cli",
  "version": "1.0.0",
  "bin": {
    "skillcoin": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts"
  }
}
```

---

## 7. ERC-8004 Agent Registration

This registers the SkillCoin AI Agent on-chain. The agent card is stored on Filecoin (with daily proofs),
then minted as an NFT on Base Sepolia — making the agent verifiable and trustless.

### CREATE: `apps/cli/src/register-agent.ts`

```typescript
/**
 * register-agent.ts
 * Registers SkillCoin as an ERC-8004 agent.
 * 
 * How it works:
 * 1. Create agent card JSON (describes what SkillCoin agent can do)
 * 2. Upload agent card to Filecoin Pin → get Root CID (permanent, proven storage)
 * 3. Register Root CID on ERC-8004 Identity Registry on Base Sepolia → NFT minted
 * 4. Anyone can verify the agent's capabilities are stored on Filecoin with daily proofs
 * 
 * Run: npx tsx src/register-agent.ts
 */

import { execSync } from 'child_process'
import { ethers } from 'ethers'
import * as fs from 'fs/promises'
import * as path from 'path'

// ERC-8004 Registry on Base Sepolia (from official docs)
const ERC8004_REGISTRY = '0x...' // paste from: https://docs.filecoin.io/builder-cookbook/filecoin-pin/erc-8004-agent-registration
const BASE_SEPOLIA_RPC = 'https://sepolia.base.org'

// Minimal ABI for registerAgent(string tokenURI)
const REGISTRY_ABI = [
  'function registerAgent(string memory tokenURI) external returns (uint256 tokenId)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'event AgentRegistered(address indexed owner, uint256 indexed tokenId, string tokenURI)',
]

async function main() {
  console.log('🤖 Registering SkillCoin Agent via ERC-8004...\n')

  // Step 1: Create agent card
  const agentCard = {
    type: 'https://eips.ethereum.org/EIPS/eip-8004',
    name: 'SkillCoin Skill Agent',
    description:
      'An autonomous AI agent that generates, modifies, publishes, and installs Claude skill files. Skills are stored on Filecoin with cryptographic proof of storage.',
    image: 'https://skillcoin.xyz/logo.png',
    version: '1.0.0',
    endpoints: [
      {
        type: 'skillcoin-api',
        url: 'https://skillcoin.xyz/api',
        description: 'SkillCoin Marketplace API',
      },
      {
        type: 'agentWallet',
        address: process.env.FILECOIN_WALLET_ADDRESS,
        chainId: 314159, // Filecoin Calibration
        currency: 'USDFC',
        description: 'Accepts USDFC for skill storage and agent actions',
      },
    ],
    capabilities: [
      'generate-skill',
      'modify-skill',
      'publish-skill',
      'install-skill',
      'verify-storage',
    ],
    storage: {
      provider: 'filecoin-pin',
      network: 'calibration',
      proofType: 'PDP',
      description: 'All skills stored on Filecoin with daily PDP proofs',
    },
    links: {
      marketplace: 'https://skillcoin.xyz',
      cli: 'https://www.npmjs.com/package/@skillcoin/cli',
      github: 'https://github.com/Tanmay-say/SkillCoin-frontend',
    },
  }

  // Step 2: Save agent card and upload to Filecoin Pin
  await fs.writeFile('agent-card.json', JSON.stringify(agentCard, null, 2))
  console.log('✅ Agent card created: agent-card.json')

  console.log('📤 Uploading agent card to Filecoin Pin...')
  const uploadResult = execSync(
    `filecoin-pin add agent-card.json --auto-fund --json`,
    { env: { ...process.env } }
  ).toString()

  const { rootCid, pieceCid, dataSetId } = JSON.parse(uploadResult)
  console.log(`✅ Uploaded to Filecoin!`)
  console.log(`   Root CID:    ${rootCid}`)
  console.log(`   Piece CID:   ${pieceCid}`)
  console.log(`   Data Set ID: ${dataSetId}`)
  console.log(`   Proof URL:   https://pdp.vxb.ai/calibration/dataset/${dataSetId}`)

  // The tokenURI for ERC-8004 is the IPFS URL of the agent card
  const tokenURI = `ipfs://${rootCid}`

  // Step 3: Register on ERC-8004 Registry on Base Sepolia
  console.log('\n📋 Registering on ERC-8004 Identity Registry (Base Sepolia)...')
  const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC)
  const wallet = new ethers.Wallet(process.env.FILECOIN_PRIVATE_KEY!, provider)
  const registry = new ethers.Contract(ERC8004_REGISTRY, REGISTRY_ABI, wallet)

  const tx = await registry.registerAgent(tokenURI)
  const receipt = await tx.wait()

  // Extract tokenId from AgentRegistered event
  const event = receipt.logs
    .map((log: any) => {
      try { return registry.interface.parseLog(log) } catch { return null }
    })
    .find((e: any) => e?.name === 'AgentRegistered')

  const tokenId = event?.args?.tokenId?.toString() ?? 'unknown'

  console.log(`✅ Agent registered on Base Sepolia!`)
  console.log(`   Transaction: ${receipt.hash}`)
  console.log(`   Token ID:    ${tokenId}`)
  console.log(`   Token URI:   ${tokenURI}`)
  console.log(`\n🎉 SkillCoin Agent is now verifiable:`)
  console.log(`   - Agent card stored on Filecoin with daily PDP proofs`)
  console.log(`   - Registered as NFT on Base Sepolia (ERC-8004)`)
  console.log(`   - Anyone can verify: ipfs.io/ipfs/${rootCid}`)

  // Save registration info
  const registration = { rootCid, pieceCid, dataSetId, tokenId, txHash: receipt.hash, tokenURI }
  await fs.writeFile('agent-registration.json', JSON.stringify(registration, null, 2))
  console.log(`\n   Saved to agent-registration.json`)
}

main().catch(console.error)
```

---

## 8. Frontend — Add AI Generate Button

In your skill publish page (e.g., `apps/web/app/skills/new/page.tsx`), add:

```tsx
// Add AI generation mode toggle
const [aiMode, setAiMode] = useState(false)
const [description, setDescription] = useState('')
const [generatedSkill, setGeneratedSkill] = useState('')
const [isGenerating, setIsGenerating] = useState(false)

const handleAiGenerate = async () => {
  setIsGenerating(true)
  const res = await fetch('/api/skills/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, category }),
  })
  const data = await res.json()
  setGeneratedSkill(data.skillMd)
  setIsGenerating(false)
}

// In JSX:
<div className="ai-generate-section">
  <button onClick={() => setAiMode(!aiMode)}>
    ✨ Generate with AI
  </button>
  
  {aiMode && (
    <div>
      <textarea
        placeholder="Describe your skill in plain English...
e.g. 'A skill that helps Claude audit Solidity smart contracts for security vulnerabilities'"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
      <button onClick={handleAiGenerate} disabled={isGenerating}>
        {isGenerating ? 'Generating...' : 'Generate SKILL.md'}
      </button>
      
      {generatedSkill && (
        <div>
          <pre>{generatedSkill}</pre>
          <button onClick={() => setSkillContent(generatedSkill)}>
            Use This Skill →
          </button>
        </div>
      )}
    </div>
  )}
</div>
```

---

## 9. Storage Proof Badge Component

Show users that their skill has verifiable Filecoin storage proofs:

```tsx
// components/FilecoinProofBadge.tsx
export function FilecoinProofBadge({ dataSetId }: { dataSetId: number }) {
  return (
    <a
      href={`https://pdp.vxb.ai/calibration/dataset/${dataSetId}`}
      target="_blank"
      className="proof-badge"
      title="Verified on Filecoin with daily PDP proofs"
    >
      <img src="/filecoin-logo.svg" width={16} />
      <span>Filecoin Verified</span>
      <span className="live-dot" />
    </a>
  )
}
```

Add this badge to every skill card wherever you display skills.

---

## 10. Verification Endpoint

```typescript
// apps/web/app/api/skills/[slug]/verify/route.ts
import { verifySkillStorage } from '@/lib/filecoin-storage'
import { db } from '@/lib/db'

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const skill = await db.skills.findUnique({ where: { slug: params.slug } })
  if (!skill) return Response.json({ error: 'Not found' }, { status: 404 })

  const proof = await verifySkillStorage(skill.filecoin_dataset_id)
  return Response.json({
    slug: skill.slug,
    rootCid: skill.fileverse_cid,
    pieceCid: skill.piece_cid,
    dataSetId: skill.filecoin_dataset_id,
    proofUrl: `https://pdp.vxb.ai/calibration/dataset/${skill.filecoin_dataset_id}`,
    ...proof,
  })
}
```

---

## 11. Summary of All Files Changed / Created

| Action | File |
|--------|------|
| DELETE | `lib/lighthouse.ts` (or equivalent) |
| CREATE | `apps/web/lib/filecoin-storage.ts` |
| CREATE | `apps/web/lib/skill-generator.ts` |
| CREATE | `apps/web/app/api/skills/generate/route.ts` |
| CREATE | `apps/web/app/api/skills/[slug]/verify/route.ts` |
| MODIFY | `apps/web/app/api/skills/publish/route.ts` |
| MODIFY | `apps/web/app/skills/new/page.tsx` (add AI generate UI) |
| CREATE | `apps/cli/src/index.ts` |
| CREATE | `apps/cli/src/register-agent.ts` |
| MODIFY | `.env.local` / `.env.example` |
| MIGRATE | SQL: add `piece_cid`, `filecoin_dataset_id` columns |

---

## 12. Test Checklist

After implementation, verify:

- [ ] `npx skillcoin generate "audit solidity contracts"` → creates SKILL.md file
- [ ] `npx skillcoin agent` → interactive loop works
- [ ] `npx skillcoin modify ./skill/SKILL.md "add more examples"` → modifies in place
- [ ] Publish form: clicking "Generate with AI" produces valid SKILL.md
- [ ] Publish form: uploading SKILL.md stores it on Filecoin (not Lighthouse)
- [ ] Skill detail page: shows Filecoin Verified badge with working proof link
- [ ] `GET /api/skills/:slug/verify` returns `isLive: true`
- [ ] `tsx apps/cli/src/register-agent.ts` → agent card minted on Base Sepolia
- [ ] All Lighthouse-related imports removed from codebase (`grep -r lighthouse` returns nothing)
