import { auth } from "@/auth";
import { loadActiveGames } from "@/lib/game-catalog";
import { GAME_DEFAULT_CONTENT, type GameDefaultContent } from "@/lib/game-default-content";
import { buildGameContactDisplay } from "@/lib/game-info";
import { fallbackGameList, gameHeroPath, gameIconPath } from "@/lib/games";
import { prisma } from "@/lib/prisma";
import { extractRoles } from "@/lib/roles";
import type { Rol } from "@prisma/client";
import { GameCard } from "./GameCard";
import { NewGameForm } from "./NewGameForm";

export const metadata = {
  title: "Juegos en el club | Bilbohammer",
  description:
    "Explora los sistemas que jugamos en Bilbohammer y descubre con quien contactar para sumarte a la proxima partida.",
};

const HERO_IMAGES: Partial<Record<string, string>> = {
  w40k: "/assets/icons/games/w40k.png",
  aos: "/assets/icons/games/aos.png",
  tow: "/assets/icons/games/tow.png",
  esdla: "/assets/icons/games/esdla.png",
  bb: "/assets/icons/games/bloodbowl.png",
  marvel: "/assets/icons/games/mcp.png",
  rol: "/assets/icons/games/rol.png",
  magic: "/assets/icons/games/magic.png",
  boardgames: "/assets/icons/games/juegosdemesa.png",
  otros: "/assets/icons/games/otros.png",
};

type GameDisplay = {
  id: string;
  slug: string;
  name: string;
  iconUrl: string;
  heroImageUrl: string;
  sortOrder: number;
  isDefault: boolean;
};

type GameInfoRecord = {
  gameId: string;
  summary: string;
  contentHtml: string;
  investment: string;
  playtime: string;
  learning: string;
  contactNote: string | null;
  contactUser: {
    id: number;
    email: string | null;
    name: string | null;
    nick: string | null;
    roles: Rol[];
  } | null;
};

export default async function JuegosPage({ searchParams }: { searchParams?: { open?: string } }) {
  const openSlug = typeof searchParams?.open === "string" ? searchParams.open.toLowerCase() : undefined;
  const session = await auth();
  const roles = extractRoles(session);
  const canEdit = roles.includes("ADMIN") || roles.includes("JUNTA");

  const games = await composeGameDisplay();
  const [memberCounts, infoRecords] = await Promise.all([getMemberCounts(games), fetchGameInfoRecords()]);

  return (
    <div className="space-y-10">
      <section className="card space-y-4">
        <h1 className="text-3xl font-semibold">Juegos en Bilbohammer</h1>
        <p>
          Organizamos ligas, campanas y quedadas libres en torno a distintos sistemas. Esta panoramica te ayuda a saber
          con quien hablar, que material compartimos y cuando solemos quedar para cada juego.
        </p>
        <p className="text-sm text-[var(--muted)]">
          Pulsa en cada tarjeta para desplegar detalles. Ajustaremos el diseno y la informacion a medida que cerremos
          calendario y responsables definitivos.
        </p>
      </section>

      <section className="space-y-4">
        {games.map((game, index) => {
          const defaults = resolveDefaults(game.slug, game.name);
          const record = infoRecords.get(game.slug);
          const memberCount = memberCounts[game.slug] ?? 0;
          const summary = record?.summary ?? defaults.summary;
          const contentHtml = record?.contentHtml ?? defaults.contentHtml;
          const investment = record?.investment ?? defaults.investment;
          const playtime = record?.playtime ?? defaults.playtime;
          const learning = record?.learning ?? defaults.learning;
          const contactUser = record?.contactUser ?? null;
          const contact = buildGameContactDisplay(contactUser, record?.contactNote ?? "");
          const fallbackContact = defaults.contactDisplay;
          const fallbackNote = defaults.contactNote ?? "";
          const contactDisplay = contact.display !== "Referencia pendiente" ? contact.display : fallbackContact;
          const contactNote = contact.note || fallbackNote;
          const contactEmail = contact.email;
          const contactUserId = contactUser?.id ?? null;
          const heroImageUrl = game.heroImageUrl;
          const nextGame = games[index + 1] ?? null;
          const isOtros = game.slug === "otros";
          const canMoveUp = canEdit && !isOtros && index > 0 && games[index - 1]?.slug !== "otros";
          const canMoveDown =
            canEdit && !isOtros && !!nextGame && nextGame.slug !== "otros";

          return (
            <GameCard
              key={game.slug}
              slug={game.slug}
              name={game.name}
              iconUrl={game.iconUrl}
              heroImageUrl={heroImageUrl}
              summary={summary}
              contentHtml={contentHtml}
              investment={investment}
              playtime={playtime}
              learning={learning}
              memberCount={memberCount}
              contactDisplay={contactDisplay}
              contactUserId={contactUserId}
              contactEmail={contactEmail}
              contactNote={contactNote}
              canEdit={canEdit}
              apiPath={`/api/admin/game-info/${game.slug}`}
              canMoveUp={canMoveUp}
              canMoveDown={canMoveDown}
              initiallyOpen={openSlug === game.slug}
            />
          );
        })}
      </section>
      {canEdit ? <NewGameForm /> : null}
    </div>
  );
}

