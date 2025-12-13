import {
  PrismaClient,
  Prisma,
  Rol,
  PostType,
  EventType,
  EventStatus,
  EventHighlightType,
  Game,
  TableStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { GAME_DEFAULT_CONTENT } from "../src/lib/game-default-content";
import { cloneContactContent } from "../src/lib/contact-content-data";

const prisma = new PrismaClient();
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_IN_MS);
const daysFromNow = (days: number, hours = 0) => new Date(Date.now() + days * DAY_IN_MS + hours * 60 * 60 * 1000);

type SeedUser = {
  email: string;
  roles: Rol[];
  name?: string | null;
  nick?: string | null;
  etiquetas?: string[];
  descripcion?: string | null;
  passwordHash?: string | null;
  isActive?: boolean;
  games?: string[];
};

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

const SEED_GAMES: SeedGame[] = [
  {
    slug: "w40k",
    name: "Warhammer 40,000",
    legacyEnumKey: "W40K",
    iconImagePath: "/assets/icons/games/w40k.png",
    sortOrder: 10,
  },
  {
    slug: "aos",
    name: "Age of Sigmar",
    legacyEnumKey: "AOS",
    iconImagePath: "/assets/icons/games/aos.png",
    sortOrder: 20,
  },
  {
    slug: "tow",
    name: "The Old World",
    legacyEnumKey: "TOW",
    iconImagePath: "/assets/icons/games/tow.png",
    sortOrder: 30,
  },
  {
    slug: "esdla",
    name: "El Señor de los Anillos",
    legacyEnumKey: "ESDLA",
    iconImagePath: "/assets/icons/games/esdla.png",
    sortOrder: 40,
  },
  {
    slug: "bb",
    name: "Blood Bowl",
    legacyEnumKey: "BB",
    iconImagePath: "/assets/icons/games/bloodbowl.png",
    sortOrder: 50,
  },
  {
    slug: "marvel",
    name: "Marvel Crisis Protocol",
    legacyEnumKey: "MARVEL",
    iconImagePath: "/assets/icons/games/mcp.png",
    sortOrder: 60,
  },
  {
    slug: "rol",
    name: "Rol",
    legacyEnumKey: "ROL",
    iconImagePath: "/assets/icons/games/rol.png",
    sortOrder: 70,
  },
  {
    slug: "magic",
    name: "Magic",
    legacyEnumKey: "MAGIC",
    iconImagePath: "/assets/icons/games/magic.png",
    sortOrder: 80,
  },
  {
    slug: "boardgames",
    name: "Juegos de mesa",
    legacyEnumKey: "JUEGOS_DE_MESA",
    iconImagePath: "/assets/icons/games/juegosdemesa.png",
    sortOrder: 90,
  },
  {
    slug: "otros",
    name: "Otros",
    legacyEnumKey: "OTROS",
    iconImagePath: "/assets/icons/games/otros.png",
    sortOrder: 100,
    isDefault: true,
  },
];

type SeedTableLayout = {
  title: string;
  description?: string;
  game?: string;
  sceneryNotes?: string;
  isDefault?: boolean;
  weekday?: number;
};

type SeedTable = {
  name: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation?: number;
  sizeTag?: string;
  notes?: string;
  status?: TableStatus;
  layouts?: SeedTableLayout[];
};

