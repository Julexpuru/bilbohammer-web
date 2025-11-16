import type { Rol } from "@prisma/client";
import { formatClubDateTime } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";

export type RawMember = {
  id: number;
  name: string | null;
  nick: string | null;
  avatarUrl: string | null;
  oauthAvatarUrl: string | null;
  facePhotoUrl: string | null;
  image: string | null;
  roles: Rol[];
  descripcion: string | null;
  membershipSince: Date | null;
};

export type MemberCard = {
  id: number;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  facePhotoUrl: string | null;
  memberSince: string | null;
  bio: string | null;
  roles: string[];
  profileHref: string;
};

const MEMBER_PROFILE_BASE_PATH = "/sobre-nosotros/tablon-de-socios";

export function toMemberCard(member: RawMember, profileBasePath = MEMBER_PROFILE_BASE_PATH): MemberCard {
  const displayName = member.nick || member.name || `Socio ${member.id}`;
  const avatarUrl = member.avatarUrl || member.oauthAvatarUrl || member.image;
  const initials = toInitials(displayName);
  const memberSince = member.membershipSince
    ? formatClubDateTime(member.membershipSince, { month: "short", year: "numeric" })
    : null;

  return {
    id: member.id,
    displayName,
    initials,
    avatarUrl,
    facePhotoUrl: member.facePhotoUrl ?? null,
    memberSince,
    bio: member.descripcion,
    roles: member.roles.map((role) => String(role)),
    profileHref: `${profileBasePath}/${member.id}`,
  };
}

function toInitials(value: string): string {
  const parts = value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "BH";
  return parts
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

type BoardTier = "presidencia" | "cargos" | "vocales";

export type SingleBoardSlotId = "PRESIDENTE" | "VICEPRESIDENTE" | "TESORERO" | "SECRETARIO";
export type BoardSlotId = SingleBoardSlotId | "VOCAL";

export type BoardSlotConfig = {
  id: BoardSlotId;
  label: string;
  tier: BoardTier;
  multiple?: boolean;
};

export const BOARD_SLOT_CONFIG: readonly BoardSlotConfig[] = [
  { id: "PRESIDENTE", label: "Presidente", tier: "presidencia" },
  { id: "VICEPRESIDENTE", label: "Vicepresidente", tier: "cargos" },
  { id: "TESORERO", label: "Tesorero", tier: "cargos" },
  { id: "SECRETARIO", label: "Secretario", tier: "cargos" },
  { id: "VOCAL", label: "Vocalia", tier: "vocales", multiple: true },
] as const;

export type BoardAssignments = Record<SingleBoardSlotId, number | null> & { VOCAL: number[] };

export const BOARD_SLOT_IDS = new Set<BoardSlotId>(BOARD_SLOT_CONFIG.map((slot) => slot.id));

const BOARD_ASSIGNMENTS_KEY = "tablon-board-assignments";

export function createEmptyBoardAssignments(): BoardAssignments {
  return {
    PRESIDENTE: null,
    VICEPRESIDENTE: null,
    TESORERO: null,
    SECRETARIO: null,
    VOCAL: [],
  };
}

function parseMemberId(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export async function getBoardAssignments(): Promise<BoardAssignments> {
  const record = await prisma.siteContent.findUnique({ where: { key: BOARD_ASSIGNMENTS_KEY } });
  const stored = (record?.content ?? {}) as Partial<Record<BoardSlotId, unknown>>;
  const assignments = createEmptyBoardAssignments();

  assignments.PRESIDENTE = parseMemberId(stored.PRESIDENTE);
  assignments.VICEPRESIDENTE = parseMemberId(stored.VICEPRESIDENTE);
  assignments.TESORERO = parseMemberId(stored.TESORERO);
  assignments.SECRETARIO = parseMemberId(stored.SECRETARIO);
  assignments.VOCAL = Array.isArray(stored.VOCAL)
    ? stored.VOCAL.map((value) => parseMemberId(value)).filter((value): value is number => value !== null)
    : [];

  return assignments;
}

export type BoardAssignmentUpdate =
  | {
      slot: SingleBoardSlotId;
      userId: number | null;
    }
  | {
      slot: "VOCAL";
      userId: number | null;
      mode: "append" | "replace" | "remove";
      targetId?: number | null;
    };

export async function applyBoardAssignmentUpdate(update: BoardAssignmentUpdate): Promise<BoardAssignments> {
  const assignments = await getBoardAssignments();

  if (update.slot === "VOCAL") {
    const list = [...assignments.VOCAL];
    const targetId = update.targetId ?? null;

    if (update.mode === "append") {
      if (update.userId != null && !list.includes(update.userId)) {
        list.push(update.userId);
      }
    } else if (update.mode === "replace") {
      if (targetId == null) {
        if (update.userId != null && !list.includes(update.userId)) list.push(update.userId);
      } else {
        const index = list.findIndex((id) => id === targetId);
        if (index >= 0) {
          if (update.userId != null) list[index] = update.userId;
          else list.splice(index, 1);
        }
      }
    } else if (update.mode === "remove") {
      if (targetId != null) {
        const index = list.findIndex((id) => id === targetId);
        if (index >= 0) list.splice(index, 1);
      }
    }

    assignments.VOCAL = Array.from(new Set(list));
  } else {
    assignments[update.slot] = update.userId;
  }

  await prisma.siteContent.upsert({
    where: { key: BOARD_ASSIGNMENTS_KEY },
    create: { key: BOARD_ASSIGNMENTS_KEY, content: assignments },
    update: { content: assignments },
  });

  return assignments;
}
