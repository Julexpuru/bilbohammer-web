"use client";

import * as React from "react";
import type { GameCatalogItem } from "@/lib/game-catalog";
import { fallbackGameList } from "@/lib/games";

export type GameCatalogEntry = {
  id: string;
  slug: string;
  name: string;
  iconImagePath: string | null;
  heroImagePath: string | null;
  legacyEnumKey: string | null;
  isDefault: boolean;
  sortOrder: number;
};

function normalizeResponse(json: unknown): GameCatalogItem[] {
  if (!json || typeof json !== "object") return [];
  const payload = json as Record<string, unknown>;
  const games = Array.isArray(payload.games) ? payload.games : [];
  return games.filter((item): item is GameCatalogItem => {
    if (!item || typeof item !== "object") return false;
    const entry = item as Record<string, unknown>;
    return (
      typeof entry.id === "string" &&
      typeof entry.slug === "string" &&
      typeof entry.name === "string"
    );
  });
}

function mergeWithFallback(data: GameCatalogItem[]): GameCatalogEntry[] {
  if (!data.length) {
    return fallbackGameList().map((item) => ({
      id: item.slug,
      slug: item.slug,
      name: item.name,
      iconImagePath: item.iconImagePath,
      legacyEnumKey: item.legacyEnumKey,
      isDefault: item.isDefault,
      sortOrder: item.sortOrder,
    }));
  }

  const fallbackMap = new Map(
    fallbackGameList().map((entry) => [entry.slug, entry])
  );

  const merged = data.map((game) => {
    const fallback = fallbackMap.get(game.slug);
    return {
      id: game.id,
      slug: game.slug,
      name: game.name ?? fallback?.name ?? game.slug,
      iconImagePath: game.iconImagePath ?? fallback?.iconImagePath ?? null,
      heroImagePath: game.heroImagePath ?? fallback?.heroImagePath ?? null,
      legacyEnumKey: game.legacyEnumKey ?? fallback?.legacyEnumKey ?? null,
      isDefault: game.isDefault ?? fallback?.isDefault ?? false,
      sortOrder: game.sortOrder ?? fallback?.sortOrder ?? 999,
    };
  });

  const knownSlugs = new Set(merged.map((item) => item.slug));
  for (const fallback of fallbackMap.values()) {
    if (!knownSlugs.has(fallback.slug)) {
      merged.push({
        id: fallback.slug,
        slug: fallback.slug,
        name: fallback.name,
      iconImagePath: fallback.iconImagePath,
      heroImagePath: fallback.heroImagePath ?? null,
        legacyEnumKey: fallback.legacyEnumKey,
        isDefault: fallback.isDefault,
        sortOrder: fallback.sortOrder,
      });
    }
  }

  return merged.sort((a, b) => {
    if (a.sortOrder === b.sortOrder) {
      return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    }
    return a.sortOrder - b.sortOrder;
  });
}

type State = {
  games: GameCatalogEntry[];
  loading: boolean;
  error: string | null;
};

export function useGamesCatalog(): State {
  const [state, setState] = React.useState<State>(() => ({
    games: mergeWithFallback([]),
    loading: true,
    error: null,
  }));

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/games", { cache: "no-store" });
        if (!res.ok) throw new Error(`status_${res.status}`);
        const json = await res.json();
        const normalized = normalizeResponse(json);
        if (!cancelled) {
          setState({
            games: mergeWithFallback(normalized),
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        console.warn("[useGamesCatalog] fetch failed", error);
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : "fetch_failed",
          }));
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
