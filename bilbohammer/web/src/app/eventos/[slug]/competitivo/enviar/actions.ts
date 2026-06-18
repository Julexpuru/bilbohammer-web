"use server";

import {
  CompetitiveMatchKind,
  CompetitiveMatchOutcome,
  CompetitiveMatchReportChannel,
  EventRegistrationStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  createCompetitiveMatchReport,
  findExistingLeagueMatchForPlayers,
} from "@/lib/competitive-matches";
import { resolveSessionUserId } from "@/lib/event-registrations";
import { buildEventSlug } from "@/lib/events/slug";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readInteger(formData: FormData, key: string) {
  const raw = readString(formData, key);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function parseKind(value: string) {
  return value === CompetitiveMatchKind.CASUAL ? CompetitiveMatchKind.CASUAL : CompetitiveMatchKind.LEAGUE;
}

function parseOutcome(value: string) {
  if (value === CompetitiveMatchOutcome.DRAW) return CompetitiveMatchOutcome.DRAW;
  if (value === CompetitiveMatchOutcome.LOSS) return CompetitiveMatchOutcome.LOSS;
  return CompetitiveMatchOutcome.WIN;
}

function opposingOutcome(outcome: CompetitiveMatchOutcome) {
  if (outcome === CompetitiveMatchOutcome.WIN) return CompetitiveMatchOutcome.LOSS;
  if (outcome === CompetitiveMatchOutcome.LOSS) return CompetitiveMatchOutcome.WIN;
  return CompetitiveMatchOutcome.DRAW;
}

function parsePlayedAt(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildRedirectPath(event: { id: string; title: string }) {
  return `/eventos/${buildEventSlug(event.id, event.title)}/competitivo/enviar`;
}

export async function submitCompetitiveReportAction(formData: FormData) {
  const eventId = readString(formData, "eventId");
  let path = "/eventos";
  const params = new URLSearchParams();

  try {
    const session = await auth();
    const userId = resolveSessionUserId(session);
    if (userId == null) {
      throw new Error("Necesitas iniciar sesión para enviar un resultado.");
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        gameId: true,
        registrations: {
          where: {
            status: { in: [EventRegistrationStatus.INSCRITO, EventRegistrationStatus.PAGADO] },
          },
          select: {
            id: true,
            userId: true,
            playerName: true,
            factionLabel: true,
            status: true,
          },
        },
      },
    });

    if (!event) {
      throw new Error("Evento no encontrado.");
    }
    path = buildRedirectPath(event);

    const ownRegistration = event.registrations.find((registration) => registration.userId === userId);
    if (!ownRegistration) {
      throw new Error("Debes estar inscrito en este evento para enviar resultados.");
    }

    const opponentRegistrationId = readString(formData, "opponentRegistrationId");
    const opponentRegistration = event.registrations.find(
      (registration) => registration.id === opponentRegistrationId,
    );
    if (!opponentRegistration || opponentRegistration.id === ownRegistration.id) {
      throw new Error("Selecciona un rival válido inscrito en el evento.");
    }

    const playedAt = parsePlayedAt(readString(formData, "playedAt"));
    if (!playedAt) {
      throw new Error("Indica una fecha de partida válida.");
    }

    const ownScore = readInteger(formData, "ownScore");
    const opponentScore = readInteger(formData, "opponentScore");
    if (ownScore == null || opponentScore == null) {
      throw new Error("Los puntos deben ser enteros no negativos.");
    }

    const ownFaction = readString(formData, "ownFaction");
    const opponentFaction = readString(formData, "opponentFaction");
    if (!ownFaction || !opponentFaction) {
      throw new Error("Las facciones de ambos jugadores son obligatorias.");
    }

    const roundNumber = readInteger(formData, "roundNumber");
    const kind = parseKind(readString(formData, "kind"));
    const outcome = parseOutcome(readString(formData, "outcome"));
    const players = [
      {
        userId: ownRegistration.userId,
        displayName: ownRegistration.playerName,
        factionLabel: ownFaction,
        outcome,
        score: ownScore,
      },
      {
        userId: opponentRegistration.userId,
        displayName: opponentRegistration.playerName,
        factionLabel: opponentFaction,
        outcome: opposingOutcome(outcome),
        score: opponentScore,
      },
    ];

    if (kind === CompetitiveMatchKind.LEAGUE) {
      const duplicate = await findExistingLeagueMatchForPlayers(event.id, players);
      if (duplicate) {
        throw new Error(
          "Ya existe una partida de liga aprobada entre estos jugadores en este evento. Envía el resultado como pachanga si procede.",
        );
      }
    }

    await createCompetitiveMatchReport({
      eventId: event.id,
      gameId: event.gameId,
      kind,
      playedAt,
      roundNumber,
      channel: CompetitiveMatchReportChannel.WEB,
      submittedById: userId,
      notes: readString(formData, "notes").slice(0, 1000),
      players,
    });

    revalidatePath(`/eventos/${buildEventSlug(event.id, event.title)}/reportes`);
    params.set("feedback", "submitted");
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo enviar el resultado.";
    params.set("error", message);
  }

  redirect(`${path}?${params.toString()}`);
}
