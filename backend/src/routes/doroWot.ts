import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { purchaseLimiter } from "../middleware/rateLimit";

const router = Router();

const DORO_COST = 500;

router.get("/", requireAuth, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.sub;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { points: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });

  const challenge = await prisma.challenge.findUnique({
    where: { slug: "doro-wot" },
    select: { id: true, slug: true, title: true, points: true, description: true, active: true },
  });

  const solve = challenge
    ? await prisma.solve.findUnique({
        where: { userId_challengeId: { userId, challengeId: challenge.id } },
        select: { solvedAt: true },
      })
    : null;

  const purchases = await prisma.purchase.count({ where: { userId } });

  return res.json({
    user: { points: user.points },
    challenge: challenge
      ? {
          slug: challenge.slug,
          title: challenge.title,
          description: challenge.description,
          cost: challenge.points,
          active: challenge.active,
        }
      : null,
    solve: solve ? { solvedAt: solve.solvedAt } : null,
    purchases,
  });
});

/**
 * INTENTIONALLY VULNERABLE ENDPOINT
 *
 * This is a TOCTOU (Time-Of-Check to Time-Of-Use) race condition.
 *
 * The flow is non-atomic:
 *   1. Read the user's current points
 *   2. Check whether points >= cost
 *   3. (await) Simulate purchase processing
 *   4. Deduct points and record the purchase
 *
 * Because steps 1-2 and 3-4 are separated by an await, multiple concurrent
 * requests can each read the same starting balance, each pass the check,
 * and each deduct the cost. The player exploits this with parallel requests
 * (e.g. Burp Suite "Send group in parallel").
 *
 * In a secure implementation, the balance check and the deduction would be
 * performed atomically (e.g. conditional UPDATE ... WHERE points >= cost,
 * or SELECT ... FOR UPDATE inside a serializable transaction).
 */
router.post("/purchase", requireAuth, purchaseLimiter, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.sub;

  try {
    // --- Step 1: READ (vulnerable: outside of a transaction/lock) ---
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { points: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    const challenge = await prisma.challenge.findUnique({
      where: { slug: "doro-wot" },
      select: { id: true, points: true, active: true, title: true },
    });
    if (!challenge || !challenge.active) {
      return res.status(404).json({ error: "Challenge unavailable" });
    }

    const alreadySolved = await prisma.solve.findUnique({
      where: { userId_challengeId: { userId, challengeId: challenge.id } },
      select: { solvedAt: true },
    });

    const cost = challenge.points;

    // --- Step 2: CHECK (vulnerable: based on stale read) ---
    if (user.points < cost) {
      return res.status(400).json({
        error: "Insufficient points",
        required: cost,
        current: user.points,
      });
    }

    // --- Step 3: PROCESS (intentional async delay widens the race window) ---
    // A realistic backend might do async I/O here (payment, external call).
    await new Promise((r) => setTimeout(r, 150));

    // --- Step 4: DEDUCT (vulnerable: unconditional decrement) ---
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { points: { decrement: cost } },
      select: { points: true },
    });

    await prisma.purchase.create({
      data: { userId, amount: cost },
    });

    // Count total successful purchases for this user
    const purchaseCount = await prisma.purchase.count({ where: { userId } });

    // Award flag when the player has completed enough purchases to exceed
    // the normal 100-point-per-day limitation. In practice, the race
    // condition causes multiple purchases to succeed from a single balance.
    const flagAwarded = !alreadySolved && purchaseCount > 0 && updated.points < 0
      ? true
      : false;

    return res.json({
      message: "Purchase successful",
      cost,
      points: updated.points,
      purchaseCount,
      // NOTE: the flag is never returned here directly.
      // The player submits the flag via the submit endpoint.
      hint: "Sometimes, what happens at the same time matters more than what happens first.",
    });
  } catch (err) {
    console.error("purchase error", err);
    return res.status(500).json({ error: "Purchase failed" });
  }
});

export default router;