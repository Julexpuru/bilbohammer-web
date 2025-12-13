export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { parseIntOrNull, errorJson } from "../../../shared";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const userId = parseIntOrNull((session?.user as any)?.id);
  if (!userId) return errorJson("Debes iniciar sesión.", 401);

  const slot = await prisma.availabilitySlot.findUnique({
    where: { id: params.id },
    include: { match: { include: { participants: true } } },
  });
  if (!slot) return errorJson("Slot no encontrado.", 404);
  if (slot.creatorId === userId) return errorJson("No puedes unirte a tu propio slot.", 400);
  if (slot.status !== "OPEN") return errorJson("El slot ya no está disponible.", 400);
  if (slot.match) return errorJson("El slot ya está emparejado.", 400);

  const matchExisting = (slot as any).match as { participants?: { userId: number }[] } | null;
  // Ya había intentos anteriores
  const existingParticipants = (matchExisting?.participants ?? []) as { userId: number }[];
  if (existingParticipants.some((p) => p.userId === userId)) {
    return errorJson("Ya te habías apuntado a este slot.", 400);
  }

  const createdMatch = await prisma.$transaction(async (tx) => {
    const matchCreated = await tx.match.create({
      data: {
        slotId: slot.id,
        gameId: slot.gameId,
        startsAt: slot.start,
        endsAt: slot.end,
        status: "PENDING",
        participants: {
          create: [
            { userId: slot.creatorId, role: "HOST", status: "CONFIRMED" },
            { userId, role: "GUEST", status: "PENDING" },
          ],
        },
      },
      include: { participants: true },
    });

    await tx.availabilitySlot.update({
      where: { id: slot.id },
      data: { status: "MATCHED", match: { connect: { id: matchCreated.id } } },
    });

    return matchCreated;
  });

  return NextResponse.json(createdMatch, { status: 201 });
}
