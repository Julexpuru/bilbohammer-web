import {
  fallbackGameList,
  factionIconPath as legacyFactionIconPath,
  gameIconPath as legacyGameIconPath,
  toEnumKey as baseToEnumKey,
  toUiId as baseToUiId,
} from "@/lib/games";

export type GameId = string;

const LEGACY_LIST = fallbackGameList();

export const GAME_TITLES: Record<string, string> = Object.fromEntries(
  LEGACY_LIST.map((entry) => [entry.slug, entry.name])
);

export function gameIconPath(id: GameId): string {
  return legacyGameIconPath(id);
}

export function factionIconPath(game: "w40k" | "aos" | "tow", id: string): string {
  return legacyFactionIconPath(game, id);
}

export function toUiId(enumValue: string): string {
  if (!enumValue) return enumValue;
  if (enumValue === "JUEGOS_DE_MESA") return "boardgames";
  return baseToUiId(enumValue);
}

export function toEnumKey(uiId: string): string {
  if (!uiId) return uiId;
  if (uiId === "boardgames") return "JUEGOS_DE_MESA";
  return baseToEnumKey(uiId);
}

export function humanizeId(id: string): string {
  if (!id) return id;
  if (id.toLowerCase() === "tau") return "T'au Empire";
  return id
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

// Facciones según los enums de Prisma (se mantienen estáticos)
export const FACTIONS_UI: Record<"w40k" | "aos" | "tow", { id: string; name: string }[]> = {
  w40k: [
    "ADEPTA_SORORITAS",
    "ADEPTUS_CUSTODES",
    "ADEPTUS_MECHANICUS",
    "ASTRA_MILITARUM",
    "BLACK_TEMPLARS",
    "BLOOD_ANGELS",
    "CHAOS_DAEMONS",
    "CHAOS_KNIGHTS",
    "CHAOS_MARINES",
    "DARK_ANGELS",
    "DEATHWATCH",
    "DEATH_GUARD",
    "DRUKHARI",
    "ELDARS",
    "EMPERORS_CHILDREN",
    "GENESTEALER_CULTS",
    "GREY_KNIGHTS",
    "IMPERIAL_AGENTS",
    "IMPERIAL_KNIGHTS",
    "LEAGUES_OF_VOTANN",
    "NECRONS",
    "ORKS",
    "SPACE_MARINES",
    "SPACE_WOLVES",
    "TAU",
    "THOUSAND_SONS",
    "TYRANIDS",
    "WORLD_EATERS",
  ].map((entry) => {
    const ui = toUiId(entry);
    return { id: ui, name: humanizeId(ui) };
  }),

  aos: [
    "STORMCAST",
    "SLAVES_TO_DARKNESS",
    "SOULBLIGHT_GRAVELORDS",
    "IRONJAWZ",
  ].map((entry) => {
    const ui = toUiId(entry);
    return { id: ui, name: humanizeId(ui) };
  }),

  tow: [
    "EMPIRE",
    "DWARFS",
    "HIGH_ELVES",
    "CHAOS",
  ].map((entry) => {
    const ui = toUiId(entry);
    return { id: ui, name: humanizeId(ui) };
  }),
};