const SEED_TABLES: SeedTable[] = [
  { name: "Mesa 1", posX: 946, posY: 555, width: 80, height: 140, sizeTag: "Vertical" },
  { name: "Mesa 2", posX: 890, posY: 425, width: 140, height: 80, sizeTag: "Vertical" },
  { name: "Mesa 3", posX: 890, posY: 299, width: 140, height: 80, sizeTag: "Vertical" },
  { name: "Mesa 4", posX: 889, posY: 165, width: 140, height: 80, sizeTag: "Vertical" },
  { name: "Mesa 5", posX: 888, posY: 35, width: 140, height: 80, sizeTag: "Horizontal" },

  { name: "Mesa 6", posX: 615, posY: 38, width: 80, height: 170, sizeTag: "Vertical" },
  { name: "Mesa 7", posX: 620, posY: 330, width: 80, height: 170, sizeTag: "Vertical" },

  { name: "Mesa 8", posX: 357, posY: 337, width: 140, height: 80, sizeTag: "Horizontal" },
  { name: "Mesa 9", posX: 356, posY: 458, width: 140, height: 80, sizeTag: "Horizontal" },
  { name: "Mesa 10", posX: 357, posY: 577, width: 140, height: 80, sizeTag: "Horizontal" },
  { name: "Mesa 11", posX: 389, posY: 703, width: 80, height: 140, sizeTag: "Vertical" },

  { name: "Mesa 12", posX: 62, posY: 41, width: 140, height: 80, sizeTag: "Vertical" },
  { name: "Mesa 13", posX: 60, posY: 159, width: 80, height: 140, sizeTag: "Vertical" },
  { name: "Mesa 14", posX: 60, posY: 338, width: 80, height: 140, sizeTag: "Vertical" },
  { name: "Mesa 15", posX: 67, posY: 517, width: 140, height: 80, sizeTag: "Horizontal" },

  { name: "Zona Sofas", posX: 305, posY: 20, width: 230, height: 180, status: TableStatus.BLOCKED, sizeTag: "Zona Sofas" },
  { name: "Mesa Sofas", posX: 349, posY: 79, width: 120, height: 70, sizeTag: "Sofas" },

  { name: "Zona Streaming", posX: 62, posY: 673, width: 220, height: 200, status: TableStatus.BLOCKED, sizeTag: "Zona Streaming" },
  { name: "Mesa Streaming", posX: 91, posY: 728, width: 90, height: 120, sizeTag: "Streaming" },

  { name: "Zona Pintura", posX: 604, posY: 589, width: 200, height: 300, status: TableStatus.BLOCKED, sizeTag: "Zona Pintura" },
  { name: "Zona Comida", posX: 898, posY: 782, width: 130, height: 110, status: TableStatus.BLOCKED, sizeTag: "Zona Comida" },
];

async function seedGames(): Promise<Map<string, Game>> {
  const seeded = await Promise.all(
    SEED_GAMES.map((game) =>
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
      })
    )
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
          contactUserId: null,
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

async function seedTables(gameIndex: Map<string, Game>) {
  for (const table of SEED_TABLES) {
    const persisted = await prisma.clubTable.upsert({
      where: { name: table.name },
      update: {
        posX: table.posX,
        posY: table.posY,
        width: table.width,
        height: table.height,
        rotation: table.rotation ?? 0,
        sizeTag: table.sizeTag ?? null,
        notes: table.notes ?? null,
        status: table.status ?? TableStatus.AVAILABLE,
        isActive: true,
      },
      create: {
        name: table.name,
        posX: table.posX,
        posY: table.posY,
        width: table.width,
        height: table.height,
        rotation: table.rotation ?? 0,
        sizeTag: table.sizeTag ?? null,
        notes: table.notes ?? null,
        status: table.status ?? TableStatus.AVAILABLE,
        isActive: true,
      },
    });

    if (table.layouts && table.layouts.length > 0) {
      for (const layout of table.layouts) {
        const gameId = layout.game ? gameIndex.get(layout.game)?.id ?? null : null;
        await prisma.tableLayout.upsert({
          where: {
            tableId_title: { tableId: persisted.id, title: layout.title },
          },
          update: {
            description: layout.description ?? null,
            sceneryNotes: layout.sceneryNotes ?? null,
            isDefault: layout.isDefault ?? false,
            weekday: layout.weekday ?? null,
            gameId,
          },
          create: {
            tableId: persisted.id,
            title: layout.title,
            description: layout.description ?? null,
            sceneryNotes: layout.sceneryNotes ?? null,
            isDefault: layout.isDefault ?? false,
            weekday: layout.weekday ?? null,
            gameId,
          },
        });
      }
    }
  }
}

