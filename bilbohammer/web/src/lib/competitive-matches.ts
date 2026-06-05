import {
  CompetitiveMatchKind,
  CompetitiveMatchOutcome,
  CompetitiveMatchReportChannel,
  CompetitiveMatchReportStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

type CompetitiveDb = PrismaClient;

export type CompetitivePlayerInput = {
  userId?: number | null;
  displayName?: string | null;
  factionLabel: string;
  outcome: CompetitiveMatchOutcome;
  score: number;
};

export type CreateCompetitiveMatchReportInput = {
  eventId?: string | null;
  gameId?: string | null;
  kind?: CompetitiveMatchKind;
  playedAt: Date;
  roundNumber?: number | null;
  channel?: CompetitiveMatchReportChannel;
  submittedById?: number | null;
  externalSubmitterId?: string | null;
  externalMessageId?: string | null;
  notes?: string | null;
  players: CompetitivePlayerInput[];
};

type MatchWithPlayers = Prisma.CompetitiveMatchGetPayload<{
  include: { players: true };
}>;

export type LeagueStandingRow = {
  position: number;
  playerKey: string;
  userId: number | null;
  displayName: string;
  leaguePoints: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  scoreTotal: number;
  minimumGames: boolean;
};

export type PaladinStandingRow = {
  rank: number;
  playerKey: string;
  userId: number | null;
  displayName: string;
  classificationPoints: number;
  pointsPerGame: number;
  played: number;
  won: number;
  drawn: number;
  winRate: number;
  ifr: number | null;
  elo: number;
  adjustedElo: number;
};

type PaladinAccumulator = Omit<
  PaladinStandingRow,
  "rank" | "pointsPerGame" | "winRate" | "ifr" | "adjustedElo"
> & {
  rivalRatings: number[];
};

function assertValidDate(value: Date) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error("La fecha de partida no es valida.");
  }
}

function normalizeNullableString(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized.length ? normalized : null;
}

function assertNonNegativeInteger(value: number | null | undefined, field: string) {
  if (value == null) return;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`El campo ${field} debe ser un entero positivo.`);
  }
}

function assertRequiredInteger(value: number | null | undefined, field: string) {
  if (value == null) {
    throw new Error(`El campo ${field} es obligatorio.`);
  }
  assertNonNegativeInteger(value, field);
}

function normalizePlayers(players: CompetitivePlayerInput[]) {
  if (players.length < 2) {
    throw new Error("Una partida necesita al menos dos jugadores.");
  }

  return players.map((player, index) => {
    const displayName = normalizeNullableString(player.displayName);
    const factionLabel = normalizeNullableString(player.factionLabel);
    assertRequiredInteger(player.score, "score");

    if (!displayName && !player.userId) {
      throw new Error("Cada jugador necesita usuario o nombre visible.");
    }
    if (!factionLabel) {
      throw new Error("Cada jugador necesita faccion informada.");
    }

    return {
      userId: player.userId ?? null,
      participantOrder: index + 1,
      displayName: displayName ?? `Jugador ${player.userId}`,
      factionLabel,
      outcome: player.outcome,
      score: player.score,
    };
  });
}

function validateOutcomeConsistency(players: ReturnType<typeof normalizePlayers>) {
  if (players.length !== 2) return;

  const outcomes = players.map((player) => player.outcome).sort();
  const isDraw = outcomes[0] === CompetitiveMatchOutcome.DRAW && outcomes[1] === CompetitiveMatchOutcome.DRAW;
  const hasWinnerAndLoser =
    outcomes[0] === CompetitiveMatchOutcome.LOSS && outcomes[1] === CompetitiveMatchOutcome.WIN;

  if (!isDraw && !hasWinnerAndLoser) {
    throw new Error("El resultado debe ser victoria/derrota o empate/empate.");
  }
}

function leaguePointsForOutcome(outcome: CompetitiveMatchOutcome) {
  if (outcome === CompetitiveMatchOutcome.WIN) return 3;
  if (outcome === CompetitiveMatchOutcome.DRAW) return 1;
  return 0;
}

function playerKey(player: { userId: number | null; displayName: string }) {
  return player.userId ? `user:${player.userId}` : `name:${player.displayName.trim().toLowerCase()}`;
}

function roundMetric(value: number, decimals = 3) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function matchDayKey(date: Date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "sinf";
  return date.toISOString().slice(0, 10);
}

function uniqueTwoPlayerMatchKey(match: MatchWithPlayers) {
  if (match.players.length !== 2) return null;
  const [first, second] = match.players;
  const firstKey = playerKey(first);
  const secondKey = playerKey(second);
  const [left, right] = firstKey < secondKey ? [firstKey, secondKey] : [secondKey, firstKey];
  return `${left}|${right}|${matchDayKey(match.playedAt)}`;
}

