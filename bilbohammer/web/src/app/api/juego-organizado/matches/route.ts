export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { userCanManageMatches } from "@/lib/roles";
import { parseDate, parseIntOrNull, parseMatchStatus, parseParticipantRole, parseParticipantStatus, parseString, errorJson } from "../shared";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const gameId = searchParams.get("gameId");
  const userId = parseIntOrNull(searchParams.get("userId"));
  const status = searchParams.get("status");

  const matches = await prisma.match.findMany({
    where: {
      ...(eventId ? { eventId } : {}),
      ...(gameId ? { gameId } : {}),
      ...(userId ? { participants: { some: { userId } } } : {}),
      ...(status ? { status: status as any } : {}),
    },
    orderBy: { startsAt: "asc" },
    include: {
      participants: { include: { user: { select: { id: true, name: true, nick: true } } } },
      reservations: { include: { table: true } },
      event: { select: { id: true, title: true } },
    },
  });
  return NextResponse.json(matches);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!userCanManageMatches(session)) {
    return errorJson("No tienes permisos para crear partidas.", 403);
  }

  let raw: any;
  try {
    raw = await request.json();
  } catch {
    return errorJson("Cuerpo de la solicitud inválido.", 400);
  }

  const startsAt = parseDate(raw.startsAt);
  const endsAt = parseDate(raw.endsAt);
  if (!startsAt || !endsAt) return errorJson("startsAt y endsAt son obligatorios.");
  if (startsAt >= endsAt) return errorJson("startsAt debe ser anterior a endsAt.");

  const participants = Array.isArray(raw.participants) ? raw.participants : [];

  const match = await prisma.match.create({
    data: {
      gameId: parseString(raw.gameId),
      eventId: parseString(raw.eventId),
      slotId: parseString(raw.slotId),
      startsAt,
      endsAt,
      status: parseMatchStatus(raw.status) ?? "PENDING",
      format: parseString(raw.format),
      notes: parseString(raw.notes),
      roundNumber: parseIntOrNull(raw.roundNumber),
      createdById: parseIntOrNull((session?.user as any)?.id),
      participants: {
        create: participants
          .map((p: any) => {
            const userId = parseIntOrNull(p.userId);
            if (!userId) return null;
            const role = parseParticipantRole(p.role) ?? "HOST";
            const status = parseParticipantStatus(p.status) ?? "PENDING";
            return { userId, role, status, note: parseString(p.note) };
          })
          .filter(Boolean) as any[],
      },
    },
    include: { participants: true },
  });

  return NextResponse.json(match, { status: 201 });
}
