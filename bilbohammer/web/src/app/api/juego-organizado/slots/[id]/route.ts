export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { parseIntOrNull, parseSlotStatus, parseString, parseDate, errorJson } from "../../shared";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const userId = parseIntOrNull((session?.user as any)?.id);
  if (!userId) return errorJson("Debes iniciar sesión.", 401);

  const { id } = params;
  const slot = await prisma.availabilitySlot.findUnique({ where: { id } });
  if (!slot) return errorJson("Slot no encontrado.", 404);
  if (slot.creatorId !== userId) return errorJson("No puedes editar este slot.", 403);

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
    const status = parseSlotStatus(raw.status);
    if (!status) return errorJson("Estado de slot no válido.");
    data.status = status;
  }
  if (raw.level !== undefined) data.level = parseString(raw.level);
  if (raw.format !== undefined) data.format = parseString(raw.format);
  if (raw.note !== undefined) data.note = parseString(raw.note);
  if (raw.gameId !== undefined) data.gameId = parseString(raw.gameId);

  const updated = await prisma.availabilitySlot.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const userId = parseIntOrNull((session?.user as any)?.id);
  if (!userId) return errorJson("Debes iniciar sesión.", 401);

  const { id } = params;
  const slot = await prisma.availabilitySlot.findUnique({ where: { id } });
  if (!slot) return errorJson("Slot no encontrado.", 404);
  if (slot.creatorId !== userId) return errorJson("No puedes eliminar este slot.", 403);

  await prisma.availabilitySlot.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
