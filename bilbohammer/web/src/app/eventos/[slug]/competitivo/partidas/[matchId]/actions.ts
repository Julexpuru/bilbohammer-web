"use server";

import { CompetitiveMatchKind, CompetitiveMatchOutcome, EventRegistrationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  updateApprovedCompetitiveMatch,
  voidApprovedCompetitiveMatch,
} from "@/lib/competitive-matches";
import { resolveSessionUserId } from "@/lib/event-registrations";
import { buildEventSlug } from "@/lib/events/slug";
import { prisma } from "@/lib/prisma";
import { userCanEditEvent } from "@/lib/roles";

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

async function loadActionContext(eventId: string, matchId: string) {
  const session = await auth();
  const actorId = resolveSessionUserId(session);
  if (!(await userCanEditEvent(session, eventId))) {
    throw new Error("No autorizado.");
  }

  const match = await prisma.competitiveMatch.findFirst({
    where: { id: matchId, eventId },
    include: { event: { select: { id: true, title: true } } },
  });

  if (!match || !match.event) {
    throw new Error("Partida no encontrada.");
  }

  const path = `/eventos/${buildEventSlug(match.event.id, match.event.title)}/competitivo/partidas/${match.id}`;
  return { actorId, match, path };
}

export async function updateApprovedCompetitiveMatchAction(formData: FormData) {
  const eventId = readString(formData, "eventId");
  const matchId = readString(formData, "matchId");
  let path = "/eventos";
  const params = new URLSearchParams();

  try {
    const context = await loadActionContext(eventId, matchId);
    path = context.path;

    const playedAt = parsePlayedAt(readString(formData, "playedAt"));
    if (!playedAt) {
      throw new Error("Indica una fecha de partida válida.");
    }

    const firstRegistrationId = readString(formData, "firstRegistrationId");
    const secondRegistrationId = readString(formData, "secondRegistrationId");
    if (!firstRegistrationId || !secondRegistrationId || firstRegistrationId === secondRegistrationId) {
      throw new Error("Selecciona dos jugadores distintos.");
    }

    const registrations = await prisma.eventRegistration.findMany({
      where: {
        eventId,
        id: { in: [firstRegistrationId, secondRegistrationId] },
        status: { in: [EventRegistrationStatus.INSCRITO, EventRegistrationStatus.PAGADO] },
      },
      select: { id: true, userId: true, playerName: true },
    });
    const firstRegistration = registrations.find((registration) => registration.id === firstRegistrationId);
    const secondRegistration = registrations.find((registration) => registration.id === secondRegistrationId);
    if (!firstRegistration || !secondRegistration) {
      throw new Error("Los jugadores seleccionados deben estar inscritos en el evento.");
    }

    const firstScore = readInteger(formData, "firstScore");
    const secondScore = readInteger(formData, "secondScore");
    if (firstScore == null || secondScore == null) {
      throw new Error("Los puntos deben ser enteros no negativos.");
    }

    const firstFaction = readString(formData, "firstFaction");
    const secondFaction = readString(formData, "secondFaction");
    if (!firstFaction || !secondFaction) {
      throw new Error("Las facciones de ambos jugadores son obligatorias.");
    }

    const firstOutcome = parseOutcome(readString(formData, "firstOutcome"));

    await updateApprovedCompetitiveMatch(matchId, context.actorId, {
      kind: parseKind(readString(formData, "kind")),
      playedAt,
      roundNumber: readInteger(formData, "roundNumber"),
      notes: readString(formData, "notes").slice(0, 1000),
      reason: readString(formData, "reason").slice(0, 1000),
      players: [
        {
          userId: firstRegistration.userId,
          displayName: firstRegistration.playerName,
          factionLabel: firstFaction,
          outcome: firstOutcome,
          score: firstScore,
        },
        {
          userId: secondRegistration.userId,
          displayName: secondRegistration.playerName,
          factionLabel: secondFaction,
          outcome: opposingOutcome(firstOutcome),
          score: secondScore,
        },
      ],
    });

    revalidatePath(path);
    revalidatePath(`/eventos/${buildEventSlug(context.match.event!.id, context.match.event!.title)}/competitivo`);
    params.set("feedback", "updated");
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo corregir la partida.";
    params.set("error", message);
  }

  redirect(`${path}?${params.toString()}`);
}

export async function voidApprovedCompetitiveMatchAction(formData: FormData) {
  const eventId = readString(formData, "eventId");
  const matchId = readString(formData, "matchId");
  let path = "/eventos";
  const params = new URLSearchParams();

  try {
    const context = await loadActionContext(eventId, matchId);
    path = context.path;
    await voidApprovedCompetitiveMatch(matchId, context.actorId, readString(formData, "reason").slice(0, 1000));

    revalidatePath(path);
    revalidatePath(`/eventos/${buildEventSlug(context.match.event!.id, context.match.event!.title)}/competitivo`);
    params.set("feedback", "voided");
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo anular la partida.";
    params.set("error", message);
  }

  redirect(`${path}?${params.toString()}`);
}
