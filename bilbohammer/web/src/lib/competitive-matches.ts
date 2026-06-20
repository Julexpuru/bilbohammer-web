import {
  CompetitiveMatchAuditAction,
  CompetitiveMatchKind,
  CompetitiveMatchOutcome,
  CompetitiveMatchReportChannel,
  CompetitiveMatchReportStatus,
  CompetitiveMatchStatus,
  CompetitiveReportScoringMode,
  Prisma,
  PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PALADIN_FORMULA,
  evaluatePaladinFormula,
  normalizePaladinFormula,
  validatePaladinFormula,
} from "@/lib/competitive-formulas";
import {
  notifyCompetitiveReportPending,
  notifyCompetitiveReportReviewed,
} from "@/lib/notifications";

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

export type UpdateCompetitiveMatchReportInput = {
  kind: CompetitiveMatchKind;
  playedAt: Date;
  roundNumber?: number | null;
  notes?: string | null;
  players: CompetitivePlayerInput[];
};

export type UpdateApprovedCompetitiveMatchInput = UpdateCompetitiveMatchReportInput & {
  reason?: string | null;
};

type MatchWithPlayers = Prisma.CompetitiveMatchGetPayload<{
  include: { players: true };
}>;

type CompetitiveReadDb = PrismaClient | Prisma.TransactionClient;

export type CompetitiveEventSettingsData = {
  eventId: string;
  paladinFormula: string;
  showReportRound: boolean;
  scoringMode: CompetitiveReportScoringMode;
  updatedById: number | null;
  updatedAt: Date | null;
};

export type ApprovedCompetitiveMatchRow = Prisma.CompetitiveMatchGetPayload<{
  include: {
    players: { orderBy: { participantOrder: "asc" } };
    event: { select: { id: true; title: true } };
    game: { select: { id: true; name: true; slug: true } };
    createdBy: { select: { id: true; name: true; nick: true; email: true } };
    validatedBy: { select: { id: true; name: true; nick: true; email: true } };
  };
}>;

export type LeagueDuplicateMatch = Prisma.CompetitiveMatchGetPayload<{
  include: { players: { orderBy: { participantOrder: "asc" } } };
}>;

