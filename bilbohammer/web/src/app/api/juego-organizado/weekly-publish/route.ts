export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { errorJson, parseDate, parseIntOrNull, parseString } from "../shared";
import { serializeSlotMetadata } from "@/lib/organized-slot-metadata";
import { notifyCompatibleSlotCreated } from "@/lib/notifications";

function mondayOf(date: Date) {
  const copy = new Date(date);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function withMinutes(day: Date, minutes: number) {
  const result = new Date(day);
  result.setMinutes(minutes, 0, 0);
  return result;
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = parseIntOrNull((session?.user as any)?.id);
  if (!userId) return errorJson("Debes iniciar sesion para publicar disponibilidad.", 401);

  let raw: any;
  try {
    raw = await request.json();
  } catch {
    return errorJson("Cuerpo de la solicitud invalido.", 400);
  }

  const selectedGames = Array.isArray(raw.gameIds)
    ? (raw.gameIds.map((value: unknown) => parseString(value)).filter(Boolean) as string[])
    : [];
  const openGames = Array.isArray(raw.openGameIds)
    ? (raw.openGameIds.map((value: unknown) => parseString(value)).filter(Boolean) as string[])
    : [];
  const weekStart = mondayOf(parseDate(raw.weekStart) ?? new Date());
  const note = parseString(raw.note);

  if (selectedGames.length === 0 && openGames.length === 0) {
    return errorJson("Selecciona al menos un juego.");
  }

  const recurring = await prisma.recurringAvailability.findMany({
    where: { userId },
    orderBy: [{ weekday: "asc" }, { startMinutes: "asc" }],
  });

  if (recurring.length === 0) return errorJson("Guarda primero al menos un horario habitual.");

  const slots = recurring.flatMap((row) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + row.weekday);
    const start = withMinutes(day, row.startMinutes);
    const end = withMinutes(day, row.endMinutes);
    const base = {
      creatorId: userId,
      start,
      end,
      status: "OPEN" as const,
      level: serializeSlotMetadata({
        wantedGameIds: selectedGames,
        openGameIds: openGames,
        source: "weekly",
      }),
      format: parseString(raw.format),
      gameId: null,
      note,
    };
    return [base];
  });

  const createdSlots = await prisma.$transaction(
    slots.map((slot) =>
      prisma.availabilitySlot.create({
        data: slot,
        select: { id: true },
      })
    )
  );

  for (const slot of createdSlots) {
    try {
      await notifyCompatibleSlotCreated(slot.id);
    } catch (error) {
      console.error("[weekly-compatible-slot-notification]", error);
    }
  }

  return NextResponse.json({ created: createdSlots.length }, { status: 201 });
}
