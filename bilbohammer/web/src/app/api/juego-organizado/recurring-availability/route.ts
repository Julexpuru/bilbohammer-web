export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { errorJson, parseIntOrNull, parseString, requireOrganizedPlayAccess } from "../shared";

function parseMinutes(value: unknown) {
  const parsed = parseIntOrNull(value);
  if (parsed == null || parsed < 0 || parsed > 24 * 60) return null;
  return parsed;
}

export async function GET() {
  const session = await auth();
  const access = await requireOrganizedPlayAccess(session, {
    unauthenticatedMessage: "Debes iniciar sesión para consultar tu horario habitual.",
    forbiddenMessage: "Necesitas ser socio o estar inscrito en una liga activa publicada para consultar tu horario habitual.",
  });
  if (access.response) return access.response;
  const userId = access.userId;

  const rows = await prisma.recurringAvailability.findMany({
    where: { userId },
    orderBy: [{ weekday: "asc" }, { startMinutes: "asc" }],
  });

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const session = await auth();
  const access = await requireOrganizedPlayAccess(session, {
    unauthenticatedMessage: "Debes iniciar sesión para guardar tu horario habitual.",
    forbiddenMessage: "Necesitas ser socio o estar inscrito en una liga activa publicada para guardar tu horario habitual.",
  });
  if (access.response) return access.response;
  const userId = access.userId;

  let raw: any;
  try {
    raw = await request.json();
  } catch {
    return errorJson("Cuerpo de la solicitud inválido.", 400);
  }

  const weekday = parseIntOrNull(raw.weekday);
  const startMinutes = parseMinutes(raw.startMinutes);
  const endMinutes = parseMinutes(raw.endMinutes);
  if (weekday == null || weekday < 0 || weekday > 6) return errorJson("weekday debe estar entre 0 y 6.");
  if (startMinutes == null || endMinutes == null) return errorJson("Horario inválido.");
  if (startMinutes >= endMinutes) return errorJson("La hora de inicio debe ser anterior a la de fin.");

  const preferredGames = Array.isArray(raw.preferredGames)
    ? raw.preferredGames.map((value: unknown) => parseString(value)).filter(Boolean)
    : [];

  const row = await prisma.recurringAvailability.create({
    data: {
      userId,
      weekday,
      startMinutes,
      endMinutes,
      preferredGames: preferredGames as string[],
      preferencesNote: parseString(raw.preferencesNote),
    },
  });

  return NextResponse.json(row, { status: 201 });
}
