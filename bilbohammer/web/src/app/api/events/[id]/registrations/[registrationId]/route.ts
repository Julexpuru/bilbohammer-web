import { EventRegistrationStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  normalizeListData,
  normalizeRegistrationText,
  parseEventRegistrationStatus,
  resolveSessionUserId,
  serializeRegistration,
  type EventRegistrationPayload,
} from "@/lib/event-registrations";
import { prisma } from "@/lib/prisma";
import { userCanEditEvent } from "@/lib/roles";

type RouteParams = {
  params: { id: string; registrationId: string };
};

function parsePayload(raw: unknown): EventRegistrationPayload {
  return raw && typeof raw === "object" ? (raw as EventRegistrationPayload) : {};
}

async function findRegistration(eventId: string, registrationId: string) {
  return prisma.eventRegistration.findFirst({
    where: { id: registrationId, eventId },
    include: { user: { select: { id: true, name: true, nick: true, email: true } } },
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  const sessionUserId = resolveSessionUserId(session);
  if (sessionUserId == null) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const existing = await findRegistration(params.id, params.registrationId);
  if (!existing) {
    return NextResponse.json({ error: "Inscripcion no encontrada." }, { status: 404 });
  }

  const canManage = await userCanEditEvent(session, params.id);
  const isOwner = existing.userId === sessionUserId;
  if (!canManage && !isOwner) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  let payload: EventRegistrationPayload;
  try {
    payload = parsePayload(await request.json());
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  const status = canManage
    ? parseEventRegistrationStatus(payload.status) ?? existing.status
    : EventRegistrationStatus.CANCELLED;

  const registration = await prisma.eventRegistration.update({
    where: { id: existing.id },
    data: canManage
      ? {
          playerName: normalizeRegistrationText(payload.playerName) ?? existing.playerName,
          factionLabel: normalizeRegistrationText(payload.factionLabel),
          status,
          notes: normalizeRegistrationText(payload.notes, 500),
          listData: normalizeListData(payload.listData),
        }
      : {
          status,
        },
    include: { user: { select: { id: true, name: true, nick: true, email: true } } },
  });

  return NextResponse.json({ registration: serializeRegistration(registration) });
}

export async function DELETE(_: Request, { params }: RouteParams) {
  const session = await auth();
  const sessionUserId = resolveSessionUserId(session);
  if (sessionUserId == null) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const existing = await findRegistration(params.id, params.registrationId);
  if (!existing) {
    return NextResponse.json({ error: "Inscripcion no encontrada." }, { status: 404 });
  }

  const canManage = await userCanEditEvent(session, params.id);
  const isOwner = existing.userId === sessionUserId;
  if (!canManage && !isOwner) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  if (canManage) {
    await prisma.eventRegistration.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  }

  const registration = await prisma.eventRegistration.update({
    where: { id: existing.id },
    data: { status: EventRegistrationStatus.CANCELLED },
    include: { user: { select: { id: true, name: true, nick: true, email: true } } },
  });
  return NextResponse.json({ registration: serializeRegistration(registration) });
}