function deduplicatePaladinMatches(matches: MatchWithPlayers[]) {
  const seen = new Set<string>();
  const deduplicated: MatchWithPlayers[] = [];

  for (const match of matches) {
    const key = uniqueTwoPlayerMatchKey(match);
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    deduplicated.push(match);
  }

  return deduplicated;
}

export async function createCompetitiveMatchReport(
  input: CreateCompetitiveMatchReportInput,
  db: CompetitiveDb = prisma,
) {
  assertValidDate(input.playedAt);

  const kind = input.kind ?? CompetitiveMatchKind.CASUAL;
  if (kind === CompetitiveMatchKind.LEAGUE && !input.eventId) {
    throw new Error("Una partida de liga necesita evento asociado.");
  }

  assertNonNegativeInteger(input.roundNumber, "roundNumber");
  const players = normalizePlayers(input.players);
  validateOutcomeConsistency(players);

  return db.competitiveMatchReport.create({
    data: {
      eventId: input.eventId ?? null,
      gameId: input.gameId ?? null,
      kind,
      playedAt: input.playedAt,
      roundNumber: input.roundNumber ?? null,
      channel: input.channel ?? CompetitiveMatchReportChannel.WEB,
      submittedById: input.submittedById ?? null,
      externalSubmitterId: normalizeNullableString(input.externalSubmitterId),
      externalMessageId: normalizeNullableString(input.externalMessageId),
      notes: normalizeNullableString(input.notes),
      players: {
        create: players,
      },
    },
    include: { players: true },
  });
}