async function syncUserGames(userId: number, gameSlugs: string[], gameIndex: Map<string, Game>) {
  const trimmed = Array.from(new Set(gameSlugs.map((slug) => slug.trim()).filter(Boolean)));
  if (trimmed.length === 0) {
    await prisma.userGame.deleteMany({ where: { userId } });
    return;
  }

  const gameIds: string[] = [];
  const missing: string[] = [];
  for (const slug of trimmed) {
    const game = gameIndex.get(slug);
    if (!game) {
      missing.push(slug);
      continue;
    }
    gameIds.push(game.id);
  }

  if (missing.length > 0) {
    console.warn(`Seed warning: juegos no encontrados para el usuario ${userId}: ${missing.join(", ")}`);
  }

  if (gameIds.length === 0) {
    await prisma.userGame.deleteMany({ where: { userId } });
    return;
  }

  await prisma.userGame.deleteMany({
    where: {
      userId,
      NOT: {
        gameId: { in: gameIds },
      },
    },
  });

  await prisma.userGame.createMany({
    data: gameIds.map((gameId) => ({ userId, gameId })),
    skipDuplicates: true,
  });
}

async function upsertUser(user: SeedUser, gameIndex: Map<string, Game>) {
  const etiquetas = user.etiquetas ?? [];
  const isActive = user.isActive ?? true;
  const updateData: Record<string, unknown> = {
    name: user.name ?? null,
    nick: user.nick ?? null,
    descripcion: user.descripcion ?? null,
    etiquetas,
    roles: { set: user.roles },
    isActive,
  };

  if (user.passwordHash !== undefined) {
    updateData.passwordHash = user.passwordHash;
  }

  const persisted = await prisma.user.upsert({
    where: { email: user.email },
    update: updateData,
    create: {
      email: user.email,
      name: user.name ?? null,
      nick: user.nick ?? null,
      descripcion: user.descripcion ?? null,
      etiquetas,
      roles: { set: user.roles },
      isActive,
      passwordHash: user.passwordHash ?? null,
    },
  });

  if (user.games !== undefined) {
    await syncUserGames(persisted.id, user.games, gameIndex);
  }

  return persisted;
}

async function upsertOrganization(params: { slug: string; name: string; isClub?: boolean }) {
  const { slug, name, isClub = false } = params;
  return prisma.organization.upsert({
    where: { slug },
    update: { name, isClub },
    create: { slug, name, isClub },
  });
}

