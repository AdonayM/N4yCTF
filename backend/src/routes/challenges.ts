import { Router, Response } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { submitFlagSchema } from "../lib/validation";

const router = Router();

function hashFlag(flag: string): string {
  return crypto.createHash("sha256").update(flag.trim()).digest("hex");
}

router.post("/doro-wot/submit", requireAuth, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.sub;

  const parsed = submitFlagSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const challenge = await prisma.challenge.findUnique({
      where: { slug: "doro-wot" },
      select: { id: true, flagHash: true, active: true, points: true },
    });
    if (!challenge || !challenge.active) {
      return res.status(404).json({ error: "Challenge unavailable" });
    }

    const existing = await prisma.solve.findUnique({
      where: { userId_challengeId: { userId, challengeId: challenge.id } },
    });

    const submittedHash = hashFlag(parsed.data.flag);
    const correct = submittedHash === challenge.flagHash;

    if (!correct) {
      return res.status(400).json({ error: "Incorrect flag." });
    }

    if (existing) {
      return res.json({
        message: "Already solved",
        solvedAt: existing.solvedAt,
      });
    }

    const solve = await prisma.solve.create({
      data: { userId, challengeId: challenge.id },
      select: { solvedAt: true },
    });

    return res.json({
      message: "Challenge completed!",
      solvedAt: solve.solvedAt,
    });
  } catch (err) {
    console.error("submit error", err);
    return res.status(500).json({ error: "Submission failed" });
  }
});

export default router;