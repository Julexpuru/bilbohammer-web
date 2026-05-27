export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseIntOrNull, errorJson } from "../../../shared";
import { rejectSlotProposal, SlotProposalActionError } from "@/lib/organized-slot-proposal-actions";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const userId = parseIntOrNull((session?.user as any)?.id);
  if (!userId) return errorJson("Debes iniciar sesion.", 401);

  try {
    const result = await rejectSlotProposal(params.id, userId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SlotProposalActionError) {
      return errorJson(error.message, error.status);
    }
    console.error("[slot-proposal-reject]", error);
    return errorJson("No se pudo rechazar la propuesta.", 500);
  }
}
