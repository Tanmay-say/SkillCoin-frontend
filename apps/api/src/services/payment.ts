import { randomUUID } from "crypto";
import { ethers } from "ethers";
import jwt, { type SignOptions } from "jsonwebtoken";
import prisma from "../db/client";
import type { PaymentChallenge, VerifyResult } from "../types";

const ADMIN_VAULT_ADDRESS = process.env.ADMIN_VAULT_ADDRESS || "";
const PAYMENT_VERIFY_RPC_URL = process.env.PAYMENT_VERIFY_RPC_URL || "";
const PAYMENT_CHAIN_ID = parseInt(process.env.PAYMENT_CHAIN_ID || "314159", 10);
const PAYMENT_RPC_URL =
  process.env.PAYMENT_RPC_URL ||
  PAYMENT_VERIFY_RPC_URL ||
  "https://api.calibration.node.glif.io/rpc/v1";
const PAYMENT_BLOCK_EXPLORER_URL =
  process.env.PAYMENT_BLOCK_EXPLORER_URL || "https://calibration.filfox.info/en";
const PAYMENT_NATIVE_CHAIN_ID = parseInt(
  process.env.PAYMENT_NATIVE_CHAIN_ID || String(PAYMENT_CHAIN_ID || 314159),
  10
);
const PAYMENT_NATIVE_RPC_URL =
  process.env.PAYMENT_NATIVE_RPC_URL ||
  process.env.FILECOIN_RPC_URL ||
  PAYMENT_RPC_URL ||
  "https://api.calibration.node.glif.io/rpc/v1";
const PAYMENT_NATIVE_BLOCK_EXPLORER_URL =
  process.env.PAYMENT_NATIVE_BLOCK_EXPLORER_URL ||
  "https://calibration.filfox.info/en";
const PAYMENT_USDC_CHAIN_ID = parseInt(
  process.env.PAYMENT_USDC_CHAIN_ID || String(PAYMENT_CHAIN_ID || 84532),
  10
);
const PAYMENT_USDC_RPC_URL =
  process.env.PAYMENT_USDC_RPC_URL ||
  process.env.BASE_SEPOLIA_RPC ||
  PAYMENT_RPC_URL ||
  "https://sepolia.base.org";
const PAYMENT_USDC_VERIFY_RPC_URL =
  process.env.PAYMENT_USDC_VERIFY_RPC_URL ||
  process.env.PAYMENT_VERIFY_RPC_URL ||
  PAYMENT_USDC_RPC_URL;
const PAYMENT_NATIVE_VERIFY_RPC_URL =
  process.env.PAYMENT_NATIVE_VERIFY_RPC_URL ||
  process.env.FILECOIN_RPC_URL ||
  PAYMENT_VERIFY_RPC_URL ||
  PAYMENT_NATIVE_RPC_URL;
const PAYMENT_USDC_BLOCK_EXPLORER_URL =
  process.env.PAYMENT_USDC_BLOCK_EXPLORER_URL ||
  "https://sepolia.basescan.org";
const PAYMENT_USDC_ADDRESS = process.env.PAYMENT_USDC_ADDRESS || "";

// Standard ERC-20 Transfer event signature
const TRANSFER_EVENT_TOPIC = ethers.id("Transfer(address,address,uint256)");

interface SignedPaymentChallengePayload {
  purpose: "payment";
  skillId: string;
  skillSlug: string;
  userId: string;
  payerAddress: string;
  amount: string;
  currency: string;
  recipient: string;
  nonce: string;
  paymentType: "native" | "erc20";
  tokenAddress?: string;
  tokenDecimals?: number;
  chainId: number;
  rpcUrl: string;
  verifyRpcUrl: string;
  blockExplorerUrl: string;
  iat?: number;
  exp?: number;
}

interface CurrencyPaymentConfig {
  currency: string;
  paymentType: "native" | "erc20";
  tokenAddress?: string;
  tokenDecimals?: number;
  chainId: number;
  rpcUrl: string;
  verifyRpcUrl: string;
  blockExplorerUrl: string;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return secret;
}

export class PaymentService {
  static getPaymentConfig(currency: string): CurrencyPaymentConfig {
    if (currency === "USDC") {
      return {
        currency,
        paymentType: "erc20",
        tokenAddress: PAYMENT_USDC_ADDRESS || undefined,
        tokenDecimals: 6,
        chainId: PAYMENT_USDC_CHAIN_ID,
        rpcUrl: PAYMENT_USDC_RPC_URL,
        verifyRpcUrl: PAYMENT_USDC_VERIFY_RPC_URL,
        blockExplorerUrl: PAYMENT_USDC_BLOCK_EXPLORER_URL,
      };
    }

    if (currency === "TFIL") {
      return {
        currency,
        paymentType: "native",
        chainId: PAYMENT_NATIVE_CHAIN_ID,
        rpcUrl: PAYMENT_NATIVE_RPC_URL,
        verifyRpcUrl: PAYMENT_NATIVE_VERIFY_RPC_URL,
        blockExplorerUrl: PAYMENT_NATIVE_BLOCK_EXPLORER_URL,
      };
    }

    throw new Error(`Unsupported payment currency: ${currency}`);
  }

