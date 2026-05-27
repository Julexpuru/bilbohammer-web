export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { parseIntOrNull } from "../shared";
import { extractSlotPreferences } from "@/lib/organized-slot-metadata";

function parseRangeDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: Request) {
  const session = await auth();
  const viewerId = parseIntOrNull((session?.user as any)?.id);
  const { searchParams } = new URL(request.url);
  const from = parseRangeDate(searchParams.get("from"));
  const to = parseRangeDate(searchParams.get("to"));

  if (!from || !to || from >= to) {
    return NextResponse.json({ error: "Rango de fechas invalido." }, { status: 400 });
  }

  try {
    const [reservations, matches, slots] = await Promise.all([
      prisma.tableReservation.findMany({
        where: {
          matchId: null,
          start: { lt: to },
          end: { gt: from },
          status: { not: "CANCELLED" },
        },
        orderBy: { start: "asc" },
        include: {
          table: { select: { id: true, name: true } },
        },
      }),
      prisma.match.findMany({
        where: {
          startsAt: { lt: to },
          endsAt: { gt: from },
          status: { not: "CANCELLED" },
        },
        orderBy: { startsAt: "asc" },
        include: {
          game: { select: { id: true, name: true } },
          event: { select: { id: true, title: true } },
          participants: {
            select: {
              role: true,
              user: { select: { id: true, name: true, nick: true } },
            },
          },
          reservations: {
            where: { status: { not: "CANCELLED" } },
            include: {
              table: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.availabilitySlot.findMany({
        where: {
          start: { lt: to },
          end: { gt: from },
          status: { not: "CANCELLED" },
        },
        orderBy: { start: "asc" },
        include: {
          game: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true, nick: true } },
          match: {
            select: {
              id: true,
              status: true,
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
      }),
    ]);

    return NextResponse.json([
      ...matches.map((match) => {
        const reservation = match.reservations[0] ?? null;
        return {
          id: match.id,
          type: "match",
          title: match.game?.name ?? "Partida",
          start: match.startsAt.toISOString(),
          end: match.endsAt.toISOString(),
          status: match.status,
          gameId: match.game?.id ?? null,
          gameName: match.game?.name ?? null,
          tableId: reservation?.table?.id ?? null,
          tableName: reservation?.table?.name ?? null,
          ownerId: null,
          ownerName: null,
          format: match.format ?? null,
          note: match.notes ?? null,
          eventTitle: match.event?.title ?? null,
          matchId: match.id,
          matchStatus: match.status,
          matchParticipants:
            match.participants
              ?.slice()
              .sort((a, b) => {
                if (a.role === b.role) return 0;
                if (a.role === "HOST") return -1;
                if (b.role === "HOST") return 1;
                return 0;
              })
              .map((participant) => participant.user.nick ?? participant.user.name ?? "Socio") ?? [],
        };
      }),
      ...reservations.map((reservation) => ({
        id: reservation.id,
        type: "reservation",
        title: "Reserva interna",
        start: reservation.start.toISOString(),
        end: reservation.end.toISOString(),
        status: reservation.status,
        gameId: null,
        gameName: null,
        tableId: reservation.table?.id ?? null,
        tableName: reservation.table?.name ?? null,
        ownerId: null,
        ownerName: reservation.createdById ? "Reserva interna" : null,
        format: null,
        note: reservation.notes ?? null,
        eventTitle: null,
      })),
      ...slots
        .filter((slot) => !slot.match || slot.match.status === "CANCELLED")
        .map((slot) => {
          const preferences = extractSlotPreferences(slot);
          const viewerProposal =
            viewerId != null ? slot.proposals.find((proposal) => proposal.requesterId === viewerId) ?? null : null;

          return {
            id: slot.id,
            type: "slot",
            title: slot.game?.name ?? "Disponibilidad abierta",
            start: slot.start.toISOString(),
            end: slot.end.toISOString(),
            status: slot.status,
            gameId: slot.game?.id ?? null,
            gameName: slot.game?.name ?? null,
            tableId: null,
            tableName: null,
            ownerId: slot.creator.id,
            ownerName: slot.creator.nick ?? slot.creator.name ?? "Socio",
            format: slot.format,
            note: slot.note,
            eventTitle: null,
            matchId: null,
            matchStatus: null,
            matchParticipants: [],
            wantedGameIds: preferences.wantedGameIds,
            openGameIds: preferences.openGameIds,
            pendingProposalCount: slot.proposals.length,
            viewerProposal: viewerProposal
              ? {
                  id: viewerProposal.id,
                  status: viewerProposal.status,
                  gameId: viewerProposal.gameId,
                  gameName: viewerProposal.game?.name ?? null,
                  proposedStart: viewerProposal.proposedStart.toISOString(),
                  proposedEnd: viewerProposal.proposedEnd.toISOString(),
                  note: viewerProposal.note,
                  createdAt: viewerProposal.createdAt.toISOString(),
                }
              : null,
          };
        }),
    ]);
  } catch (error) {
    console.error("[organized-calendar]", error);
    return NextResponse.json({ error: "No se pudo cargar el calendario." }, { status: 503 });
  }
}
