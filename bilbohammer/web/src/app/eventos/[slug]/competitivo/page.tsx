import Link from "next/link";
import { notFound } from "next/navigation";

import CompetitiveDataTable, {
  type CompetitiveTableColumn,
  type CompetitiveTableRow,
} from "@/components/competitive/CompetitiveDataTable";
import {
  listApprovedCompetitiveMatches,
  listLeagueStandings,
  listPaladinStandings,
  type ApprovedCompetitiveMatchRow,
} from "@/lib/competitive-matches";
import { buildEventSlug, extractEventIdFromSlug } from "@/lib/events/slug";
import { prisma } from "@/lib/prisma";

type Params = {
  slug: string;
};

type SearchParams = {
  hoja?: string;
};

type SheetId = "liga" | "paladin" | "partidas";

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeZone: "Europe/Madrid",
});

const sheetTabs: { id: SheetId; label: string }[] = [
  { id: "liga", label: "Tabla Liga" },
  { id: "paladin", label: "Tabla Paladín" },
  { id: "partidas", label: "Partidas" },
];

const leagueColumns: CompetitiveTableColumn[] = [
  { id: "position", label: "Pos.", numeric: true },
  { id: "displayName", label: "Jugador" },
  { id: "leaguePoints", label: "Pts liga", numeric: true },
  { id: "played", label: "PJ", numeric: true },
  { id: "won", label: "G", numeric: true },
  { id: "drawn", label: "E", numeric: true },
  { id: "lost", label: "P", numeric: true },
  { id: "scoreTotal", label: "Puntos", numeric: true },
  { id: "minimumGames", label: "Mínimo" },
];

const paladinColumns: CompetitiveTableColumn[] = [
  { id: "rank", label: "Rank", numeric: true },
  { id: "displayName", label: "Jugador" },
  { id: "classificationPoints", label: "P. Clasificación", numeric: true },
  { id: "pointsPerGame", label: "PpP", numeric: true },
  { id: "played", label: "PJ", numeric: true },
  { id: "won", label: "G", numeric: true },
  { id: "drawn", label: "E", numeric: true },
  { id: "winRate", label: "Win rate", numeric: true },
  { id: "ifr", label: "IFR", numeric: true },
  { id: "elo", label: "Elo", numeric: true },
  { id: "adjustedElo", label: "Elo ajustado", numeric: true },
];

const matchColumns: CompetitiveTableColumn[] = [
  { id: "playedAt", label: "Fecha" },
  { id: "roundNumber", label: "Ronda", numeric: true },
  { id: "kind", label: "Tipo" },
  { id: "player", label: "Jugador" },
  { id: "playerFaction", label: "Facción" },
  { id: "result", label: "Resultado" },
  { id: "score", label: "Puntos" },
  { id: "opponent", label: "Rival" },
  { id: "opponentFaction", label: "Facción rival" },
  { id: "validatedBy", label: "Validador" },
  { id: "notes", label: "Notas", hideOnMobile: true },
];

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return dateFormatter.format(value);
}

function formatNumber(value: number | null | undefined, decimals = 2) {
  if (value == null) return null;
  return Number.isInteger(value) ? value : Number(value.toFixed(decimals));
}

function displayUser(user: { id: number; nick: string | null; name: string | null; email: string } | null) {
  if (!user) return null;
  return user.nick?.trim() || user.name?.trim() || user.email || `Usuario ${user.id}`;
}

function displayPlayer(player: ApprovedCompetitiveMatchRow["players"][number] | undefined) {
  if (!player) return "";
  return player.displayName.trim() || `Jugador ${player.participantOrder}`;
}

function displayOutcome(match: ApprovedCompetitiveMatchRow) {
  const [first, second] = match.players;
  if (!first) return "Pendiente";
  if (!second) return first.outcome === "WIN" ? "Victoria" : first.outcome === "DRAW" ? "Empate" : "Derrota";
  if (first.outcome === "DRAW" && second.outcome === "DRAW") return "Empate";
  if (first.outcome === "WIN") return `Victoria de ${displayPlayer(first)}`;
  if (second.outcome === "WIN") return `Victoria de ${displayPlayer(second)}`;
  return "Pendiente";
}

function kindLabel(kind: ApprovedCompetitiveMatchRow["kind"]) {
  return kind === "LEAGUE" ? "Liga" : "Pachanga";
}

function toMatchRow(match: ApprovedCompetitiveMatchRow): CompetitiveTableRow {
  const [first, second] = match.players;
  return {
    id: match.id,
    playedAt: formatDate(match.playedAt),
    roundNumber: match.roundNumber ?? null,
    kind: kindLabel(match.kind),
    player: displayPlayer(first),
    playerFaction: first?.factionLabel ?? null,
    result: displayOutcome(match),
    score: first && second ? `${first.score} - ${second.score}` : first ? String(first.score) : null,
    opponent: displayPlayer(second),
    opponentFaction: second?.factionLabel ?? null,
    validatedBy: displayUser(match.validatedBy),
    notes: match.notes,
  };
}

