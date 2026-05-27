export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { userCanManageMatches } from "@/lib/roles";
import { parseIntOrNull, errorJson } from "../../../shared";
import { getEffectiveMatchStatus } from "@/lib/organized-slot-status";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const userId = parseIntOrNull((session?.user as any)?.id);
  if (!userId) return errorJson("Debes iniciar sesion.", 401);

  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: {
      participants: { select: { userId: true } },
      reservations: { select: { id: true } },
    },
  });

  if (!match) return errorJson("Partida no encontrada.", 404);

  const isParticipant = match.participants.some((participant) => participant.userId === userId);
  if (!isParticipant && !userCanManageMatches(session)) {
    return errorJson("No puedes cancelar esta partida.", 403);
  }

  const effectiveStatus = getEffectiveMatchStatus({
    status: match.status,
    start: match.startsAt,
    end: match.endsAt,
  });

  if (effectiveStatus === "DONE") {
    return errorJson("La partida ya esta terminada.", 400);
  }
  if (effectiveStatus === "CANCELLED") {
    return errorJson("La partida ya esta cancelada.", 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.tableReservation.updateMany({
      where: {
        matchId: match.id,
        status: { not: "CANCELLED" },
      },
      data: { status: "CANCELLED" },
    });

    await tx.match.update({
      where: { id: match.id },
      data: { status: "CANCELLED" },
    });
  });

  return NextResponse.json({ ok: true });
}
