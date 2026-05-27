import { prisma } from "@/lib/prisma";
import { pickMatchGameId } from "@/lib/organized-slot-metadata";
import { ensureProposalInsideSlot, splitSlotAfterAcceptance } from "@/lib/organized-slot-proposals";
import { getEffectiveSlotStatus } from "@/lib/organized-slot-status";
import {
  getUserDisplayName,
  notifySlotProposalAccepted,
  notifySlotProposalRejected,
  notifySlotProposalSuperseded,
} from "@/lib/notifications";

export class SlotProposalActionError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function acceptSlotProposal(proposalId: string, actingUserId: number) {
  const result = await prisma.$transaction(async (tx) => {
    const proposal = await tx.slotProposal.findUnique({
      where: { id: proposalId },
      include: {
        requester: {
          select: { id: true, email: true, name: true, nick: true },
        },
        game: {
          select: { id: true, name: true },
        },
        slot: {
          include: {
            creator: {
              select: { id: true, email: true, name: true, nick: true },
            },
            match: { select: { id: true, status: true, startsAt: true, endsAt: true } },
            proposals: {
              where: { status: "PENDING" },
              include: {
                requester: {
                  select: { id: true, email: true, name: true, nick: true },
                },
                game: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!proposal) throw new SlotProposalActionError("Propuesta no encontrada.", 404);
    if (proposal.slot.creatorId !== actingUserId) {
      throw new SlotProposalActionError("Solo el creador del slot puede gestionar propuestas.", 403);
    }
    if (proposal.status !== "PENDING") {
      throw new SlotProposalActionError("La propuesta ya no esta pendiente.", 400);
    }
    if (
      getEffectiveSlotStatus({
        status: proposal.slot.status,
        start: proposal.slot.start,
        end: proposal.slot.end,
        match: proposal.slot.match
          ? {
              status: proposal.slot.match.status,
              start: proposal.slot.match.startsAt,
              end: proposal.slot.match.endsAt,
            }
          : null,
      }) !== "OPEN"
    ) {
      throw new SlotProposalActionError("La oferta ya no admite propuestas.", 400);
    }
    if (!ensureProposalInsideSlot(proposal.slot, proposal.proposedStart, proposal.proposedEnd)) {
      throw new SlotProposalActionError("La propuesta ya no encaja en la franja disponible.", 400);
    }

    const match = await tx.match.create({
      data: {
        gameId: proposal.gameId ?? pickMatchGameId(proposal.slot),
        slotId: proposal.slotId,
        proposalId: proposal.id,
        startsAt: proposal.proposedStart,
        endsAt: proposal.proposedEnd,
        status: "CONFIRMED",
        format: proposal.slot.format,
        notes: proposal.note ?? proposal.slot.note,
        createdById: actingUserId,
        participants: {
          create: [
            { userId: proposal.slot.creatorId, role: "HOST", status: "CONFIRMED" },
            { userId: proposal.requesterId, role: "GUEST", status: "CONFIRMED" },
          ],
        },
      },
      include: {
        participants: { include: { user: { select: { id: true, name: true, nick: true } } } },
      },
    });

    await tx.slotProposal.update({
      where: { id: proposal.id },
      data: { status: "ACCEPTED" },
    });

    await tx.slotProposal.updateMany({
      where: {
        slotId: proposal.slotId,
        id: { not: proposal.id },
        status: "PENDING",
      },
      data: { status: "REJECTED" },
    });

    await tx.availabilitySlot.update({
      where: { id: proposal.slotId },
      data: { status: "MATCHED" },
    });

    const remainderRanges = splitSlotAfterAcceptance(
      proposal.slot,
      proposal.proposedStart,
      proposal.proposedEnd
    );

    if (remainderRanges.length > 0) {
      await tx.availabilitySlot.createMany({
        data: remainderRanges.map((range) => ({
          creatorId: proposal.slot.creatorId,
          gameId: proposal.slot.gameId,
          start: range.start,
          end: range.end,
          status: "OPEN",
          level: proposal.slot.level,
          format: proposal.slot.format,
          note: proposal.slot.note,
        })),
      });
    }

    const actorName = getUserDisplayName(proposal.slot.creator);
    const supersededProposals = proposal.slot.proposals.filter((pendingProposal) => pendingProposal.id !== proposal.id);

    return {
      match,
      remainderCount: remainderRanges.length,
      acceptedNotification: {
        recipientUserId: proposal.requesterId,
        actorUserId: actingUserId,
        actorName,
        gameName: proposal.game?.name ?? null,
        proposedStart: proposal.proposedStart,
        proposedEnd: proposal.proposedEnd,
        slotId: proposal.slotId,
        proposalId: proposal.id,
        matchId: match.id,
      },
      supersededNotifications: supersededProposals.map((pendingProposal) => ({
        recipientUserId: pendingProposal.requesterId,
        actorUserId: actingUserId,
        actorName,
        gameName: pendingProposal.game?.name ?? null,
        proposedStart: pendingProposal.proposedStart,
        proposedEnd: pendingProposal.proposedEnd,
        slotId: pendingProposal.slotId,
        proposalId: pendingProposal.id,
      })),
    };
  });

  try {
    await notifySlotProposalAccepted(result.acceptedNotification);
  } catch (error) {
    console.error("[slot-proposal-accepted-notification]", error);
  }

  for (const payload of result.supersededNotifications) {
    try {
      await notifySlotProposalSuperseded(payload);
    } catch (error) {
      console.error("[slot-proposal-superseded-notification]", error);
    }
  }

  return { match: result.match, remainderCount: result.remainderCount };
}

export async function rejectSlotProposal(proposalId: string, actingUserId: number) {
  const proposal = await prisma.slotProposal.findUnique({
    where: { id: proposalId },
    include: {
      requester: {
        select: { id: true, email: true, name: true, nick: true },
      },
      game: {
        select: { id: true, name: true },
      },
      slot: {
        select: {
          id: true,
          creatorId: true,
          creator: {
            select: { id: true, email: true, name: true, nick: true },
          },
        },
      },
    },
  });

  if (!proposal) throw new SlotProposalActionError("Propuesta no encontrada.", 404);
  if (proposal.slot.creatorId !== actingUserId) {
    throw new SlotProposalActionError("Solo el creador del slot puede gestionar propuestas.", 403);
  }
  if (proposal.status !== "PENDING") {
    throw new SlotProposalActionError("La propuesta ya no esta pendiente.", 400);
  }

  const updated = await prisma.slotProposal.update({
    where: { id: proposalId },
    data: { status: "REJECTED" },
  });

  try {
    await notifySlotProposalRejected({
      recipientUserId: proposal.requesterId,
      actorUserId: actingUserId,
      actorName: getUserDisplayName(proposal.slot.creator),
      gameName: proposal.game?.name ?? null,
      proposedStart: proposal.proposedStart,
      proposedEnd: proposal.proposedEnd,
      slotId: proposal.slot.id,
      proposalId: proposal.id,
    });
  } catch (error) {
    console.error("[slot-proposal-rejected-notification]", error);
  }

  return updated;
}
