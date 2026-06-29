export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { parseIntOrNull, parseSlotStatus, parseString, parseDate, errorJson, requireOrganizedPlayAccess } from "../../shared";
import { getEffectiveSlotStatus } from "@/lib/organized-slot-status";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const access = await requireOrganizedPlayAccess(session);
  if (access.response) return access.response;
  const userId = access.userId;

  const { id } = params;
  const slot = await prisma.availabilitySlot.findUnique({
    where: { id },
    include: {
      match: { select: { id: true, status: true, startsAt: true, endsAt: true } },
      proposals: {
        where: { status: "PENDING" },
        select: { id: true },
      },
    },
  });
  if (!slot) return errorJson("Slot no encontrado.", 404);
  if (slot.creatorId !== userId) return errorJson("No puedes editar este slot.", 403);
  if (
    getEffectiveSlotStatus({
      status: slot.status,
      start: slot.start,
      end: slot.end,
      match: slot.match
        ? {
            status: slot.match.status,
            start: slot.match.startsAt,
            end: slot.match.endsAt,
          }
        : null,
    }) !== "OPEN"
  ) {
    return errorJson("Solo puedes editar ofertas abiertas.", 400);
  }
  if (slot.proposals.length > 0) {
    return errorJson("No puedes editar una oferta con propuestas pendientes. Resuelvelas primero.", 400);
  }

  let raw: any;
  try {
    raw = await request.json();
  } catch {
    return errorJson("Cuerpo de la solicitud inválido.", 400);
  }

  const data: any = {};
  if (raw.start !== undefined) data.start = parseDate(raw.start);
  if (raw.end !== undefined) data.end = parseDate(raw.end);
  if (data.start && data.end && data.start >= data.end) {
    return errorJson("La fecha de inicio debe ser anterior al fin.", 400);
  }

  if (raw.status !== undefined) {
    const status = parseSlotStatus(raw.status);
    if (!status) return errorJson("Estado de slot no valido.", 400);
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
  const access = await requireOrganizedPlayAccess(session);
  if (access.response) return access.response;
  const userId = access.userId;

  const { id } = params;
  const slot = await prisma.availabilitySlot.findUnique({
    where: { id },
    include: {
      match: {
        select: {
          id: true,
          status: true,
          startsAt: true,
          endsAt: true,
        },
      },
    },
  });
  if (!slot) return errorJson("Slot no encontrado.", 404);
  if (slot.creatorId !== userId) return errorJson("No puedes eliminar este slot.", 403);

  const effectiveStatus = getEffectiveSlotStatus({
    status: slot.status,
    start: slot.start,
    end: slot.end,
    match: slot.match
      ? {
          status: slot.match.status,
          start: slot.match.startsAt,
          end: slot.match.endsAt,
        }
      : null,
  });

  if (effectiveStatus === "CONFIRMED" || effectiveStatus === "IN_PLAY") {
    return errorJson("Cancela la partida antes de eliminarla.", 400);
  }

  await prisma.$transaction(async (tx) => {
    if (slot.match?.id) {
      await tx.tableReservation.deleteMany({
        where: { matchId: slot.match.id },
      });

      await tx.match.delete({
        where: { id: slot.match.id },
      });
    }

    await tx.availabilitySlot.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