  /**
   * Create a short-lived signed payment challenge for a specific user + skill.
   */
  static createChallenge(args: {
    skillId: string;
    skillSlug: string;
    userId: string;
    payerAddress: string;
    amount: string;
    currency: string;
  }): PaymentChallenge {
    if (!ADMIN_VAULT_ADDRESS) {
      throw new Error("ADMIN_VAULT_ADDRESS is not configured for paid downloads");
    }

    const nonce = randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const paymentConfig = this.getPaymentConfig(args.currency);

    const payload: SignedPaymentChallengePayload = {
      purpose: "payment",
      skillId: args.skillId,
      skillSlug: args.skillSlug,
      userId: args.userId,
      payerAddress: args.payerAddress,
      amount: args.amount,
      currency: args.currency,
      recipient: ADMIN_VAULT_ADDRESS,
      nonce,
      paymentType: paymentConfig.paymentType,
      tokenAddress: paymentConfig.tokenAddress,
      tokenDecimals: paymentConfig.tokenDecimals,
      chainId: paymentConfig.chainId,
      rpcUrl: paymentConfig.rpcUrl,
      verifyRpcUrl: paymentConfig.verifyRpcUrl,
      blockExplorerUrl: paymentConfig.blockExplorerUrl,
    };

    const opts: SignOptions = { expiresIn: "10m" };
    const token = jwt.sign(payload, getSecret(), opts);

    return {
      token,
      skillId: args.skillId,
      skillSlug: args.skillSlug,
      userId: args.userId,
      payerAddress: args.payerAddress,
      amount: args.amount,
      currency: args.currency,
      recipient: ADMIN_VAULT_ADDRESS,
      nonce,
      expiresAt,
      paymentType: paymentConfig.paymentType,
      tokenAddress: paymentConfig.tokenAddress,
      tokenDecimals: paymentConfig.tokenDecimals,
      chainId: paymentConfig.chainId,
      rpcUrl: paymentConfig.rpcUrl,
      blockExplorerUrl: paymentConfig.blockExplorerUrl,
    };
  }

  static verifyChallengeToken(
    token: string,
    expectedUserId: string
  ): SignedPaymentChallengePayload {
    const decoded = jwt.verify(token, getSecret()) as SignedPaymentChallengePayload;
    if (decoded.purpose !== "payment") {
      throw new Error("Invalid payment challenge");
    }
    if (decoded.userId !== expectedUserId) {
      throw new Error("Payment challenge does not belong to this user");
    }
    return decoded;
  }

  static validateChallengeForSkill(
    challenge: SignedPaymentChallengePayload,
    skill: { id: string; slug: string; priceAmount: any; priceCurrency: string },
    payerAddress: string
  ) {
    if (challenge.skillId !== skill.id || challenge.skillSlug !== skill.slug) {
      throw new Error("Payment challenge does not match this skill");
    }
    if (challenge.payerAddress.toLowerCase() !== payerAddress.toLowerCase()) {
      throw new Error("Payment challenge does not match the authenticated wallet");
    }
    if (challenge.currency !== skill.priceCurrency) {
      throw new Error("Payment challenge currency mismatch");
    }
    if (Number(challenge.amount) !== Number(skill.priceAmount)) {
      throw new Error("Payment challenge amount mismatch");
    }
    if (!challenge.recipient || challenge.recipient.toLowerCase() !== ADMIN_VAULT_ADDRESS.toLowerCase()) {
      throw new Error("Payment challenge recipient mismatch");
    }
    if (challenge.paymentType === "erc20" && !challenge.tokenAddress) {
      throw new Error("USDC payments are not configured on this server");
    }
  }

  static buildContentUrl(origin: string, skillSlug: string, token?: string): string {
    const url = new URL(`/api/skills/${skillSlug}/content`, origin);
    if (token) {
      url.searchParams.set("token", token);
    }
    return url.toString();
  }

