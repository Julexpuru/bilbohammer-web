import type { GameId } from "@/lib/games";
import { Juego } from "@prisma/client";

export const GAME_ID_TO_ENUM: Record<GameId, Juego> = {
  w40k: Juego.W40K,
  aos: Juego.AOS,
  tow: Juego.TOW,
  esdla: Juego.ESDLA,
  bb: Juego.BB,
  marvel: Juego.MARVEL,
  rol: Juego.ROL,
  magic: Juego.MAGIC,
  boardgames: Juego.JUEGOS_DE_MESA,
  otros: Juego.OTROS,
};

export const GAME_ENUM_TO_ID: Record<Juego, GameId> = Object.fromEntries(
  Object.entries(GAME_ID_TO_ENUM).map(([gameId, enumValue]) => [enumValue, gameId as GameId]),
) as Record<Juego, GameId>;

export function gameIdToEnum(id: GameId): Juego {
  return GAME_ID_TO_ENUM[id];
}

export function juegoEnumToId(game: Juego): GameId {
  return GAME_ENUM_TO_ID[game];
}