async function composeGameDisplay(): Promise<GameDisplay[]> {
  const [dbGames, fallback] = await Promise.all([loadActiveGames(), Promise.resolve(fallbackGameList())]);
  const dbBySlug = new Map(dbGames.map((game) => [game.slug, game]));
  const seen = new Set<string>();
  const results: GameDisplay[] = [];

  for (const entry of fallback) {
    const override = dbBySlug.get(entry.slug);
    const slug = entry.slug;
    const iconImagePath = override?.iconImagePath ?? entry.iconImagePath ?? null;
    const heroImagePath = override?.heroImagePath ?? entry.heroImagePath ?? null;
    results.push({
      id: override?.id ?? entry.slug,
      slug,
      name: override?.name ?? entry.name,
      iconUrl: iconImagePath ?? gameIconPath(slug),
      heroImageUrl: HERO_IMAGES[slug] ?? heroImagePath ?? gameHeroPath(slug),
      sortOrder: override?.sortOrder ?? entry.sortOrder ?? 999,
      isDefault: override?.isDefault ?? entry.isDefault ?? false,
    });
    seen.add(slug);
  }

  for (const game of dbGames) {
    if (seen.has(game.slug)) continue;
    const slug = game.slug;
    const iconImagePath = game.iconImagePath ?? null;
    const heroImagePath = game.heroImagePath ?? null;
    results.push({
      id: game.id,
      slug,
      name: game.name,
      iconUrl: iconImagePath ?? gameIconPath(slug),
      heroImageUrl: HERO_IMAGES[slug] ?? heroImagePath ?? gameHeroPath(slug),
      sortOrder: game.sortOrder ?? 999,
      isDefault: game.isDefault ?? false,
    });
    seen.add(slug);
  }

  return results.sort((a, b) => {
    if (a.sortOrder === b.sortOrder) {
      return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    }
    return a.sortOrder - b.sortOrder;
  });
}

async function getMemberCounts(games: GameDisplay[]): Promise<Record<string, number>> {
  const pairs = await Promise.all(
    games.map(async (game) => {
      const count = await prisma.user.count({
        where: {
          isActive: true,
          games: { some: { gameId: game.id } },
        },
      });
      return [game.slug, count] as const;
    }),
  );
  return Object.fromEntries(pairs);
}

async function fetchGameInfoRecords(): Promise<Map<string, GameInfoRecord>> {
  const client = prisma as unknown as {
    gameInfo?: {
      findMany: (args: {
        include: {
          game: {
            select: {
              slug: true;
              id: true;
            };
          };
          contactUser: {
            select: {
              id: true;
              email: true;
              name: true;
              nick: true;
              roles: true;
            };
          };
        };
      }) => Promise<
        Array<{
          summary: string;
          contentHtml: string;
          investment: string;
          playtime: string;
          learning: string;
          contactNote: string | null;
          game: { slug: string; id: string } | null;
          contactUser: GameInfoRecord["contactUser"];
        }>
      >;
    };
  };

  if (!client.gameInfo?.findMany) {
    console.warn("[juegos] Tabla gameInfo no disponible en el cliente Prisma; usando textos por defecto.");
    return new Map();
  }

  let records: Awaited<ReturnType<typeof client.gameInfo.findMany>>;
  try {
    records = await client.gameInfo.findMany({
      include: {
        game: {
          select: {
            slug: true,
            id: true,
          },
        },
        contactUser: {
          select: {
            id: true,
            email: true,
            name: true,
            nick: true,
            roles: true,
          },
        },
      },
    });
  } catch (error) {
    console.warn("[juegos] Error consultando gameInfo; se mostrará contenido por defecto.", error);
    return new Map();
  }

  const map = new Map<
    string,
    GameInfoRecord
  >();

  for (const record of records) {
    if (!record.game) continue;
    map.set(record.game.slug, {
      gameId: record.game.id,
      summary: record.summary,
      contentHtml: record.contentHtml,
      investment: record.investment,
      playtime: record.playtime,
      learning: record.learning,
      contactNote: record.contactNote,
      contactUser: record.contactUser,
    });
  }

  return map;
}

function resolveDefaults(slug: string, name: string): GameDefaultContent {
  const defaults = GAME_DEFAULT_CONTENT[slug];
  if (defaults) return defaults;
  return {
    summary: `Informacion de ${name} pendiente de configuracion.`,
    contentHtml: `<p>Estamos recopilando detalles sobre ${name}. Si quieres impulsar este sistema, escribe a hola@bilbohammer.eus.</p>`,
    investment: "Pendiente",
    playtime: "Pendiente",
    learning: "Media",
    contactDisplay: "Junta · Coordinacion",
    contactNote: "Escribe a hola@bilbohammer.eus para proponer actividades.",
  };
}
