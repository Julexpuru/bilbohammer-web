import { Juego, FaccionesW40K, FaccionesAoS, FaccionesTOW } from "@prisma/client";

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ======== GAMES =========
const JUEGO_KEYS = Object.keys(Juego) as Array<keyof typeof Juego>;

const GAME_ALIAS: Record<string, string[]> = {
  // uiId -> candidate tokens to match in enum keys
  w40k: ["W40K", "WARHAMMER40", "WARHAMMER_40"],
  aos: ["AOS", "AGEOFSIGMAR", "AGE_OF_SIGMAR"],
  tow: ["TOW", "THE_OLD_WORLD", "OLDWORLD"],
  bb: ["BB", "BLOODBOWL", "BLOOD_BOWL"],
  marvel: ["MCP", "MARVEL", "CRISIS_PROTOCOL"],
  rol: ["ROL", "ROLEPLAY", "ROLE_PLAY", "RPG"],
  magic: ["MAGIC", "MTG"],
  boardgames: ["BOARD", "BOARDGAMES", "BOARD_GAMES", "MESA"],
  otros: ["OTROS", "OTHERS"],
};

export function uiGameToEnum(uiId: string): keyof typeof Juego | null {
  const up = uiId.toUpperCase() as any;
  if (JUEGO_KEYS.includes(up)) return up;

  const norm = normalize(uiId);
  // exact normalized match
  const direct = JUEGO_KEYS.find(k => normalize(String(k)) === norm);
  if (direct) return direct as any;

  const aliases = GAME_ALIAS[uiId] || [];
  for (const token of aliases) {
    const found = JUEGO_KEYS.find(k => String(k).includes(token));
    if (found) return found as any;
  }
  return null;
}

// ======== FACTIONS =========
function keys<T>(e: T) { return Object.keys(e as any) as string[]; }

const W40K_KEYS = keys(FaccionesW40K);
const AOS_KEYS = keys(FaccionesAoS);
const TOW_KEYS = keys(FaccionesTOW);

const W40K_ALIAS: Record<string, string[]> = {
  sm: ["SPACE_MARINES"],
  votann: ["LEAGUES_OF_VOTANN", "VOTANN"],
  custodes: ["ADEPTUS_CUSTODES", "CUSTODES"],
  tau: ["TAU", "T_AU", "TAU_EMPIRE"],
  necrons: ["NECRONS"],
  tyranids: ["TYRANIDS", "TIRANIDOS", "TYRANID"],
};

const AOS_ALIAS: Record<string, string[]> = {
  stormcast: ["STORMCAST", "STORMCAST_ETERNALS"],
  slaves: ["SLAVES_TO_DARKNESS", "SLAVES"],
  orruks: ["ORRUK", "ORRUKS", "ORRUK_WARCLANS", "WARCLANS"],
  soulblight: ["SOULBLIGHT", "SOULBLIGHT_GRAVELORDS", "GRAVELORDS"],
};

const TOW_ALIAS: Record<string, string[]> = {
  empire: ["EMPIRE", "EMPIRE_OF_MAN"],
  bretonnia: ["BRETONNIA"],
  dwarfs: ["DWARFS", "DWARVES", "DWARF"],
  greenskins: ["GREENSKINS", "GREEN_SKINS"],
};

function findEnumKey(valid: string[], uiId: string, aliases: Record<string,string[]>) {
  const up = uiId.toUpperCase();
  if (valid.includes(up)) return up;
  const byNorm = valid.find(k => normalize(k) === normalize(uiId));
  if (byNorm) return byNorm;
  const al = aliases[uiId] || [];
  for (const token of al) {
    const found = valid.find(k => k.includes(token));
    if (found) return found;
  }
  return null;
}

export function uiFactionToEnumW40K(id: string): string | null {
  return findEnumKey(W40K_KEYS, id, W40K_ALIAS);
}
export function uiFactionToEnumAoS(id: string): string | null {
  return findEnumKey(AOS_KEYS, id, AOS_ALIAS);
}
export function uiFactionToEnumTOW(id: string): string | null {
  return findEnumKey(TOW_KEYS, id, TOW_ALIAS);
}
