export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { errorJson, requireOrganizedPlayAccess } from "../../shared";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const access = await requireOrganizedPlayAccess(session, {
    unauthenticatedMessage: "Debes iniciar sesion para eliminar horarios.",
    forbiddenMessage: "Necesitas ser socio o estar inscrito en una liga activa publicada para eliminar horarios.",
  });
  if (access.response) return access.response;
  const userId = access.userId;

  const row = await prisma.recurringAvailability.findUnique({ where: { id: params.id } });
  if (!row || row.userId !== userId) return errorJson("Horario no encontrado.", 404);

  await prisma.recurringAvailability.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
