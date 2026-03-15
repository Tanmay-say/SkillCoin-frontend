/**
 * Deploy SkillRegistry and SkillLicenseNFT to Filecoin Calibration FVM
 *
 * Run: npx hardhat run scripts/deploy.js --network calibration
 *
 * After deployment, update .env:
 *   SKILL_REGISTRY_ADDRESS=<deployed address>
 *   SKILL_LICENSE_NFT_ADDRESS=<deployed address>
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=== SkillCoin Contract Deployment ===");
  console.log("Network:  Filecoin Calibration FVM (chainId 314159)");
  console.log("Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance: ", ethers.formatEther(balance), "FIL\n");

  if (balance === 0n) {
    throw new Error("Deployer wallet has 0 FIL. Fund it at https://faucet.calibration.fildev.network/");
  }

  // ─── 1. Deploy SkillRegistry ────────────────────────────────────────────────
  console.log("Deploying SkillRegistry...");
  const SkillRegistry = await ethers.getContractFactory("SkillRegistry");
  const registry = await SkillRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("✅ SkillRegistry deployed to:", registryAddress);

  // ─── 2. Deploy SkillLicenseNFT ──────────────────────────────────────────────
  console.log("\nDeploying SkillLicenseNFT...");
  const SkillLicenseNFT = await ethers.getContractFactory("SkillLicenseNFT");
  const nft = await SkillLicenseNFT.deploy();
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("✅ SkillLicenseNFT deployed to:", nftAddress);

  // ─── 3. Save addresses ──────────────────────────────────────────────────────
  const deployment = {
    network: "filecoin-calibration",
    chainId: 314159,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      SkillRegistry: registryAddress,
      SkillLicenseNFT: nftAddress,
    },
    explorerBaseUrl: "https://calibration.filfox.info/en/address",
  };

  const outPath = path.join(__dirname, "../deployment.json");
  fs.writeFileSync(outPath, JSON.stringify(deployment, null, 2));
  console.log("\n📄 Addresses saved to contracts/deployment.json");

  console.log("\n=== Post-Deployment Steps ===");
  console.log("Add these to your .env file:");
  console.log(`SKILL_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`SKILL_LICENSE_NFT_ADDRESS=${nftAddress}`);
  console.log(`\nExplorer links:`);
  console.log(`  SkillRegistry:    https://calibration.filfox.info/en/address/${registryAddress}`);
  console.log(`  SkillLicenseNFT:  https://calibration.filfox.info/en/address/${nftAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
