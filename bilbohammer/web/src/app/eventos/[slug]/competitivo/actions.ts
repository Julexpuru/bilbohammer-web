"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { updateCompetitiveEventPaladinFormula } from "@/lib/competitive-matches";
import { resolveSessionUserId } from "@/lib/event-registrations";
import { prisma } from "@/lib/prisma";
import { userCanEditEvent } from "@/lib/roles";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function buildCompetitivePath(eventSlug: string) {
  return `/eventos/${eventSlug}/competitivo?hoja=paladin&calculo=paladin`;
}

export async function updatePaladinFormulaAction(formData: FormData) {
  const eventId = readString(formData, "eventId");
  const eventSlug = readString(formData, "eventSlug");
  const formula = readString(formData, "paladinFormula");
  let path = eventSlug ? buildCompetitivePath(eventSlug) : "/eventos";
  const params = new URLSearchParams({ hoja: "paladin", calculo: "paladin" });

  try {
    const session = await auth();
    if (!(await userCanEditEvent(session, eventId))) {
      throw new Error("No autorizado.");
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) {
      throw new Error("Evento no encontrado.");
    }

    await updateCompetitiveEventPaladinFormula(event.id, resolveSessionUserId(session), formula);
    if (eventSlug) {
      revalidatePath(`/eventos/${eventSlug}/competitivo`);
    }
    params.set("feedback", "paladin-formula-updated");
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar la fórmula.";
    params.set("error", message);
  }

  if (eventSlug) {
    path = `/eventos/${eventSlug}/competitivo?${params.toString()}`;
  }
  redirect(path);
}
