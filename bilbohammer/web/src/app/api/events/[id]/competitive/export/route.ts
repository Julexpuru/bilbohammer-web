import { CompetitiveMatchKind, EventRegistrationStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  listApprovedCompetitiveMatches,
  getCompetitiveEventSettings,
  includeRegisteredPlayersInLeagueStandings,
  includeRegisteredPlayersInPaladinStandings,
  listLeagueStandings,
  listPaladinStandings,
  type ApprovedCompetitiveMatchRow,
} from "@/lib/competitive-matches";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: { id: string };
};

type ExportSheet = "liga" | "paladin" | "partidas";

function csvValue(value: string | number | boolean | null | undefined) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>) {
  return [headers, ...rows].map((row) => row.map(csvValue).join(";")).join("\n");
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function kindLabel(kind: CompetitiveMatchKind) {
  return kind === CompetitiveMatchKind.LEAGUE ? "Liga" : "Pachanga";
}

function formatNumber(value: number | null | undefined, decimals = 2) {
  if (value == null) return null;
  return Number.isInteger(value) ? value : Number(value.toFixed(decimals));
}

function displayPlayer(player: ApprovedCompetitiveMatchRow["players"][number] | undefined) {
  if (!player) return "";
  return player.displayName.trim() || `Jugador ${player.participantOrder}`;
}

function resultLabel(match: ApprovedCompetitiveMatchRow) {
  const [first, second] = match.players;
  if (!first) return "";
  if (first.outcome === "DRAW" && second?.outcome === "DRAW") return "Empate";
  const winner = match.players.find((player) => player.outcome === "WIN");
  return winner ? `Victoria de ${displayPlayer(winner)}` : "";
}

function filterMatches(matches: ApprovedCompetitiveMatchRow[], searchParams: URLSearchParams) {
  const player = normalizeText(searchParams.get("jugador"));
  const faction = normalizeText(searchParams.get("faccion"));
  const kind = searchParams.get("tipo");
  const round = searchParams.get("ronda")?.trim() ?? "";
  const date = searchParams.get("fecha")?.trim() ?? "";
  const roundNumber = round ? Number(round) : null;

  return matches.filter((match) => {
    if (kind === CompetitiveMatchKind.LEAGUE || kind === CompetitiveMatchKind.CASUAL) {
      if (match.kind !== kind) return false;
    }
    if (round && (!Number.isInteger(roundNumber) || match.roundNumber !== roundNumber)) return false;
    if (date && match.playedAt.toISOString().slice(0, 10) !== date) return false;
    if (player && !match.players.some((item) => normalizeText(item.displayName).includes(player))) return false;
    if (faction && !match.players.some((item) => normalizeText(item.factionLabel).includes(faction))) return false;
    return true;
  });
}

export async function GET(request: Request, { params }: RouteParams) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      registrations: {
        where: { status: { not: EventRegistrationStatus.CANCELLED } },
        select: { userId: true, playerName: true, status: true },
      },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const sheet = (searchParams.get("hoja") ?? "liga") as ExportSheet;
  const safeSheet: ExportSheet = sheet === "paladin" || sheet === "partidas" ? sheet : "liga";
  let csv = "";

  if (safeSheet === "liga") {
    const settings = await getCompetitiveEventSettings(event.id);
    const rows = includeRegisteredPlayersInLeagueStandings(
      await listLeagueStandings(event.id, { minimumGames: settings.minimumPrizeGames }),
      event.registrations,
      settings.minimumPrizeGames,
    );
    const includeMinimum = settings.minimumPrizeGames > 0;
    csv = toCsv(
      includeMinimum
        ? ["Posición", "Jugador", "Pts liga", "PJ", "G", "E", "P", "Puntos", "Mínimo"]
        : ["Posición", "Jugador", "Pts liga", "PJ", "G", "E", "P", "Puntos"],
      rows.map((row) => [
        row.position,
        row.displayName,
        row.leaguePoints,
        row.played,
        row.won,
        row.drawn,
        row.lost,
        row.scoreTotal,
        ...(includeMinimum ? [row.minimumGames ? "Sí" : "No"] : []),
      ]),
    );
  }

  if (safeSheet === "paladin") {
    const settings = await getCompetitiveEventSettings(event.id);
    const rows = includeRegisteredPlayersInPaladinStandings(
      await listPaladinStandings({ eventId: event.id }),
      event.registrations,
      { formula: settings.paladinFormula },
    );
    csv = toCsv(
      ["Rank", "Jugador", "P. Clasificación", "Clasif", "PpP", "PJ", "G", "E", "Win rate", "IFR", "Elo", "Elo ajustado"],
      rows.map((row) => [
        row.rank,
        row.displayName,
        row.classificationPoints,
        row.classificationScore,
        formatNumber(row.pointsPerGame),
        row.played,
        row.won,
        row.drawn,
        `${formatNumber(row.winRate * 100)}%`,
        formatNumber(row.ifr),
        formatNumber(row.elo),
        formatNumber(row.adjustedElo),
      ]),
    );
  }

  if (safeSheet === "partidas") {
    const matches = filterMatches(await listApprovedCompetitiveMatches({ eventId: event.id }), searchParams);
    csv = toCsv(
      ["Fecha", "Ronda", "Tipo", "Jugador", "Facción", "Resultado", "Puntos", "Rival", "Facción rival", "Notas"],
      matches.map((match) => {
        const [first, second] = match.players;
        return [
          match.playedAt.toISOString().slice(0, 10),
          match.roundNumber,
          kindLabel(match.kind),
          displayPlayer(first),
          first?.factionLabel,
          resultLabel(match),
          first && second ? `${first.score} - ${second.score}` : first?.score,
          displayPlayer(second),
          second?.factionLabel,
          match.notes,
        ];
      }),
    );
  }

  const filename = `${event.title}-${safeSheet}.csv`.replace(/[^\p{L}\p{N}._-]+/gu, "-").toLowerCase();

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
