export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { MatchStatus, ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { userCanManageMatches } from "@/lib/roles";
import { parseDate, parseIntOrNull, parseMatchStatus, parseParticipantRole, parseParticipantStatus, parseString, errorJson } from "../../shared";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!userCanManageMatches(session)) {
    return errorJson("No tienes permisos para editar partidas.", 403);
  }
  const { id } = params;
  const existing = await prisma.match.findUnique({
    where: { id },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      reservations: {
        where: { status: { not: "CANCELLED" } },
        select: { id: true, tableId: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!existing) return errorJson("Partida no encontrada.", 404);

  let raw: any;
  try {
    raw = await request.json();
  } catch {
    return errorJson("Cuerpo de la solicitud inválido.", 400);
  }

  const data: any = {};
  if (raw.startsAt !== undefined) data.startsAt = parseDate(raw.startsAt);
  if (raw.endsAt !== undefined) data.endsAt = parseDate(raw.endsAt);
  if (raw.status !== undefined) {
    const status = parseMatchStatus(raw.status);
    if (!status) return errorJson("Estado de partida no válido.");
    data.status = status;
  }
  if (raw.format !== undefined) data.format = parseString(raw.format);
  if (raw.notes !== undefined) data.notes = parseString(raw.notes);
  if (raw.roundNumber !== undefined) data.roundNumber = parseIntOrNull(raw.roundNumber);
  if (raw.gameId !== undefined) data.gameId = parseString(raw.gameId);
  if (raw.eventId !== undefined) data.eventId = parseString(raw.eventId);
  if (raw.slotId !== undefined) data.slotId = parseString(raw.slotId);

  const nextStartsAt = data.startsAt instanceof Date ? data.startsAt : existing.startsAt;
  const nextEndsAt = data.endsAt instanceof Date ? data.endsAt : existing.endsAt;
  const nextStatus = (data.status as MatchStatus | undefined) ?? existing.status;

  if (!(nextStartsAt instanceof Date) || Number.isNaN(nextStartsAt.getTime()) || !(nextEndsAt instanceof Date) || Number.isNaN(nextEndsAt.getTime())) {
    return errorJson("Horario de partida invalido.");
  }
  if (nextStartsAt >= nextEndsAt) return errorJson("startsAt debe ser anterior a endsAt.");

  const reservation = existing.reservations[0] ?? null;
  if (reservation) {
    const [overlappingReservation, overlappingBlock] = await Promise.all([
      prisma.tableReservation.findFirst({
        where: {
          id: { not: reservation.id },
          tableId: reservation.tableId,
          status: { in: ACTIVE_RESERVATION_STATUSES },
          start: { lt: nextEndsAt },
          end: { gt: nextStartsAt },
        },
        select: { id: true },
      }),
      prisma.tableBlock.findFirst({
        where: {
          tableId: reservation.tableId,
          start: { lt: nextEndsAt },
          end: { gt: nextStartsAt },
        },
        select: { id: true },
      }),
    ]);

    if (overlappingBlock) return errorJson("La mesa reservada para esta partida esta bloqueada en el nuevo horario.", 409);
    if (overlappingReservation) {
      return errorJson("La mesa reservada para esta partida colisiona con otra reserva en el nuevo horario.", 409);
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const match = await tx.match.update({
      where: { id },
      data,
      include: { participants: true },
    });

    if (reservation) {
      await tx.tableReservation.update({
        where: { id: reservation.id },
        data: {
          start: nextStartsAt,
          end: nextEndsAt,
          status: toReservationStatus(nextStatus),
        },
      });
    }

    return match;
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!userCanManageMatches(session)) {
    return errorJson("No tienes permisos para eliminar partidas.", 403);
  }
  const { id } = params;
  await prisma.$transaction(async (tx) => {
    await tx.tableReservation.deleteMany({ where: { matchId: id } });
    await tx.match.delete({ where: { id } });
  });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  // small helper endpoint to upsert participants
  const session = await auth();
  if (!userCanManageMatches(session)) {
    return errorJson("No tienes permisos para editar participantes.", 403);
  }
  const { id } = params;
  let raw: any;
  try {
    raw = await request.json();
  } catch {
    return errorJson("Cuerpo de la solicitud inválido.", 400);
  }
  const participants = Array.isArray(raw.participants) ? raw.participants : [];

  await prisma.matchParticipant.deleteMany({ where: { matchId: id } });
  await prisma.matchParticipant.createMany({
    data: participants
      .map((p: any) => {
        const userId = parseIntOrNull(p.userId);
        if (!userId) return null;
        const role = parseParticipantRole(p.role) ?? "HOST";
        const status = parseParticipantStatus(p.status) ?? "PENDING";
        return { matchId: id, userId, role, status, note: parseString(p.note) };
      })
      .filter(Boolean) as any[],
    skipDuplicates: true,
  });

  const refreshed = await prisma.match.findUnique({
    where: { id },
    include: { participants: true },
  });
  return NextResponse.json(refreshed);
}

function toReservationStatus(status: MatchStatus): ReservationStatus {
  if (status === "IN_PLAY") return "IN_PLAY";
  if (status === "DONE") return "ENDED";
  if (status === "CANCELLED") return "CANCELLED";
  if (status === "CONFIRMED") return "CONFIRMED";
  return "PENDING";
}

const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = ["PENDING", "CONFIRMED", "IN_PLAY"];
