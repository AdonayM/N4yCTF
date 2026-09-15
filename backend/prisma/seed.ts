import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

// The flag is derived from an env-provided secret, or falls back to a default.
// In production, set FLAG_SECRET to control the actual flag value.
const FLAG_SECRET = process.env.FLAG_SECRET ?? "doro-wot-race-condition-secret";
const FLAG = `N4YCTF{race_the_doro_wot_${crypto
  .createHash("sha256")
  .update(FLAG_SECRET)
  .digest("hex")
  .slice(0, 12)}}`;

async function main() {
  const flagHash = crypto.createHash("sha256").update(FLAG).digest("hex");

  await prisma.challenge.upsert({
    where: { slug: "doro-wot" },
    update: {
      title: "The Doro Wot Challenge",
      description:
        "Obtain the legendary Doro Wot meal without waiting multiple days. The meal costs 500 points, but you only receive 100 points per day.",
      flagHash,
      points: 500,
      active: true,
    },
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

  console.log("✅ Seeded Doro Wot challenge.");
  console.log("   Flag:", FLAG);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });