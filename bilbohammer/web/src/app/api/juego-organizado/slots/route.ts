export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { parseDate, parseIntOrNull, parseSlotStatus, parseString, errorJson } from "../shared";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const slots = await prisma.availabilitySlot.findMany({
    where: {
      ...(gameId ? { gameId } : {}),
      ...(from && to
        ? {
            start: { lt: new Date(to) },
            end: { gt: new Date(from) },
          }
        : {}),
    },
    orderBy: { start: "asc" },
    include: { match: true },
  });
  return NextResponse.json(slots);
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = parseIntOrNull((session?.user as any)?.id);
  if (!userId) return errorJson("Debes iniciar sesión para crear disponibilidad.", 401);

  let raw: any;
  try {
    raw = await request.json();
  } catch {
    return errorJson("Cuerpo de la solicitud inválido.", 400);
  }

  const start = parseDate(raw.start);
  const end = parseDate(raw.end);
  if (!start || !end) return errorJson("start y end son obligatorios.");
  if (start >= end) return errorJson("start debe ser anterior a end.");

  const slot = await prisma.availabilitySlot.create({
    data: {
      creatorId: userId,
      gameId: parseString(raw.gameId),
      start,
      end,
      status: parseSlotStatus(raw.status) ?? "OPEN",
      level: parseString(raw.level),
      format: parseString(raw.format),
      note: parseString(raw.note),
    },
  });

  return NextResponse.json(slot, { status: 201 });
}
