import { CompetitiveMatchKind, EventRegistrationStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import CompetitiveDataTable, {
  type CompetitiveTableColumn,
  type CompetitiveTableRow,
} from "@/components/competitive/CompetitiveDataTable";
import {
  DEFAULT_PALADIN_FORMULA,
  getCompetitiveEventSettings,
  includeRegisteredPlayersInLeagueStandings,
  includeRegisteredPlayersInPaladinStandings,
  listApprovedCompetitiveMatches,
  listLeagueStandings,
  listPaladinStandings,
  type ApprovedCompetitiveMatchRow,
} from "@/lib/competitive-matches";
import { buildEventSlug, extractEventIdFromSlug } from "@/lib/events/slug";
import { prisma } from "@/lib/prisma";
import { userCanEditEvent } from "@/lib/roles";

import { updatePaladinFormulaAction } from "./actions";

type Params = {
  slug: string;
};

type SearchParams = {
  hoja?: string;
  jugador?: string;
  faccion?: string;
  tipo?: string;
  ronda?: string;
  fecha?: string;
  calculo?: string;
  feedback?: string;
  error?: string;
};

type SheetId = "liga" | "paladin" | "partidas";

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeZone: "Europe/Madrid",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
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
  { id: "leaguePoints", label: "Pts liga", numeric: true, help: "Victoria = 3 puntos, empate = 1 punto, derrota = 0 puntos." },
  { id: "played", label: "PJ", numeric: true },
  { id: "won", label: "G", numeric: true, help: "Partidas ganadas." },
  { id: "drawn", label: "E", numeric: true, help: "Partidas empatadas." },
  { id: "lost", label: "P", numeric: true, help: "Partidas perdidas." },
  { id: "scoreTotal", label: "Puntos", numeric: true },
  { id: "minimumGames", label: "Mínimo" },
];

const paladinColumns: CompetitiveTableColumn[] = [
  { id: "rank", label: "Rank", numeric: true },
  { id: "displayName", label: "Jugador" },
  { id: "classificationPoints", label: "P. Clasificación", numeric: true, help: "Suma de puntos de batalla en partidas aprobadas." },
  { id: "pointsPerGame", label: "PpP", numeric: true, help: "Puntos de batalla por partida." },
  { id: "played", label: "PJ", numeric: true },
  { id: "won", label: "G", numeric: true, help: "Partidas ganadas." },
  { id: "drawn", label: "E", numeric: true, help: "Partidas empatadas." },
  { id: "winRate", label: "Win rate", numeric: true, help: "Porcentaje de victorias." },
  { id: "adjustedElo", label: "Elo ajustado", numeric: true, help: "Elo corregido por dificultad media de rivales." },
];

const paladinCalculationColumns: CompetitiveTableColumn[] = [
  { id: "rank", label: "Rank", numeric: true },
  { id: "displayName", label: "Jugador" },
  { id: "classificationPoints", label: "P. Clasificación", numeric: true, help: "Suma de puntos de batalla en partidas aprobadas." },
  { id: "classificationScore", label: "Clasif", numeric: true, help: "Valor técnico usado para ordenar la Tabla Paladín." },
  { id: "pointsPerGame", label: "PpP", numeric: true, help: "Puntos de batalla por partida." },
  { id: "played", label: "PJ", numeric: true },
  { id: "won", label: "G", numeric: true, help: "Partidas ganadas." },
  { id: "drawn", label: "E", numeric: true, help: "Partidas empatadas." },
  { id: "winRate", label: "Win rate", numeric: true, help: "Porcentaje de victorias." },
  { id: "ifr", label: "IFR", numeric: true, help: "Índice de fuerza de rivales." },
  { id: "elo", label: "Elo", numeric: true, help: "Rating Elo calculado desde partidas aprobadas." },
  { id: "adjustedElo", label: "Elo ajustado", numeric: true, help: "Elo corregido por dificultad media de rivales." },
];

