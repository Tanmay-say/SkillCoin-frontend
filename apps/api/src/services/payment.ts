import { randomUUID } from "crypto";
import { ethers } from "ethers";
import prisma from "../db/client";
import type { PaymentChallenge, VerifyResult } from "../types";

const ADMIN_VAULT_ADDRESS = process.env.ADMIN_VAULT_ADDRESS || "";
const PAYMENT_VERIFY_RPC_URL = process.env.PAYMENT_VERIFY_RPC_URL || "";

// Standard USDC ERC-20 Transfer event signature
const TRANSFER_EVENT_TOPIC = ethers.id("Transfer(address,address,uint256)");

export class PaymentService {
  /**
   * Create an x402 payment challenge for a skill download
   */
  static createChallenge(
    skillSlug: string,
    amount: string,
    currency: string
  ): PaymentChallenge {
    return {
      amount,
      currency,
      recipient: ADMIN_VAULT_ADDRESS,
      skillSlug,
      nonce: randomUUID(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
    };
  }

  /**
   * Verify an on-chain payment transaction
   *
   * CRIT-02: On error, return valid=false (not true).
   * Demo mode only activates when NODE_ENV=development AND no RPC URL is set.
   * STUB-03: Parse ERC-20 Transfer event for USDC amount (not tx.value).
   */
  static async verifyPayment(
    txHash: string,
    expectedAmount: number,
    currency: string
  ): Promise<VerifyResult> {
    try {
      // Check for replay attack first
      const isReplay = await this.isReplayAttack(txHash);
      if (isReplay) {
        return { valid: false, actualAmount: 0, paidAt: new Date() };
      }

      if (!PAYMENT_VERIFY_RPC_URL) {
        // Demo mode: only accept when explicitly in development
        if (process.env.NODE_ENV === "development") {
          console.warn("[Payment] No RPC URL configured — running in demo mode (dev only)");
          return { valid: true, actualAmount: expectedAmount, paidAt: new Date() };
        }
        console.error("[Payment] No RPC URL configured and not in development mode — rejecting");
        return { valid: false, actualAmount: 0, paidAt: new Date() };
      }

      const provider = new ethers.JsonRpcProvider(PAYMENT_VERIFY_RPC_URL);
      const receipt = await provider.getTransactionReceipt(txHash);

      if (!receipt || receipt.status !== 1) {
        return { valid: false, actualAmount: 0, paidAt: new Date() };
      }

      const tx = await provider.getTransaction(txHash);
      if (!tx) {
        return { valid: false, actualAmount: 0, paidAt: new Date() };
      }

      const block = await provider.getBlock(receipt.blockNumber);
      const paidAt = block ? new Date(block.timestamp * 1000) : new Date();

      let actualAmount = 0;
      let recipientMatch = false;

      if (currency === "USDC" || currency === "FREE") {
        // STUB-03 FIX: Parse ERC-20 Transfer event from receipt logs
        for (const log of receipt.logs) {
          if (log.topics[0] === TRANSFER_EVENT_TOPIC && log.topics.length >= 3) {
            const toAddress = ethers.getAddress("0x" + log.topics[2].slice(26));
            if (toAddress.toLowerCase() === ADMIN_VAULT_ADDRESS.toLowerCase()) {
              // Decode the amount from log data (USDC = 6 decimals)
              const transferAmount = parseFloat(
                ethers.formatUnits(BigInt(log.data), 6)
              );
              actualAmount = transferAmount;
              recipientMatch = true;
              break;
            }
          }
        }
      } else {
        // Native token payment (FIL, ETH)
        recipientMatch = tx.to?.toLowerCase() === ADMIN_VAULT_ADDRESS.toLowerCase();
        actualAmount = parseFloat(ethers.formatEther(tx.value));
      }

      return {
        valid: recipientMatch && actualAmount >= expectedAmount,
        actualAmount,
        paidAt,
      };
    } catch (error: any) {
      // CRIT-02 FIX: Never accept payment on error
      console.error("[Payment] Verification failed:", error.message);
      return { valid: false, actualAmount: 0, paidAt: new Date() };
    }
  }

  /**
   * Check if a user has already purchased a skill
   */
  static async isAlreadyPurchased(
    userId: string,
    skillId: string
  ): Promise<boolean> {
    const purchase = await prisma.purchase.findFirst({
      where: { userId, skillId },
    });
    return !!purchase;
  }

  /**
   * Check if a txHash has already been used (replay protection)
   */
  static async isReplayAttack(txHash: string): Promise<boolean> {
    if (!txHash) return false;
    const existing = await prisma.purchase.findFirst({
      where: { txHash },
    });
    return !!existing;
  }

  /**
   * Record a purchase in the database
   */
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