function activeSheet(value: string | undefined): SheetId {
  return sheetTabs.some((tab) => tab.id === value) ? (value as SheetId) : "liga";
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

export default async function EventCompetitiveSheetsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const eventId = extractEventIdFromSlug(params.slug);
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, game: { select: { name: true, slug: true } } },
  });

  if (!event) {
    notFound();
  }

  const eventSlug = buildEventSlug(event.id, event.title);

  const [leagueRows, paladinRows, matches] = await Promise.all([
    listLeagueStandings(event.id),
    listPaladinStandings({ eventId: event.id }),
    listApprovedCompetitiveMatches({ eventId: event.id }),
  ]);

  const sheet = activeSheet(searchParams?.hoja);
  const baseHref = `/eventos/${eventSlug}/competitivo`;
  const leagueTableRows: CompetitiveTableRow[] = leagueRows.map((row) => ({
    id: row.playerKey,
    position: row.position,
    displayName: row.displayName,
    leaguePoints: row.leaguePoints,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    scoreTotal: row.scoreTotal,
    minimumGames: row.minimumGames,
  }));
  const paladinTableRows: CompetitiveTableRow[] = paladinRows.map((row) => ({
    id: row.playerKey,
    rank: row.rank,
    displayName: row.displayName,
    classificationPoints: row.classificationPoints,
    pointsPerGame: formatNumber(row.pointsPerGame, 3),
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    winRate: `${formatNumber(row.winRate * 100, 1)}%`,
    ifr: formatNumber(row.ifr),
    elo: formatNumber(row.elo),
    adjustedElo: formatNumber(row.adjustedElo),
  }));
  const matchTableRows = matches.map(toMatchRow);
  const uniquePlayers = new Set(matches.flatMap((match) => match.players.map((player) => player.userId ?? player.displayName))).size;

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
          <Link href={`/eventos/${eventSlug}`} className="transition hover:text-white">
            Evento
          </Link>
          <span>/</span>
          <span>Hojas competitivas</span>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
              {event.game?.name ?? event.game?.slug ?? "Competitivo"}
            </p>
            <h1 className="text-3xl font-semibold text-white">Datos competitivos</h1>
            <p className="max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
              {event.title}. Las tablas se calculan desde las partidas aprobadas; no se editan a mano.
            </p>
          </div>
          <Link
            href={`/eventos/${eventSlug}`}
            className="w-fit rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Volver al evento
          </Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Partidas aprobadas" value={matches.length} />
        <StatCard label="Partidas de liga" value={matches.filter((match) => match.kind === "LEAGUE").length} />
        <StatCard label="Pachangas" value={matches.filter((match) => match.kind === "CASUAL").length} />
        <StatCard label="Jugadores" value={uniquePlayers} />
      </section>

      <nav className="flex flex-wrap gap-2">
        {sheetTabs.map((tab) => {
          const isActive = tab.id === sheet;
          const href = tab.id === "liga" ? baseHref : `${baseHref}?hoja=${tab.id}`;
          return (
            <Link
              key={tab.id}
              href={href}
              scroll={false}
              prefetch={false}
              className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.24em] transition ${
                isActive
                  ? "border-white/80 bg-white/10 text-white"
                  : "border-white/10 text-[var(--muted)] hover:border-white/40 hover:text-white"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <section className="rounded-3xl border border-white/10 bg-black/20 p-4 shadow-lg sm:p-6">
        {sheet === "liga" && (
          <CompetitiveDataTable
            columns={leagueColumns}
            rows={leagueTableRows}
            emptyMessage="Todavía no hay partidas de liga aprobadas para calcular esta hoja."
            searchPlaceholder="Buscar jugador"
          />
        )}
        {sheet === "paladin" && (
          <CompetitiveDataTable
            columns={paladinColumns}
            rows={paladinTableRows}
            emptyMessage="Todavía no hay partidas aprobadas para calcular Paladín."
            searchPlaceholder="Buscar jugador"
          />
        )}
        {sheet === "partidas" && (
          <CompetitiveDataTable
            columns={matchColumns}
            rows={matchTableRows}
            emptyMessage="Todavía no hay partidas aprobadas en este evento."
            searchPlaceholder="Buscar jugador, facción o validador"
          />
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-relaxed text-[var(--muted)]">
        La importación de Excel antiguo no queda activada todavía. Si hace falta generar datos sintéticos para validar
        diseño y cálculos, conviene hacerlo como importación controlada a reportes pendientes, no como escritura directa
        sobre las clasificaciones.
      </section>
    </div>
  );
}
