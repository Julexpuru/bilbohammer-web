export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { userCanManageMatches } from "@/lib/roles";
import { errorJson, requireOrganizedPlayAccess } from "../../../shared";
import { getEffectiveMatchStatus } from "@/lib/organized-slot-status";
import { getUserDisplayName, notifyMatchCancelled } from "@/lib/notifications";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const access = await requireOrganizedPlayAccess(session);
  if (access.response) return access.response;
  const userId = access.userId;

  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: {
      game: { select: { name: true } },
      participants: {
        select: {
          userId: true,
          user: { select: { id: true, email: true, name: true, nick: true } },
        },
      },
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

  const actor = match.participants.find((participant) => participant.userId === userId)?.user;
  const actorName = actor
    ? getUserDisplayName(actor)
    : getUserDisplayName((session?.user as any) ?? {});
  const recipients = match.participants
    .map((participant) => participant.userId)
    .filter((participantUserId) => participantUserId !== userId);

  await Promise.all(
    recipients.map(async (recipientUserId) => {
      try {
        await notifyMatchCancelled({
          recipientUserId,
          actorUserId: userId,
          actorName,
          matchId: match.id,
          gameName: match.game?.name ?? null,
          startsAt: match.startsAt,
          endsAt: match.endsAt,
        });
      } catch (error) {
        console.error("[match-cancelled-notification]", error);
      }
    })
  );

  return NextResponse.json({ ok: true });
}
