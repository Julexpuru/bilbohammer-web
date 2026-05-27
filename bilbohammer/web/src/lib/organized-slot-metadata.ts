const SLOT_META_PREFIX = "BH_SLOT_META:";
const LEGACY_WANTED_SUFFIX = "Preferencia: quiero jugar este juego.";
const LEGACY_OPEN_SUFFIX = "Preferencia: abierto a jugar este juego.";

export type SlotPreferenceMetadata = {
  wantedGameIds: string[];
  openGameIds: string[];
  source?: "manual" | "weekly";
};

export type ParsedSlotPreferences = {
  wantedGameIds: string[];
  openGameIds: string[];
  note: string | null;
};

export function serializeSlotMetadata(metadata: SlotPreferenceMetadata | null) {
  if (!metadata) return null;
  if (metadata.wantedGameIds.length === 0 && metadata.openGameIds.length === 0) return null;
  return `${SLOT_META_PREFIX}${JSON.stringify(metadata)}`;
}

export function parseSlotMetadata(level: string | null | undefined) {
  if (!level || !level.startsWith(SLOT_META_PREFIX)) return null;
  try {
    const parsed = JSON.parse(level.slice(SLOT_META_PREFIX.length)) as SlotPreferenceMetadata;
    return {
      wantedGameIds: Array.isArray(parsed.wantedGameIds) ? parsed.wantedGameIds.filter(isString) : [],
      openGameIds: Array.isArray(parsed.openGameIds) ? parsed.openGameIds.filter(isString) : [],
      source: parsed.source,
    };
  } catch {
    return null;
  }
}

export function extractSlotPreferences(input: {
  gameId?: string | null;
  level?: string | null;
  note?: string | null;
}): ParsedSlotPreferences {
  const metadata = parseSlotMetadata(input.level);
  if (metadata) {
    return {
      wantedGameIds: metadata.wantedGameIds,
      openGameIds: metadata.openGameIds,
      note: cleanNote(input.note),
    };
  }

  const note = cleanNote(input.note);
  if (!input.gameId) {
    return { wantedGameIds: [], openGameIds: [], note };
  }

  const rawNote = input.note?.trim() ?? "";
  if (rawNote.endsWith(LEGACY_WANTED_SUFFIX)) {
    return {
      wantedGameIds: [input.gameId],
      openGameIds: [],
      note: cleanNote(rawNote.slice(0, -LEGACY_WANTED_SUFFIX.length)),
    };
  }
  if (rawNote.endsWith(LEGACY_OPEN_SUFFIX)) {
    return {
      wantedGameIds: [],
      openGameIds: [input.gameId],
      note: cleanNote(rawNote.slice(0, -LEGACY_OPEN_SUFFIX.length)),
    };
  }

  return {
    wantedGameIds: [input.gameId],
    openGameIds: [],
    note,
  };
}

export function includesGamePreference(input: {
  gameId?: string | null;
  level?: string | null;
  note?: string | null;
}, gameId: string) {
  const parsed = extractSlotPreferences(input);
  return parsed.wantedGameIds.includes(gameId) || parsed.openGameIds.includes(gameId);
}

export function getSlotPreferenceGameIds(input: {
  gameId?: string | null;
  level?: string | null;
  note?: string | null;
}) {
  const parsed = extractSlotPreferences(input);
  if (parsed.wantedGameIds.length || parsed.openGameIds.length) {
    return Array.from(new Set([...parsed.wantedGameIds, ...parsed.openGameIds]));
  }
  return input.gameId ? [input.gameId] : [];
}

export function pickMatchGameId(input: {
  gameId?: string | null;
  level?: string | null;
  note?: string | null;
}) {
  if (input.gameId) return input.gameId;
  const parsed = extractSlotPreferences(input);
  if (parsed.wantedGameIds.length === 1 && parsed.openGameIds.length === 0) {
    return parsed.wantedGameIds[0];
  }
  return null;
}

function cleanNote(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
