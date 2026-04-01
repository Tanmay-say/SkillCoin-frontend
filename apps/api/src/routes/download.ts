import { Hono } from "hono";
import { PaymentService } from "../services/payment";
import { SkillService } from "../services/skill";
import { FilecoinStorageService } from "../services/filecoin-storage";
import {
  generateDownloadToken,
  verifyDownloadToken,
  type AuthUser,
} from "../middleware/auth";
import { VerifyPaymentSchema } from "../types";

type Variables = { user: AuthUser };
const download = new Hono<{ Variables: Variables }>();

/**
 * GET /api/skills/:slug/download
 *
 * Free skills return a direct content URL.
 * Paid skills require authentication and return a signed payment challenge first.
 */
download.get("/:slug/download", async (c) => {
  try {
    const slug = c.req.param("slug");
    const skill = await SkillService.getSkillBySlug(slug);

    if (!skill) {
      return c.json({ success: false, error: "Skill not found" }, 404);
    }

    if (Number(skill.priceAmount) === 0 || skill.priceCurrency === "FREE") {
      await SkillService.incrementDownloads(skill.id);
      return c.json({
        success: true,
        data: {
          ...PaymentService.buildAccessInfo(skill, c.req.url),
          free: true,
        },
      });
    }

    const user = c.get("user");
    if (!user?.userId) {
      return c.json(
        { success: false, error: "Authentication required for paid downloads" },
        401
      );
    }

    const alreadyPurchased = await PaymentService.isAlreadyPurchased(
      user.userId,
      skill.id
    );
    if (alreadyPurchased) {
      await SkillService.incrementDownloads(skill.id);
      const contentId = PaymentService.resolveContentId(skill);
      if (!contentId) {
        return c.json({ success: false, error: "Skill content CID missing" }, 500);
      }
      const token = generateDownloadToken(skill.id, user.userId, contentId);
      return c.json({
        success: true,
        data: {
          ...PaymentService.buildAccessInfo(skill, c.req.url, token),
          token,
          expiresIn: 300,
          alreadyPurchased: true,
        },
      });
    }

    const challenge = PaymentService.createChallenge({
      skillId: skill.id,
      skillSlug: skill.slug,
      userId: user.userId,
      payerAddress: user.address,
      amount: skill.priceAmount.toString(),
      currency: skill.priceCurrency,
    });

    c.header(
      "X-Payment-Request",
      Buffer.from(JSON.stringify(challenge)).toString("base64")
    );

    return c.json(
      {
        error: "payment_required",
        challenge,
        amount: Number(skill.priceAmount),
        currency: skill.priceCurrency,
        recipient: challenge.recipient,
        skillSlug: skill.slug,
        skillName: skill.name,
      },
      402
    );
  } catch (error: any) {
    console.error("[Download] Error:", error);
    const msg =
      process.env.NODE_ENV === "development"
        ? error.message
        : "Internal server error";
    return c.json({ success: false, error: msg }, 500);
  }
});

/**
 * POST /api/skills/:slug/verify-payment
 *
 * Requires authentication and a valid signed challenge token.
 */
