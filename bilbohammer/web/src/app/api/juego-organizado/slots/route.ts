export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { parseDate, parseIntOrNull, parseSlotStatus, parseString, errorJson } from "../shared";
import { includesGamePreference } from "@/lib/organized-slot-metadata";
import { isClosedMatchStatus } from "@/lib/organized-slot-status";
import { notifyCompatibleSlotCreated } from "@/lib/notifications";

export async function GET(request: Request) {
  const session = await auth();
  const viewerId = parseIntOrNull((session?.user as any)?.id);
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const slots = await prisma.availabilitySlot.findMany({
    where: {
      ...(from && to
        ? {
            start: { lt: new Date(to) },
            end: { gt: new Date(from) },
          }
        : {}),
    },
    orderBy: { start: "asc" },
    include: {
      match: {
        include: {
          game: { select: { id: true, name: true } },
          participants: {
            select: {
              role: true,
              user: { select: { id: true, name: true, nick: true } },
            },
          },
        },
      },
      proposals: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include: {
          requester: { select: { id: true, name: true, nick: true } },
          game: { select: { id: true, name: true } },
        },
      },
    },
  });

  const filtered = gameId ? slots.filter((slot) => includesGamePreference(slot, gameId)) : slots;

  return NextResponse.json(
    filtered.map((slot) => {
      const viewerProposal =
        viewerId != null ? slot.proposals.find((proposal) => proposal.requesterId === viewerId) ?? null : null;
      const ownerVisibleProposals =
        viewerId != null && slot.creatorId === viewerId
          ? slot.proposals.map((proposal) => ({
              id: proposal.id,
              requesterId: proposal.requesterId,
              requesterName: proposal.requester.nick ?? proposal.requester.name ?? "Socio",
              gameId: proposal.gameId,
              gameName: proposal.game?.name ?? null,
              proposedStart: proposal.proposedStart.toISOString(),
              proposedEnd: proposal.proposedEnd.toISOString(),
              note: proposal.note,
              status: proposal.status,
              createdAt: proposal.createdAt.toISOString(),
            }))
          : [];
      const displayStart = isClosedMatchStatus(slot.match?.status) ? slot.match!.startsAt : slot.start;
      const displayEnd = isClosedMatchStatus(slot.match?.status) ? slot.match!.endsAt : slot.end;
      const displayGameId = isClosedMatchStatus(slot.match?.status) ? slot.match?.gameId ?? slot.gameId : slot.gameId;
      const displayGameName = isClosedMatchStatus(slot.match?.status) ? slot.match?.game?.name ?? null : null;

      return {
        id: slot.id,
        creatorId: slot.creatorId,
        gameId: displayGameId,
        start: displayStart.toISOString(),
        end: displayEnd.toISOString(),
        status: slot.status,
        level: slot.level,
        format: slot.format,
        note: slot.note,
        matchId: slot.match?.id ?? null,
        matchStatus: slot.match?.status ?? null,
        matchGameId: slot.match?.gameId ?? null,
        matchGameName: displayGameName,
        matchParticipants:
          slot.match?.participants
            ?.slice()
            .sort((a, b) => {
              if (a.role === b.role) return 0;
              if (a.role === "HOST") return -1;
              if (b.role === "HOST") return 1;
              return 0;
            })
            .map((participant) => participant.user.nick ?? participant.user.name ?? "Socio") ?? [],
        pendingProposalCount: slot.proposals.length,
        viewerProposal: viewerProposal
          ? {
              id: viewerProposal.id,
              gameId: viewerProposal.gameId,
              proposedStart: viewerProposal.proposedStart.toISOString(),
              proposedEnd: viewerProposal.proposedEnd.toISOString(),
              note: viewerProposal.note,
              status: viewerProposal.status,
              createdAt: viewerProposal.createdAt.toISOString(),
            }
          : null,
        proposals: ownerVisibleProposals,
      };
    })
  );
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = parseIntOrNull((session?.user as any)?.id);
  if (!userId) return errorJson("Debes iniciar sesion para crear disponibilidad.", 401);

  let raw: any;
  try {
    raw = await request.json();
  } catch {
    return errorJson("Cuerpo de la solicitud invalido.", 400);
  }

  const start = parseDate(raw.start);
  const end = parseDate(raw.end);
  if (!start || !end) return errorJson("start y end son obligatorios.");
  if (start >= end) return errorJson("start debe ser anterior a end.");

  const slot = await prisma.availabilitySlot.create({
    data: {
      creatorId: userId,
      gameId: parseString(raw.gameId),
      start,
      end,
      status: parseSlotStatus(raw.status) ?? "OPEN",
      level: parseString(raw.level),
      format: parseString(raw.format),
      note: parseString(raw.note),
    },
  });

  if (slot.status === "OPEN") {
    try {
      await notifyCompatibleSlotCreated(slot.id);
    } catch (error) {
      console.error("[compatible-slot-notification]", error);
    }
  }

  return NextResponse.json(slot, { status: 201 });
}
