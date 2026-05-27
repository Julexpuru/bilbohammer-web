export type TableUiState = "available" | "reserved" | "in_play" | "blocked";

type TableStatusValue = "AVAILABLE" | "RESERVED" | "IN_PLAY" | "BLOCKED";
type ReservationStatusValue = "PENDING" | "CONFIRMED" | "IN_PLAY" | "ENDED" | "CANCELLED";

type TableStateInput = {
  id: string;
  status: TableStatusValue;
};

type ReservationStateInput = {
  tableId: string;
  start: Date | string;
  end: Date | string;
  status: ReservationStatusValue;
};

type BlockStateInput = {
  tableId: string;
  start: Date | string;
  end: Date | string;
};

export const TABLE_STATE_COLORS: Record<TableUiState, string> = {
  available: "#2dd4bf",
  reserved: "#f97316",
  in_play: "#ef4444",
  blocked: "#94a3b8",
};

export const TABLE_STATE_LABELS: Record<TableUiState, string> = {
  available: "Libre",
  reserved: "Reservada",
  in_play: "En juego",
  blocked: "Bloqueada",
};

export function isZoneTableName(name: string) {
  return name.trim().toLowerCase().includes("zona");
}

export function isOrientationTag(tag?: string | null) {
  if (!tag) return false;
  const normalized = tag.trim().toLowerCase();
  return normalized === "vertical" || normalized === "horizontal";
}

export function getEffectiveTableState(
  table: TableStateInput,
  reservations: ReservationStateInput[],
  blocks: BlockStateInput[],
  now = new Date()
): TableUiState {
  const hasActiveBlock = blocks.some((block) => {
    if (block.tableId !== table.id) return false;
    const start = toDate(block.start);
    const end = toDate(block.end);
    return !!start && !!end && start <= now && now <= end;
  });

  if (hasActiveBlock || table.status === "BLOCKED") return "blocked";

  const overlappingReservations = reservations.filter((reservation) => {
    if (reservation.tableId !== table.id || reservation.status === "CANCELLED") return false;
    const start = toDate(reservation.start);
    const end = toDate(reservation.end);
    return !!start && !!end && start <= now && now <= end;
  });

  if (overlappingReservations.some((reservation) => reservation.status === "IN_PLAY")) return "in_play";
  if (overlappingReservations.length > 0) return "reserved";

  if (table.status === "IN_PLAY") return "in_play";
  if (table.status === "RESERVED") return "reserved";

  return "available";
}

function toDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
