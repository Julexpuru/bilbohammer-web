export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { parseIntOrNull, parseString, errorJson } from "../../../shared";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const userId = parseIntOrNull((session?.user as any)?.id);
  if (!userId) return errorJson("Debes iniciar sesión.", 401);

  let raw: any = {};
  try {
    raw = await request.json();
  } catch {
    // cuerpo opcional, ignoramos si no hay
  }
  const tableId = raw.tableId ? parseString(raw.tableId) : null;

  const slot = await prisma.availabilitySlot.findUnique({
    where: { id: params.id },
    include: {
      match: { include: { participants: true, reservations: true } },
    },
  });

  if (!slot) return errorJson("Slot no encontrado.", 404);
  if (slot.creatorId !== userId) return errorJson("Solo el creador del slot puede aceptar.", 403);
  if (!slot.match) return errorJson("No hay partida pendiente para este slot.", 400);
  const matchId = slot.match.id;

  const guest = slot.match.participants.find((p) => p.role === "GUEST");
  if (!guest) return errorJson("No hay invitado pendiente.", 400);

  if (tableId) {
    const conflicts = await prisma.tableReservation.count({
      where: {
        tableId,
        status: { not: "CANCELLED" },
        start: { lt: slot.end },
        end: { gt: slot.start },
      },
    });
    if (conflicts > 0) {
      return errorJson("La mesa seleccionada está reservada en ese horario.", 409);
    }

    const blocked = await prisma.tableBlock.count({
      where: {
        tableId,
        start: { lt: slot.end },
        end: { gt: slot.start },
      },
    });
    if (blocked > 0) {
      return errorJson("La mesa seleccionada está bloqueada en ese horario.", 409);
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const matchUpdated = await tx.match.update({
      where: { id: matchId },
      data: {
        status: "CONFIRMED",
        participants: {
          update: [
            {
              where: { matchId_userId: { matchId, userId: guest.userId } },
              data: { status: "CONFIRMED" },
            },
          ],
        },
      },
      include: { participants: true },
    });

    if (tableId) {
      await tx.tableReservation.create({
        data: {
          tableId,
          start: slot.start,
          end: slot.end,
          status: "CONFIRMED",
          matchId,
          createdById: userId,
          notes: "Reserva automática al confirmar partida",
        },
      });
    }

    return matchUpdated;
  });

  return NextResponse.json(updated);
}
