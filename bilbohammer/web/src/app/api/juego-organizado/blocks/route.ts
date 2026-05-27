export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userCanManageBlocks } from "@/lib/roles";
import { errorJson, parseDate, parseIntOrNull, parseString } from "../shared";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));

  if ((searchParams.get("from") || searchParams.get("to")) && (!from || !to || from >= to)) {
    return errorJson("Rango de fechas invalido.");
  }

  const blocks = await prisma.tableBlock.findMany({
    where: from && to ? { start: { lt: to }, end: { gt: from } } : undefined,
    orderBy: { start: "asc" },
  });

  return NextResponse.json(blocks);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!userCanManageBlocks(session)) {
    return errorJson("No tienes permisos para bloquear mesas.", 403);
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

  const created = await prisma.tableBlock.create({
    data: {
      tableId,
      start,
      end,
      reason: parseString(raw.reason),
      eventId: parseString(raw.eventId),
      createdById: parseIntOrNull((session?.user as any)?.id),
    },
  });

  return NextResponse.json(created, { status: 201 });
}
