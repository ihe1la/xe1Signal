import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.deleteMany({
    where: { username: { in: ["hela", "test"] } },
  });

  console.log(`Deleted ${result.count} demo account(s).`);
}

main()
  .catch((error) => {
    console.error("Could not remove demo accounts:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
