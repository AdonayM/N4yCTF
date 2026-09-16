import { Router, Response } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { submitFlagSchema } from "../lib/validation";

const router = Router();

const hashFlag = (f: string) =>
  crypto.createHash("sha256").update(f.trim()).digest("hex");

router.post(
  "/doro-wot/submit",
  requireAuth,
  async (req: AuthedRequest, res: Response) => {
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
        select: { id: true, flagHash: true, active: true },
      });
      if (!challenge || !challenge.active) {
        return res.status(404).json({ error: "Challenge unavailable" });
      }

      const submitted = hashFlag(parsed.data.flag);
      if (submitted !== challenge.flagHash) {
        return res.status(400).json({ error: "Incorrect flag." });
      }

      // Correct flag — record the solve (idempotent).
      const existing = await prisma.solve.findUnique({
        where: { userId_challengeId: { userId, challengeId: challenge.id } },
      });

      if (existing) {
        return res.json({
          message: "Challenge already solved",
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
  }
);

export default router;