export async function approveCompetitiveMatchReport(
  reportId: string,
  reviewerId: number | null,
  db: CompetitiveDb = prisma,
) {
  return db.$transaction(async (tx) => {
    const report = await tx.competitiveMatchReport.findUnique({
      where: { id: reportId },
      include: { players: { orderBy: { participantOrder: "asc" } } },
    });

    if (!report) {
      throw new Error("Reporte no encontrado.");
    }
    if (report.status !== CompetitiveMatchReportStatus.PENDING) {
      throw new Error("Solo se pueden aprobar reportes pendientes.");
    }

    const match = await tx.competitiveMatch.create({
      data: {
        eventId: report.eventId,
        gameId: report.gameId,
        kind: report.kind,
        playedAt: report.playedAt,
        roundNumber: report.roundNumber,
        sourceReportId: report.id,
        notes: report.notes,
        createdById: report.submittedById,
        validatedById: reviewerId,
        validatedAt: new Date(),
        players: {
          create: report.players.map((player) => ({
            userId: player.userId,
            participantOrder: player.participantOrder,
            displayName: player.displayName,
            factionLabel: player.factionLabel,
            outcome: player.outcome,
            score: player.score,
          })),
        },
      },
      include: { players: true },
    });

    await tx.competitiveMatchReport.update({
      where: { id: report.id },
      data: {
        status: CompetitiveMatchReportStatus.APPROVED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });

    return match;
  });
}

export async function rejectCompetitiveMatchReport(
  reportId: string,
  reviewerId: number | null,
  rejectionReason: string,
  db: CompetitiveDb = prisma,
) {
  return db.competitiveMatchReport.update({
    where: { id: reportId },
    data: {
      status: CompetitiveMatchReportStatus.REJECTED,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      rejectionReason: normalizeNullableString(rejectionReason),
    },
    include: { players: { orderBy: { participantOrder: "asc" } } },
  });
}

export async function listPendingCompetitiveMatchReports(eventId?: string, db: CompetitiveDb = prisma) {
  return db.competitiveMatchReport.findMany({
    where: {
      status: CompetitiveMatchReportStatus.PENDING,
      eventId: eventId ?? undefined,
    },
    include: {
      players: { orderBy: { participantOrder: "asc" } },
      event: { select: { id: true, title: true } },
      submittedBy: { select: { id: true, name: true, nick: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function listLeagueStandings(
  eventId: string,
  options: { minimumGames?: number } = {},
  db: CompetitiveDb = prisma,
): Promise<LeagueStandingRow[]> {
  const matches = await db.competitiveMatch.findMany({
    where: {
      eventId,
      kind: CompetitiveMatchKind.LEAGUE,
    },
    include: { players: true },
    orderBy: [{ playedAt: "asc" }, { createdAt: "asc" }],
  });

  return calculateLeagueStandings(matches, options.minimumGames ?? 0);
}

export function calculateLeagueStandings(
  matches: MatchWithPlayers[],
  minimumGames = 0,
): LeagueStandingRow[] {
  const rows = new Map<string, Omit<LeagueStandingRow, "position" | "minimumGames">>();

  for (const match of matches) {
    for (const player of match.players) {
      const key = playerKey(player);
      const current =
        rows.get(key) ??
        {
          playerKey: key,
          userId: player.userId,
          displayName: player.displayName,
          leaguePoints: 0,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          scoreTotal: 0,
        };

      current.displayName = player.displayName;
      current.leaguePoints += leaguePointsForOutcome(player.outcome);
      current.played += 1;
      current.won += player.outcome === CompetitiveMatchOutcome.WIN ? 1 : 0;
      current.drawn += player.outcome === CompetitiveMatchOutcome.DRAW ? 1 : 0;
      current.lost += player.outcome === CompetitiveMatchOutcome.LOSS ? 1 : 0;
      current.scoreTotal += player.score;
      rows.set(key, current);
    }
  }

  return Array.from(rows.values())
    .sort((a, b) => {
      if (b.leaguePoints !== a.leaguePoints) return b.leaguePoints - a.leaguePoints;
      if (b.won !== a.won) return b.won - a.won;
      if (b.scoreTotal !== a.scoreTotal) return b.scoreTotal - a.scoreTotal;
      if (a.played !== b.played) return a.played - b.played;
      return a.displayName.localeCompare(b.displayName, "es");
    })
    .map((row, index) => ({
      position: index + 1,
      ...row,
      minimumGames: row.played >= minimumGames,
    }));
}

export async function listPaladinStandings(
  filters: { eventId?: string; gameId?: string } = {},
  db: CompetitiveDb = prisma,
): Promise<PaladinStandingRow[]> {
  const matches = await db.competitiveMatch.findMany({
    where: {
      eventId: filters.eventId,
      gameId: filters.gameId,
    },
    include: { players: true },
    orderBy: [{ playedAt: "asc" }, { createdAt: "asc" }],
  });

  return calculatePaladinStandings(matches);
}

export function calculatePaladinStandings(matches: MatchWithPlayers[]): PaladinStandingRow[] {
  const baseElo = 1500;
  const kFactor = 32;
  const ifrLambda = 5;
  const rows = new Map<string, PaladinAccumulator>();

  function ensure(player: MatchWithPlayers["players"][number]) {
    const key = playerKey(player);
    const current =
      rows.get(key) ??
      {
        playerKey: key,
        userId: player.userId,
        displayName: player.displayName,
        classificationPoints: 0,
        played: 0,
        won: 0,
        drawn: 0,
        elo: baseElo,
        rivalRatings: [],
      };
    current.displayName = player.displayName;
    rows.set(key, current);
    return current;
  }

  for (const match of deduplicatePaladinMatches(matches)) {
    for (const player of match.players) {
      const current = ensure(player);
      current.classificationPoints += player.score;
      current.played += 1;
      current.won += player.outcome === CompetitiveMatchOutcome.WIN ? 1 : 0;
      current.drawn += player.outcome === CompetitiveMatchOutcome.DRAW ? 1 : 0;
    }

    if (match.players.length === 2) {
      const [firstPlayer, secondPlayer] = match.players;
      const first = ensure(firstPlayer);
      const second = ensure(secondPlayer);
      const firstResult =
        firstPlayer.outcome === CompetitiveMatchOutcome.WIN
          ? 1
          : firstPlayer.outcome === CompetitiveMatchOutcome.DRAW
            ? 0.5
            : 0;
      const secondResult = 1 - firstResult;
      const firstRatingBefore = first.elo;
      const secondRatingBefore = second.elo;
      const firstExpected = 1 / (1 + 10 ** ((second.elo - first.elo) / 400));
      const secondExpected = 1 / (1 + 10 ** ((first.elo - second.elo) / 400));

      first.rivalRatings.push(secondRatingBefore);
      second.rivalRatings.push(firstRatingBefore);
      first.elo = roundMetric(first.elo + kFactor * (firstResult - firstExpected), 2);
      second.elo = roundMetric(second.elo + kFactor * (secondResult - secondExpected), 2);
    }
  }

  return Array.from(rows.values())
    .map((row) => {
      const { rivalRatings, ...standingRow } = row;
      const rivalRatingTotal = rivalRatings.reduce((total, rating) => total + rating, 0);
      const ifr =
        rivalRatings.length > 0
          ? roundMetric((rivalRatingTotal + ifrLambda * baseElo) / (rivalRatings.length + ifrLambda), 2)
          : 0;
      return {
        ...standingRow,
        pointsPerGame: row.played > 0 ? roundMetric(row.classificationPoints / row.played, 3) : 0,
        winRate: row.played > 0 ? roundMetric(row.won / row.played, 3) : 0,
        ifr,
        elo: roundMetric(row.elo, 2),
        adjustedElo: roundMetric(row.elo + ifr - baseElo, 2),
      };
    })
    .sort((a, b) => {
      if (b.classificationPoints !== a.classificationPoints) {
        return b.classificationPoints - a.classificationPoints;
      }
      if (b.pointsPerGame !== a.pointsPerGame) return b.pointsPerGame - a.pointsPerGame;
      if (b.elo !== a.elo) return b.elo - a.elo;
      return a.displayName.localeCompare(b.displayName, "es");
    })
    .map((row, index) => ({
      rank: index + 1,
      ...row,
    }));
}
