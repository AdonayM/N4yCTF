import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

const DAILY_AMOUNT = 100;
const DORO_COST = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

function nextAt(last: Date | null) {
  return last ? new Date(last.getTime() + DAY_MS) : null;
}

/**
 * GET /api/dashboard
 * Returns the user's balance, daily reward status, and challenge state.
 * This endpoint is not vulnerable — it only reads.
 */
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
        where: { userId_challengeId: { userId, challengeId: challenge.id } },
        select: { solvedAt: true },
      })
    : null;

  const next = nextAt(user.lastDailyRewardAt);
  const canClaimDaily = !next || next.getTime() <= Date.now();

  return res.json({
    user: { id: user.id, username: user.username, points: user.points },
    daily: {
      amount: DAILY_AMOUNT,
      lastClaimedAt: user.lastDailyRewardAt,
      nextAvailableAt: next,
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

/**
 * POST /api/dashboard/claim-daily
 *
 * INTENTIONALLY VULNERABLE — TOCTOU race condition.
 *
 * The 24-hour guard relies on reading `lastDailyRewardAt`, checking it,
 * then writing a new value. These three operations are NOT atomic:
 *
 *   1. READ   lastDailyRewardAt
 *   2. CHECK  has 24h elapsed since lastDailyRewardAt?
 *   3. WAIT   (await — widens the race window)
 *   4. WRITE  increment points, set lastDailyRewardAt = now
 *
 * If a player fires N parallel requests within the window between (1) and (4),
 * all N requests read the same stale `lastDailyRewardAt`, all pass the check,
 * and all reach (4). The result is N × DAILY_AMOUNT points awarded from a
 * single daily window.
 *
 * A secure implementation would do this inside a serializable transaction
 * with SELECT ... FOR UPDATE, or as a single conditional UPDATE:
 *
 *   UPDATE "User"
 *      SET points = points + 100, "lastDailyRewardAt" = NOW()
 *    WHERE id = $1
 *      AND ("lastDailyRewardAt" IS NULL
 *           OR "lastDailyRewardAt" < NOW() - INTERVAL '24 hours')
 *    RETURNING points, "lastDailyRewardAt";
 *
 * If 0 rows are returned, the daily reward was already claimed.
 */
router.post("/claim-daily", requireAuth, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.sub;

  try {
    // ---- Step 1: READ (no lock, no transaction) ----
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastDailyRewardAt: true, points: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    // ---- Step 2: CHECK based on the stale read ----
    const now = Date.now();
    if (
      user.lastDailyRewardAt &&
      now - user.lastDailyRewardAt.getTime() < DAY_MS
    ) {
      return res.status(429).json({
        error: "Daily reward not available yet",
        nextAvailableAt: new Date(user.lastDailyRewardAt.getTime() + DAY_MS),
      });
    }

    // ---- Step 3: PROCESS — deliberate async delay widens the window ----
    await new Promise((r) => setTimeout(r, 150));

    // ---- Step 4: WRITE (no guard, no lock) ----
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        points: { increment: DAILY_AMOUNT },
        lastDailyRewardAt: new Date(),
      },
      select: { points: true, lastDailyRewardAt: true },
    });

    await prisma.dailyReward.create({
      data: { userId, amount: DAILY_AMOUNT },
    });

    return res.json({
      message: `Daily reward claimed: +${DAILY_AMOUNT} points`,
      points: updated.points,
      lastClaimedAt: updated.lastDailyRewardAt,
    });
  } catch (err) {
    console.error("claim-daily error", err);
    return res.status(500).json({ error: "Failed to claim daily reward" });
  }
});

export default router;