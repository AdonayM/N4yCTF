import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { registerSchema, loginSchema } from "../lib/validation";
import { signToken, AUTH_COOKIE, COOKIE_OPTIONS } from "../lib/jwt";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";

const router = Router();

router.post("/register", authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { username, email, password } = parsed.data;

  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email: email.toLowerCase() }],
      },
      select: { username: true, email: true },
    });

    if (existing) {
      const details: Record<string, string[]> = {};
      if (existing.username === username) {
        details.username = ["Username already taken"];
      }
      if (existing.email === email.toLowerCase()) {
        details.email = ["Email already registered"];
      }
      return res
        .status(409)
        .json({ error: "Account already exists", details });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        username,
        email: email.toLowerCase(),
        passwordHash,
      },
    });

    return res.status(201).json({ message: "Registration successful" });
  } catch (err) {
    console.error("register error", err);
    return res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { identifier, password } = parsed.data;

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier },
        ],
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken({ sub: user.id, username: user.username });
    res.cookie(AUTH_COOKIE, token, COOKIE_OPTIONS);

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        points: user.points,
      },
    });
  } catch (err) {
    console.error("login error", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE, { ...COOKIE_OPTIONS, maxAge: 0 });
  return res.json({ message: "Logged out" });
});

router.get("/me", requireAuth, async (req: AuthedRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: {
      id: true,
      username: true,
      email: true,
      points: true,
      lastDailyRewardAt: true,
    },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ user });
});

export default router;