import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth";
import dashboardRoutes from "./routes/dashboard";
import doroWotRoutes from "./routes/doroWot";
import challengeRoutes from "./routes/challenges";

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: [FRONTEND_URL], credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "N4yCTF" }));

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/doro-wot", doroWotRoutes);
app.use("/api/challenges", challengeRoutes);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

async function ensureChallengeSeeded() {
  const prisma = new PrismaClient();
  try {
    const flagSecret = process.env.FLAG_SECRET ?? "doro-wot-flag-2024";
    const FLAG = `N4YCTF{race_the_doro_wot_${crypto
      .createHash("sha256")
      .update(flagSecret)
      .digest("hex")
      .slice(0, 12)}}`;
    const flagHash = crypto.createHash("sha256").update(FLAG).digest("hex");

    await prisma.challenge.upsert({
      where: { slug: "doro-wot" },
      update: {},
      create: {
        slug: "doro-wot",
        title: "The Doro Wot Challenge",
        description:
          "Obtain the legendary Doro Wot meal without waiting multiple days. The meal costs 500 points, but you only receive 100 points per day.",
        flagHash,
        points: 500,
        active: true,
      },
    });
    console.log("[seed] Challenge ensured. Flag:", FLAG);
  } catch (e) {
    console.error("[seed] Failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

ensureChallengeSeeded().then(() => {
  app.listen(PORT, () => {
    console.log(`N4yCTF backend listening on port ${PORT}`);
  });
});