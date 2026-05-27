export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { parseIntOrNull, errorJson } from "../../shared";
import { getEffectiveSlotStatus } from "@/lib/organized-slot-status";

export async function POST() {
  const session = await auth();
  const userId = parseIntOrNull((session?.user as any)?.id);
  if (!userId) return errorJson("Debes iniciar sesion.", 401);

  const slots = await prisma.availabilitySlot.findMany({
    where: { creatorId: userId },
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

  const targets = slots.filter((slot) => {
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

    return effectiveStatus === "DONE" || effectiveStatus === "EXPIRED" || effectiveStatus === "CANCELLED";
  });

  if (targets.length === 0) {
    return NextResponse.json({ ok: true, deletedCount: 0 });
  }

  await prisma.$transaction(async (tx) => {
    for (const slot of targets) {
      if (slot.match?.id) {
        await tx.tableReservation.deleteMany({
          where: { matchId: slot.match.id },
        });

        await tx.match.delete({
          where: { id: slot.match.id },
        });
      }

      await tx.availabilitySlot.delete({
        where: { id: slot.id },
      });
    }
  });

  return NextResponse.json({ ok: true, deletedCount: targets.length });
}
