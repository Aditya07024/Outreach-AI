import prisma from './src/utils/prisma';

async function main() {
  console.log("--- LATEST USERS ---");
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(users);

  console.log("\n--- LATEST ERROR LOGS ---");
  const logs = await prisma.log.findMany({
    where: { level: 'ERROR' },
    orderBy: { timestamp: 'desc' },
    take: 10
  });
  console.log(logs);
}

main().catch(console.error);
