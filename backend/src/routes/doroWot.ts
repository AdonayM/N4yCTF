import { Router, Response } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { purchaseLimiter } from "../middleware/rateLimit";

const router = Router();

const PURCHASE_COST = 500;

function buildFlag(): string {
  const secret = process.env.FLAG_SECRET ?? "doro-wot-flag-2024";
  return `N4YCTF{race_the_doro_wot_${crypto
    .createHash("sha256")
    .update(secret)
    .digest("hex")
    .slice(0, 12)}}`;
}

router.get("/", requireAuth, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.sub;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { points: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });

  const challenge = await prisma.challenge.findUnique({
    where: { slug: "doro-wot" },
    select: {
      id: true,
      slug: true,
      title: true,
      points: true,
      description: true,
      active: true,
    },
  });

  const solve = challenge
    ? await prisma.solve.findUnique({
        where: { userId_challengeId: { userId, challengeId: challenge.id } },
        select: { solvedAt: true },
      })
    : null;

  const purchases = await prisma.purchase.count({ where: { userId } });

  // The flag is only returned to users who already solved the challenge.
  const revealedFlag = solve ? buildFlag() : null;

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
    purchaseCost: PURCHASE_COST,
    flag: revealedFlag,
  });
});

router.post(
  "/purchase",
  requireAuth,
  purchaseLimiter,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user!.sub;

    try {
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

      // Was the challenge already solved before this purchase?
      const existingSolve = await prisma.solve.findUnique({
        where: { userId_challengeId: { userId, challengeId: challenge.id } },
      });

      // If already solved, reveal the flag without charging again.
      if (existingSolve) {
        return res.json({
          message: "Challenge already solved",
          points: user.points,
          challengeCompleted: false,
          flag: buildFlag(),
        });
      }

      if (user.points < PURCHASE_COST) {
        return res.status(400).json({
          error: "Insufficient points",
          required: PURCHASE_COST,
          current: user.points,
        });
      }

      // Atomic deduction.
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { points: { decrement: PURCHASE_COST } },
        select: { points: true },
      });

      await prisma.purchase.create({
        data: { userId, amount: PURCHASE_COST },
      });

      await prisma.solve.create({
        data: { userId, challengeId: challenge.id },
      });

      return res.json({
        message: "Purchase successful",
        cost: PURCHASE_COST,
        points: updated.points,
        challengeCompleted: true,
        flag: buildFlag(), // <-- revealed here for the first time
      });
    } catch (err) {
      console.error("purchase error", err);
      return res.status(500).json({ error: "Purchase failed" });
    }
  }
);

export default router;