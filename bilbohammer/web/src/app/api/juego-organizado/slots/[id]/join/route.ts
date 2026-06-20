export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { parseDate, parseString, errorJson, requireOrganizedPlayAccess } from "../../../shared";
import { getSlotAllowedGameIds, ensureProposalInsideSlot } from "@/lib/organized-slot-proposals";
import { getEffectiveSlotStatus } from "@/lib/organized-slot-status";
import { getUserDisplayName, notifySlotProposalReceived } from "@/lib/notifications";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const access = await requireOrganizedPlayAccess(session, {
    forbiddenMessage: "Necesitas ser socio o estar inscrito en una liga activa publicada para apuntarte a una oferta.",
  });
  if (access.response) return access.response;
  const userId = access.userId;

  let raw: any;
  try {
    raw = await request.json();
  } catch {
    return errorJson("Cuerpo de la solicitud invalido.", 400);
  }

  const proposedStart = parseDate(raw.proposedStart);
  const proposedEnd = parseDate(raw.proposedEnd);
  const gameId = parseString(raw.gameId);
  const note = parseString(raw.note);

  if (!proposedStart || !proposedEnd) {
    return errorJson("Debes indicar una franja horaria valida.");
  }

  const slot = await prisma.availabilitySlot.findUnique({
    where: { id: params.id },
    include: {
      creator: {
        select: { id: true, email: true, name: true, nick: true },
      },
      match: { select: { id: true, status: true, startsAt: true, endsAt: true } },
      proposals: {
        where: {
          requesterId: userId,
          status: "PENDING",
        },
        select: { id: true },
      },
    },
  });

  if (!slot) return errorJson("Slot no encontrado.", 404);
  if (slot.creatorId === userId) return errorJson("No puedes proponer una partida sobre tu propio slot.", 400);
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
    return errorJson("La oferta ya no esta disponible.", 400);
  }
  if (slot.proposals.length > 0) return errorJson("Ya tienes una propuesta pendiente para esta oferta.", 400);
  if (!ensureProposalInsideSlot(slot, proposedStart, proposedEnd)) {
    return errorJson("La franja propuesta debe estar dentro del horario ofertado.", 400);
  }

  const allowedGameIds = getSlotAllowedGameIds(slot);
  if (gameId && allowedGameIds.length > 0 && !allowedGameIds.includes(gameId)) {
    return errorJson("El juego seleccionado no forma parte de la oferta.", 400);
  }
  if (!gameId && allowedGameIds.length > 0) {
    return errorJson("Debes seleccionar un juego para la propuesta.", 400);
  }

  const proposal = await prisma.slotProposal.create({
    data: {
      slotId: slot.id,
      requesterId: userId,
      gameId,
      proposedStart,
      proposedEnd,
      note,
      status: "PENDING",
    },
    include: {
      requester: { select: { id: true, name: true, nick: true } },
      game: { select: { id: true, name: true } },
    },
  });

  try {
    await notifySlotProposalReceived({
      recipientUserId: slot.creator.id,
      actorUserId: userId,
      actorName: getUserDisplayName(proposal.requester),
      gameName: proposal.game?.name ?? null,
      proposedStart,
      proposedEnd,
      slotId: slot.id,
      proposalId: proposal.id,
    });
  } catch (error) {
    console.error("[slot-proposal-received-notification]", error);
  }

  return NextResponse.json(proposal, { status: 201 });
}