download.post("/:slug/verify-payment", async (c) => {
  try {
    const slug = c.req.param("slug");
    const body = await c.req.json();

    const parsed = VerifyPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          success: false,
          error: "Invalid request",
          details: parsed.error.flatten(),
        },
        400
      );
    }

    const skill = await SkillService.getSkillBySlug(slug);
    if (!skill) {
      return c.json({ success: false, error: "Skill not found" }, 404);
    }

    const user = c.get("user");
    if (!user?.userId) {
      return c.json(
        { success: false, error: "Authentication required" },
        401
      );
    }

    if (!parsed.data.challengeToken) {
      return c.json(
        { success: false, error: "challengeToken is required" },
        400
      );
    }

    const isReplay = await PaymentService.isReplayAttack(parsed.data.txHash);
    if (isReplay) {
      return c.json({ success: false, error: "Payment already used" }, 400);
    }

    let challenge;
    try {
      challenge = PaymentService.verifyChallengeToken(
        parsed.data.challengeToken,
        user.userId
      );
      PaymentService.validateChallengeForSkill(challenge, skill, user.address);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }

    const verification = await PaymentService.verifyPayment({
      txHash: parsed.data.txHash,
      expectedAmount: Number(skill.priceAmount),
      currency: skill.priceCurrency,
      expectedRecipient: challenge.recipient,
      expectedPayer: challenge.payerAddress,
      tokenAddress: challenge.tokenAddress,
      tokenDecimals: challenge.tokenDecimals,
      verifyRpcUrl: challenge.verifyRpcUrl,
    });

    if (!verification.valid) {
      return c.json(
        { success: false, error: "Payment verification failed" },
        400
      );
    }

    await PaymentService.markPurchased(
      user.userId,
      skill.id,
      parsed.data.txHash,
      Number(skill.priceAmount),
      skill.priceCurrency
    );

    await SkillService.incrementDownloads(skill.id);

    const contentId = PaymentService.resolveContentId(skill);
    if (!contentId) {
      return c.json({ success: false, error: "Skill content CID missing" }, 500);
    }

    const token = generateDownloadToken(skill.id, user.userId, contentId);

    return c.json({
      success: true,
      data: {
        ...PaymentService.buildAccessInfo(skill, c.req.url, token),
        token,
        expiresIn: 300,
      },
    });
  } catch (error: any) {
    console.error("[VerifyPayment] Error:", error);
    const msg =
      process.env.NODE_ENV === "development"
        ? error.message
        : "Internal server error";
    return c.json({ success: false, error: msg }, 500);
  }
});

/**
 * GET /api/skills/:slug/content
 *
 * Paid skills accept a short-lived download token returned by /download or /verify-payment.
 */
download.get("/:slug/content", async (c) => {
  try {
    const slug = c.req.param("slug");
    const skill = await SkillService.getSkillBySlug(slug);
    if (!skill) {
      return c.json({ success: false, error: "Skill not found" }, 404);
    }

    const isFree =
      Number(skill.priceAmount) === 0 || skill.priceCurrency === "FREE";
    const contentId = PaymentService.resolveContentId(skill);

    if (!isFree) {
      const token =
        c.req.query("token") || c.req.header("X-Download-Token") || "";

      if (token) {
        const decoded = verifyDownloadToken(token);
        if (!decoded || decoded.skillId !== skill.id || decoded.cid !== contentId) {
          return c.json(
            { success: false, error: "Invalid or expired download token" },
            401
          );
        }
      } else {
        const user = c.get("user");
        if (!user?.userId) {
          return c.json(
            {
              success: false,
              error: "Authentication required for paid downloads",
            },
            401
          );
        }
        const alreadyPurchased = await PaymentService.isAlreadyPurchased(
          user.userId,
          skill.id
        );
        if (!alreadyPurchased) {
          return c.json(
            {
              success: false,
              error: "Payment required before content download",
            },
            402
          );
        }
      }
    }

    if (!contentId) {
      return c.json({ success: false, error: "Skill content CID missing" }, 500);
    }

    const data = await FilecoinStorageService.downloadStoredFile({
      zipCid: contentId,
      pieceCid: PaymentService.normalizeContentId(skill.pieceCid) || contentId,
      storageType: skill.storageType,
    });
    const isZip =
      data.length >= 4 &&
      data[0] === 0x50 &&
      data[1] === 0x4b &&
      data[2] === 0x03 &&
      data[3] === 0x04;
    const filename = `${skill.slug || skill.name}.${isZip ? "zip" : "md"}`;

    c.header(
      "Content-Type",
      isZip ? "application/zip" : "text/markdown; charset=utf-8"
    );
    c.header("Content-Disposition", `attachment; filename=\"${filename}\"`);
    c.header("Cache-Control", "private, max-age=300");
    return c.body(Buffer.from(data));
  } catch (error: any) {
    console.error("[Content] Error:", error);
    return c.json(
      {
        success: false,
        error: error.message || "Failed to fetch skill content",
      },
      500
    );
  }
});

export default download;
