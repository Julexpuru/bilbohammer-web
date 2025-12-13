export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { userCanManageReservations } from "@/lib/roles";
import { parseDate, parseIntOrNull, parseReservationStatus, parseString, errorJson } from "../shared";

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
      match: true,
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
    return errorJson("Cuerpo de la solicitud inválido.", 400);
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
