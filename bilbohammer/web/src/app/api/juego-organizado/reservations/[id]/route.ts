export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { userCanManageReservations } from "@/lib/roles";
import { parseDate, parseReservationStatus, parseString, errorJson } from "../../shared";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!userCanManageReservations(session)) {
    return errorJson("No tienes permisos para editar reservas.", 403);
  }
  const { id } = params;
  let raw: any;
  try {
    raw = await request.json();
  } catch {
    return errorJson("Cuerpo de la solicitud inválido.", 400);
  }

  const data: any = {};
  if (raw.start !== undefined) data.start = parseDate(raw.start);
  if (raw.end !== undefined) data.end = parseDate(raw.end);
  if (raw.status !== undefined) {
    const status = parseReservationStatus(raw.status);
    if (!status) return errorJson("Estado de reserva no válido.");
    data.status = status;
  }
  if (raw.notes !== undefined) data.notes = parseString(raw.notes);
  if (raw.matchId !== undefined) data.matchId = parseString(raw.matchId);

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
