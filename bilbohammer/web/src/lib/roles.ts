import { EventStatus, EventType } from "@prisma/client";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { ACTIVE_EVENT_REGISTRATION_STATUSES } from "@/lib/event-registrations";

const CLUB_PRIVILEGE_ROLES = new Set(["ADMIN", "JUNTA"]);
const ORGANIZED_PLAY_BASE_ROLES = new Set(["SOCIO", "JUNTA", "ADMIN"]);

export function extractRoles(session: Session | null | undefined): string[] {
  const rawRoles = Array.isArray((session?.user as any)?.roles)
    ? ((session?.user as any).roles as string[])
    : [];
  const mainRole = (session?.user as any)?.rol as string | undefined;
  const list = rawRoles.map((role) => String(role).toUpperCase());
  if (mainRole) {
    list.push(String(mainRole).toUpperCase());
  }
  return Array.from(new Set(list));
}

function hasClubPrivileges(session: Session | null | undefined): boolean {
  const roles = extractRoles(session);
  return roles.some((role) => CLUB_PRIVILEGE_ROLES.has(role));
}

export function userHasOrganizedPlayBaseRole(session: Session | null | undefined): boolean {
  const roles = extractRoles(session);
  return roles.some((role) => ORGANIZED_PLAY_BASE_ROLES.has(role));
}

export function userCanManageGallery(session: Session | null | undefined): boolean {
  return hasClubPrivileges(session);
}

export function userCanManageEvents(session: Session | null | undefined): boolean {
  return hasClubPrivileges(session);
}

export function userCanManageTables(session: Session | null | undefined): boolean {
  return hasClubPrivileges(session);
}

export function userCanManageBlocks(session: Session | null | undefined): boolean {
  return hasClubPrivileges(session);
}

export function userCanManageReservations(session: Session | null | undefined): boolean {
  return hasClubPrivileges(session);
}

export function userCanManageMatches(session: Session | null | undefined): boolean {
  return hasClubPrivileges(session);
}

function resolveSessionUserId(session: Session | null | undefined): number | null {
  const rawId = (session?.user as any)?.id;
  if (typeof rawId === "number" && Number.isFinite(rawId)) {
    return rawId;
  }
  if (typeof rawId === "string") {
    const trimmed = rawId.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeEventId(eventId: string | null | undefined): string | null {
  if (typeof eventId !== "string") return null;
  const trimmed = eventId.trim();
  return trimmed.length ? trimmed : null;
}

export async function userHasActiveLeagueRegistration(session: Session | null | undefined): Promise<boolean> {
  const userId = resolveSessionUserId(session);
  if (userId == null) return false;

  const registration = await prisma.eventRegistration.findFirst({
    where: {
      userId,
      status: { in: [...ACTIVE_EVENT_REGISTRATION_STATUSES] },
      event: {
        type: EventType.LEAGUE,
        status: { in: [EventStatus.PUBLISHED, EventStatus.PREPARATION, EventStatus.IN_PROGRESS] },
        endsAt: { gte: new Date() },
      },
    },
    select: { id: true },
  });

  return Boolean(registration);
}

export async function userCanAccessOrganizedPlay(session: Session | null | undefined): Promise<boolean> {
  if (userHasOrganizedPlayBaseRole(session)) {
    return true;
  }

  return userHasActiveLeagueRegistration(session);
}

export async function userIsEventOrganizer(
  session: Session | null | undefined,
  eventId: string | null | undefined
): Promise<boolean> {
  const normalizedEventId = normalizeEventId(eventId);
  if (!normalizedEventId) return false;
  const userId = resolveSessionUserId(session);
  if (userId == null) return false;
  const organizer = await prisma.eventOrganizer.findFirst({
    where: { eventId: normalizedEventId, userId },
    select: { id: true },
  });
  return Boolean(organizer);
}

export async function userCanEditEvent(
  session: Session | null | undefined,
  eventId: string | null | undefined
): Promise<boolean> {
  if (userCanManageEvents(session)) {
    return true;
  }
  return userIsEventOrganizer(session, eventId);
}

export function userCanEditAlbum(
  session: Session | null | undefined,
  collaboratorIds: string[]
): "none" | "edit" | "admin" {
  if (hasClubPrivileges(session)) {
    return "admin";
  }

  const userId = (session?.user as any)?.id as string | undefined;
  if (userId && collaboratorIds.includes(userId)) {
    return "edit";
  }

  return "none";
}
