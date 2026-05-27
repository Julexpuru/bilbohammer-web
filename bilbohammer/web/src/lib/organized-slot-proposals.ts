import { getSlotPreferenceGameIds } from "@/lib/organized-slot-metadata";

const ONE_HOUR_MS = 60 * 60 * 1000;

type SlotWindowInput = {
  start: Date | string;
  end: Date | string;
};

type SlotPreferenceInput = SlotWindowInput & {
  gameId?: string | null;
  level?: string | null;
  note?: string | null;
};

export function ensureProposalInsideSlot(slot: SlotWindowInput, proposedStart: Date, proposedEnd: Date) {
  const slotStart = toDate(slot.start);
  const slotEnd = toDate(slot.end);
  return (
    proposedStart.getTime() >= slotStart.getTime() &&
    proposedEnd.getTime() <= slotEnd.getTime() &&
    proposedStart.getTime() < proposedEnd.getTime()
  );
}

export function getSlotAllowedGameIds(slot: SlotPreferenceInput) {
  return getSlotPreferenceGameIds(slot);
}

export function splitSlotAfterAcceptance(slot: SlotWindowInput, proposedStart: Date, proposedEnd: Date) {
  const slotStart = toDate(slot.start);
  const slotEnd = toDate(slot.end);
  const ranges = [
    { start: slotStart, end: proposedStart },
    { start: proposedEnd, end: slotEnd },
  ];

  return ranges.filter((range) => range.end.getTime() - range.start.getTime() > ONE_HOUR_MS);
}

export function overlapsRange(
  aStart: Date | string,
  aEnd: Date | string,
  bStart: Date | string,
  bEnd: Date | string
) {
  return toDate(aStart).getTime() < toDate(bEnd).getTime() && toDate(aEnd).getTime() > toDate(bStart).getTime();
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}
