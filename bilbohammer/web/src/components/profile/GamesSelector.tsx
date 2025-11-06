"use client";

import { enumFactionToUi, gameIconPath } from "@/lib/games";
import { PRISMA_W40K, PRISMA_AOS, PRISMA_TOW } from "@/lib/prisma-factions";
import { useGamesCatalog } from "@/lib/use-games-catalog";

export type GamesState = {
  selected: Set<string>; // game ids
  factions: Record<string, Set<string>>; // { w40k: Set("adepta_sororitas") }
};

// Nombre "bonito" de facción a partir del enum -> ui slug
function displayFromEnum(gameId: "w40k" | "aos" | "tow", enumKey: string): { uiId: string; name: string } {
  const uiId = enumFactionToUi(gameId, enumKey);
  // Humanizar uiId en caso de no tener catálogo con nombres
  const human = uiId.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  return { uiId, name: human };
}

export default function GamesSelector({
  state,
  onChange,
}: {
  state: GamesState;
  onChange: (next: GamesState) => void;
}) {
  const { games: catalogGames } = useGamesCatalog();
  const games = catalogGames;

  function toggleGame(id: string) {
    const next = new Set(state.selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...state, selected: next });
  }

  function toggleFaction(gameId: string, fid: string) {
    const current = state.factions[gameId] ?? new Set<string>();
    const nextSet = new Set(current);
    if (nextSet.has(fid)) nextSet.delete(fid);
    else nextSet.add(fid);
    onChange({ ...state, factions: { ...state.factions, [gameId]: nextSet } });
  }

  // Opciones: derivadas de los enums reales de Prisma
  const factionOptions = {
    w40k: PRISMA_W40K.map((k) => displayFromEnum("w40k", String(k))),
    aos: PRISMA_AOS.map((k) => displayFromEnum("aos", String(k))),
    tow: PRISMA_TOW.map((k) => displayFromEnum("tow", String(k))),
  } as const;

  return (
    <div className="space-y-3">
      <div className="border border-white/10 rounded-md">
        {games.map((g) => {
          const slug = g.slug;
          const checked = state.selected.has(slug);
          const label = g.name || slug;
          const iconSrc = g.iconImagePath ?? gameIconPath(slug);
          return (
            <div key={slug} className="flex items-center justify-between px-3 py-2 border-b border-white/10 last:border-b-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded bg-slate-800 grid place-items-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={iconSrc} alt="" className="h-7 w-7 object-contain" loading="lazy" decoding="async" />
                </div>
                <div className="text-sm truncate">{label}</div>
              </div>
              <input type="checkbox" checked={checked} onChange={() => toggleGame(slug)} />
            </div>
          );
        })}
      </div>

      {(["w40k","aos","tow"] as const).map((gid) => {
        if (!state.selected.has(gid)) return null;
        const list = factionOptions[gid];
        const selectedF = state.factions[gid] ?? new Set<string>();
        return (
          <div key={gid} className="border border-white/10 rounded-md p-2">
            <div className="text-sm font-medium mb-2">Facciones de {gid.toUpperCase()}</div>
            {/* Scrollable list */}
            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
              {list.map((f) => (
                <label key={f.uiId} className="flex items-center justify-between px-2 py-1 bg-slate-800 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-slate-700 grid place-items-center text-[10px]">{f.name[0]}</div>
                    <span className="text-sm">{f.name}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedF.has(f.uiId)}
                    onChange={() => toggleFaction(gid, f.uiId)}
                  />
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
