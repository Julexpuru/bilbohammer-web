export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { ReservationStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isZoneTableName } from "@/lib/organized-tables";
import { userCanManageReservations } from "@/lib/roles";
import { errorJson, parseDate, parseReservationStatus, parseString } from "../../shared";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!userCanManageReservations(session)) {
    return errorJson("No tienes permisos para editar reservas.", 403);
  }

  const { id } = params;
  const existing = await prisma.tableReservation.findUnique({
    where: { id },
    select: {
      id: true,
      tableId: true,
      start: true,
      end: true,
      matchId: true,
    },
  });
  if (!existing) return errorJson("Reserva no encontrada.", 404);

  let raw: any;
  try {
    raw = await request.json();
  } catch {
    return errorJson("Cuerpo de la solicitud inválido.", 400);
  }

  const data: any = {};
  if (raw.tableId !== undefined) data.tableId = parseString(raw.tableId);
  if (raw.start !== undefined) data.start = parseDate(raw.start);
  if (raw.end !== undefined) data.end = parseDate(raw.end);
  if (raw.status !== undefined) {
    const status = parseReservationStatus(raw.status);
    if (!status) return errorJson("Estado de reserva no valido.");
    data.status = status;
  }
  if (raw.notes !== undefined) data.notes = parseString(raw.notes);
  if (raw.matchId !== undefined) data.matchId = parseString(raw.matchId);

  const nextTableId = typeof data.tableId === "string" ? data.tableId : existing.tableId;
  const nextStart = data.start instanceof Date ? data.start : existing.start;
  const nextEnd = data.end instanceof Date ? data.end : existing.end;
  const nextMatchId = raw.matchId !== undefined ? (data.matchId ?? null) : existing.matchId;

  if (!nextTableId) return errorJson("La reserva debe estar asociada a una mesa.");
  if (!(nextStart instanceof Date) || Number.isNaN(nextStart.getTime()) || !(nextEnd instanceof Date) || Number.isNaN(nextEnd.getTime())) {
    return errorJson("Horario inválido.");
  }
  if (nextStart >= nextEnd) return errorJson("start debe ser anterior a end.");

  if (raw.tableId !== undefined) {
    const table = nextTableId
      ? await prisma.clubTable.findUnique({
          where: { id: nextTableId },
          select: { id: true, name: true, status: true, isActive: true },
        })
      : null;
    if (!table || !table.isActive) return errorJson("Mesa no encontrada.", 404);
    if (isZoneTableName(table.name)) return errorJson("No puedes reservar una zona como si fuera una mesa.", 400);
    if (table.status === "BLOCKED") return errorJson("La mesa está bloqueada y no puede reservarse.", 400);
  }

  if (nextMatchId) {
    const match = await prisma.match.findUnique({
      where: { id: nextMatchId },
      select: { id: true },
    });
    if (!match) return errorJson("La partida asociada no existe.", 404);

    const duplicateMatch = await prisma.tableReservation.findFirst({
      where: {
        id: { not: id },
        matchId: nextMatchId,
      },
      select: { id: true },
    });
    if (duplicateMatch) {
      return errorJson("La partida ya tiene una mesa reservada.", 409);
    }
  }

  const conflict = await findReservationConflict({
    tableId: nextTableId,
    start: nextStart,
    end: nextEnd,
    excludeReservationId: id,
  });
  if (conflict) return errorJson(conflict, 409);

  const updated = await prisma.tableReservation.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!userCanManageReservations(session)) {
    return errorJson("No tienes permisos para eliminar reservas.", 403);
  }

  const { id } = params;
  await prisma.tableReservation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

async function findReservationConflict({
  tableId,
  start,
  end,
  excludeReservationId,
}: {
  tableId: string;
  start: Date;
  end: Date;
  excludeReservationId: string;
}) {
  const [overlappingReservation, overlappingBlock] = await Promise.all([
    prisma.tableReservation.findFirst({
      where: {
        id: { not: excludeReservationId },
        tableId,
        status: { in: ACTIVE_RESERVATION_STATUSES },
        start: { lt: end },
        end: { gt: start },
      },
      select: { id: true },
    }),
    prisma.tableBlock.findFirst({
      where: {
        tableId,
        start: { lt: end },
        end: { gt: start },
      },
      select: { id: true },
    }),
  ]);

  if (overlappingBlock) return "La mesa está bloqueada en ese horario.";
  if (overlappingReservation) return "La mesa ya está reservada en ese horario.";
  return null;
}

const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = ["PENDING", "CONFIRMED", "IN_PLAY"];
