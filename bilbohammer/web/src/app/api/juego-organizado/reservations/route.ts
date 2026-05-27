export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { ReservationStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isZoneTableName } from "@/lib/organized-tables";
import { userCanManageReservations } from "@/lib/roles";
import { errorJson, parseDate, parseIntOrNull, parseReservationStatus, parseString } from "../shared";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const from = fromParam ? new Date(fromParam) : null;
  const to = toParam ? new Date(toParam) : null;

  const reservations = await prisma.tableReservation.findMany({
    where: {
      ...(from && to ? { start: { lt: to }, end: { gt: from } } : {}),
    },
    orderBy: { start: "asc" },
    include: {
      table: true,
      match: {
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  nick: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(reservations);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!userCanManageReservations(session)) {
    return errorJson("No tienes permisos para crear reservas.", 403);
  }

  let raw: any;
  try {
    raw = await request.json();
  } catch {
    return errorJson("Cuerpo de la solicitud invalido.", 400);
  }

  const tableId = parseString(raw.tableId);
  const start = parseDate(raw.start);
  const end = parseDate(raw.end);
  if (!tableId || !start || !end) {
    return errorJson("tableId, start y end son obligatorios.");
  }
  if (start >= end) return errorJson("start debe ser anterior a end.");

  const status = parseReservationStatus(raw.status) ?? "PENDING";
  const matchId = parseString(raw.matchId);
  const createdById = parseIntOrNull((session?.user as any)?.id);

  const table = await prisma.clubTable.findUnique({
    where: { id: tableId },
    select: { id: true, name: true, status: true, isActive: true },
  });
  if (!table || !table.isActive) return errorJson("Mesa no encontrada.", 404);
  if (isZoneTableName(table.name)) return errorJson("No puedes reservar una zona como si fuera una mesa.", 400);
  if (table.status === "BLOCKED") return errorJson("La mesa esta bloqueada y no puede reservarse.", 400);

  if (matchId) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true },
    });
    if (!match) return errorJson("La partida asociada no existe.", 404);

    const existingForMatch = await prisma.tableReservation.findFirst({
      where: { matchId },
      select: { id: true },
    });
    if (existingForMatch) {
      return errorJson("La partida ya tiene una mesa reservada.", 409);
    }
  }

  const conflict = await findReservationConflict({
    tableId,
    start,
    end,
  });
  if (conflict) return errorJson(conflict, 409);

  const created = await prisma.tableReservation.create({
    data: {
      tableId,
      start,
      end,
      status,
      matchId,
      createdById,
      notes: parseString(raw.notes),
    },
  });

  return NextResponse.json(created, { status: 201 });
}

async function findReservationConflict({
  tableId,
  start,
  end,
}: {
  tableId: string;
  start: Date;
  end: Date;
}) {
  const [overlappingReservation, overlappingBlock] = await Promise.all([
    prisma.tableReservation.findFirst({
      where: {
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

  if (overlappingBlock) return "La mesa esta bloqueada en ese horario.";
  if (overlappingReservation) return "La mesa ya esta reservada en ese horario.";
  return null;
}

const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = ["PENDING", "CONFIRMED", "IN_PLAY"];
