// === Juegos y Facciones (UI) ===
// Las ids (slugs) de facción se eligen para que coincidan con los nombres de archivo
// en /public/assets/icons/{games|factions}/{...}.png
// Para AoS/TOW hay mapeos especiales UI <-> Enum Prisma porque los enums no llevan guiones_bajos.

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

export const GAMES: { id: GameId; name: string; iconUrl?: string | null }[] = [
  { id: "w40k", name: "Warhammer 40,000" },
  { id: "aos", name: "Age of Sigmar" },
  { id: "tow", name: "The Old World" },
  { id: "esdla", name: "ESDLA" },
  { id: "bb", name: "Blood Bowl" },
  { id: "marvel", name: "Marvel Crisis Protocol" },
  { id: "rol", name: "Rol" },
  { id: "magic", name: "Magic" },
  { id: "boardgames", name: "Juegos de mesa" },
  { id: "otros", name: "Otros" },
];

export const FACTIONS: Record<
  Exclude<GameId, "esdla" | "bb" | "marvel" | "rol" | "magic" | "boardgames" | "otros">,
  { id: string; name: string; iconUrl?: string | null }[]
> = {
  w40k: [
    { id: "adepta_sororitas", name: "Adepta Sororitas" },
    { id: "adeptus_custodes", name: "Adeptus Custodes" },
    { id: "adeptus_mechanicus", name: "Adeptus Mechanicus" },
    { id: "aeldari", name: "Aeldari" },
    { id: "astra_militarum", name: "Astra Militarum" },
    { id: "black_templars", name: "Black Templars" },
    { id: "blood_angels", name: "Blood Angels" },
    { id: "chaos_daemons", name: "Chaos Daemons" },
    { id: "chaos_knights", name: "Chaos Knights" },
    { id: "chaos_marines", name: "Chaos Marines" },
    { id: "dark_angels", name: "Dark Angels" },
    { id: "deathwatch", name: "Deathwatch" },
    { id: "death_guard", name: "Death Guard" },
    { id: "drukhari", name: "Drukhari" },
    { id: "emperors_children", name: "Emperors Children" },
    { id: "genestealer_cults", name: "Genestealer Cults" },
    { id: "grey_knights", name: "Grey Knights" },
    { id: "imperial_agents", name: "Imperial Agents" },
    { id: "imperial_knights", name: "Imperial Knights" },
    { id: "leagues_of_votann", name: "Leagues of Votann" },
    { id: "necrons", name: "Necrons" },
    { id: "orks", name: "Orks" },
    { id: "space_marines", name: "Space Marines" },
    { id: "space_wolves", name: "Space Wolves" },
    { id: "tau", name: "T'au Empire" },
    { id: "thousand_sons", name: "Thousand Sons" },
    { id: "tyranids", name: "Tyranids" },
    { id: "world_eaters", name: "World Eaters" },
  ],
  aos: [
    { id: "beastmen", name: "Beastmen" },
    { id: "bladesofkhorne", name: "Blades of Khorne" },
    { id: "bonnezplitterz", name: "Bonnezplitterz" },
    { id: "citiesofsigmar", name: "Cities of Sigmar" },
    { id: "daughtersofkhaine", name: "Daughters of Khaine" },
    { id: "disciplesoftzeench", name: "Disciples of Tzeentch" },
    { id: "flesheaters", name: "Flesh Eater Courts" },
    { id: "fyreslayers", name: "Fyreslayers" },
    { id: "gloomspite", name: "Gloomspite Gitz" },
    { id: "hedonitesofslaanesh", name: "Hedonites of Slaanesh" },
    { id: "idoneth", name: "Idoneth Deepkin" },
    { id: "ironjawz", name: "Ironjawz" },
    { id: "kharadron", name: "Kharadron Overlords" },
    { id: "kruleboyz", name: "Kruleboyz" },
    { id: "lumineth", name: "Lumineth Realm Lords" },
    { id: "maggothkinofnurgle", name: "Maggotkin of Nurgle" },
    { id: "nighthaunt", name: "Nighthaunt" },
    { id: "ogors", name: "Ogor Mawtribes" },
    { id: "ossiarchbonerippers", name: "Ossiarch Bonerippers" },
    { id: "seraphon", name: "Seraphon" },
    { id: "skaven", name: "Skaven" },
    { id: "slavestodarkness", name: "Slaves to Darkness" },
    { id: "sonsofbehemath", name: "Sons of Behemath" },
    { id: "soulblight", name: "Soulblight Gravelords" },
    { id: "stormcast", name: "Stormcast Eternals" },
    { id: "sylvaneth", name: "Sylvaneth" },
  ],
  tow: [
    { id: "beastmen", name: "Beastmen" },
    { id: "bretonnia", name: "Bretonnia" },
    { id: "cathay", name: "Grand Cathay" },
    { id: "chaosdwarves", name: "Chaos Dwarves" },
    { id: "chaosdemons", name: "Chaos Daemons" },
    { id: "darkelves", name: "Dark Elves" },
    { id: "dwarves", name: "Dwarves" },
    { id: "empire", name: "Empire of Man" },
    { id: "greenskins", name: "Greenskins" },
    { id: "highelves", name: "High Elves" },
    { id: "khemri", name: "Khemri" },
    { id: "lizardmen", name: "Lizardmen" },
    { id: "ogres", name: "Ogres" },
    { id: "skaven", name: "Skaven" },
    { id: "vampirecounts", name: "Vampire Counts" },
    { id: "warriorsofchaos", name: "Warriors of Chaos" },
    { id: "woodelves", name: "Wood Elves" },
  ],
};

