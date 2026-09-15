import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

const DAILY_AMOUNT = 100;
const DORO_COST = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

function nextDailyAvailableAt(last: Date | null): Date | null {
  if (!last) return null;
  return new Date(last.getTime() + DAY_MS);
}

router.get("/", requireAuth, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.sub;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      points: true,
      lastDailyRewardAt: true,
    },
  });
  if (!user) return res.status(404).json({ error: "User not found" });

  const challenge = await prisma.challenge.findUnique({
    where: { slug: "doro-wot" },
    select: { id: true, slug: true, title: true, points: true, active: true },
  });

  const solve = challenge
    ? await prisma.solve.findUnique({
        where: {
          userId_challengeId: { userId, challengeId: challenge.id },
        },
        select: { solvedAt: true },
      })
    : null;

  // Determine whether daily reward is claimable
  const nextAt = nextDailyAvailableAt(user.lastDailyRewardAt);
  const canClaimDaily = !nextAt || nextAt.getTime() <= Date.now();

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      points: user.points,
    },
    daily: {
      amount: DAILY_AMOUNT,
      lastClaimedAt: user.lastDailyRewardAt,
      nextAvailableAt: nextAt,
      canClaim: canClaimDaily,
    },
    challenge: challenge
      ? {
          slug: challenge.slug,
          title: challenge.title,
          cost: challenge.points,
          active: challenge.active,
          solved: !!solve,
          solvedAt: solve?.solvedAt ?? null,
        }
      : null,
    doroCost: DORO_COST,
  });
});

router.post("/claim-daily", requireAuth, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.sub;

  try {
    // Atomic claim: only update if lastDailyRewardAt is null or older than 24h.
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { lastDailyRewardAt: true, points: true },
      });
      if (!user) return { ok: false, reason: "not_found" as const };

      const now = Date.now();
      if (
        user.lastDailyRewardAt &&
        now - user.lastDailyRewardAt.getTime() < DAY_MS
      ) {
        return {
          ok: false,
          reason: "too_soon" as const,
          nextAt: new Date(user.lastDailyRewardAt.getTime() + DAY_MS),
        };
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          points: { increment: DAILY_AMOUNT },
          lastDailyRewardAt: new Date(),
        },
        select: { points: true, lastDailyRewardAt: true },
      });

      await tx.dailyReward.create({
        data: { userId, amount: DAILY_AMOUNT },
      });

      return { ok: true as const, points: updated.points, lastClaimedAt: updated.lastDailyRewardAt };
    });

    if (!result.ok) {
      if (result.reason === "not_found")
        return res.status(404).json({ error: "User not found" });
      return res.status(429).json({
        error: "Daily reward not available yet",
        nextAvailableAt: result.nextAt,
      });
    }

    return res.json({
      message: `Daily reward claimed: +${DAILY_AMOUNT} points`,
      points: result.points,
      lastClaimedAt: result.lastClaimedAt,
    });
  } catch (err) {
    console.error("claim-daily error", err);
    return res.status(500).json({ error: "Failed to claim daily reward" });
  }
});

export default router;