// === Game metadata & factions ===
// Slugs follow the icon filenames in /public/assets/icons/games/*.png

export type GameId = string;

type LegacyGameMeta = {
  name: string;
  iconImagePath: string;
  heroImagePath?: string | null;
  legacyEnumKey: string | null;
  sortOrder: number;
  isDefault: boolean;
};

export const LEGACY_GAME_META: Record<string, LegacyGameMeta> = {
  w40k: {
    name: "Warhammer 40,000",
    iconImagePath: "/assets/icons/games/w40k.png",
    heroImagePath: "/assets/heroes/games/w40k.jpg",
    legacyEnumKey: "W40K",
    sortOrder: 10,
    isDefault: false,
  },
  aos: {
    name: "Age of Sigmar",
    iconImagePath: "/assets/icons/games/aos.png",
    heroImagePath: "/assets/heroes/games/aos.jpg",
    legacyEnumKey: "AOS",
    sortOrder: 20,
    isDefault: false,
  },
  tow: {
    name: "The Old World",
    iconImagePath: "/assets/icons/games/tow.png",
    heroImagePath: "/assets/heroes/games/tow.jpg",
    legacyEnumKey: "TOW",
    sortOrder: 30,
    isDefault: false,
  },
  esdla: {
    name: "ESDLA",
    iconImagePath: "/assets/icons/games/esdla.png",
    heroImagePath: "/assets/heroes/games/esdla.jpg",
    legacyEnumKey: "ESDLA",
    sortOrder: 40,
    isDefault: false,
  },
  bb: {
    name: "Blood Bowl",
    iconImagePath: "/assets/icons/games/bloodbowl.png",
    heroImagePath: "/assets/heroes/games/bloodbowl.jpg",
    legacyEnumKey: "BB",
    sortOrder: 50,
    isDefault: false,
  },
  marvel: {
    name: "Marvel Crisis Protocol",
    iconImagePath: "/assets/icons/games/mcp.png",
    heroImagePath: "/assets/heroes/games/marvel.jpg",
    legacyEnumKey: "MARVEL",
    sortOrder: 60,
    isDefault: false,
  },
  rol: {
    name: "Rol",
    iconImagePath: "/assets/icons/games/rol.png",
    heroImagePath: "/assets/heroes/games/rol.jpg",
    legacyEnumKey: "ROL",
    sortOrder: 70,
    isDefault: false,
  },
  magic: {
    name: "Magic",
    iconImagePath: "/assets/icons/games/magic.png",
    heroImagePath: "/assets/heroes/games/magic.jpg",
    legacyEnumKey: "MAGIC",
    sortOrder: 80,
    isDefault: false,
  },
  boardgames: {
    name: "Juegos de mesa",
    iconImagePath: "/assets/icons/games/juegosdemesa.png",
    heroImagePath: "/assets/heroes/games/boardgames.jpg",
    legacyEnumKey: "JUEGOS_DE_MESA",
    sortOrder: 90,
    isDefault: false,
  },
  otros: {
    name: "Otros",
    iconImagePath: "/assets/icons/games/otros.png",
    heroImagePath: "/assets/heroes/games/otros.jpg",
    legacyEnumKey: "OTROS",
    sortOrder: 100,
    isDefault: true,
  },
};

export function fallbackGameList() {
  return Object.entries(LEGACY_GAME_META)
    .map(([slug, meta]) => ({ slug, ...meta }))
    .sort((a, b) => {
      if (a.sortOrder === b.sortOrder) {
        return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
      }
      return a.sortOrder - b.sortOrder;
    });
}

export function fallbackGameName(slug: string) {
  return LEGACY_GAME_META[slug]?.name ?? slug;
}

export const FACTIONS: Record<
  "w40k" | "aos" | "tow",
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
  return fallbackGameName(id);
}

// === Helpers UI <-> enum ===

export function toEnumKey(uiId: string): string {
  return uiId.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

export function toUiId(enumKey: string): string {
  return enumKey.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

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

export function enumFactionToUi(game: "w40k" | "aos" | "tow", value: string): string {
  if (game === "aos") return AOS_ENUM_TO_UI[value] ?? toUiId(value);
  if (game === "tow") return TOW_ENUM_TO_UI[value] ?? toUiId(value);
  return toUiId(value);
}

// === Icons ===

export function gameIconPath(slug: string): string {
  return LEGACY_GAME_META[slug]?.iconImagePath ?? `/assets/icons/games/${slug}.png`;
}

export function gameHeroPath(slug: string): string {
  const hero = LEGACY_GAME_META[slug]?.heroImagePath;
  if (hero) return hero;
  return `/assets/heroes/games/${slug}.jpg`;
}

// Factions live under /assets/icons/factions/{game}/{uiId}.png
// W40K has a missing imperial_agents icon, reusing deathwatch.png
export function factionIconPath(game: "w40k" | "aos" | "tow", uiId: string): string {
  if (game === "w40k" && uiId === "imperial_agents") {
    return `/assets/icons/factions/${game}/deathwatch.png`;
  }
  return `/assets/icons/factions/${game}/${uiId}.png`;
}
