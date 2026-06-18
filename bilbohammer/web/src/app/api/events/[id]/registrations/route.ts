import { EventRegistrationSource, EventRegistrationStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  canAcceptRegistrations,
  countActiveRegistrations,
  getRegistrationEvent,
  getUserRegistrationName,
  normalizeListData,
  normalizeRegistrationText,
  parseEventRegistrationStatus,
  resolveSessionUserId,
  serializeRegistration,
  type EventRegistrationPayload,
} from "@/lib/event-registrations";
import { prisma } from "@/lib/prisma";
import { extractRoles, userCanEditEvent } from "@/lib/roles";

type RouteParams = {
  params: { id: string };
};

function parsePayload(raw: unknown): EventRegistrationPayload {
  return raw && typeof raw === "object" ? (raw as EventRegistrationPayload) : {};
}

async function findNameConflict(eventId: string, playerName: string, targetUserId: number | null) {
  return prisma.eventRegistration.findFirst({
    where: {
      eventId,
      playerName: { equals: playerName, mode: "insensitive" },
      ...(targetUserId != null
        ? {
            OR: [{ userId: null }, { userId: { not: targetUserId } }],
          }
        : {}),
    },
    select: { id: true },
  });
}

export async function GET(_: Request, { params }: RouteParams) {
  const session = await auth();
  const canManage = await userCanEditEvent(session, params.id);

  const registrations = await prisma.eventRegistration.findMany({
    where: canManage ? { eventId: params.id } : { eventId: params.id, status: { not: "CANCELLED" } },
    include: {
      user: { select: { id: true, name: true, nick: true, email: true } },
    },
    orderBy: [{ status: "asc" }, { registeredAt: "asc" }, { playerName: "asc" }],
  });

  return NextResponse.json({
    registrations: registrations.map(serializeRegistration),
    canManage,
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  const sessionUserId = resolveSessionUserId(session);
  if (sessionUserId == null) {
    return NextResponse.json({ error: "Necesitas iniciar sesión para inscribirte." }, { status: 401 });
  }

  const event = await getRegistrationEvent(params.id);
  if (!event) {
    return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
  }

  const canManage = await userCanEditEvent(session, params.id);
  if (!canManage && !canAcceptRegistrations(event)) {
    return NextResponse.json({ error: "Este evento no admite nuevas inscripciones." }, { status: 400 });
  }
  if (!canManage && event.isMembersOnly) {
    const roles = extractRoles(session);
    const isMember = roles.some((role) => role === "SOCIO" || role === "JUNTA" || role === "ADMIN");
    if (!isMember) {
      return NextResponse.json({ error: "Este evento está reservado a socios." }, { status: 403 });
    }
  }

  let payload: EventRegistrationPayload;
  try {
    payload = parsePayload(await request.json());
  } catch {
    payload = {};
  }

  const targetUserId = canManage ? (payload.userId != null ? Number(payload.userId) : null) : sessionUserId;
  if (targetUserId != null && (!Number.isInteger(targetUserId) || targetUserId <= 0)) {
    return NextResponse.json({ error: "Usuario inválido." }, { status: 400 });
  }

  const requestedStatus = canManage ? parseEventRegistrationStatus(payload.status) : null;
  const status = requestedStatus ?? EventRegistrationStatus.INSCRITO;
  const playerName =
    normalizeRegistrationText(payload.playerName) ??
    (targetUserId != null ? await getUserRegistrationName(targetUserId) : null);
  if (!playerName) {
    return NextResponse.json({ error: "No se pudo resolver el nombre del participante." }, { status: 400 });
  }
  const nameConflict = await findNameConflict(params.id, playerName, targetUserId);
  if (nameConflict) {
    return NextResponse.json({ error: "Ya existe un participante con ese nombre en este evento." }, { status: 409 });
  }

  const activeCount = await countActiveRegistrations(params.id);
  if (
    !canManage &&
    event.capacityMax != null &&
    event.capacityMax > 0 &&
    activeCount >= event.capacityMax
  ) {
    return NextResponse.json({ error: "El aforo de este evento está completo." }, { status: 400 });
  }

  try {
    const data = {
      eventId: params.id,
      userId: targetUserId,
      playerName,
      factionLabel: normalizeRegistrationText(payload.factionLabel),
      status,
      source: canManage ? EventRegistrationSource.ADMIN : EventRegistrationSource.WEB,
      notes: normalizeRegistrationText(payload.notes, 500),
      listData: normalizeListData(payload.listData),
    };
    const registration =
      targetUserId == null
        ? await prisma.eventRegistration.create({
            data,
            include: {
              user: { select: { id: true, name: true, nick: true, email: true } },
            },
          })
        : await prisma.eventRegistration.upsert({
            where: {
              eventId_userId: {
                eventId: params.id,
                userId: targetUserId,
              },
            },
            create: data,
            update: {
              playerName,
              factionLabel: normalizeRegistrationText(payload.factionLabel),
              status,
              source: canManage ? EventRegistrationSource.ADMIN : EventRegistrationSource.WEB,
              notes: normalizeRegistrationText(payload.notes, 500),
              listData: normalizeListData(payload.listData),
            },
            include: {
              user: { select: { id: true, name: true, nick: true, email: true } },
            },
          });

    return NextResponse.json({ registration: serializeRegistration(registration) });
  } catch (error) {
    console.error("[events] Failed to create registration", error);
    return NextResponse.json({ error: "No se pudo guardar la inscripción." }, { status: 500 });
  }
}
