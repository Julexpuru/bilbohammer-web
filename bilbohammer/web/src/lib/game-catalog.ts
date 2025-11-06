import { prisma } from "@/lib/prisma";
import { toEnumKey } from "@/lib/games_helpers";

export type GameCatalogItem = {
  id: string;
  slug: string;
  name: string;
  legacyEnumKey: string | null;
  iconImagePath: string | null;
  heroImagePath: string | null;
  sortOrder: number;
  isDefault: boolean;
};

export const GAME_INPUT_ALIASES: Record<string, string[]> = {
  w40k: ["W40K", "WARHAMMER_40K", "WARHAMMER_40000", "WARHAMMER40K"],
  aos: ["AOS", "AGE_OF_SIGMAR"],
  tow: ["TOW", "THE_OLD_WORLD", "OLD_WORLD"],
  esdla: ["ESDLA", "MIDDLE_EARTH", "LORD_OF_THE_RINGS", "EL_SENOR_DE_LOS_ANILLOS"],
  bb: ["BB", "BLOOD_BOWL"],
  marvel: ["MARVEL", "MCP", "CRISIS_PROTOCOL"],
  rol: ["ROL", "RPG", "ROLEPLAY"],
  magic: ["MAGIC", "MTG"],
  boardgames: ["BOARDGAMES", "BOARD_GAMES", "JUEGOS_DE_MESA"],
  otros: ["OTROS", "OTHERS"],
};

function buildLookups(games: GameCatalogItem[]) {
  const slug = new Map<string, GameCatalogItem>();
  const legacy = new Map<string, GameCatalogItem>();
  for (const game of games) {
    slug.set(game.slug.toLowerCase(), game);
    if (game.legacyEnumKey) {
      legacy.set(game.legacyEnumKey.toUpperCase(), game);
    }
  }
  return { slug, legacy };
}

export async function loadActiveGames(): Promise<GameCatalogItem[]> {
  return prisma.game.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      legacyEnumKey: true,
      iconImagePath: true,
      heroImagePath: true,
      sortOrder: true,
      isDefault: true,
    },
  });
}

export function resolveGameFromInput(
  input: string | undefined,
  games: GameCatalogItem[]
): GameCatalogItem | null {
  if (!input || !games.length) return null;
  const value = input.trim();
  if (!value) return null;

  const idMatch = games.find((game) => game.id === value);
  if (idMatch) return idMatch;

  const { slug, legacy } = buildLookups(games);
  const slugCandidate = value.toLowerCase();
  const direct = slug.get(slugCandidate);
  if (direct) return direct;

  const enumKey = toEnumKey(value);
  const legacyMatch = legacy.get(enumKey);
  if (legacyMatch) return legacyMatch;

  const aliasCandidates = [
    ...(GAME_INPUT_ALIASES[slugCandidate] ?? []),
    ...(GAME_INPUT_ALIASES[enumKey.toLowerCase()] ?? []),
  ];

  for (const candidate of aliasCandidates) {
    const candidateSlug = candidate.toLowerCase();
    const slugMatch = slug.get(candidateSlug);
    if (slugMatch) return slugMatch;

    const legacyMatchCandidate = legacy.get(toEnumKey(candidate));
    if (legacyMatchCandidate) return legacyMatchCandidate;
  }

  return null;
}

export function resolveGameIdsFromInput(uiIds: string[], games: GameCatalogItem[]): string[] {
  if (!uiIds?.length || !games.length) return [];
  const seen = new Set<string>();
  const resolved: string[] = [];
  for (const raw of uiIds) {
    const game = resolveGameFromInput(raw, games);
    if (game && !seen.has(game.id)) {
      seen.add(game.id);
      resolved.push(game.id);
    }
  }
  return resolved;
}
