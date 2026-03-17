/**
 * register-agent.ts — ERC-8004 Agent Registration Command
 *
 * Flow:
 *  1. Build agent card JSON (describes SkillCoin Agent capabilities)
 *  2. Upload agent card to Filecoin Pin CLI (gets Root CID with daily PDP proofs)
 *  3. Register `ipfs://<rootCid>` as tokenURI on ERC-8004 registry on Base Sepolia
 *  4. Save agent-registration.json with all IDs
 *
 * Usage: skillcoin register-agent
 */

import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import ora from "ora";
import chalk from "chalk";
import { uploadWithFilecoinPin, isFilecoinPinAvailable } from "../lib/filecoin-pin";

// ERC-8004 Identity Registry — Base Sepolia (official)
const ERC8004_REGISTRY = "0x8004AA63c570c570eBF15376c0dB199918BFe9Fb";
const BASE_SEPOLIA_RPC = process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";

// Minimal ABI — just the bits we need
const REGISTRY_ABI = [
  "function registerAgent(string memory tokenURI) external returns (uint256 tokenId)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "event AgentRegistered(address indexed owner, uint256 indexed tokenId, string tokenURI)",
];

export async function registerAgentCommand() {
  console.log(chalk.bold.cyan("\n🤖 SkillCoin ERC-8004 Agent Registration\n"));

  const privateKey = process.env.FILECOIN_PRIVATE_KEY;
  if (!privateKey) {
    console.error(chalk.red("❌ FILECOIN_PRIVATE_KEY is not set in your .env"));
    console.error(chalk.dim("   Create a wallet and set the private key in .env"));
    process.exit(1);
  }

  const walletAddress = process.env.FILECOIN_WALLET_ADDRESS || "";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://skillcoin.xyz";

  // ─── Step 1: Build agent card ──────────────────────────────────────────────
  const spinner = ora("Building agent card JSON...").start();

  const agentCard = {
    type: "https://eips.ethereum.org/EIPS/eip-8004",
    name: "SkillCoin Skill Agent",
    description:
      "An autonomous AI agent that generates (via Gemini AI), publishes, and installs Claude skill files on the decentralized SkillCoin marketplace. All skills are stored on Filecoin with cryptographic PDP proof of storage.",
    image: `${apiUrl}/logo.png`,
    version: "2.0.0",
    createdAt: new Date().toISOString(),
    endpoints: [
      {
        type: "skillcoin-api",
        url: `${apiUrl}/api`,
        description: "SkillCoin Marketplace REST API",
      },
      {
        type: "skill-generate",
        url: `${apiUrl}/api/skills/generate`,
        description: "Gemini-powered AI skill generation endpoint",
      },
      ...(walletAddress
        ? [
            {
              type: "agentWallet",
              address: walletAddress,
              chainId: 314159, // Filecoin Calibration
              currency: "USDFC",
              description: "Accepts USDFC for skill purchases and storage",
            },
          ]
        : []),
    ],
    capabilities: [
      "generate-skill",
      "modify-skill",
      "publish-skill",
      "install-skill",
      "verify-storage",
      "erc8004-registered",
    ],
    storage: {
      provider: "filecoin-pin",
      sdk: "@filoz/synapse-sdk",
      network: "calibration",
      proofType: "PDP",
      description: "All skills stored on Filecoin with daily PDP proofs",
    },
    contracts: {
      SkillRegistry: process.env.SKILL_REGISTRY_ADDRESS || "TBD",
      SkillLicenseNFT: process.env.SKILL_LICENSE_NFT_ADDRESS || "TBD",
      network: "Filecoin Calibration FVM (chainId 314159)",
    },
    links: {
      marketplace: apiUrl,
      cli: "https://www.npmjs.com/package/skillcoin",
      github: "https://github.com/Tanmay-say/SkillCoin-frontend",
    },
  };

  const cardPath = path.join(process.cwd(), "agent-card.json");
  fs.writeFileSync(cardPath, JSON.stringify(agentCard, null, 2));
  spinner.succeed(chalk.green("Agent card written to agent-card.json"));

  // ─── Step 2: Upload to Filecoin Pin ───────────────────────────────────────
  const uploadSpinner = ora("Uploading agent card to Filecoin Pin...").start();

  let rootCid: string;
  let pieceCid = "";
  let dataSetId = 0;

  const fpAvailable = await isFilecoinPinAvailable();

  if (fpAvailable) {
    try {
      const uploadResult = await uploadWithFilecoinPin(cardPath);
      rootCid = uploadResult.rootCid;
      pieceCid = uploadResult.pieceCid;
      dataSetId = uploadResult.dataSetId;
      uploadSpinner.succeed(chalk.green("Uploaded to Filecoin via filecoin-pin!"));
    } catch (err: any) {
      uploadSpinner.warn(
        chalk.yellow(`filecoin-pin upload failed: ${err.message}`)
      );
      console.log(chalk.dim("  Using placeholder CID for demo mode"));
      rootCid = `bafkreidemo${Date.now()}`;
    }
  } else {
    uploadSpinner.warn(
      chalk.yellow("filecoin-pin not available — using placeholder CID for demo")
    );
    rootCid = `bafkreidemo${Date.now()}`;
  }

  console.log(chalk.cyan(`  Root CID:    ${rootCid}`));
  if (pieceCid) console.log(chalk.cyan(`  Piece CID:   ${pieceCid}`));
  if (dataSetId) {
    console.log(chalk.cyan(`  Data Set ID: ${dataSetId}`));
    console.log(chalk.cyan(`  Proof URL:   https://pdp.vxb.ai/calibration/dataset/${dataSetId}`));
  }

  const tokenURI = `ipfs://${rootCid}`;

  // ─── Step 3: Register on ERC-8004 ──────────────────────────────────────────
  const regSpinner = ora("Registering on ERC-8004 Identity Registry (Base Sepolia)...").start();

  try {
    const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
    const wallet = new ethers.Wallet(privateKey, provider);
    const registry = new ethers.Contract(ERC8004_REGISTRY, REGISTRY_ABI, wallet);

    const tx = await registry.registerAgent(tokenURI);
    regSpinner.text = `Transaction submitted: ${tx.hash}`;
    const receipt = await tx.wait();

    // Parse AgentRegistered event for tokenId
    let tokenId = "unknown";
    for (const log of receipt.logs) {
      try {
        const parsed = registry.interface.parseLog(log);
        if (parsed?.name === "AgentRegistered") {
          tokenId = parsed.args.tokenId.toString();
        }
      } catch {}
    }

    regSpinner.succeed(chalk.green("Agent registered on Base Sepolia!"));
    console.log(chalk.cyan(`  Transaction: ${receipt.hash}`));
    console.log(chalk.cyan(`  Token ID:    ${tokenId}`));
    console.log(chalk.cyan(`  Token URI:   ${tokenURI}`));
    console.log(
      chalk.cyan(`  Basescan:    https://sepolia.basescan.org/tx/${receipt.hash}`)
    );

    // ─── Step 4: Save registration result ─────────────────────────────────────
    const registration = {
      registeredAt: new Date().toISOString(),
      network: "Base Sepolia",
      registry: ERC8004_REGISTRY,
      tokenId,
      tokenURI,
      txHash: receipt.hash,
      filecoin: { rootCid, pieceCid, dataSetId },
      agentCard,
    };

    const regPath = path.join(process.cwd(), "agent-registration.json");
    fs.writeFileSync(regPath, JSON.stringify(registration, null, 2));

    console.log(chalk.bold.green("\n🎉 SkillCoin Agent is now ERC-8004 verifiable!"));
    console.log(chalk.dim(`   Agent card:  https://ipfs.io/ipfs/${rootCid}`));
    console.log(chalk.dim(`   Saved to:    agent-registration.json`));
  } catch (err: any) {
    regSpinner.fail(chalk.red(`Registration failed: ${err.message}`));
    console.log(chalk.dim("\nCommon causes:"));
    console.log(chalk.dim("  - Wallet has no Base Sepolia ETH (faucet: https://faucet.quicknode.com/base/sepolia)"));
    console.log(chalk.dim("  - FILECOIN_PRIVATE_KEY is not a valid private key"));
    process.exit(1);
  }
}
