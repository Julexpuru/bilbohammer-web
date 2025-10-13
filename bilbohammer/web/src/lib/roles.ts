import type { Session } from "next-auth";

const CLUB_PRIVILEGE_ROLES = new Set(["ADMIN", "JUNTA"]);

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

export function userCanManageGallery(session: Session | null | undefined): boolean {
  return hasClubPrivileges(session);
}

export function userCanManageEvents(session: Session | null | undefined): boolean {
  return hasClubPrivileges(session);
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

