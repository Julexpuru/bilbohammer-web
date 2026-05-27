import { PrismaClient, type Game } from "@prisma/client";
import { upsertSeedTables } from "../prisma/seed-organized-tables";

const prisma = new PrismaClient();

async function loadGameIndex() {
  const games = await prisma.game.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      legacyEnumKey: true,
      sortOrder: true,
      isDefault: true,
      iconImagePath: true,
      heroImagePath: true,
      description: true,
      isActive: true,
    },
  });

  return new Map(games.map((game) => [game.slug, game as Game]));
}

async function main() {
  const gameIndex = await loadGameIndex();
  await upsertSeedTables(prisma, gameIndex);

  const activeTables = await prisma.clubTable.count({ where: { isActive: true } });
  console.log(`OK: synchronized organized tables. Active tables: ${activeTables}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
