'use client';

import Image from "next/image";
import clsx from "clsx";
import * as React from "react";
import type { FC } from "react";
import { factionIconPath, gameIconPath } from "@/lib/games";

type ImgProps = {
  cacheKey: string;
  primary?: string | null;
  wrapperClassName?: string;
  imageClassName?: string;
  hideIfMissing?: boolean;
};

const resolvedSrcCache = new Map<string, string>();

const ImgWithFallback = React.memo(function ImgWithFallback({
  cacheKey,
  primary,
  wrapperClassName,
  imageClassName,
  hideIfMissing = true,
}: ImgProps) {
  const candidates = React.useMemo(() => (primary ? [primary] : []), [primary]);
  const cached = resolvedSrcCache.get(cacheKey) || null;
  const [index, setIndex] = React.useState(cached ? Math.max(0, candidates.indexOf(cached)) : 0);
  const [failed, setFailed] = React.useState(false);
  const src = cached ?? candidates[index] ?? null;

  React.useEffect(() => {
    if (src && !resolvedSrcCache.has(cacheKey)) {
      resolvedSrcCache.set(cacheKey, src);
    }
  }, [src, cacheKey]);

  if (!src || failed) {
    return hideIfMissing ? null : <></>;
  }

  const handleError = () => {
    if (!cached && index + 1 < candidates.length) {
      setIndex(index + 1);
    } else {
      setFailed(true);
    }
  };

  return (
    <span className={clsx("relative block", wrapperClassName)}>
      <Image
        src={src}
        alt=""
        fill
        sizes="96px"
        className={clsx("object-contain", imageClassName)}
        onError={handleError}
      />
    </span>
  );
}, (prev, next) => {
  return (
    prev.cacheKey === next.cacheKey &&
    prev.primary === next.primary &&
    prev.wrapperClassName === next.wrapperClassName &&
    prev.imageClassName === next.imageClassName &&
    prev.hideIfMissing === next.hideIfMissing
  );
});

type Faction = { id: string; name: string; iconUrl?: string | null };
type UserGame = { id: string; name: string; iconUrl?: string | null; factions?: Faction[] };

function GameIcon({
  id,
  name,
  iconUrl,
  hideLabel = false,
}: {
  id: string;
  name: string;
  iconUrl?: string | null;
  hideLabel?: boolean;
}) {
  return (
    <div className="flex w-36 flex-col items-center gap-2">
      <div className="relative grid h-36 w-36 place-items-center overflow-hidden rounded-lg border border-white/10 bg-slate-800/50">
        <ImgWithFallback
          cacheKey={`game:${id}`}
          primary={iconUrl || gameIconPath(id as any)}
          wrapperClassName="h-full w-full"
        />
      </div>
      {!hideLabel && <span className="text-center text-sm opacity-80 line-clamp-2">{name}</span>}
    </div>
  );
}

function FactionIcon({
  gameId,
  id,
  name,
  iconUrl,
}: {
  gameId: "w40k" | "aos" | "tow";
  id: string;
  name: string;
  iconUrl?: string | null;
}) {
  return (
    <div
      className="relative grid h-[4rem] w-[4rem] place-items-center overflow-hidden rounded-md border border-white/10 bg-slate-800/50"
      title={name}
    >
      <ImgWithFallback
        cacheKey={`faction:${gameId}:${id}`}
        primary={iconUrl || factionIconPath(gameId, id)}
        wrapperClassName="h-full w-full"
      />
    </div>
  );
}

export const GamesSection: FC<{ games?: UserGame[] }> = ({ games }) => {
  if (!games || games.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
        <h2 className="mb-2 text-lg font-semibold">Juegos</h2>
        <p className="text-sm opacity-70">No hay juegos registrados.</p>
      </div>
    );
  }

  const OTHER_ORDER: Array<"esdla" | "bb" | "marvel" | "rol" | "magic" | "boardgames" | "otros"> = [
    "esdla",
    "bb",
    "marvel",
    "rol",
    "magic",
    "boardgames",
    "otros",
  ];
  const specialOrder = ["w40k", "aos", "tow"] as const;
  const specialsSet = new Set<string>(specialOrder as readonly string[]);

  const specialGames = specialOrder
    .map((id) => games.find((game) => game.id === id))
    .filter((game): game is UserGame => Boolean(game));

  const orderIndex = new Map(OTHER_ORDER.map((id, position) => [id, position]));
  const otherGames = games
    .filter((game) => !specialsSet.has(game.id))
    .slice()
    .sort((a, b) => (orderIndex.get(a.id as any) ?? 999) - (orderIndex.get(b.id as any) ?? 999));

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
      <h2 className="mb-4 text-lg font-semibold">Juegos</h2>

      {specialGames.map((game) => (
        <div key={game.id} className="mb-8">
          <div className="mb-3 flex items-center gap-4">
            <GameIcon id={game.id} name={game.name} iconUrl={game.iconUrl} hideLabel />
            <h3 className="text-lg font-semibold">{game.name}</h3>
          </div>
          {game.factions && game.factions.length > 0 ? (
            <div className="flex flex-wrap gap-3 pl-1">
              {[...game.factions]
                .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }))
                .map((faction) => (
                  <FactionIcon
                    key={`${game.id}-${faction.id}`}
                    gameId={game.id as any}
                    id={faction.id}
                    name={faction.name}
                    iconUrl={faction.iconUrl ?? undefined}
                  />
                ))}
            </div>
          ) : (
            <p className="pl-1 text-sm opacity-70">Sin facciones seleccionadas.</p>
          )}
        </div>
      ))}

      {otherGames.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-6">
          {otherGames.map((game) => (
            <GameIcon key={game.id} id={game.id} name={game.name} iconUrl={game.iconUrl} />
          ))}
        </div>
      )}
    </div>
  );
};
