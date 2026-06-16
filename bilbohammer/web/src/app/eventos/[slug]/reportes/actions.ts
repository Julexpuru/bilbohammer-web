"use server";

import { CompetitiveMatchReportStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  approveCompetitiveMatchReport,
  rejectCompetitiveMatchReport,
} from "@/lib/competitive-matches";
import { resolveSessionUserId } from "@/lib/event-registrations";
import { buildEventSlug } from "@/lib/events/slug";
import { prisma } from "@/lib/prisma";
import { userCanEditEvent } from "@/lib/roles";

type ReviewContext = {
  event: {
    id: string;
    title: string;
  };
  path: string;
};

function buildReviewPath(event: { id: string; title: string }) {
  return `/eventos/${buildEventSlug(event.id, event.title)}/reportes`;
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
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

export async function approveCompetitiveReportAction(formData: FormData) {
  const eventId = readString(formData, "eventId");
  const reportId = readString(formData, "reportId");

  let path = "/eventos";
  const params = new URLSearchParams();

  try {
    const session = await auth();
    const reviewerId = resolveSessionUserId(session);
    const context = await loadReviewContext(eventId, reportId);
    path = context.path;

    await approveCompetitiveMatchReport(reportId, reviewerId);
    revalidatePath(path);
    params.set("feedback", "approved");
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo aprobar el reporte.";
    params.set("error", message);
  }

  redirect(params.size > 0 ? `${path}?${params.toString()}` : path);
}

export async function rejectCompetitiveReportAction(formData: FormData) {
  const eventId = readString(formData, "eventId");
  const reportId = readString(formData, "reportId");
  const rejectionReason = readString(formData, "rejectionReason").slice(0, 500);

  let path = "/eventos";
  const params = new URLSearchParams();

  try {
    const session = await auth();
    const reviewerId = resolveSessionUserId(session);
    const context = await loadReviewContext(eventId, reportId);
    path = context.path;

    await rejectCompetitiveMatchReport(reportId, reviewerId, rejectionReason);
    revalidatePath(path);
    params.set("feedback", "rejected");
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo rechazar el reporte.";
    params.set("error", message);
  }

  redirect(params.size > 0 ? `${path}?${params.toString()}` : path);
}
