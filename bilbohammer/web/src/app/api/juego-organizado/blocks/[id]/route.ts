export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { userCanManageBlocks } from "@/lib/roles";
import { parseDate, parseIntOrNull, parseString, errorJson } from "../../shared";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!userCanManageBlocks(session)) {
    return errorJson("No tienes permisos para editar bloqueos.", 403);
  }
  const { id } = params;
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
  if (raw.reason !== undefined) data.reason = parseString(raw.reason);
  if (raw.eventId !== undefined) data.eventId = parseString(raw.eventId);

  const updated = await prisma.tableBlock.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!userCanManageBlocks(session)) {
    return errorJson("No tienes permisos para eliminar bloqueos.", 403);
  }
  const { id } = params;
  await prisma.tableBlock.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