type AuditedMatch = Prisma.CompetitiveMatchGetPayload<{
  include: { players: { orderBy: { participantOrder: "asc" } } };
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
  classificationScore: number;
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
  "rank" | "classificationScore" | "pointsPerGame" | "winRate" | "ifr" | "adjustedElo"
> & {
  rivalRatings: number[];
};

const REPORT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const REPORT_RATE_LIMIT_MAX = 5;

export { DEFAULT_PALADIN_FORMULA };

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

function sameTwoPlayerPair(
  leftPlayers: { userId: number | null; displayName: string }[],
  rightPlayers: { userId: number | null; displayName: string }[],
) {
  if (leftPlayers.length !== 2 || rightPlayers.length !== 2) return false;
  const left = leftPlayers.map(playerKey).sort();
  const right = rightPlayers.map(playerKey).sort();
  return left[0] === right[0] && left[1] === right[1];
}

function assertDistinctTwoPlayers(players: { userId: number | null; displayName: string }[]) {
  if (players.length !== 2) return;
  const [first, second] = players.map(playerKey);
  if (first === second) {
    throw new Error("Una partida no puede tener al mismo jugador en ambos lados.");
  }
}

function validateScoresForMode(players: { score: number }[], mode: CompetitiveReportScoringMode) {
  if (mode === CompetitiveReportScoringMode.SUM_20) {
    const total = players.reduce((sum, player) => sum + player.score, 0);
    if (total !== 20) {
      throw new Error("La puntuación configurada para este evento exige que ambos jugadores sumen 20 puntos.");
    }
    return;
  }

  const invalid = players.some((player) => player.score < 0 || player.score > 100);
  if (invalid) {
    throw new Error("La puntuación configurada para este evento exige puntos entre 0 y 100 para cada jugador.");
  }
}

function roundMetric(value: number, decimals = 3) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

export async function getCompetitiveEventSettings(
  eventId: string,
  db: CompetitiveReadDb = prisma,
): Promise<CompetitiveEventSettingsData> {
  const settings = await db.competitiveEventSettings.findUnique({
    where: { eventId },
    select: {
      eventId: true,
      paladinFormula: true,
      showReportRound: true,
      scoringMode: true,
      updatedById: true,
      updatedAt: true,
    },
  });

  return {
    eventId,
    paladinFormula: settings?.paladinFormula ?? DEFAULT_PALADIN_FORMULA,
    showReportRound: settings?.showReportRound ?? true,
    scoringMode: settings?.scoringMode ?? CompetitiveReportScoringMode.INDIVIDUAL_0_100,
    updatedById: settings?.updatedById ?? null,
    updatedAt: settings?.updatedAt ?? null,
  };
}

export async function updateCompetitiveEventReportOptions(
  eventId: string,
  actorId: number | null,
  input: { showReportRound: boolean; scoringMode: CompetitiveReportScoringMode },
  db: CompetitiveDb = prisma,
) {
  return db.competitiveEventSettings.upsert({
    where: { eventId },
    create: {
      eventId,
      paladinFormula: DEFAULT_PALADIN_FORMULA,
      showReportRound: input.showReportRound,
      scoringMode: input.scoringMode,
      updatedById: actorId,
    },
    update: {
      showReportRound: input.showReportRound,
      scoringMode: input.scoringMode,
      updatedById: actorId,
    },
    select: {
      eventId: true,
      paladinFormula: true,
      showReportRound: true,
      scoringMode: true,
      updatedById: true,
      updatedAt: true,
    },
  });
}

export async function updateCompetitiveEventPaladinFormula(
  eventId: string,
  actorId: number | null,
  formula: string,
  db: CompetitiveDb = prisma,
) {
  const paladinFormula = normalizePaladinFormula(formula);
  validatePaladinFormula(paladinFormula);

  return db.$transaction(async (tx) => {
    const previous = await tx.competitiveEventSettings.findUnique({
      where: { eventId },
      select: { paladinFormula: true },
    });

    const settings = await tx.competitiveEventSettings.upsert({
      where: { eventId },
      create: {
        eventId,
        paladinFormula,
        updatedById: actorId,
      },
      update: {
        paladinFormula,
        updatedById: actorId,
      },
      select: { eventId: true, paladinFormula: true, updatedById: true, updatedAt: true },
    });

    if ((previous?.paladinFormula ?? DEFAULT_PALADIN_FORMULA) !== paladinFormula) {
      await tx.competitiveEventSettingsAuditLog.create({
        data: {
          eventId,
          actorId,
          previousFormula: previous?.paladinFormula ?? DEFAULT_PALADIN_FORMULA,
          nextFormula: paladinFormula,
        },
      });
    }

    return settings;
  });
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

function serializeMatchForAudit(match: AuditedMatch) {
  return {
    id: match.id,
    eventId: match.eventId,
    gameId: match.gameId,
    kind: match.kind,
    status: match.status,
    playedAt: match.playedAt.toISOString(),
    roundNumber: match.roundNumber,
    notes: match.notes,
    voidedById: match.voidedById,
    voidedAt: match.voidedAt?.toISOString() ?? null,
    voidReason: match.voidReason,
    players: match.players.map((player) => ({
      userId: player.userId,
      participantOrder: player.participantOrder,
      displayName: player.displayName,
      factionLabel: player.factionLabel,
      outcome: player.outcome,
      score: player.score,
    })),
  };
}

async function assertReportRateLimit(input: CreateCompetitiveMatchReportInput, db: CompetitiveDb) {
  if (!input.submittedById) return;
  const since = new Date(Date.now() - REPORT_RATE_LIMIT_WINDOW_MS);
  const recentCount = await db.competitiveMatchReport.count({
    where: {
      submittedById: input.submittedById,
      eventId: input.eventId ?? undefined,
      createdAt: { gte: since },
    },
  });
  if (recentCount >= REPORT_RATE_LIMIT_MAX) {
    throw new Error("Has enviado demasiados reportes en poco tiempo. Espera unos minutos antes de volver a intentarlo.");
  }
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
  assertDistinctTwoPlayers(players);
  validateOutcomeConsistency(players);
  const settings = input.eventId ? await getCompetitiveEventSettings(input.eventId, db) : null;
  validateScoresForMode(players, settings?.scoringMode ?? CompetitiveReportScoringMode.INDIVIDUAL_0_100);
  await assertReportRateLimit(input, db);

  const report = await db.competitiveMatchReport.create({
    data: {
      eventId: input.eventId ?? null,
      gameId: input.gameId ?? null,
      kind,
      playedAt: input.playedAt,
      roundNumber: settings?.showReportRound === false ? null : input.roundNumber ?? null,
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

  if (db === prisma) {
    await notifyCompetitiveReportPending({ reportId: report.id, actorUserId: input.submittedById ?? null });
  }

  return report;
}

export async function findExistingLeagueMatchForPlayers(
  eventId: string | null | undefined,
  players: { userId: number | null; displayName: string }[],
  db: CompetitiveReadDb = prisma,
  excludeMatchId?: string | null,
): Promise<LeagueDuplicateMatch | null> {
  if (!eventId || players.length !== 2) return null;

  const matches = await db.competitiveMatch.findMany({
    where: {
      id: excludeMatchId ? { not: excludeMatchId } : undefined,
      eventId,
      kind: CompetitiveMatchKind.LEAGUE,
      status: CompetitiveMatchStatus.APPROVED,
    },
    include: { players: { orderBy: { participantOrder: "asc" } } },
    orderBy: [{ playedAt: "asc" }, { createdAt: "asc" }],
  });

  return matches.find((match) => sameTwoPlayerPair(match.players, players)) ?? null;
}

export async function updatePendingCompetitiveMatchReport(
  reportId: string,
  input: UpdateCompetitiveMatchReportInput,
  db: CompetitiveDb = prisma,
) {
  assertValidDate(input.playedAt);
  assertNonNegativeInteger(input.roundNumber, "roundNumber");
  const players = normalizePlayers(input.players);
  assertDistinctTwoPlayers(players);
  validateOutcomeConsistency(players);

  return db.$transaction(async (tx) => {
    const report = await tx.competitiveMatchReport.findUnique({
      where: { id: reportId },
      select: { id: true, eventId: true, status: true },
    });

    if (!report) {
      throw new Error("Reporte no encontrado.");
    }
    if (report.status !== CompetitiveMatchReportStatus.PENDING) {
      throw new Error("Solo se pueden corregir reportes pendientes.");
    }
    const settings = report.eventId ? await getCompetitiveEventSettings(report.eventId, tx) : null;
    validateScoresForMode(players, settings?.scoringMode ?? CompetitiveReportScoringMode.INDIVIDUAL_0_100);

    await tx.competitiveMatchReportPlayer.deleteMany({ where: { reportId: report.id } });

    return tx.competitiveMatchReport.update({
      where: { id: report.id },
      data: {
        kind: input.kind,
        playedAt: input.playedAt,
        roundNumber: settings?.showReportRound === false ? null : input.roundNumber ?? null,
        notes: normalizeNullableString(input.notes),
        players: {
          create: players,
        },
      },
      include: { players: { orderBy: { participantOrder: "asc" } } },
    });
  });
}

export async function approveCompetitiveMatchReport(
  reportId: string,
  reviewerId: number | null,
  db: CompetitiveDb = prisma,
) {
  const match = await db.$transaction(async (tx) => {
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
    assertDistinctTwoPlayers(report.players);
    const settings = report.eventId ? await getCompetitiveEventSettings(report.eventId, tx) : null;
    validateScoresForMode(report.players, settings?.scoringMode ?? CompetitiveReportScoringMode.INDIVIDUAL_0_100);
    if (report.kind === CompetitiveMatchKind.LEAGUE) {
      const duplicate = await findExistingLeagueMatchForPlayers(report.eventId, report.players, tx);
      if (duplicate) {
        throw new Error(
          "Ya existe una partida de liga aprobada entre estos jugadores en este evento. Cambia el reporte a pachanga antes de aprobarlo.",
        );
      }
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

  if (db === prisma) {
    await notifyCompetitiveReportReviewed({ reportId, actorUserId: reviewerId, approved: true });
  }

  return match;
}

export async function rejectCompetitiveMatchReport(
  reportId: string,
  reviewerId: number | null,
  rejectionReason: string,
  db: CompetitiveDb = prisma,
) {
  const report = await db.$transaction(async (tx) => {
    const report = await tx.competitiveMatchReport.findUnique({
      where: { id: reportId },
      select: { id: true, status: true },
    });

    if (!report) {
      throw new Error("Reporte no encontrado.");
    }
    if (report.status !== CompetitiveMatchReportStatus.PENDING) {
      throw new Error("Solo se pueden rechazar reportes pendientes.");
    }

    return tx.competitiveMatchReport.update({
      where: { id: report.id },
      data: {
        status: CompetitiveMatchReportStatus.REJECTED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        rejectionReason: normalizeNullableString(rejectionReason),
      },
      include: { players: { orderBy: { participantOrder: "asc" } } },
    });
  });

  if (db === prisma) {
    await notifyCompetitiveReportReviewed({ reportId, actorUserId: reviewerId, approved: false });
  }

  return report;
}

export async function updateApprovedCompetitiveMatch(
  matchId: string,
  actorId: number | null,
  input: UpdateApprovedCompetitiveMatchInput,
  db: CompetitiveDb = prisma,
) {
  assertValidDate(input.playedAt);
  assertNonNegativeInteger(input.roundNumber, "roundNumber");
  const players = normalizePlayers(input.players);
  validateOutcomeConsistency(players);

  return db.$transaction(async (tx) => {
    const match = await tx.competitiveMatch.findUnique({
      where: { id: matchId },
      include: { players: { orderBy: { participantOrder: "asc" } } },
    });

    if (!match) {
      throw new Error("Partida no encontrada.");
    }
    if (match.status !== CompetitiveMatchStatus.APPROVED) {
      throw new Error("Solo se pueden corregir partidas aprobadas activas.");
    }
    if (input.kind === CompetitiveMatchKind.LEAGUE) {
      const duplicate = await findExistingLeagueMatchForPlayers(match.eventId, players, tx, match.id);
      if (duplicate) {
        throw new Error(
          "Ya existe otra partida de liga aprobada entre estos jugadores en este evento. Cambia la partida a pachanga o corrige la otra partida.",
        );
      }
    }

    const previousData = serializeMatchForAudit(match);
    await tx.competitiveMatchPlayer.deleteMany({ where: { matchId: match.id } });

    const updated = await tx.competitiveMatch.update({
      where: { id: match.id },
      data: {
        kind: input.kind,
        playedAt: input.playedAt,
        roundNumber: input.roundNumber ?? null,
        notes: normalizeNullableString(input.notes),
        players: { create: players },
      },
      include: { players: { orderBy: { participantOrder: "asc" } } },
    });

    await tx.competitiveMatchAuditLog.create({
      data: {
        matchId: match.id,
        actorId,
        action: CompetitiveMatchAuditAction.UPDATED,
        reason: normalizeNullableString(input.reason),
        previousData,
        nextData: serializeMatchForAudit(updated),
      },
    });

    return updated;
  });
}

export async function voidApprovedCompetitiveMatch(
  matchId: string,
  actorId: number | null,
  reason: string,
  db: CompetitiveDb = prisma,
) {
  return db.$transaction(async (tx) => {
    const match = await tx.competitiveMatch.findUnique({
      where: { id: matchId },
      include: { players: { orderBy: { participantOrder: "asc" } } },
    });

    if (!match) {
      throw new Error("Partida no encontrada.");
    }
    if (match.status !== CompetitiveMatchStatus.APPROVED) {
      throw new Error("Solo se pueden anular partidas aprobadas activas.");
    }

    const previousData = serializeMatchForAudit(match);
    const updated = await tx.competitiveMatch.update({
      where: { id: match.id },
      data: {
        status: CompetitiveMatchStatus.VOIDED,
        voidedById: actorId,
        voidedAt: new Date(),
        voidReason: normalizeNullableString(reason),
      },
      include: { players: { orderBy: { participantOrder: "asc" } } },
    });

    await tx.competitiveMatchAuditLog.create({
      data: {
        matchId: match.id,
        actorId,
        action: CompetitiveMatchAuditAction.VOIDED,
        reason: normalizeNullableString(reason),
        previousData,
        nextData: serializeMatchForAudit(updated),
      },
    });

    return updated;
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
      game: { select: { id: true, name: true, slug: true } },
      submittedBy: { select: { id: true, name: true, nick: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function listApprovedCompetitiveMatches(
  filters: { eventId?: string; gameId?: string; kind?: CompetitiveMatchKind } = {},
  db: CompetitiveDb = prisma,
): Promise<ApprovedCompetitiveMatchRow[]> {
  return db.competitiveMatch.findMany({
    where: {
      eventId: filters.eventId,
      gameId: filters.gameId,
      kind: filters.kind,
      status: CompetitiveMatchStatus.APPROVED,
    },
    include: {
      players: { orderBy: { participantOrder: "asc" } },
      event: { select: { id: true, title: true } },
      game: { select: { id: true, name: true, slug: true } },
      createdBy: { select: { id: true, name: true, nick: true, email: true } },
      validatedBy: { select: { id: true, name: true, nick: true, email: true } },
    },
    orderBy: [{ playedAt: "asc" }, { createdAt: "asc" }],
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
      status: CompetitiveMatchStatus.APPROVED,
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
  const formula = filters.eventId
    ? (await getCompetitiveEventSettings(filters.eventId, db)).paladinFormula
    : DEFAULT_PALADIN_FORMULA;
  const matches = await db.competitiveMatch.findMany({
    where: {
      eventId: filters.eventId,
      gameId: filters.gameId,
      status: CompetitiveMatchStatus.APPROVED,
    },
    include: { players: true },
    orderBy: [{ playedAt: "asc" }, { createdAt: "asc" }],
  });

  return calculatePaladinStandings(matches, { formula });
}

export function calculatePaladinStandings(
  matches: MatchWithPlayers[],
  options: { formula?: string } = {},
): PaladinStandingRow[] {
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

  const playedMedian = Math.floor(median(Array.from(rows.values()).map((row) => row.played).filter((played) => played > 0)));

  return Array.from(rows.values())
    .map((row) => {
      const { rivalRatings, ...standingRow } = row;
      const rivalRatingTotal = rivalRatings.reduce((total, rating) => total + rating, 0);
      const ifr =
        rivalRatings.length > 0
          ? roundMetric((rivalRatingTotal + ifrLambda * baseElo) / (rivalRatings.length + ifrLambda), 2)
          : 0;
      const pointsPerGame = row.played > 0 ? roundMetric(row.classificationPoints / row.played, 3) : 0;
      const winRate = row.played > 0 ? roundMetric(row.won / row.played, 3) : 0;
      const elo = roundMetric(row.elo, 2);
      const adjustedElo = roundMetric(row.elo + ifr - baseElo, 2);
      const classificationScore = evaluatePaladinFormula(options.formula ?? DEFAULT_PALADIN_FORMULA, {
        classificationPoints: row.classificationPoints,
        pointsPerGame,
        played: row.played,
        won: row.won,
        drawn: row.drawn,
        winRate,
        ifr,
        elo,
        adjustedElo,
        medianPlayed: playedMedian,
      });
      return {
        ...standingRow,
        classificationScore,
        pointsPerGame,
        winRate,
        ifr,
        elo,
        adjustedElo,
      };
    })
    .sort((a, b) => {
      if (b.classificationScore !== a.classificationScore) return b.classificationScore - a.classificationScore;
      if (b.classificationPoints !== a.classificationPoints) return b.classificationPoints - a.classificationPoints;
      if (b.pointsPerGame !== a.pointsPerGame) return b.pointsPerGame - a.pointsPerGame;
      if (b.elo !== a.elo) return b.elo - a.elo;
      return a.displayName.localeCompare(b.displayName, "es");
    })
    .map((row, index) => ({
      rank: index + 1,
      ...row,
    }));
}
