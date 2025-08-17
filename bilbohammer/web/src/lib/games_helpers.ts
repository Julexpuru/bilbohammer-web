
export type GameId =
  | "w40k"
  | "aos"
  | "tow"
  | "esdla"
  | "bb"
  | "marvel"
  | "rol"
  | "magic"
  | "boardgames"
  | "otros";

export const GAME_TITLES: Record<GameId, string> = {
  w40k: "Warhammer 40,000",
  aos: "Age of Sigmar",
  tow: "The Old World",
  esdla: "ESDLA",
  bb: "Blood Bowl",
  marvel: "Marvel Crisis Protocol",
  rol: "Rol",
  magic: "Magic",
  boardgames: "Juegos de mesa",
  otros: "Otros",
};

export function gameIconPath(id: GameId): string {
  return `/assets/icons/games/${id}.svg`;
}

export function factionIconPath(game: "w40k" | "aos" | "tow", id: string): string {
  return `/assets/icons/factions/${game}/${id}.svg`;
}

// Prisma Enum -> UI id
export function toUiId(enumValue: string): string {
  if (!enumValue) return enumValue;
  if (enumValue === "JUEGOS_DE_MESA") return "boardgames";
  return enumValue.toLowerCase();
}

// UI id -> Prisma Enum label
export function toEnumKey(uiId: string): string {
  if (!uiId) return uiId;
  if (uiId === "boardgames") return "JUEGOS_DE_MESA";
  return uiId.toUpperCase();
}

// Humaniza ids (FOO_BAR -> Foo Bar)
export function humanizeId(id: string): string {
  if (!id) return id;
  // excepciones mínimas
  if (id.toLowerCase() === "tau") return "T'au Empire";
  return id
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

/**
 * Facciones segun tu schema exacto (enums de Prisma) convertidas a UI ids (lowercase).
 * Si amplias el schema, añade aquí.
 */
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
  ].map(e => ({ id: toUiId(e), name: humanizeId(toUiId(e)) })),

  aos: [
    "STORMCAST",
    "SLAVES_TO_DARKNESS",
    "SOULBLIGHT_GRAVELORDS",
    "IRONJAWZ",
  ].map(e => ({ id: toUiId(e), name: humanizeId(toUiId(e)) })),

  tow: [
    "EMPIRE",
    "DWARFS",
    "HIGH_ELVES",
    "CHAOS",
  ].map(e => ({ id: toUiId(e), name: humanizeId(toUiId(e)) })),
};
