export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { MatchStatus, ReservationStatus } from "@prisma/client";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { compareTableNames } from "@/lib/organized-table-naming";
import { getEffectiveMatchStatus } from "@/lib/organized-slot-status";
import { isZoneTableName } from "@/lib/organized-tables";
import { userCanManageMatches, userCanManageReservations } from "@/lib/roles";
import { errorJson, parseString, requireOrganizedPlayAccess } from "../../../shared";

const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = ["PENDING", "CONFIRMED", "IN_PLAY"];

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const access = await requireOrganizedPlayAccess(session);
  if (access.response) return access.response;
  const userId = access.userId;

  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: {
      participants: { select: { userId: true } },
      reservations: {
        where: { status: { not: "CANCELLED" } },
        include: { table: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!match) return errorJson("Partida no encontrada.", 404);
  if (!canManageMatchTable(session, userId, match.participants)) {
    return errorJson("No puedes gestionar la mesa de esta partida.", 403);
  }

  const tables = await prisma.clubTable.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      status: true,
      game: { select: { name: true } },
    },
  });

  const visibleTables = tables
    .filter((table) => !isZoneTableName(table.name))
    .sort((a, b) => compareTableNames(a.name, b.name));

  const currentReservation = match.reservations[0] ?? null;
  const tableIds = visibleTables.map((table) => table.id);

  const [overlappingReservations, overlappingBlocks] = await Promise.all([
    prisma.tableReservation.findMany({
      where: {
        tableId: { in: tableIds },
        status: { in: ACTIVE_RESERVATION_STATUSES },
        start: { lt: match.endsAt },
        end: { gt: match.startsAt },
        ...(currentReservation ? { id: { not: currentReservation.id } } : {}),
      },
      select: { tableId: true },
    }),
    prisma.tableBlock.findMany({
      where: {
        tableId: { in: tableIds },
        start: { lt: match.endsAt },
        end: { gt: match.startsAt },
      },
      select: { tableId: true },
    }),
  ]);

  const reservedTableIds = new Set(overlappingReservations.map((reservation) => reservation.tableId));
  const blockedTableIds = new Set(overlappingBlocks.map((block) => block.tableId));

  return NextResponse.json({
    reservation:
      currentReservation && currentReservation.table
        ? {
            id: currentReservation.id,
            tableId: currentReservation.table.id,
            tableName: currentReservation.table.name,
          }
        : null,
    tables: visibleTables.map((table) => {
      let availability: "available" | "current" | "reserved" | "blocked" = "available";
      let reason: string | null = null;

      if (currentReservation?.tableId === table.id) {
        availability = "current";
      } else if (table.status === "BLOCKED" || blockedTableIds.has(table.id)) {
        availability = "blocked";
        reason = "Bloqueada en ese horario.";
      } else if (reservedTableIds.has(table.id)) {
        availability = "reserved";
        reason = "Ya reservada para otra partida.";
      }

      return {
        id: table.id,
        name: table.name,
        gameName: table.game?.name ?? null,
        availability,
        reason,
      };
    }),
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const access = await requireOrganizedPlayAccess(session);
  if (access.response) return access.response;
  const userId = access.userId;

  let raw: any;
  try {
    raw = await request.json();
  } catch {
    return errorJson("Cuerpo de la solicitud inválido.", 400);
  }

  const tableId = parseString(raw.tableId);
  if (!tableId) return errorJson("Debes seleccionar una mesa.");

  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: {
      participants: { select: { userId: true } },
      reservations: {
        where: { status: { not: "CANCELLED" } },
        select: { id: true, tableId: true, createdById: true, notes: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!match) return errorJson("Partida no encontrada.", 404);
  if (!canManageMatchTable(session, userId, match.participants)) {
    return errorJson("No puedes gestionar la mesa de esta partida.", 403);
  }

  const effectiveStatus = getEffectiveMatchStatus({
    status: match.status,
    start: match.startsAt,
    end: match.endsAt,
  });
  if (!effectiveStatus || effectiveStatus === "DONE" || effectiveStatus === "CANCELLED") {
    return errorJson("Solo puedes reservar mesa para partidas activas o futuras.", 400);
  }

  const table = await prisma.clubTable.findUnique({
    where: { id: tableId },
    select: { id: true, name: true, status: true, isActive: true },
  });
  if (!table || !table.isActive) return errorJson("Mesa no encontrada.", 404);
  if (isZoneTableName(table.name)) return errorJson("No puedes reservar una zona como si fuera una mesa.", 400);
  if (table.status === "BLOCKED") return errorJson("La mesa está bloqueada y no puede reservarse.", 400);

  const currentReservation = match.reservations[0] ?? null;
  const conflict = await findTableConflict({
    tableId,
    start: match.startsAt,
    end: match.endsAt,
    excludeReservationId: currentReservation?.id ?? null,
  });
  if (conflict) return errorJson(conflict, 409);

  const reservationStatus = toReservationStatus(match.status);

  const reservation = await prisma.$transaction(async (tx) => {
    const existingForMatch = await tx.tableReservation.findFirst({
      where: { matchId: match.id },
      select: { id: true, tableId: true, createdById: true, notes: true },
    });

    if (existingForMatch) {
      return tx.tableReservation.update({
        where: { id: existingForMatch.id },
        data: {
          tableId,
          start: match.startsAt,
          end: match.endsAt,
          status: reservationStatus,
        },
        include: {
          table: { select: { id: true, name: true } },
        },
      });
    }

    return tx.tableReservation.create({
      data: {
        tableId,
        start: match.startsAt,
        end: match.endsAt,
        status: reservationStatus,
        matchId: match.id,
        createdById: userId,
      },
      include: {
        table: { select: { id: true, name: true } },
      },
    });
  });

  return NextResponse.json({
    reservation: {
      id: reservation.id,
      tableId: reservation.table.id,
      tableName: reservation.table.name,
    },
  });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const access = await requireOrganizedPlayAccess(session);
  if (access.response) return access.response;
  const userId = access.userId;

  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: {
      participants: { select: { userId: true } },
      reservations: {
        where: { status: { not: "CANCELLED" } },
        select: { id: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!match) return errorJson("Partida no encontrada.", 404);
  if (!canManageMatchTable(session, userId, match.participants)) {
    return errorJson("No puedes gestionar la mesa de esta partida.", 403);
  }

  const effectiveStatus = getEffectiveMatchStatus({
    status: match.status,
    start: match.startsAt,
    end: match.endsAt,
  });
  if (!effectiveStatus || effectiveStatus === "DONE" || effectiveStatus === "CANCELLED") {
    return errorJson("Solo puedes liberar la mesa de partidas activas o futuras.", 400);
  }

  const currentReservation = match.reservations[0] ?? null;
  if (!currentReservation) return NextResponse.json({ ok: true, reservation: null });

  await prisma.tableReservation.delete({
    where: { id: currentReservation.id },
  });

  return NextResponse.json({ ok: true, reservation: null });
}

async function findTableConflict({
  tableId,
  start,
  end,
  excludeReservationId,
}: {
  tableId: string;
  start: Date;
  end: Date;
  excludeReservationId: string | null;
}) {
  const [overlappingReservation, overlappingBlock] = await Promise.all([
    prisma.tableReservation.findFirst({
      where: {
        tableId,
        status: { in: ACTIVE_RESERVATION_STATUSES },
        start: { lt: end },
        end: { gt: start },
        ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
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
  if (overlappingReservation) return "La mesa ya está reservada para otra partida en ese horario.";
  return null;
}

function canManageMatchTable(
  session: Session | null,
  userId: number,
  participants: { userId: number }[]
) {
  if (userCanManageMatches(session) || userCanManageReservations(session)) return true;
  return participants.some((participant) => participant.userId === userId);
}

function toReservationStatus(status: MatchStatus): ReservationStatus {
  if (status === "IN_PLAY") return "IN_PLAY";
  if (status === "DONE") return "ENDED";
  if (status === "CANCELLED") return "CANCELLED";
  if (status === "CONFIRMED") return "CONFIRMED";
  return "PENDING";
}
