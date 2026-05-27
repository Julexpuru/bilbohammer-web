export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { parseIntOrNull, errorJson } from "../../../shared";
import { acceptSlotProposal, SlotProposalActionError } from "@/lib/organized-slot-proposal-actions";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const userId = parseIntOrNull((session?.user as any)?.id);
  if (!userId) return errorJson("Debes iniciar sesion.", 401);

  const proposals = await prisma.slotProposal.findMany({
    where: {
      slotId: params.id,
      status: "PENDING",
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (proposals.length === 0) {
    return errorJson("No hay propuestas pendientes para esta oferta.", 400);
  }
  if (proposals.length > 1) {
    return errorJson("Hay varias propuestas pendientes. Debes confirmar una propuesta concreta.", 400);
  }

  try {
    const result = await acceptSlotProposal(proposals[0].id, userId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SlotProposalActionError) {
      return errorJson(error.message, error.status);
    }
    console.error("[slot-accept-legacy]", error);
    return errorJson("No se pudo aceptar la propuesta.", 500);
  }
}
