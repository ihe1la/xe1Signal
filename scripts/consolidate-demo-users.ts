import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Archive!2026", 12);
  const testUser = await db.user.upsert({
    where: { username: "test" },
    update: { email: "test@signal.local", isActive: true, isBanned: false },
    create: {
      id: "test",
      username: "test",
      email: "test@signal.local",
      name: "test",
      displayName: "test",
      bio: "A private test account for checking sharing and account boundaries.",
      passwordHash,
      emailVerified: new Date(),
      avatarUrl: "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=test&backgroundColor=111116",
      settings: { create: {} },
    },
  });

  const retired = await db.user.findMany({ where: { username: { notIn: ["hela", "test"] } }, select: { id: true } });
  const retiredIds = retired.map((user) => user.id);
  if (retiredIds.length) {
    await db.$transaction([
      db.signal.updateMany({ where: { ownerId: { in: retiredIds } }, data: { ownerId: testUser.id } }),
      db.frequency.updateMany({ where: { ownerId: { in: retiredIds } }, data: { ownerId: testUser.id } }),
      db.researchTrail.updateMany({ where: { ownerId: { in: retiredIds } }, data: { ownerId: testUser.id } }),
      db.user.deleteMany({ where: { id: { in: retiredIds } } }),
    ]);
  }

  const users = await db.user.findMany({ select: { username: true, email: true }, orderBy: { username: "asc" } });
  console.log("Active archive accounts:", users);
}

main().finally(() => db.$disconnect());
