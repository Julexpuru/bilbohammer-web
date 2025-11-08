// web/src/components/home/FeedTabs.tsx
"use client";

import clsx from "clsx";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getClubDateTimeFormatter } from "@/lib/date-format";
import { HOME_FEED_PAGE_SIZE } from "@/constants/feed";

type PostType = "ANUNCIO" | "EVENTO" | "NOTICIA_PRIVADA";

type Post = {
  id: string;
  type: PostType;
  title: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  event?: any;
  reactionScore?: number | null;
};

const ALL_TABS: readonly { key: PostType; label: string }[] = [
  { key: "ANUNCIO", label: "Anuncios" },
  { key: "EVENTO", label: "Eventos" },
  { key: "NOTICIA_PRIVADA", label: "Noticias (socios)" },
] as const;

const TAB_LABEL: Record<PostType, string> = {
  ANUNCIO: "Anuncios",
  EVENTO: "Eventos",
  NOTICIA_PRIVADA: "Noticias (socios)",
};

const ARCHIVE_LINK: Record<PostType, { href: string; label: string }> = {
  ANUNCIO: { href: "/novedades?tab=news", label: "Novedades publicas" },
  EVENTO: { href: "/eventos", label: "Agenda completa" },
  NOTICIA_PRIVADA: { href: "/novedades?tab=members", label: "Novedades para socios" },
};

const DATE_FORMAT = getClubDateTimeFormatter({
  day: "2-digit",
  month: "short",
});

const TIME_FORMAT = getClubDateTimeFormatter({
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(value: string) {
  try {
    return DATE_FORMAT.format(new Date(value));
  } catch {
    return value;
  }
}

function formatTime(value: string) {
  try {
    return TIME_FORMAT.format(new Date(value));
  } catch {
    return "";
  }
}

function buildExcerpt(text: string, max = 220) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1)}â€¦`;
}

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

  const [itemsByTab, setItemsByTab] = useState<Record<PostType, Post[]>>(() => {
    const empty: Record<PostType, Post[]> = { ANUNCIO: [], EVENTO: [], NOTICIA_PRIVADA: [] };
    if (initialByType) {
      for (const key of Object.keys(initialByType) as PostType[]) {
        if (initialByType[key]) empty[key] = initialByType[key]!;
      }
    }
    return empty;
  });

  const [cursorByTab, setCursorByTab] = useState<Record<PostType, string | null>>({
    ANUNCIO: null,
    EVENTO: null,
    NOTICIA_PRIVADA: null,
  });

  const [hasMoreByTab, setHasMoreByTab] = useState<Record<PostType, boolean>>(() => {
    const initial: Record<PostType, boolean> = { ANUNCIO: false, EVENTO: false, NOTICIA_PRIVADA: false };
    for (const key of Object.keys(initialByType ?? {}) as PostType[]) {
      const list = initialByType?.[key] ?? [];
      initial[key] = list.length === HOME_FEED_PAGE_SIZE;
    }
    return initial;
  });

  const [loading, setLoading] = useState(false);

  const loadPage = useCallback(
    async (reset: boolean) => {
      if (loading) return;
      if (!hasMoreByTab[tab] && !reset) return;
      setLoading(true);
      try {
        const currentCursor = cursorByTab[tab];
        const url = new URL("/api/posts", window.location.origin);
        url.searchParams.set("type", tab);
        url.searchParams.set("limit", String(HOME_FEED_PAGE_SIZE));
        if (!reset && currentCursor) url.searchParams.set("cursor", currentCursor);

        const response = await fetch(url.toString());
        if (!response.ok) throw new Error("Error al cargar posts");
        const data: { items: Post[]; nextCursor: string | null } = await response.json();

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
    [tab, cursorByTab, hasMoreByTab, loading]
  );

  useEffect(() => {
    const alreadyLoaded = itemsByTab[tab] && itemsByTab[tab].length > 0;
    if (!alreadyLoaded) {
      setCursorByTab((prev) => ({ ...prev, [tab]: null }));
      setHasMoreByTab((prev) => ({ ...prev, [tab]: true }));
      loadPage(true);
    }
  }, [tab, itemsByTab, loadPage]);

  const items = itemsByTab[tab] || [];
  const hasItems = items.length > 0;
  const [featured, ...rest] = items;
  const archiveLink = ARCHIVE_LINK[tab];

  return (
    <section className="mt-16 space-y-8 md:space-y-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold">Noticias y anuncios</h2>
          <p className="text-sm text-[var(--muted)]">
            Actualidad del club, avisos relevantes y agenda abierta para todos los socios.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                "rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-600)]",
                tab === t.key
                  ? "bg-[var(--accent)] text-[#0b1216] shadow"
                  : "border border-[var(--hairline)] bg-[var(--card)] text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--text)]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {loading && !hasItems ? (
        <div className="rounded-3xl border border-dashed border-[var(--hairline)] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted)]">
          Cargando publicacionesâ€¦
        </div>
      ) : null}

      {!loading && !hasItems ? (
        <div className="rounded-3xl border border-dashed border-[var(--hairline)] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted)]">
          No hay publicaciones en esta categorÃ­a todavÃ­a. Cuando publiquemos algo nuevo aparecerÃ¡ aquÃ­ mismo.
        </div>
      ) : null}

      {featured ? (
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <article className="relative overflow-hidden rounded-[28px] border border-[var(--hairline)] bg-[var(--card)] p-8 text-white shadow-lg">
            {featured.imageUrl ? (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `linear-gradient(160deg, rgba(8,16,24,0.85), rgba(8,18,30,0.35)), url(${featured.imageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-600)]/25 via-transparent to-[var(--accent-600)]/15" />
            )}
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative z-10 flex h-full flex-col justify-end space-y-6">
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.28em] text-white/70">
                <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1">
                  {TAB_LABEL[featured.type]}
                </span>
                <time suppressHydrationWarning>{formatDate(featured.createdAt)}</time>
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold leading-tight md:text-3xl">{featured.title}</h3>
                <p className="text-sm text-white/80 md:text-base">{buildExcerpt(featured.content, 280)}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">Club Bilbohammer</span>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                  {formatTime(featured.createdAt)}
                </span>
              </div>
            </div>
          </article>

          <div className="grid gap-4 sm:grid-cols-2">
            {rest.map((post) => (
              <article
                key={post.id}
                className="group rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-5 transition hover:-translate-y-1 hover:border-[var(--border)] hover:shadow-xl"
              >
                <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
                  <span>{TAB_LABEL[post.type]}</span>
                  <time suppressHydrationWarning>{formatDate(post.createdAt)}</time>
                </div>
                <h4 className="mt-3 text-lg font-semibold text-[var(--text)] transition group-hover:text-[var(--accent-600)]">
                  {post.title}
                </h4>
                <p className="mt-2 text-sm text-[var(--muted)]">{buildExcerpt(post.content)}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {hasItems ? (
        <div className="flex justify-center">
          {hasMoreByTab[tab] ? (
            <button
              type="button"
              onClick={() => loadPage(false)}
              disabled={loading}
              className="rounded-full border border-[var(--hairline)] bg-[var(--card)] px-6 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border)] hover:text-white disabled:opacity-60"
            >
              {loading ? "Cargandoâ€¦" : "Ver mÃ¡s"}
            </button>
          ) : archiveLink ? (
            <Link
              href={archiveLink.href}
              prefetch={false}
              className="rounded-full border border-[var(--hairline)] bg-[var(--card)] px-6 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent-400)] hover:text-white"
            >
              Ver todas
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}


