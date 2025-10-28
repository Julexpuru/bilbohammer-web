import { auth } from "@/auth";
import type { GameId } from "@/lib/games";
import { GAMES, gameIconPath } from "@/lib/games";
import { prisma } from "@/lib/prisma";
import { extractRoles } from "@/lib/roles";
import { GAME_ENUM_TO_ID, GAME_ID_TO_ENUM } from "@/lib/game-enum";
import { buildGameContactDisplay } from "@/lib/game-info";
import { GameCard } from "./GameCard";

export const metadata = {
  title: "Juegos en el club | Bilbohammer",
  description:
    "Explora los sistemas que jugamos en Bilbohammer y descubre con quien contactar para sumarte a la proxima partida.",
};

const HERO_IMAGES: Partial<Record<GameId, string>> = {
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

type DefaultCopy = {
  summary: string;
  contentHtml: string;
  investment: string;
  playtime: string;
  learning: string;
  contactDisplay: string;
  contactNote?: string;
};

const DEFAULT_COPY: Record<GameId, DefaultCopy> = {
  w40k: {
    summary: "Competitivo, narrativo y siempre con mesas llenas.",
    contentHtml: [
      "<p>Warhammer 40,000 es el motor principal del club: combinamos ligas, campanas narrativas y torneos puntuables. Si empiezas desde cero siempre encontraras a alguien dispuesto a ensenarte.</p>",
      "<ul>",
      "  <li>Calendario trimestral con noches fijas entre semana y torneos puntuables.</li>",
      "  <li>Escenografia propia y tapetes listos para formatos de 2000, 1500 y 1000 puntos.</li>",
      "  <li>Grupo de aprendizaje con partidas dirigidas para nuevos jugadores.</li>",
      "</ul>",
    ].join("\n"),
    investment: "Desde 150 EUR",
    playtime: "2.5 - 3 h",
    learning: "Alta",
    contactDisplay: "Julen · Junta",
    contactNote: "Coordinacion principal del sistema.",
  },
  aos: {
    summary: "Age of Sigmar reune a todos los perfiles de juego.",
    contentHtml: [
      "<p>Alternamos ligas cortas con campanas narrativas para mantener la escena variada. Viajamos juntos a eventos del norte y cuidamos cada mesa para representar los Reinos Mortales.</p>",
      "<ul>",
      "  <li>Mini ligas de cuatro semanas para no saturar agendas.</li>",
      "  <li>Escenografia tematizada y tapetes de 44x60 y 60x44.</li>",
      "  <li>Coordinamos desplazamientos a torneos cercanos.</li>",
      "</ul>",
    ].join("\n"),
    investment: "Desde 140 EUR",
    playtime: "2 - 2.5 h",
    learning: "Media",
    contactDisplay: "Kimetz · Junta",
  },
  tow: {
    summary: "El regreso del Old World con campanas de mapa.",
    contentHtml: [
      "<p>Recuperamos el espiritu clasico con campanas por territorios, partidas narrativas y quedadas especiales para grandes batallas. Restauramos minis antiguas y compartimos recursos de trasfondo.</p>",
      "<ul>",
      "  <li>Campanas de mapa con seguimiento digital de resultados.</li>",
      "  <li>Quedadas mensuales para partidas epicas.</li>",
      "  <li>Talleres de restauracion y pintura clasica.</li>",
      "</ul>",
    ].join("\n"),
    investment: "Desde 180 EUR",
    playtime: "3 - 4 h",
    learning: "Media",
    contactDisplay: "Andoni · Socio",
  },
  esdla: {
    summary: "Escenarios de la Tierra Media con mimo tematico.",
    contentHtml: [
      "<p>Ofrecemos escenarios competitivos y campanas cooperativas inspiradas en los libros. La escenografia recrea ruinas, bosques y minas emblematicas para cada mision.</p>",
      "<ul>",
      "  <li>Narrativas basadas en los libros y peliculas.</li>",
      "  <li>Escenografia tematica propia y compartida con otros clubs.</li>",
      "  <li>Quedadas cruzadas con asociaciones vecinas.</li>",
      "</ul>",
    ].join("\n"),
    investment: "Desde 120 EUR",
    playtime: "2 h",
    learning: "Media",
    contactDisplay: "Andoni · Socio",
  },
  bb: {
    summary: "Blood Bowl asegura risas, drama y ranking anual.",
    contentHtml: [
      "<p>La liga anual incluye draft de franquicias, playoffs y cronicas semanales. Cada jornada se juega en estadios tematizados con escenografia modular para ambientar el campo.</p>",
      "<ul>",
      "  <li>Liga anual con clasificacion y premios tematicos.</li>",
      "  <li>Gestor online para fichajes y cronicas.</li>",
      "  <li>Escenografia modular para personalizar cada estadio.</li>",
      "</ul>",
    ].join("\n"),
    investment: "Desde 95 EUR",
    playtime: "2 - 2.5 h",
    learning: "Media",
    contactDisplay: "Kimetz · Junta",
  },
  marvel: {
    summary: "Partidas dinamicas y eventos tematicos de comic.",
    contentHtml: [
      "<p>Marvel Crisis Protocol es ideal si buscas dinamismo. Organizamos ligas cortas, escenarios caseros y talleres de escenografia urbana para ambientar las mesas.</p>",
      "<ul>",
      "  <li>Ligas rapidas de seis jornadas.</li>",
      "  <li>Talleres de escenografia urbana y pintura.</li>",
      "  <li>Jornadas de demostracion abiertas al publico.</li>",
      "</ul>",
    ].join("\n"),
    investment: "Desde 110 EUR",
    playtime: "90 - 120 min",
    learning: "Media",
    contactDisplay: "Gorka · Amigo",
  },
  rol: {
    summary: "Rol semanal con plazas abiertas y rotacion de directores.",
    contentHtml: [
      "<p>Gestionamos una agenda compartida para reservar mesa, anunciar campanas y organizar sesiones cero. Hay hueco para aventuras cortas o campanas de larga duracion.</p>",
      "<ul>",
      "  <li>Calendario colaborativo para reservar sesiones.</li>",
      "  <li>Biblioteca de manuales y ayudas de juego.</li>",
      "  <li>Sesiones cero para crear personajes desde cero.</li>",
      "</ul>",
    ].join("\n"),
    investment: "Desde 30 EUR",
    playtime: "3 - 4 h",
    learning: "Baja",
    contactDisplay: "OAuth Demo · Amigo",
  },
  magic: {
    summary: "Commander casual y sellados tematicos cada temporada.",
    contentHtml: [
      "<p>Quedamos los domingos para Commander, con listas compartidas y sellados tematicos cuando llega una nueva expansion. Tenemos pool de cartas para quien quiera iniciarse.</p>",
      "<ul>",
      "  <li>Quedadas dominicales con seguimiento de ligas.</li>",
      "  <li>Sellados tematicos con kits comunitarios.</li>",
      "  <li>Pool de cartas para iniciacion.</li>",
      "</ul>",
    ].join("\n"),
    investment: "Desde 80 EUR",
    playtime: "2 - 3 h",
    learning: "Media",
    contactDisplay: "OAuth Demo · Amigo",
  },
  boardgames: {
    summary: "Juegos de mesa modernos y planes familiares.",
    contentHtml: [
      "<p>Disponemos de una ludoteca comunitaria que cubre euros, party y cooperativos. Tambien organizamos sesiones para probar prototipos de autores locales.</p>",
      "<ul>",
      "  <li>Ludoteca comunitaria en constante crecimiento.</li>",
      "  <li>Club mensual de testeo de prototipos.</li>",
      "  <li>Sesiones introductorias para familias y novatos.</li>",
      "</ul>",
    ].join("\n"),
    investment: "Desde 40 EUR",
    playtime: "60 - 120 min",
    learning: "Baja",
    contactDisplay: "Local Demo · Socio",
  },
  otros: {
    summary: "Hueco para proyectos nuevos y sistemas emergentes.",
    contentHtml: [
      "<p>Si tienes un juego minoritario o quieres lanzar un proyecto experimental, la junta te ayuda con logistica, difusion y material siempre que sea posible.</p>",
      "<ul>",
      "  <li>Reservamos mesas para campanas experimentales.</li>",
      "  <li>Apoyo logistico para materiales y difusion.</li>",
      "  <li>Inventario colaborativo para nuevos sistemas.</li>",
      "</ul>",
    ].join("\n"),
    investment: "Variable",
    playtime: "Segun sistema",
    learning: "Media",
    contactDisplay: "Julen · Junta",
    contactNote: "Coordinacion general de propuestas nuevas.",
  },
};

async function getMemberCounts(): Promise<Record<GameId, number>> {
  const pairs = await Promise.all(
    Object.entries(GAME_ID_TO_ENUM).map(async ([gameId, enumValue]) => {
      const count = await prisma.user.count({
        where: { isActive: true, juegos: { has: enumValue } },
      });
      return [gameId as GameId, count] as const;
    }),
  );
  return Object.fromEntries(pairs) as Record<GameId, number>;
}

export default async function JuegosPage() {
  const session = await auth();
  const roles = extractRoles(session);
  const canEdit = roles.includes("ADMIN") || roles.includes("JUNTA");

  const [memberCounts, gameInfoRecords] = await Promise.all([getMemberCounts(), fetchGameInfoRecords()]);

  const infoByGameId = new Map<GameId, (typeof gameInfoRecords)[number]>();
  for (const record of gameInfoRecords) {
    const id = GAME_ENUM_TO_ID[record.game];
    infoByGameId.set(id, record);
  }

  return (
    <div className="space-y-10">
      <section className="card space-y-4">
        <h1 className="text-3xl font-semibold">Juegos en Bilbohammer</h1>
        <p>
          Organizamos ligas, campanas y quedadas libres en torno a distintos sistemas. Esta panoramica te ayuda a
          saber con quien hablar, que material compartimos y cuando solemos quedar para cada juego.
        </p>
        <p className="text-sm text-[var(--muted)]">
          Pulsa en cada tarjeta para desplegar detalles. Ajustaremos el diseno y la informacion a medida que
          cerremos calendario y responsables definitivos.
        </p>
      </section>

      <section className="space-y-4">
        {GAMES.map((game) => {
          const defaults = DEFAULT_COPY[game.id];
          const record = infoByGameId.get(game.id);
          const memberCount = memberCounts[game.id] ?? 0;
          const summary = record?.summary ?? defaults.summary;
          const contentHtml = record?.contentHtml ?? defaults.contentHtml;
          const investment = record?.investment ?? defaults.investment;
          const playtime = record?.playtime ?? defaults.playtime;
          const learning = record?.learning ?? defaults.learning;
          const contact = buildGameContactDisplay(record?.contactUser ?? null, record?.contactNote ?? "");
          const fallbackContact = defaults.contactDisplay;
          const fallbackNote = defaults.contactNote ?? "";
          const contactDisplay = contact.display !== "Referencia pendiente" ? contact.display : fallbackContact;
          const contactNote = contact.note || fallbackNote;
          const contactEmail = contact.email;
          const heroImageUrl = HERO_IMAGES[game.id] ?? gameIconPath(game.id);

          return (
            <GameCard
              key={game.id}
              gameId={game.id}
              name={game.name}
              iconUrl={gameIconPath(game.id)}
              heroImageUrl={heroImageUrl}
              summary={summary}
              contentHtml={contentHtml}
              investment={investment}
              playtime={playtime}
              learning={learning}
              memberCount={memberCount}
              contactDisplay={contactDisplay}
              contactEmail={contactEmail}
              contactNote={contactNote}
              canEdit={canEdit}
              apiPath={`/api/admin/game-info/${game.id}`}
            />
          );
        })}
      </section>
    </div>
  );
}

type GameInfoRecord = {
  game: (typeof GAME_ENUM_TO_ID)[keyof typeof GAME_ENUM_TO_ID];
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
    roles: string[];
  } | null;
};

async function fetchGameInfoRecords(): Promise<GameInfoRecord[]> {
  const client = prisma as unknown as {
    gameInfo?: {
      findMany: (args: {
        include: {
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
      }) => Promise<GameInfoRecord[]>;
    };
  };

  if (!client.gameInfo?.findMany) {
    console.warn("[juegos] Tabla gameInfo no disponible; usando textos por defecto.");
    return [];
  }

  try {
    return await client.gameInfo.findMany({
      include: {
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
    console.warn("[juegos] Error consultando gameInfo; se mostrara contenido por defecto.", error);
    return [];
  }
}
