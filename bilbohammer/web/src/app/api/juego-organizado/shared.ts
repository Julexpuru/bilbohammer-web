import { NextResponse } from "next/server";
import type { ReservationStatus, TableStatus, MatchStatus, SlotStatus, ParticipantRole, ParticipantStatus } from "@prisma/client";

type EnumLike = Record<string, string>;

export function parseString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function parseIntOrNull(value: unknown): number | null {
  if (value == null) return null;
  const num = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(num)) return null;
  return Math.trunc(num);
}

export function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseEnum<T extends string>(value: unknown, values: Set<T>): T | null {
  if (typeof value !== "string") return null;
  const upper = value.trim().toUpperCase();
  return values.has(upper as T) ? (upper as T) : null;
}

export function parseTableStatus(value: unknown): TableStatus | null {
  return parseEnum<TableStatus>(value, new Set(["AVAILABLE", "RESERVED", "IN_PLAY", "BLOCKED"]));
}

export function parseReservationStatus(value: unknown): ReservationStatus | null {
  return parseEnum<ReservationStatus>(value, new Set(["PENDING", "CONFIRMED", "IN_PLAY", "ENDED", "CANCELLED"]));
}

export function parseMatchStatus(value: unknown): MatchStatus | null {
  return parseEnum<MatchStatus>(value, new Set(["PENDING", "CONFIRMED", "IN_PLAY", "DONE", "CANCELLED"]));
}

export function parseSlotStatus(value: unknown): SlotStatus | null {
  return parseEnum<SlotStatus>(value, new Set(["OPEN", "MATCHED", "CANCELLED"]));
}

export function parseParticipantRole(value: unknown): ParticipantRole | null {
  return parseEnum<ParticipantRole>(value, new Set(["HOST", "GUEST", "STAFF"]));
}

export function parseParticipantStatus(value: unknown): ParticipantStatus | null {
  return parseEnum<ParticipantStatus>(value, new Set(["PENDING", "CONFIRMED", "DECLINED"]));
}

export function errorJson(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