const matchColumns: CompetitiveTableColumn[] = [
  { id: "detail", label: "Detalle" },
  { id: "playedAt", label: "Fecha" },
  { id: "roundNumber", label: "Ronda", numeric: true, hideOnMobile: true },
  { id: "kind", label: "Tipo" },
  { id: "player", label: "Jugador" },
  { id: "playerFaction", label: "Facción", hideOnMobile: true },
  { id: "result", label: "Resultado" },
  { id: "score", label: "Puntos" },
  { id: "opponent", label: "Rival" },
  { id: "opponentFaction", label: "Facción rival", hideOnMobile: true },
  { id: "validatedBy", label: "Validador", hideOnMobile: true },
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

function normalizeFilter(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function filterMatches(matches: ApprovedCompetitiveMatchRow[], searchParams?: SearchParams) {
  const player = normalizeFilter(searchParams?.jugador);
  const faction = normalizeFilter(searchParams?.faccion);
  const roundRaw = searchParams?.ronda?.trim() ?? "";
  const date = searchParams?.fecha?.trim() ?? "";
  const roundNumber = roundRaw ? Number(roundRaw) : null;
  const kind = searchParams?.tipo;

  return matches.filter((match) => {
    if (kind === CompetitiveMatchKind.LEAGUE || kind === CompetitiveMatchKind.CASUAL) {
      if (match.kind !== kind) return false;
    }
    if (roundRaw && (!Number.isInteger(roundNumber) || match.roundNumber !== roundNumber)) return false;
    if (date && match.playedAt.toISOString().slice(0, 10) !== date) return false;
    if (player && !match.players.some((item) => normalizeFilter(item.displayName).includes(player))) return false;
    if (faction && !match.players.some((item) => normalizeFilter(item.factionLabel).includes(faction))) return false;
    return true;
  });
}

function exportHref(eventId: string, sheet: SheetId, searchParams?: SearchParams) {
  const params = new URLSearchParams({ hoja: sheet });
  if (sheet === "partidas") {
    for (const key of ["jugador", "faccion", "tipo", "ronda", "fecha"] as const) {
      const value = searchParams?.[key]?.trim();
      if (value) params.set(key, value);
    }
  }
  return `/api/events/${eventId}/competitive/export?${params.toString()}`;
}

function playerMatchesHref(baseHref: string, displayName: string) {
  const params = new URLSearchParams({ hoja: "partidas", jugador: displayName });
  return `${baseHref}?${params.toString()}`;
}

function toMatchRow(match: ApprovedCompetitiveMatchRow, baseHref: string): CompetitiveTableRow {
  const [first, second] = match.players;
  const firstName = displayPlayer(first);
  const secondName = displayPlayer(second);
  return {
    id: match.id,
    detail: { label: "Ver", href: `${baseHref}/partidas/${match.id}` },
    playedAt: formatDate(match.playedAt),
    roundNumber: match.roundNumber ?? null,
    kind: kindLabel(match.kind),
    player: firstName ? { label: firstName, href: playerMatchesHref(baseHref, firstName) } : "",
    playerFaction: first?.factionLabel ?? null,
    result: displayOutcome(match),
    score: first && second ? `${first.score} - ${second.score}` : first ? String(first.score) : null,
    opponent: secondName ? { label: secondName, href: playerMatchesHref(baseHref, secondName) } : "",
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
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4">
      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[var(--muted)] sm:text-xs sm:tracking-[0.22em]">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-white sm:text-2xl">{value}</p>
    </div>
  );
}

function paladinCalculationHref(baseHref: string, enabled: boolean) {
  return enabled ? `${baseHref}?hoja=paladin` : `${baseHref}?hoja=paladin&calculo=paladin`;
}

function FeedbackBanner({ searchParams }: { searchParams?: SearchParams }) {
  if (searchParams?.error) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
        {searchParams.error}
      </div>
    );
  }

  if (searchParams?.feedback === "paladin-formula-updated") {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
        Fórmula de Paladín guardada. La tabla se ha recalculado con la nueva configuración.
      </div>
    );
  }

  return null;
}

