import {
  CompetitiveMatchKind,
  CompetitiveMatchOutcome,
  CompetitiveMatchStatus,
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  calculateLeagueStandings,
  calculatePaladinStandings,
} from "@/lib/competitive-matches";

type LeagueMatch = Parameters<typeof calculateLeagueStandings>[0][number];
type PlayerInput = {
  userId?: number | null;
  displayName: string;
  factionLabel?: string;
  outcome: CompetitiveMatchOutcome;
  score: number;
};

function competitiveMatch(
  id: string,
  playedAt: string,
  players: PlayerInput[],
  kind: CompetitiveMatchKind = CompetitiveMatchKind.LEAGUE,
): LeagueMatch {
  const date = new Date(playedAt);

  return {
    id,
    eventId: "event-1",
    gameId: "game-1",
    kind,
    status: CompetitiveMatchStatus.APPROVED,
    playedAt: date,
    roundNumber: null,
    sourceReportId: null,
    notes: null,
    createdById: null,
    validatedById: null,
    validatedAt: date,
    voidedById: null,
    voidedAt: null,
    voidReason: null,
    createdAt: date,
    updatedAt: date,
    players: players.map((player, index) => ({
      id: `${id}-player-${index + 1}`,
      matchId: id,
      userId: player.userId ?? null,
      participantOrder: index + 1,
      displayName: player.displayName,
      factionLabel: player.factionLabel ?? `Facción ${index + 1}`,
      outcome: player.outcome,
      score: player.score,
      createdAt: date,
      updatedAt: date,
    })),
  } as LeagueMatch;
}

describe("competitive standings", () => {
  it("calcula la tabla de liga con victoria, empate, derrota y mínimo de partidas", () => {
    const rows = calculateLeagueStandings(
      [
        competitiveMatch("match-1", "2026-06-01T12:00:00.000Z", [
          { userId: 1, displayName: "Ane", outcome: CompetitiveMatchOutcome.WIN, score: 20 },
          { userId: 2, displayName: "Beñat", outcome: CompetitiveMatchOutcome.LOSS, score: 0 },
        ]),
        competitiveMatch("match-2", "2026-06-02T12:00:00.000Z", [
          { userId: 2, displayName: "Beñat", outcome: CompetitiveMatchOutcome.WIN, score: 15 },
          { userId: 3, displayName: "Carmen", outcome: CompetitiveMatchOutcome.LOSS, score: 5 },
        ]),
      ],
      2,
    );

    expect(rows).toMatchObject([
      { displayName: "Ane", leaguePoints: 3, played: 1, won: 1, scoreTotal: 20, minimumGames: false },
      { displayName: "Beñat", leaguePoints: 3, played: 2, won: 1, lost: 1, scoreTotal: 15, minimumGames: true },
      { displayName: "Carmen", leaguePoints: 0, played: 1, lost: 1, scoreTotal: 5, minimumGames: false },
    ]);
  });

  it("deduplica Paladín por pareja y fecha antes de sumar puntos", () => {
    const rows = calculatePaladinStandings([
      competitiveMatch("match-1", "2026-06-01T12:00:00.000Z", [
        { userId: 1, displayName: "Ane", outcome: CompetitiveMatchOutcome.WIN, score: 20 },
        { userId: 2, displayName: "Beñat", outcome: CompetitiveMatchOutcome.LOSS, score: 0 },
      ]),
      competitiveMatch("match-duplicate", "2026-06-01T18:00:00.000Z", [
        { userId: 2, displayName: "Beñat", outcome: CompetitiveMatchOutcome.WIN, score: 19 },
        { userId: 1, displayName: "Ane", outcome: CompetitiveMatchOutcome.LOSS, score: 1 },
      ]),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.displayName === "Ane")).toMatchObject({
      classificationPoints: 20,
      played: 1,
      won: 1,
    });
    expect(rows.find((row) => row.displayName === "Beñat")).toMatchObject({
      classificationPoints: 0,
      played: 1,
      won: 0,
    });
  });

  it("incluye Liga y Pachanga aprobadas en Paladín", () => {
    const rows = calculatePaladinStandings([
      competitiveMatch(
        "league-match",
        "2026-06-01T12:00:00.000Z",
        [
          { userId: 1, displayName: "Ane", outcome: CompetitiveMatchOutcome.WIN, score: 20 },
          { userId: 2, displayName: "Beñat", outcome: CompetitiveMatchOutcome.LOSS, score: 0 },
        ],
        CompetitiveMatchKind.LEAGUE,
      ),
      competitiveMatch(
        "casual-match",
        "2026-06-02T12:00:00.000Z",
        [
          { userId: 1, displayName: "Ane", outcome: CompetitiveMatchOutcome.LOSS, score: 12 },
          { userId: 3, displayName: "Carmen", outcome: CompetitiveMatchOutcome.WIN, score: 18 },
        ],
        CompetitiveMatchKind.CASUAL,
      ),
    ]);

    expect(rows.find((row) => row.displayName === "Ane")).toMatchObject({
      classificationPoints: 32,
      played: 2,
      won: 1,
      ifr: 1500,
      elo: 1499.26,
      adjustedElo: 1499.26,
      classificationScore: expect.any(Number),
    });
    expect(rows.find((row) => row.displayName === "Carmen")).toMatchObject({
      classificationPoints: 18,
      played: 1,
      won: 1,
    });
  });

  it("mantiene empates de Paladín con PpP y Elo estable entre rivales iguales", () => {
    const rows = calculatePaladinStandings([
      competitiveMatch("match-1", "2026-06-01T12:00:00.000Z", [
        { userId: 1, displayName: "Ane", outcome: CompetitiveMatchOutcome.DRAW, score: 15 },
        { userId: 2, displayName: "Beñat", outcome: CompetitiveMatchOutcome.DRAW, score: 15 },
      ]),
    ]);

    expect(rows).toEqual([
      expect.objectContaining({
        displayName: "Ane",
        classificationPoints: 15,
        pointsPerGame: 15,
        drawn: 1,
        elo: 1500,
        adjustedElo: 1500,
      }),
      expect.objectContaining({
        displayName: "Beñat",
        classificationPoints: 15,
        pointsPerGame: 15,
        drawn: 1,
        elo: 1500,
        adjustedElo: 1500,
      }),
    ]);
  });

  it("recalcula y reordena Paladín con una fórmula personalizada", () => {
    const rows = calculatePaladinStandings(
      [
        competitiveMatch("match-1", "2026-06-01T12:00:00.000Z", [
          { userId: 1, displayName: "Ane", outcome: CompetitiveMatchOutcome.WIN, score: 20 },
          { userId: 2, displayName: "Beñat", outcome: CompetitiveMatchOutcome.LOSS, score: 0 },
        ]),
        competitiveMatch("match-2", "2026-06-02T12:00:00.000Z", [
          { userId: 2, displayName: "Beñat", outcome: CompetitiveMatchOutcome.WIN, score: 10 },
          { userId: 3, displayName: "Carmen", outcome: CompetitiveMatchOutcome.LOSS, score: 0 },
        ]),
      ],
      { formula: "played * 1000 + classificationPoints" },
    );

    expect(rows[0]).toMatchObject({
      displayName: "Beñat",
      classificationScore: 2010,
      played: 2,
    });
  });
});