export function gameNameById(id: string) {
  return GAMES.find((g) => g.id === (id as GameId))?.name ?? id;
}

// ====================== Helpers de mapeo UI <-> Prisma enum ======================

// Conversión genérica UI -> ENUM (W40K usa snake_case -> UPPER_SNAKE que coincide)
export function toEnumKey(uiId: string): string {
  return uiId.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

// ENUM -> UI (por defecto pasa a minúsculas y snake_case)
export function toUiId(enumKey: string): string {
  return enumKey.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

// --- Mapeos específicos (AoS y TOW) porque los enums no llevan guiones_bajos y/o tienen grafías distintas

const AOS_UI_TO_ENUM: Record<string, string> = {
  beastmen: "BEASTMEN",
  bladesofkhorne: "BLADESOFKHORNE",
  bonnezplitterz: "BONNEZPLITTERZ",
  citiesofsigmar: "CITIESOFSIGMAR",
  daughtersofkhaine: "DAUGHTERSOFKHAINE",
  disciplesoftzeench: "DISCIPLESOFTZEENCH",
  flesheaters: "FLESHEATERS",
  fyreslayers: "FYRESLAYERS",
  gloomspite: "GLOOMSPITE",
  hedonitesofslaanesh: "HEDONITESOFSLAANESH",
  idoneth: "IDONETH",
  ironjawz: "IRONJAWZ",
  kharadron: "KHARADRON",
  kruleboyz: "KRULEBOYZ",
  lumineth: "LUMINETH",
  maggothkinofnurgle: "MAGGOTKINOFNURGLE",
  nighthaunt: "NIGHTHAUNT",
  ogors: "OGORS",
  ossiarchbonerippers: "OSSIARCHBONERIPPERS",
  seraphon: "SERAPHON",
  skaven: "SKAVEN",
  slavestodarkness: "SLAVESTODARKNESS",
  sonsofbehemath: "SONSOFBEHEMATH",
  soulblight: "SOULBLIGHT",
  stormcast: "STORMCAST",
  sylvaneth: "SYLVANETH",
};

const AOS_ENUM_TO_UI: Record<string, string> = Object.fromEntries(
  Object.entries(AOS_UI_TO_ENUM).map(([k, v]) => [v, k])
);

const TOW_UI_TO_ENUM: Record<string, string> = {
  beastmen: "BEASTMEN",
  bretonnia: "BRETONNIA",
  cathay: "CATHAY",
  chaosdwarves: "CHAOSDWARVES",
  chaosdemons: "CHAOSDAEMONS",
  darkelves: "DARKELVES",
  dwarves: "DWARVES",
  empire: "EMPIRE",
  greenskins: "GREENSKINS",
  highelves: "HIGHELVES",
  khemri: "KHEMRI",
  lizardmen: "LIZARDMEN",
  ogres: "OGRES",
  skaven: "SKAVEN",
  vampirecounts: "VAMPIRECOUNTS",
  warriorsofchaos: "WARRIORSOFCHAOS",
  woodelves: "WOODELVES",
};

const TOW_ENUM_TO_UI: Record<string, string> = Object.fromEntries(
  Object.entries(TOW_UI_TO_ENUM).map(([k, v]) => [v, k])
);

export function uiFactionToEnum(game: "w40k" | "aos" | "tow", id: string): string {
  if (game === "aos") return AOS_UI_TO_ENUM[id] ?? toEnumKey(id);
  if (game === "tow") return TOW_UI_TO_ENUM[id] ?? toEnumKey(id);
  return toEnumKey(id);
}

export function enumFactionToUi(game: "w40k" | "aos" | "tow", ev: string): string {
  if (game === "aos") return AOS_ENUM_TO_UI[ev] ?? toUiId(ev);
  if (game === "tow") return TOW_ENUM_TO_UI[ev] ?? toUiId(ev);
  return toUiId(ev);
}

// ====================== Iconos ======================

// Juegos → nombre de archivo exacto
const GAME_ICON_FILE: Record<GameId, string> = {
  w40k: "w40k.png",
  aos: "aos.png",
  tow: "tow.png",
  esdla: "esdla.png",
  bb: "bloodbowl.png",
  marvel: "mcp.png",
  rol: "rol.png",
  magic: "magic.png",
  boardgames: "juegosdemesa.png",
  otros: "otros.png",
};

export function gameIconPath(id: GameId): string {
  return `/assets/icons/games/${GAME_ICON_FILE[id]}`;
}

// Facciones → por convención: /assets/icons/factions/{game}/{uiId}.png
// Caso especial: en W40K no existe 'imperial_agents.png'; usar 'deathwatch.png' como fallback
export function factionIconPath(game: "w40k" | "aos" | "tow", uiId: string): string {
  if (game === "w40k" && uiId === "imperial_agents") {
    return `/assets/icons/factions/${game}/deathwatch.png`;
  }
  return `/assets/icons/factions/${game}/${uiId}.png`;
}
