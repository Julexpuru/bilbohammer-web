export type PersistedSlotStatus = "OPEN" | "MATCHED" | "CANCELLED";
export type MatchLifecycleStatus = "PENDING" | "CONFIRMED" | "IN_PLAY" | "DONE" | "CANCELLED";
export type EffectiveSlotStatus = PersistedSlotStatus | "EXPIRED" | "CONFIRMED" | "IN_PLAY" | "DONE";

type DateLike = Date | string | null | undefined;

type MatchStatusInput = {
  status?: MatchLifecycleStatus | null;
  start?: DateLike;
  end?: DateLike;
} | null;

type SlotStatusInput = {
  status: PersistedSlotStatus;
  start?: DateLike;
  end: DateLike;
  match?: MatchStatusInput;
};

const CLOSED_MATCH_STATUSES = new Set<MatchLifecycleStatus>(["CONFIRMED", "IN_PLAY", "DONE", "CANCELLED"]);

export function isClosedMatchStatus(status: MatchLifecycleStatus | null | undefined) {
  return !!status && CLOSED_MATCH_STATUSES.has(status);
}

export function getEffectiveMatchStatus(input: MatchStatusInput, now = new Date()): MatchLifecycleStatus | null {
  if (!input?.status) return null;
  if (input.status === "CANCELLED") return "CANCELLED";
  if (input.status === "DONE") return "DONE";

  const start = toDate(input.start);
  const end = toDate(input.end);

  if (end && end.getTime() <= now.getTime()) {
    return "DONE";
  }

  if ((input.status === "CONFIRMED" || input.status === "IN_PLAY") && start && start.getTime() <= now.getTime()) {
    return "IN_PLAY";
  }

  return input.status;
}

export function getEffectiveSlotStatus(input: SlotStatusInput, now = new Date()): EffectiveSlotStatus {
  if (input.status === "CANCELLED") return "CANCELLED";

  const effectiveMatchStatus = getEffectiveMatchStatus(input.match ?? null, now);
  if (effectiveMatchStatus === "CANCELLED") return "CANCELLED";
  if (effectiveMatchStatus === "DONE") return "DONE";
  if (effectiveMatchStatus === "IN_PLAY") return "IN_PLAY";
  if (effectiveMatchStatus === "CONFIRMED") return "CONFIRMED";

  const end = toDate(input.end);
  if (end && end.getTime() <= now.getTime()) {
    return "EXPIRED";
  }

  return input.status;
}

export function getSlotStatusLabel(status: EffectiveSlotStatus) {
  switch (status) {
    case "OPEN":
      return "Buscando rival";
    case "MATCHED":
      return "Pendiente confirmar";
    case "CONFIRMED":
      return "Partida";
    case "IN_PLAY":
      return "En curso";
    case "DONE":
      return "Terminada";
    case "EXPIRED":
      return "Caducada";
    case "CANCELLED":
      return "Cancelado";
    default:
      return status;
  }
}

function toDate(value: DateLike) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
