export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { userCanManageMatches } from "@/lib/roles";
import { parseDate, parseIntOrNull, parseMatchStatus, parseParticipantRole, parseParticipantStatus, parseString, errorJson } from "../../shared";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!userCanManageMatches(session)) {
    return errorJson("No tienes permisos para editar partidas.", 403);
  }
  const { id } = params;
  let raw: any;
  try {
    raw = await request.json();
  } catch {
    return errorJson("Cuerpo de la solicitud inválido.", 400);
  }

  const data: any = {};
  if (raw.startsAt !== undefined) data.startsAt = parseDate(raw.startsAt);
  if (raw.endsAt !== undefined) data.endsAt = parseDate(raw.endsAt);
  if (raw.status !== undefined) {
    const status = parseMatchStatus(raw.status);
    if (!status) return errorJson("Estado de partida no válido.");
    data.status = status;
  }
  if (raw.format !== undefined) data.format = parseString(raw.format);
  if (raw.notes !== undefined) data.notes = parseString(raw.notes);
  if (raw.roundNumber !== undefined) data.roundNumber = parseIntOrNull(raw.roundNumber);
  if (raw.gameId !== undefined) data.gameId = parseString(raw.gameId);
  if (raw.eventId !== undefined) data.eventId = parseString(raw.eventId);
  if (raw.slotId !== undefined) data.slotId = parseString(raw.slotId);

  const updated = await prisma.match.update({
    where: { id },
    data,
    include: { participants: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!userCanManageMatches(session)) {
    return errorJson("No tienes permisos para eliminar partidas.", 403);
  }
  const { id } = params;
  await prisma.match.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  // small helper endpoint to upsert participants
  const session = await auth();
  if (!userCanManageMatches(session)) {
    return errorJson("No tienes permisos para editar participantes.", 403);
  }
  const { id } = params;
  let raw: any;
  try {
    raw = await request.json();
  } catch {
    return errorJson("Cuerpo de la solicitud inválido.", 400);
  }
  const participants = Array.isArray(raw.participants) ? raw.participants : [];

  await prisma.matchParticipant.deleteMany({ where: { matchId: id } });
  await prisma.matchParticipant.createMany({
    data: participants
      .map((p: any) => {
        const userId = parseIntOrNull(p.userId);
        if (!userId) return null;
        const role = parseParticipantRole(p.role) ?? "HOST";
        const status = parseParticipantStatus(p.status) ?? "PENDING";
        return { matchId: id, userId, role, status, note: parseString(p.note) };
      })
      .filter(Boolean) as any[],
    skipDuplicates: true,
  });

  const refreshed = await prisma.match.findUnique({
    where: { id },
    include: { participants: true },
  });
  return NextResponse.json(refreshed);
}
