// web/src/components/home/FeedTabs.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";

type PostType = "ANUNCIO" | "EVENTO" | "NOTICIA_PRIVADA";

type Post = {
  id: string;
  type: PostType;
  title: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  event?: any;
};

const ALL_TABS: readonly { key: PostType; label: string }[] = [
  { key: "ANUNCIO", label: "Anuncios" },
  { key: "EVENTO", label: "Eventos" },
  { key: "NOTICIA_PRIVADA", label: "Noticias (socios)" },
] as const;

export default function FeedTabs({
  showPrivate,
  initialByType,
}: {
  showPrivate: boolean;
  initialByType?: Partial<Record<PostType, Post[]>>;
}) {
  const tabs = useMemo(
    () => (showPrivate ? ALL_TABS : ALL_TABS.filter((t) => t.key !== "NOTICIA_PRIVADA")),
    [showPrivate]
  );

  const [tab, setTab] = useState<PostType>(tabs[0].key);

  // Estado por pestaña para poder cambiar sin perder la paginación previa
  const [itemsByTab, setItemsByTab] = useState<Record<PostType, Post[]>>(() => {
    const base = { ANUNCIO: [], EVENTO: [], NOTICIA_PRIVADA: [] } as Record<PostType, Post[]>;
    if (initialByType) {
      for (const k of Object.keys(initialByType) as PostType[]) {
        if (initialByType[k]) base[k] = initialByType[k]!;
      }
    }
    return base;
  });

  const [cursorByTab, setCursorByTab] = useState<Record<PostType, string | null>>({
    ANUNCIO: null,
    EVENTO: null,
    NOTICIA_PRIVADA: null,
  });
  const [hasMoreByTab, setHasMoreByTab] = useState<Record<PostType, boolean>>({
    ANUNCIO: true,
    EVENTO: true,
    NOTICIA_PRIVADA: true,
  });
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Carga (página) para la pestaña actual
  const loadPage = useCallback(
    async (reset: boolean) => {
      if (loading) return;
      setLoading(true);
      try {
        const currentCursor = cursorByTab[tab];
        const url = new URL("/api/posts", window.location.origin);
        url.searchParams.set("type", tab);
        if (!reset && currentCursor) url.searchParams.set("cursor", currentCursor);

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("Error al cargar posts");
        const data: { items: Post[]; nextCursor: string | null } = await res.json();

        setItemsByTab((prev) => ({
          ...prev,
          [tab]: reset ? data.items : [...(prev[tab] || []), ...data.items],
        }));
        setCursorByTab((prev) => ({ ...prev, [tab]: data.nextCursor }));
        setHasMoreByTab((prev) => ({ ...prev, [tab]: !!data.nextCursor }));
      } finally {
        setLoading(false);
      }
    },
    [tab, cursorByTab, loading]
  );

  // Al cambiar de pestaña:
  // - Si ya hay datos (de SSR o de carga previa), no parpadea.
  // - Si no hay datos, cargamos la primera página.
  useEffect(() => {
    const hasInitial = (itemsByTab[tab] && itemsByTab[tab].length > 0);
    if (!hasInitial) {
      // primera vez en esta pestaña: reset de cursor/hasMore y carga
      setCursorByTab((prev) => ({ ...prev, [tab]: null }));
      setHasMoreByTab((prev) => ({ ...prev, [tab]: true }));
      loadPage(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Scroll infinito con IntersectionObserver
  useEffect(() => {
    if (!hasMoreByTab[tab] || loading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const ob = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMoreByTab[tab] && !loading) {
        loadPage(false);
      }
    }, { rootMargin: "200px" });
    ob.observe(el);
    return () => ob.disconnect();
  }, [tab, hasMoreByTab, loading, loadPage]);

  const items = itemsByTab[tab] || [];

  return (
    <section className="card mt-8">
      <div className="flex gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={"btn " + (tab === t.key ? "btn-accent" : "")}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ul className="space-y-4">
        {items.map((p) => (
          <li key={p.id} className="border rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-1">{p.title}</h3>
            <p className="text-sm opacity-80">{p.content}</p>
          </li>
        ))}
      </ul>

      <div ref={sentinelRef} className="h-10 flex items-center justify-center">
        {loading && <span className="text-sm opacity-70">Cargando…</span>}
        {!loading && items.length === 0 && (
          <span className="text-sm opacity-70">No hay elementos para mostrar.</span>
        )}
        {!hasMoreByTab[tab] && items.length > 0 && (
          <span className="text-xs opacity-60">No hay más resultados.</span>
        )}
      </div>
    </section>
  );
}
