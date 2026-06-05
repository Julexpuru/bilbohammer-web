import { EventRegistrationSource, EventRegistrationStatus, EventStatus, type PrismaClient } from "@prisma/client";
import type { Session } from "next-auth";

import { prisma } from "@/lib/prisma";

export const ACTIVE_EVENT_REGISTRATION_STATUSES = [
  EventRegistrationStatus.INSCRITO,
  EventRegistrationStatus.PAGADO,
] as const;

export type EventRegistrationPayload = {
  userId?: number | null;
  playerName?: string | null;
  factionLabel?: string | null;
  status?: EventRegistrationStatus | null;
  notes?: string | null;
  listData?: unknown;
};

type EventRegistrationDb = PrismaClient;

export function resolveSessionUserId(session: Session | null | undefined): number | null {
  const rawId = (session?.user as any)?.id;
  if (typeof rawId === "number" && Number.isFinite(rawId)) return rawId;
  if (typeof rawId === "string") {
    const parsed = Number.parseInt(rawId, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function normalizeRegistrationText(value: string | null | undefined, maxLength = 120) {
  const normalized = value?.trim() ?? "";
  return normalized.length ? normalized.slice(0, maxLength) : null;
}

export function parseEventRegistrationStatus(value: unknown): EventRegistrationStatus | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === EventRegistrationStatus.INSCRITO) return EventRegistrationStatus.INSCRITO;
  if (normalized === EventRegistrationStatus.PAGADO) return EventRegistrationStatus.PAGADO;
  if (normalized === EventRegistrationStatus.CANCELLED) return EventRegistrationStatus.CANCELLED;
  return null;
}

export function canAcceptRegistrations(event: {
  status: EventStatus;
  startsAt: Date;
  endsAt: Date;
  registrationClosesAt?: Date | null;
}) {
  if (event.status === EventStatus.CANCELLED || event.status === EventStatus.POSTPONED) return false;
  if (event.status === EventStatus.DRAFT || event.status === EventStatus.FINALIZED) return false;
  const now = Date.now();
  if (event.registrationClosesAt) {
    return event.registrationClosesAt.getTime() > now;
  }
  return event.startsAt.getTime() > now;
}

export async function getRegistrationEvent(eventId: string, db: EventRegistrationDb = prisma) {
  return db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      status: true,
      startsAt: true,
      endsAt: true,
      registrationClosesAt: true,
      capacityMax: true,
      isMembersOnly: true,
    },
  });
}

export async function countActiveRegistrations(eventId: string, db: EventRegistrationDb = prisma) {
  return db.eventRegistration.count({
    where: {
      eventId,
      status: { in: [...ACTIVE_EVENT_REGISTRATION_STATUSES] },
    },
  });
}

export async function getUserRegistrationName(userId: number, db: EventRegistrationDb = prisma) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, nombre: true, nick: true, email: true },
  });
  if (!user) return null;
  return user.nick ?? user.nombre ?? user.name ?? user.email ?? `Usuario ${user.id}`;
}

export function normalizeListData(value: unknown) {
  if (value == null) return undefined;
  if (typeof value === "object") return value;
  return undefined;
}

export function serializeRegistration(registration: {
  id: string;
  eventId: string;
  userId: number | null;
  playerName: string;
  factionLabel: string | null;
  status: EventRegistrationStatus;
  source: EventRegistrationSource;
  notes: string | null;
  registeredAt: Date;
  updatedAt: Date;
  user?: { id: number; name: string | null; nick: string | null; email: string } | null;
}) {
  return {
    id: registration.id,
    eventId: registration.eventId,
    userId: registration.userId,
    playerName: registration.playerName,
    factionLabel: registration.factionLabel,
    status: registration.status,
    source: registration.source,
    notes: registration.notes,
    registeredAt: registration.registeredAt.toISOString(),
    updatedAt: registration.updatedAt.toISOString(),
    user: registration.user
      ? {
          id: registration.user.id,
          name: registration.user.name,
          nick: registration.user.nick,
          email: registration.user.email,
        }
      : null,
  };
}
