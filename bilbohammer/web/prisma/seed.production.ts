import { PrismaClient, Rol, type Game } from "@prisma/client";
import bcrypt from "bcryptjs";
import { GAME_DEFAULT_CONTENT } from "../src/lib/game-default-content";
import { cloneContactContent } from "../src/lib/contact-content-data";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@bilbohammer.es";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "B1lb0h4ck3r!";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Bilbohammer Admin";
const ADMIN_NICK = process.env.SEED_ADMIN_NICK ?? "Admin";
const ADMIN_GAMES = (process.env.SEED_ADMIN_GAMES ?? "")
  .split(",")
  .map((slug) => slug.trim())
  .filter(Boolean);

type SeedGame = {
  slug: string;
  name: string;
  legacyEnumKey?: string;
  sortOrder: number;
  isDefault?: boolean;
  iconImagePath?: string | null;
  heroImagePath?: string | null;
  description?: string | null;
  isActive?: boolean;
};

const BASE_GAMES: SeedGame[] = [
  { slug: "w40k", name: "Warhammer 40,000", legacyEnumKey: "W40K", iconImagePath: "/assets/icons/games/w40k.png", sortOrder: 10 },
  { slug: "aos", name: "Age of Sigmar", legacyEnumKey: "AOS", iconImagePath: "/assets/icons/games/aos.png", sortOrder: 20 },
  { slug: "tow", name: "The Old World", legacyEnumKey: "TOW", iconImagePath: "/assets/icons/games/tow.png", sortOrder: 30 },
  { slug: "esdla", name: "El Señor de los Anillos", legacyEnumKey: "ESDLA", iconImagePath: "/assets/icons/games/esdla.png", sortOrder: 40 },
  { slug: "bb", name: "Blood Bowl", legacyEnumKey: "BB", iconImagePath: "/assets/icons/games/bloodbowl.png", sortOrder: 50 },
  { slug: "marvel", name: "Marvel Crisis Protocol", legacyEnumKey: "MARVEL", iconImagePath: "/assets/icons/games/mcp.png", sortOrder: 60 },
  { slug: "rol", name: "Rol", legacyEnumKey: "ROL", iconImagePath: "/assets/icons/games/rol.png", sortOrder: 70 },
  { slug: "magic", name: "Magic", legacyEnumKey: "MAGIC", iconImagePath: "/assets/icons/games/magic.png", sortOrder: 80 },
  { slug: "boardgames", name: "Juegos de mesa", legacyEnumKey: "JUEGOS_DE_MESA", iconImagePath: "/assets/icons/games/juegosdemesa.png", sortOrder: 90 },
  { slug: "otros", name: "Otros", legacyEnumKey: "OTROS", iconImagePath: "/assets/icons/games/otros.png", sortOrder: 100, isDefault: true },
];

async function seedGames(): Promise<Map<string, Game>> {
  const seeded = await Promise.all(
    BASE_GAMES.map((game) =>
      prisma.game.upsert({
        where: { slug: game.slug },
        update: {
          name: game.name,
          legacyEnumKey: game.legacyEnumKey ?? null,
          iconImagePath: game.iconImagePath ?? null,
          heroImagePath: game.heroImagePath ?? game.iconImagePath ?? null,
          description: game.description ?? null,
          sortOrder: game.sortOrder,
          isDefault: Boolean(game.isDefault),
          isActive: game.isActive ?? true,
        },
        create: {
          slug: game.slug,
          name: game.name,
          legacyEnumKey: game.legacyEnumKey ?? null,
          iconImagePath: game.iconImagePath ?? null,
          heroImagePath: game.heroImagePath ?? game.iconImagePath ?? null,
          description: game.description ?? null,
          sortOrder: game.sortOrder,
          isDefault: Boolean(game.isDefault),
          isActive: game.isActive ?? true,
        },
      }),
    ),
  );

  return new Map(seeded.map((game) => [game.slug, game]));
}

async function seedGameInfo(gameIndex: Map<string, Game>) {
  await Promise.all(
    Object.entries(GAME_DEFAULT_CONTENT).map(async ([slug, defaults]) => {
      const game = gameIndex.get(slug);
      if (!game) return;
      await prisma.gameInfo.upsert({
        where: { gameId: game.id },
        update: {
          summary: defaults.summary,
          contentHtml: defaults.contentHtml,
          investment: defaults.investment,
          playtime: defaults.playtime,
          learning: defaults.learning || "Media",
          contactNote: defaults.contactNote ?? "",
        },
        create: {
          gameId: game.id,
          summary: defaults.summary,
          contentHtml: defaults.contentHtml,
          investment: defaults.investment,
          playtime: defaults.playtime,
          learning: defaults.learning || "Media",
          contactNote: defaults.contactNote ?? "",
        },
      });
    }),
  );
}

async function seedContactContent() {
  await prisma.siteContent.upsert({
    where: { key: "contact-page" },
    update: { content: cloneContactContent() },
    create: { key: "contact-page", content: cloneContactContent() },
  });
}

async function ensureAdmin(gameIndex: Map<string, Game>) {
  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: ADMIN_NAME,
      nick: ADMIN_NICK,
      roles: { set: [Rol.ADMIN, Rol.JUNTA] },
      isActive: true,
      passwordHash: hashed,
    },
    create: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      nick: ADMIN_NICK,
      roles: [Rol.ADMIN, Rol.JUNTA],
      isActive: true,
      passwordHash: hashed,
    },
    select: { id: true },
  });

  if (ADMIN_GAMES.length > 0) {
    await prisma.userGame.deleteMany({ where: { userId: admin.id } });
    const data = ADMIN_GAMES.map((slug) => gameIndex.get(slug))
      .filter((game): game is Game => Boolean(game))
      .map((game) => ({ userId: admin.id, gameId: game.id }));

    if (data.length > 0) {
      await prisma.userGame.createMany({ data, skipDuplicates: true });
    }
  }
}

async function run() {
  try {
    const gameIndex = await seedGames();
    await seedGameInfo(gameIndex);
    await seedContactContent();
    await ensureAdmin(gameIndex);
    console.log("✅ Production seed completed");
  } catch (error) {
    console.error("❌ Production seed failed", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