const SAMPLE_USERS: SeedUser[] = [
  {
    name: "Julen",
    email: "julexpuru@gmail.com",
    nick: "Julen",
    etiquetas: [],
    roles: [Rol.ADMIN, Rol.SOCIO],
    passwordHash: "$2a$12$lQf5dfG97mY2r90NJ1pWse14c.JaC8tNy3jAhHiLs1W7aBfkwNFD.",
    games: ["w40k", "aos"],
  },
  {
    name: "Kimetz",
    email: "kimetzimetz@bilbohammer.test",
    nick: "Kimetz",
    etiquetas: [],
    roles: [Rol.JUNTA, Rol.SOCIO],
    games: ["tow", "bb"],
  },
  {
    name: "Andoni",
    email: "andoni@bilbohammer.test",
    nick: "Andoni",
    etiquetas: [],
    roles: [Rol.SOCIO],
    games: ["rol", "boardgames"],
  },
  {
    name: "Gorka",
    email: "gorka@bilbohammer.test",
    nick: "gorka",
    etiquetas: [],
    roles: [Rol.AMIGO],
    games: ["otros"],
  },
  {
    name: "Iker",
    email: "iker@bilbohammer.test",
    nick: "iker",
    etiquetas: ["w40k"],
    roles: [Rol.SOCIO],
    isActive: true,
    games: ["w40k", "bb"],
  },
  {
    name: "Maialen",
    email: "maialen@bilbohammer.test",
    nick: "maia",
    etiquetas: ["pintura"],
    roles: [Rol.AMIGO],
    isActive: true,
    games: ["boardgames"],
  },
  {
    name: "Asier",
    email: "asier@bilbohammer.test",
    nick: "asier",
    etiquetas: ["rol"],
    roles: [Rol.SOCIO],
    games: ["rol", "otros"],
  },
  {
    name: "Irati",
    email: "irati@bilbohammer.test",
    nick: "irati",
    etiquetas: ["aos"],
    roles: [Rol.SOCIO],
    games: ["aos"],
  },
  {
    name: "Jon",
    email: "jon@bilbohammer.test",
    nick: "jonny",
    etiquetas: [],
    roles: [Rol.AMIGO],
    games: ["magic"],
  },
  {
    name: "Ane",
    email: "ane@bilbohammer.test",
    nick: "ane",
    etiquetas: ["organizacion"],
    roles: [Rol.JUNTA, Rol.SOCIO],
    isActive: true,
    games: ["w40k", "aos"],
  },
  {
    name: "Lander",
    email: "lander@bilbohammer.test",
    nick: "land",
    etiquetas: ["escenografia"],
    roles: [Rol.SOCIO],
    games: ["boardgames", "otros"],
  },
  {
    name: "Uxue",
    email: "uxue@bilbohammer.test",
    nick: "uxu",
    etiquetas: ["juegos de mesa"],
    roles: [Rol.AMIGO],
    games: ["boardgames"],
  },
  {
    name: "Gaizka",
    email: "gaizka@bilbohammer.test",
    nick: "gaiz",
    etiquetas: ["w40k"],
    roles: [Rol.SOCIO],
    isActive: false,
    games: ["w40k"],
  },
  {
    name: "Leire",
    email: "leire@bilbohammer.test",
    nick: "lei",
    etiquetas: ["aos"],
    roles: [Rol.SOCIO],
    games: ["aos", "magic"],
  },
  {
    name: "Xabier",
    email: "xabier@bilbohammer.test",
    nick: "xab",
    etiquetas: [],
    roles: [Rol.SOCIO],
    games: ["tow"],
  },
  {
    name: "Naia",
    email: "naia@bilbohammer.test",
    nick: "naia",
    etiquetas: ["pintura"],
    roles: [Rol.AMIGO],
    games: ["otros"],
  },
  {
    name: "Hodei",
    email: "hodei@bilbohammer.test",
    nick: "hodei",
    etiquetas: ["w40k"],
    roles: [Rol.SOCIO],
    games: ["w40k", "rol"],
  },
  {
    name: "June",
    email: "june@bilbohammer.test",
    nick: "jun",
    etiquetas: ["rol"],
    roles: [Rol.AMIGO],
    games: ["rol"],
  },
  {
    name: "Unai",
    email: "unai@bilbohammer.test",
    nick: "unai",
    etiquetas: [],
    roles: [Rol.SOCIO],
    games: ["bb"],
  },
  {
    name: "Maddi",
    email: "maddi@bilbohammer.test",
    nick: "mad",
    etiquetas: ["organizacion"],
    roles: [Rol.JUNTA],
    games: ["rol", "boardgames"],
  },
  {
    name: "Eneko",
    email: "eneko@bilbohammer.test",
    nick: "enek",
    etiquetas: ["tow"],
    roles: [Rol.SOCIO],
    games: ["tow", "magic"],
  },
  {
    name: "Olaia",
    email: "olaia@bilbohammer.test",
    nick: "ola",
    etiquetas: ["comunicacion"],
    roles: [Rol.AMIGO],
    games: ["otros"],
  },
  {
    name: "Iban",
    email: "iban@bilbohammer.test",
    nick: "iban",
    etiquetas: ["w40k"],
    roles: [Rol.SOCIO],
    isActive: true,
    games: ["w40k"],
  },
  {
    name: "Sara",
    email: "sara@bilbohammer.test",
    nick: "sara",
    etiquetas: ["aos"],
    roles: [Rol.SOCIO],
    games: ["aos", "boardgames"],
  },
];