function PaladinFormulaPanel({
  eventId,
  eventSlug,
  formula,
}: {
  eventId: string;
  eventSlug: string;
  formula: string;
}) {
  return (
    <section className="mb-6 rounded-2xl border border-sky-300/20 bg-sky-500/5 p-4 text-sm leading-relaxed text-sky-50">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-white">Cálculo técnico de Paladín</h2>
          <p className="text-sky-100/80">
            La tabla se ordena por `Clasif`. IFR y Elo quedan ocultos en la vista normal para no saturar, pero aquí se
            muestran para auditoría de organizador/admin.
          </p>
        </div>
      </div>
      <pre className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-sky-50">
{`Si PJ = 0:
  Clasif = 1000
Si PJ > 0:
  Clasif = redondear(
    1000
    + 100 * WinRate * PpP * (IFR / Elo) * factor_volumen
    + ln(PJ + 1) * 12,5
  )

factor_volumen = 1 / (1 + exp(-0,4 * (PJ - mediana_PJ)))`}
      </pre>
      <form action={updatePaladinFormulaAction} className="mt-4 space-y-3">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="eventSlug" value={eventSlug} />
        <label htmlFor="paladinFormula" className="text-xs uppercase tracking-[0.22em] text-sky-100/70">
          Fórmula persistente
        </label>
        <textarea
          id="paladinFormula"
          name="paladinFormula"
          rows={5}
          defaultValue={formula}
          className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-white outline-none focus:border-sky-300/50"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
          >
            Guardar y recalcular
          </button>
          <p className="text-xs text-sky-100/70">
            Variables permitidas: classificationPoints, pointsPerGame, played, won, drawn, winRate, ifr, elo,
            adjustedElo, medianPlayed. Funciones: if, round, floor, ceil, log, exp, min, max, abs. Usa punto decimal
            en la fórmula editable, por ejemplo 12.5.
          </p>
        </div>
      </form>
    </section>
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
    select: {
      id: true,
      title: true,
      game: { select: { name: true, slug: true } },
      registrations: {
        where: { status: { not: EventRegistrationStatus.CANCELLED } },
        select: { userId: true, playerName: true, status: true },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const eventSlug = buildEventSlug(event.id, event.title);
  const session = await auth();
  const canManage = await userCanEditEvent(session, event.id);

  const competitiveSettings = await getCompetitiveEventSettings(event.id);
  const [calculatedLeagueRows, calculatedPaladinRows, matches] = await Promise.all([
    listLeagueStandings(event.id, { minimumGames: competitiveSettings.minimumPrizeGames }),
    listPaladinStandings({ eventId: event.id }),
    listApprovedCompetitiveMatches({ eventId: event.id }),
  ]);
  const leagueRows = includeRegisteredPlayersInLeagueStandings(
    calculatedLeagueRows,
    event.registrations,
    competitiveSettings.minimumPrizeGames,
  );
  const paladinRows = includeRegisteredPlayersInPaladinStandings(calculatedPaladinRows, event.registrations, {
    formula: competitiveSettings.paladinFormula || DEFAULT_PALADIN_FORMULA,
  });

  const sheet = activeSheet(searchParams?.hoja);
  const showPaladinCalculation = canManage && sheet === "paladin" && searchParams?.calculo === "paladin";
  const baseHref = `/eventos/${eventSlug}/competitivo`;
  const activeLeagueColumns =
    competitiveSettings.minimumPrizeGames > 0
      ? leagueColumns
      : leagueColumns.filter((column) => column.id !== "minimumGames");
  const leagueTableRows: CompetitiveTableRow[] = leagueRows.map((row) => ({
    id: row.playerKey,
    position: row.position,
    displayName: { label: row.displayName, href: playerMatchesHref(baseHref, row.displayName) },
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
    displayName: { label: row.displayName, href: playerMatchesHref(baseHref, row.displayName) },
    classificationPoints: row.classificationPoints,
    classificationScore: row.classificationScore,
    pointsPerGame: formatNumber(row.pointsPerGame),
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    winRate: `${formatNumber(row.winRate * 100, 1)}%`,
    ifr: formatNumber(row.ifr),
    elo: formatNumber(row.elo),
    adjustedElo: formatNumber(row.adjustedElo),
  }));
  const filteredMatches = filterMatches(matches, searchParams);
  const matchTableRows = filteredMatches.map((match) => toMatchRow(match, baseHref));
  const uniquePlayers = paladinRows.length;
  const leagueLeader = leagueRows[0]?.displayName ?? "-";
  const paladinLeader = paladinRows[0]?.displayName ?? "-";
  const lastUpdated = matches.length
    ? dateTimeFormatter.format(new Date(Math.max(...matches.map((match) => match.updatedAt.getTime()))))
    : "-";

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
      <FeedbackBanner searchParams={searchParams} />

      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
          <Link href={`/eventos/${eventSlug}`} className="transition hover:text-white">
            {event.title}
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
              Las tablas se calculan desde las partidas aprobadas; no se editan a mano.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`${baseHref}/enviar`}
              className="w-fit rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
            >
              Enviar resultado
            </Link>
            <Link
              href={exportHref(event.id, sheet, searchParams)}
              className="w-fit rounded-full border border-emerald-300/40 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/10"
            >
              Descargar CSV
            </Link>
            {canManage && sheet === "paladin" && (
              <Link
                href={paladinCalculationHref(baseHref, showPaladinCalculation)}
                className="w-fit rounded-full border border-sky-300/40 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/10"
              >
                {showPaladinCalculation ? "Ocultar cálculo" : "Mostrar cálculo"}
              </Link>
            )}
            <Link
              href={`/eventos/${eventSlug}`}
              className="w-fit rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Volver al evento
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Jugadores" value={uniquePlayers} />
        <StatCard label="Partidas totales" value={matches.length} />
        <StatCard label="Partidas de liga" value={matches.filter((match) => match.kind === "LEAGUE").length} />
        <StatCard label="Líder Liga" value={leagueLeader} />
        <StatCard label="Líder Paladín" value={paladinLeader} />
        <StatCard label="Última actualización" value={lastUpdated} />
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
        {sheet === "partidas" && (
          <form action={baseHref} className="mb-6 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto_auto]">
            <input type="hidden" name="hoja" value="partidas" />
            <input
              name="jugador"
              defaultValue={searchParams?.jugador ?? ""}
              placeholder="Jugador"
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
            />
            <input
              name="faccion"
              defaultValue={searchParams?.faccion ?? ""}
              placeholder="Facción"
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
            />
            <select
              name="tipo"
              defaultValue={searchParams?.tipo ?? ""}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
            >
              <option value="">Liga y pachanga</option>
              <option value={CompetitiveMatchKind.LEAGUE}>Solo liga</option>
              <option value={CompetitiveMatchKind.CASUAL}>Solo pachanga</option>
            </select>
            <input
              name="ronda"
              type="number"
              min={0}
              defaultValue={searchParams?.ronda ?? ""}
              placeholder="Ronda"
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
            />
            <input
              name="fecha"
              type="date"
              defaultValue={searchParams?.fecha ?? ""}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
            />
            <button
              type="submit"
              className="rounded-xl bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black"
            >
              Filtrar
            </button>
            <Link
              href={`${baseHref}?hoja=partidas`}
              className="rounded-xl border border-white/20 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-white hover:bg-white/10"
            >
              Limpiar
            </Link>
          </form>
        )}
        {sheet === "liga" && (
          <CompetitiveDataTable
            columns={activeLeagueColumns}
            rows={leagueTableRows}
            emptyMessage="Todavía no hay partidas de liga aprobadas para calcular esta hoja."
            searchPlaceholder="Buscar jugador"
          />
        )}
        {sheet === "paladin" && (
          <>
            {showPaladinCalculation && (
              <PaladinFormulaPanel
                eventId={event.id}
                eventSlug={eventSlug}
                formula={competitiveSettings.paladinFormula || DEFAULT_PALADIN_FORMULA}
              />
            )}
            <CompetitiveDataTable
              columns={showPaladinCalculation ? paladinCalculationColumns : paladinColumns}
              rows={paladinTableRows}
              emptyMessage="Todavía no hay partidas aprobadas para calcular Paladín."
              searchPlaceholder="Buscar jugador"
            />
          </>
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

      {canManage && (
        <section className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-relaxed text-[var(--muted)]">
          La importación de Excel antiguo no queda activada todavía. Los datos sintéticos para validar diseño y cálculos se
          mantienen fuera de la página pública como fixture controlado, no como generación directa desde la web.
        </section>
      )}
    </div>
  );
}