  static buildAccessInfo(
    skill: {
      slug: string;
      zipCid: string;
      storageType?: string | null;
      pieceCid?: string | null;
      filecoinDatasetId?: number | null;
      filecoinDealId?: string | null;
    },
    reqUrl: string,
    token?: string
  ) {
    const origin = new URL(reqUrl).origin;
    const access: Record<string, any> = {
      cid: skill.zipCid,
      downloadUrl: this.buildContentUrl(origin, skill.slug, token),
      storageType: skill.storageType || "filecoin",
    };

    if (skill.pieceCid) access.pieceCid = skill.pieceCid;
    if (skill.filecoinDatasetId) {
      access.filecoinDatasetId = skill.filecoinDatasetId;
      access.proofUrl = `https://pdp.vxb.ai/calibration/dataset/${skill.filecoinDatasetId}`;
    }
    if (skill.filecoinDealId) access.dealId = skill.filecoinDealId;

    return access;
  }

  /**
   * Verify an on-chain payment transaction against the expected payer + recipient.
   */
  static async verifyPayment(args: {
    txHash: string;
    expectedAmount: number;
    currency: string;
    expectedRecipient: string;
    expectedPayer: string;
    tokenAddress?: string;
    tokenDecimals?: number;
    verifyRpcUrl?: string;
  }): Promise<VerifyResult> {
    try {
      const isReplay = await this.isReplayAttack(args.txHash);
      if (isReplay) {
        return { valid: false, actualAmount: 0, paidAt: new Date() };
      }

      const verifyRpcUrl = args.verifyRpcUrl || PAYMENT_VERIFY_RPC_URL;

      if (!verifyRpcUrl) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[Payment] No RPC URL configured — running in demo mode (dev only)");
          return { valid: true, actualAmount: args.expectedAmount, paidAt: new Date() };
        }
        console.error("[Payment] No RPC URL configured and not in development mode — rejecting");
        return { valid: false, actualAmount: 0, paidAt: new Date() };
      }

      const provider = new ethers.JsonRpcProvider(verifyRpcUrl);
      const receipt = await provider.getTransactionReceipt(args.txHash);
      if (!receipt || receipt.status !== 1) {
        return { valid: false, actualAmount: 0, paidAt: new Date() };
      }

      const tx = await provider.getTransaction(args.txHash);
      if (!tx) {
        return { valid: false, actualAmount: 0, paidAt: new Date() };
      }

      const block = await provider.getBlock(receipt.blockNumber);
      const paidAt = block ? new Date(block.timestamp * 1000) : new Date();

      const payerMatch = tx.from?.toLowerCase() === args.expectedPayer.toLowerCase();
      let actualAmount = 0;
      let recipientMatch = false;

      if (args.currency === "USDC") {
        if (!args.tokenAddress) {
          return { valid: false, actualAmount: 0, paidAt };
        }

        for (const log of receipt.logs) {
          if (
            log.address.toLowerCase() === args.tokenAddress.toLowerCase() &&
            log.topics[0] === TRANSFER_EVENT_TOPIC &&
            log.topics.length >= 3
          ) {
            const fromAddress = ethers.getAddress("0x" + log.topics[1].slice(26));
            const toAddress = ethers.getAddress("0x" + log.topics[2].slice(26));
            if (
              fromAddress.toLowerCase() === args.expectedPayer.toLowerCase() &&
              toAddress.toLowerCase() === args.expectedRecipient.toLowerCase()
            ) {
              actualAmount = parseFloat(
                ethers.formatUnits(BigInt(log.data), args.tokenDecimals ?? 6)
              );
              recipientMatch = true;
              break;
            }
          }
        }
      } else {
        recipientMatch = tx.to?.toLowerCase() === args.expectedRecipient.toLowerCase();
        actualAmount = parseFloat(ethers.formatEther(tx.value));
      }

      return {
        valid: payerMatch && recipientMatch && actualAmount >= args.expectedAmount,
        actualAmount,
        paidAt,
      };
    } catch (error: any) {
      console.error("[Payment] Verification failed:", error.message);
      return { valid: false, actualAmount: 0, paidAt: new Date() };
    }
  }

  static async isAlreadyPurchased(
    userId: string,
    skillId: string
  ): Promise<boolean> {
    const purchase = await prisma.purchase.findFirst({
      where: { userId, skillId },
    });
    return !!purchase;
  }

  static async isReplayAttack(txHash: string): Promise<boolean> {
    if (!txHash) return false;
    const existing = await prisma.purchase.findFirst({
      where: { txHash },
    });
    return !!existing;
  }

  static async markPurchased(
    userId: string,
    skillId: string,
    txHash: string,
    amount: number,
    currency: string
  ) {
    return prisma.purchase.create({
      data: {
        userId,
        skillId,
        amount,
        currency,
        paymentMethod: "x402",
        txHash,
        createdAt: new Date(),
      },
    });
  }
}

export default PaymentService;
