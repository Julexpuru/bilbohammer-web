"use server";

import {
  CompetitiveMatchKind,
  CompetitiveMatchOutcome,
  CompetitiveMatchReportStatus,
  CompetitiveReportScoringMode,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  approveCompetitiveMatchReport,
  rejectCompetitiveMatchReport,
  updateCompetitiveEventReportOptions,
  updatePendingCompetitiveMatchReport,
} from "@/lib/competitive-matches";
import { resolveSessionUserId } from "@/lib/event-registrations";
import { buildEventSlug } from "@/lib/events/slug";
import { prisma } from "@/lib/prisma";
import { userCanEditEvent } from "@/lib/roles";

import type { ReportActionState } from "./report-action-state";

type ReviewContext = {
  event: {
    id: string;
    title: string;
  };
  path: string;
};

function successState(): ReportActionState {
  return { ok: true, error: null };
}

function errorState(error: unknown, fallback: string): ReportActionState {
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

function buildReviewPath(event: { id: string; title: string }) {
  return `/eventos/${buildEventSlug(event.id, event.title)}/reportes`;
}

function readReviewPath(formData: FormData, fallback: string) {
  const eventSlug = readString(formData, "eventSlug");
  if (eventSlug && !eventSlug.includes("/") && !eventSlug.includes("?") && !eventSlug.includes("#")) {
    return `/eventos/${eventSlug}/reportes`;
  }
  return fallback;
}

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

function parseScoringMode(value: string) {
  return value === CompetitiveReportScoringMode.SUM_20
    ? CompetitiveReportScoringMode.SUM_20
    : CompetitiveReportScoringMode.INDIVIDUAL_0_100;
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

async function loadReviewContext(eventId: string, reportId: string): Promise<ReviewContext> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true },
  });

  if (!event) {
    throw new Error("Evento no encontrado.");
  }

  const session = await auth();
  const canEdit = await userCanEditEvent(session, event.id);
  if (!canEdit) {
    throw new Error("No autorizado.");
  }

  const report = await prisma.competitiveMatchReport.findUnique({
    where: { id: reportId },
    select: { id: true, eventId: true, status: true },
  });

  if (!report || report.eventId !== event.id) {
    throw new Error("Reporte no encontrado.");
  }
  if (report.status !== CompetitiveMatchReportStatus.PENDING) {
    throw new Error("Solo se pueden revisar reportes pendientes.");
  }

  return {
    event,
    path: buildReviewPath(event),
  };
}

export async function approveCompetitiveReportAction(
  _previousState: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const eventId = readString(formData, "eventId");
  const reportId = readString(formData, "reportId");

  let path = "/eventos";

  try {
    const session = await auth();
    const reviewerId = resolveSessionUserId(session);
    const context = await loadReviewContext(eventId, reportId);
    path = readReviewPath(formData, context.path);

    await approveCompetitiveMatchReport(reportId, reviewerId);
    revalidatePath(path);
    return successState();
  } catch (error) {
    return errorState(error, "No se pudo aprobar el reporte.");
  }
}

export async function updateCompetitiveReportAction(
  _previousState: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const eventId = readString(formData, "eventId");
  const reportId = readString(formData, "reportId");

  let path = "/eventos";

  try {
    const context = await loadReviewContext(eventId, reportId);
    path = readReviewPath(formData, context.path);

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
      where: { eventId, id: { in: [firstRegistrationId, secondRegistrationId] } },
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

    await updatePendingCompetitiveMatchReport(reportId, {
      kind: parseKind(readString(formData, "kind")),
      playedAt,
      roundNumber: readInteger(formData, "roundNumber"),
      notes: readString(formData, "notes").slice(0, 1000),
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
    return successState();
  } catch (error) {
    return errorState(error, "No se pudo corregir el reporte.");
  }
}

export async function rejectCompetitiveReportAction(
  _previousState: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const eventId = readString(formData, "eventId");
  const reportId = readString(formData, "reportId");
  const rejectionReason = readString(formData, "rejectionReason").slice(0, 500);

  let path = "/eventos";

  try {
    const session = await auth();
    const reviewerId = resolveSessionUserId(session);
    const context = await loadReviewContext(eventId, reportId);
    path = readReviewPath(formData, context.path);

    await rejectCompetitiveMatchReport(reportId, reviewerId, rejectionReason);
    revalidatePath(path);
    return successState();
  } catch (error) {
    return errorState(error, "No se pudo rechazar el reporte.");
  }
}

export async function updateCompetitiveReportOptionsAction(formData: FormData) {
  const eventId = readString(formData, "eventId");
  const eventSlug = readString(formData, "eventSlug");
  const showReportRound = formData.get("showReportRound") === "on";
  const scoringMode = parseScoringMode(readString(formData, "scoringMode"));

  const session = await auth();
  if (!(await userCanEditEvent(session, eventId))) {
    throw new Error("No autorizado.");
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true },
  });
  if (!event) {
    throw new Error("Evento no encontrado.");
  }

  await updateCompetitiveEventReportOptions(event.id, resolveSessionUserId(session), { showReportRound, scoringMode });
  const slug = eventSlug || buildEventSlug(event.id, event.title);
  revalidatePath(`/eventos/${slug}/reportes`);
  revalidatePath(`/eventos/${slug}/reportes/opciones`);
}