async function main() {
  const gameIndex = await seedGames();
  await seedGameInfo(gameIndex);
  await seedTables(gameIndex);
  await prisma.newsArticle.deleteMany();
  await prisma.post.deleteMany();
  await prisma.event.deleteMany();
  const hash = await bcrypt.hash("DemoSegura123!", 12);
  const userLocal = await upsertUser(
    {
      email: "local@bilbohammer.test",
      passwordHash: hash,
      name: "Local Demo",
      nick: "local_demo",
      etiquetas: ["tester", "demo"],
      roles: [Rol.SOCIO],
      games: ["w40k", "boardgames"],
    },
    gameIndex
  );

  const userOauth = await upsertUser(
    {
      email: "oauth@bilbohammer.test",
      name: "OAuth Demo",
      roles: [Rol.AMIGO],
      games: ["marvel", "otros"],
    },
    gameIndex
  );

  const extraUsers: string[] = [];
  for (const candidate of SAMPLE_USERS) {
    const created = await upsertUser(candidate, gameIndex);
    extraUsers.push(created.email);
  }

  const [bilbohammerOrg, dkhmOrg] = await Promise.all([
    upsertOrganization({ slug: "bilbohammer", name: "Bilbohammer", isClub: true }),
    upsertOrganization({ slug: "dkhm", name: "DKHM" }),
  ]);

  const album = await prisma.galleryAlbum.upsert({
    where: { slug: "quedada-semanal" },
    update: {
      title: "Quedada semanal Bilbohammer",
      description: "Momentos destacados de nuestra quedada semanal.",
      location: "Bilbohammer HQ",
      displayDate: new Date().toLocaleDateString("es-ES"),
      dateISO: new Date().toISOString(),
      coverImagePath: "/assets/img/slide1.svg",
      coverImageAlt: "Mesa de juego con miniaturas",
      totalPhotos: 0,
      facetYear: String(new Date().getFullYear()),
      facetGame: "w40k",
      facetFormat: "social",
    },
    create: {
      slug: "quedada-semanal",
      title: "Quedada semanal Bilbohammer",
      description: "Momentos destacados de nuestra quedada semanal.",
      location: "Bilbohammer HQ",
      displayDate: new Date().toLocaleDateString("es-ES"),
      dateISO: new Date().toISOString(),
      coverImagePath: "/assets/img/slide1.svg",
      coverImageAlt: "Mesa de juego con miniaturas",
      totalPhotos: 0,
      facetYear: String(new Date().getFullYear()),
      facetGame: "w40k",
      facetFormat: "social",
    },
  });

  await prisma.galleryImage.deleteMany({ where: { albumId: album.id } });

  const ahora = new Date();
  const dosHoras = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);

  const existingEvent = await prisma.event.findUnique({
    where: { albumId: album.id },
    select: { id: true },
  });

  if (existingEvent) {
    await prisma.post.deleteMany({ where: { eventId: existingEvent.id } });
    await prisma.eventOrganization.deleteMany({ where: { eventId: existingEvent.id } });
    await prisma.eventOrganizer.deleteMany({ where: { eventId: existingEvent.id } });
    await prisma.eventTag.deleteMany({ where: { eventId: existingEvent.id } });
    await prisma.eventAttachment.deleteMany({ where: { eventId: existingEvent.id } });
    await prisma.eventLink.deleteMany({ where: { eventId: existingEvent.id } });
    await prisma.eventHighlight.deleteMany({ where: { eventId: existingEvent.id } });
    await prisma.eventRankingEntry.deleteMany({ where: { eventId: existingEvent.id } });
    await prisma.event.delete({ where: { id: existingEvent.id } });
  }

  const evento = await prisma.event.create({
    data: {
      title: "Quedada semanal",
      bannerUrl: "/assets/img/slide2.svg",
      startsAt: ahora,
      endsAt: dosHoras,
      location: "Bilbohammer HQ - Bilbao",
      latitude: 43.263,
      longitude: -2.935,
      mapsUrl: "https://maps.google.com/?q=Bilbohammer+HQ",
      details: "Partidas casuales, briefing inicial y espacio para pintura.",
      recap: "Gran ambiente, mesas llenas y muchas risas. ¡Repetiremos!",
      status: EventStatus.PUBLISHED,
      type: EventType.SOCIAL,
      gameId: gameIndex.get("otros")?.id ?? null,
      priceGeneral: new Prisma.Decimal("5.00"),
      priceSocios: new Prisma.Decimal("0.00"),
      capacityMax: 30,
      capacityCurrent: 18,
      isInternal: true,
      isMembersOnly: false,
      showDescription: true,
      showAttachments: true,
      showLinks: true,
      showStandings: true,
      showRecap: true,
      showGallery: true,
      showLocation: true,
      albumId: album.id,
      tags: {
        create: [{ label: "Casual" }, { label: "Pintura" }, { label: "Demo" }],
      },
      organizers: {
        create: [
          { userId: userLocal.id, role: "Coordinador" },
          { userId: userOauth.id, role: "Apoyo logístico" },
        ],
      },
      organizations: {
        create: [{ organizationId: bilbohammerOrg.id, role: "Host" }],
      },
      attachments: {
        create: [
          {
            title: "Guía del evento",
            description: "Información general y planificación.",
            fileUrl: "https://example.com/docs/guia-evento.pdf",
          },
        ],
      },
      links: {
        create: [
          { label: "Inscripción", url: "https://example.com/registro" },
          { label: "Reglas de convivencia", url: "https://example.com/reglas" },
        ],
      },
      highlights: {
        create: [
          {
            type: EventHighlightType.FIRST,
            title: "Mejor general",
            playerName: "Julen",
            playerId: userLocal.id,
          },
          {
            type: EventHighlightType.AWARD,
            title: "Mejor pintado",
            playerName: "Kimetz",
            playerId: userOauth.id,
          },
        ],
      },
      rankings: {
        create: [
          {
            position: 1,
            playerName: "Julen",
            playerId: userLocal.id,
            score: "3-0",
          },
          {
            position: 2,
            playerName: "Kimetz",
            playerId: userOauth.id,
            score: "2-1",
          },
          {
            position: 3,
            playerName: "Andoni",
            score: "1-2",
          },
        ],
      },
    },
  });

  await prisma.eventOrganization.create({
    data: {
      eventId: evento.id,
      organizationId: dkhmOrg.id,
      role: "Colabora",
    },
  });

  await prisma.galleryImage.createMany({
    data: [
      {
        albumId: album.id,
        eventId: evento.id,
        storagePath: "/gallery/quedada-1.jpg",
        title: "Inicio del evento",
        description: "Briefing inicial con los participantes.",
        width: 1600,
        height: 900,
        mimeType: "image/jpeg",
        position: 1,
      },
      {
        albumId: album.id,
        eventId: evento.id,
        storagePath: "/gallery/quedada-2.jpg",
        title: "Mesas en juego",
        description: "Varias partidas en simultáneo.",
        width: 1600,
        height: 900,
        mimeType: "image/jpeg",
        position: 2,
      },
    ],
  });

  await prisma.galleryAlbum.update({
    where: { id: album.id },
    data: { totalPhotos: 2 },
  });

  const upcomingEvents = await Promise.all([
    prisma.event.create({
      data: {
        title: "Liga Kill Team de otoño",
        bannerUrl: "/assets/img/slide3.svg",
        startsAt: daysFromNow(5),
        endsAt: daysFromNow(5, 6),
        location: "Sala táctica Bilbohammer",
        details: "Tres rondas suizas con listas a 125 puntos.",
        status: EventStatus.PUBLISHED,
        type: EventType.LEAGUE,
        priceGeneral: new Prisma.Decimal("10.00"),
        priceSocios: new Prisma.Decimal("0.00"),
      },
    }),
    prisma.event.create({
      data: {
        title: "Open de pintura express",
        bannerUrl: "/assets/img/slide1.svg",
        startsAt: daysFromNow(9),
        endsAt: daysFromNow(9, 4),
        location: "Bilbohammer HQ",
        details: "Trae tu mini y te damos una hora para terminarla.",
        status: EventStatus.PUBLISHED,
        type: EventType.WORKSHOP,
        priceGeneral: new Prisma.Decimal("0.00"),
        priceSocios: new Prisma.Decimal("0.00"),
      },
    }),
  ]);

  type FeedPostSeed = {
    title: string;
    type: PostType;
    content: string;
    reactionScore: number;
    createdAt: Date;
    author: "local" | "oauth";
    eventId?: string;
  };

  const feedPosts: FeedPostSeed[] = [
    {
      title: "Guía rápida para quienes os apuntáis esta semana",
      type: PostType.ANUNCIO,
      content: "Hemos resumido los pasos para reservar mesa, apuntarte a ligas y pedir llaves del local.",
      reactionScore: 72,
      createdAt: daysAgo(1),
      author: "oauth",
    },
    {
      title: "Horario extendido el sábado",
      type: PostType.ANUNCIO,
      content: "Abrimos desde las 10:00 hasta medianoche para que podáis cerrar campañas pendientes.",
      reactionScore: 28,
      createdAt: daysAgo(2),
      author: "local",
    },
    {
      title: "Crónica privada de la junta: nueva remesa de tapetes",
      type: PostType.NOTICIA_PRIVADA,
      content: "Llegan 6 tapetes temáticos financiados con la cuota trimestral. Coordinad el almacenaje en Discord.",
      reactionScore: 41,
      createdAt: daysAgo(3),
      author: "oauth",
    },
    {
      title: "Mentorías uno a uno para socios",
      type: PostType.NOTICIA_PRIVADA,
      content: "Abrimos slots de práctica competitiva con la gente de la liga. Reservad desde el tablón privado.",
      reactionScore: 19,
      createdAt: daysAgo(5),
      author: "local",
    },
    {
      title: "Últimas plazas para la quedada semanal",
      type: PostType.EVENTO,
      content: "Nos quedan 4 plazas libres en mesas narrativas. Confirmad asistencia antes del jueves.",
      reactionScore: 33,
      createdAt: daysAgo(2),
      author: "local",
      eventId: evento.id,
    },
    {
      title: "Liga Kill Team: cierra tu inscripción",
      type: PostType.EVENTO,
      content: "Publicamos bases actualizadas y emparejamientos de la primera jornada.",
      reactionScore: 25,
      createdAt: daysAgo(4),
      author: "oauth",
      eventId: upcomingEvents[0]?.id,
    },
  ];

  for (const post of feedPosts) {
    await prisma.post.create({
      data: {
        title: post.title,
        type: post.type,
        content: post.content,
        reactionScore: post.reactionScore,
        createdAt: post.createdAt,
        published: true,
        author: {
          connect: { id: post.author === "local" ? userLocal.id : userOauth.id },
        },
        ...(post.eventId
          ? {
              event: {
                connect: { id: post.eventId },
              },
            }
          : {}),
      },
    });
  }

  await prisma.notification.create({
    data: {
      title: "Mantenimiento",
      content: "La web estará en mantenimiento el lunes de 02:00 a 03:00.",
      visible: true,
    },
  });

  const existingContactContent = await prisma.siteContent.findUnique({
    where: { key: "contact-page" },
  });
  if (!existingContactContent) {
    await prisma.siteContent.create({
      data: {
        key: "contact-page",
        content: cloneContactContent(),
      },
    });
  }

  console.log("Seed OK ?", {
    userLocal: userLocal.email,
    userOauth: userOauth.email,
    extraUsers,
    evento: evento.title,
    organizations: [bilbohammerOrg.slug, dkhmOrg.slug],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
