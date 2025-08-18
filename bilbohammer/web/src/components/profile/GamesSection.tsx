"use client";

import * as React from "react";
import type { FC } from "react";
import { gameIconPath, factionIconPath } from "@/lib/games";

// ===== Stable image with cache and no placeholder text =====
type ImgProps = {
  cacheKey: string;
  primary?: string | null;
  className?: string;
  hideIfMissing?: boolean; // default: true
};

const resolvedSrcCache = new Map<string, string>();

const ImgWithFallback = React.memo(function ImgWithFallback({
  cacheKey,
  primary,
  className,
  hideIfMissing = true,
}: ImgProps) {
  const candidates = React.useMemo(() => (primary ? [primary] : []), [primary]);
  const cached = resolvedSrcCache.get(cacheKey) || null;
  const [idx, setIdx] = React.useState(cached ? Math.max(0, candidates.indexOf(cached)) : 0);
  const [failed, setFailed] = React.useState(false);
  const src = cached ?? candidates[idx] ?? null;

  React.useEffect(() => {
    if (src && !resolvedSrcCache.get(cacheKey)) resolvedSrcCache.set(cacheKey, src);
  }, [src, cacheKey]);

  if (!src || failed) return hideIfMissing ? null : <></>;

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt=""
      decoding="async"
      loading="lazy"
      draggable={false}
      className={className}
      onError={() => {
        if (!cached && idx + 1 < candidates.length) setIdx(idx + 1);
        else setFailed(true);
      }}
    />
  );
}, (prev, next) => (
  prev.cacheKey === next.cacheKey &&
  prev.primary === next.primary &&
  prev.className === next.className &&
  prev.hideIfMissing === next.hideIfMissing
));

type Faction = { id: string; name: string; iconUrl?: string | null };
type UserGame = { id: string; name: string; iconUrl?: string | null; factions?: Faction[] };

function GameIcon({ id, name, iconUrl, hideLabel = false }: { id: string; name: string; iconUrl?: string | null; hideLabel?: boolean }) {
  // x3 respecto al tamaño anterior (antes w-12 h-12)
  return (
    <div className="flex flex-col items-center gap-2 w-36">
      <div className="w-36 h-36 rounded-lg border border-white/10 grid place-items-center overflow-hidden bg-slate-800/50">
        <ImgWithFallback
          cacheKey={`game:${id}`}
          primary={iconUrl || gameIconPath(id as any)}
          className="w-full h-full object-contain"
          hideIfMissing
        />
      </div>
      {!hideLabel && <span className="text-sm opacity-80 text-center line-clamp-2">{name}</span>}
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
    <div className="w-[4rem] h-[4rem] rounded-md border border-white/10 grid place-items-center overflow-hidden bg-slate-800/50" title={name}>
      <ImgWithFallback
        cacheKey={`faction:${gameId}:${id}`}
        primary={iconUrl || factionIconPath(gameId, id)}
        className="w-full h-full object-contain"
        hideIfMissing
      />
    </div>
  );
}

export const GamesSection: FC<{ games?: UserGame[] }> = ({ games }) => {
  if (!games || games.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 p-4 bg-slate-900/40">
        <h2 className="text-lg font-semibold mb-2">Juegos</h2>
        <p className="text-sm opacity-70">No hay juegos registrados.</p>
      </div>
    );
  }
  
  // Orden fijo para los juegos "otros" (UI ids)
  const OTHER_ORDER: Array<"esdla"|"bb"|"marvel"|"rol"|"magic"|"boardgames"|"otros"> = [
    "esdla", "bb", "marvel", "rol", "magic", "boardgames", "otros",
  ];
  // Orden fijo de subsecciones especiales (si existen, se muestran en este orden)
  const specialOrder = ["w40k", "aos", "tow"] as const;
  const specialsSet = new Set<string>(specialOrder as readonly string[]);

  const specialGames = specialOrder
    .map((id) => games.find((g) => g.id === id))
    .filter((g): g is UserGame => Boolean(g));

  const orderIdx = new Map(OTHER_ORDER.map((id, i) => [id, i]));
  const otherGames = games
    .filter((g) => !specialsSet.has(g.id))
    .slice()
    .sort(
      (a, b) =>
        (orderIdx.get(a.id as any) ?? 999) -
        (orderIdx.get(b.id as any) ?? 999)
    );

  return (
    <div className="rounded-xl border border-white/10 p-4 bg-slate-900/40">
      <h2 className="text-lg font-semibold mb-4">Juegos</h2>

      {specialGames.map((g) => (
        <div key={g.id} className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            <GameIcon id={g.id} name={g.name} iconUrl={g.iconUrl} hideLabel />{/* sin texto debajo */}
            <h3 className="text-lg font-semibold">{g.name}</h3>
          </div>
          {g.factions && g.factions.length > 0 ? (
            <div className="flex flex-wrap gap-3 pl-1">
              {[...g.factions]
                .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }))
                .map((f) => (
                  <FactionIcon
                    key={`${g.id}-${f.id}`}
                    gameId={g.id as any}
                    id={f.id}
                    name={f.name}
                    iconUrl={f.iconUrl ?? undefined}
                  />
                ))}
            </div>
          ) : (
            <p className="text-sm opacity-70 pl-1">Sin facciones seleccionadas.</p>
          )}
        </div>
      ))}

      {otherGames.length > 0 && (
        <div className="flex flex-wrap gap-6 mb-8">
          {otherGames.map((g) => (
            <GameIcon key={g.id} id={g.id} name={g.name} iconUrl={g.iconUrl} />
          ))}
        </div>
      )}

    </div>
  );
};
