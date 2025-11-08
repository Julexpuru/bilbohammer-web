"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import type { Article, ArticleCategory, ArticlesByCategory } from "./data";
import { CATEGORY_LABELS } from "./data";
import { ArticleShareButtons } from "./ArticleShareButtons";

type Props = {
  articlesByCategory: ArticlesByCategory;
  showMembersTab: boolean;
  canManage: boolean;
  initialTab?: ArticleCategory;
};

const TAB_ORDER: Array<{ id: ArticleCategory }> = [
  { id: "news" },
  { id: "chronicles" },
  { id: "members" },
];

type DateRange = {
  from: string;
  to: string;
};

export function NovedadesContent({ articlesByCategory, showMembersTab, canManage, initialTab }: Props) {
  const tabs = useMemo(
    () =>
      TAB_ORDER.filter((tab) => tab.id !== "members" || showMembersTab).map((tab) => ({
        id: tab.id,
        label: CATEGORY_LABELS[tab.id],
      })),
    [showMembersTab],
  );

  const fallbackTab = tabs[0]?.id ?? "news";
  const safeInitialTab = useMemo(() => {
    if (initialTab && tabs.some((tab) => tab.id === initialTab)) {
      return initialTab;
    }
    return fallbackTab;
  }, [fallbackTab, initialTab, tabs]);

  const [activeTab, setActiveTab] = useState<ArticleCategory>(safeInitialTab);
  const lastInitialTab = useRef<ArticleCategory>(safeInitialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" });

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(fallbackTab);
    }
  }, [activeTab, fallbackTab, tabs]);

  useEffect(() => {
    if (lastInitialTab.current === safeInitialTab) return;
    lastInitialTab.current = safeInitialTab;
    setActiveTab(safeInitialTab);
  }, [safeInitialTab]);

  const filteredArticles = useMemo(() => {
    const currentArticles = articlesByCategory[activeTab] ?? [];
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const fromDate = dateRange.from ? new Date(dateRange.from) : null;
    const toDate = dateRange.to ? new Date(dateRange.to) : null;

    return currentArticles.filter((article) => {
      if (!matchesSearch(article, normalizedQuery)) {
        return false;
      }

      const articleDate = new Date(article.date);
      if (Number.isNaN(articleDate.getTime())) {
        return true;
      }

      if (fromDate && articleDate < fromDate) {
        return false;
      }
      if (toDate) {
        const toDateEnd = new Date(toDate);
        toDateEnd.setHours(23, 59, 59, 999);
        if (articleDate > toDateEnd) {
          return false;
        }
      }
      return true;
    });
  }, [activeTab, articlesByCategory, dateRange.from, dateRange.to, searchQuery]);

  if (tabs.length === 0) {
    return (
      <section className="rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-10 text-center text-[var(--muted)]">
        No hay secciones de novedades disponibles todavÃ­a.
      </section>
    );
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-6 rounded-3xl border border-[var(--hairline)] bg-[var(--card-muted)] p-6">
        <div>
          <label htmlFor="novedades-search" className="block text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
            Buscar
          </label>
          <input
            id="novedades-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="TÃ­tulo, autor o tag"
            className="mt-2 w-full rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent-400)] focus:outline-none"
          />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Filtrar por fecha</p>
          <div className="mt-3 space-y-2">
            <label className="flex flex-col text-[var(--muted)]">
              <span className="text-xs font-medium uppercase tracking-[0.2em]">Desde</span>
              <input
                type="date"
                value={dateRange.from}
                onChange={(event) => setDateRange((prev) => ({ ...prev, from: event.target.value }))}
                className="mt-1 rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] focus:border-[var(--accent-400)] focus:outline-none"
              />
            </label>
            <label className="flex flex-col text-[var(--muted)]">
              <span className="text-xs font-medium uppercase tracking-[0.2em]">Hasta</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(event) => setDateRange((prev) => ({ ...prev, to: event.target.value }))}
                className="mt-1 rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] focus:border-[var(--accent-400)] focus:outline-none"
              />
            </label>
          </div>
          {(dateRange.from || dateRange.to) && (
            <button
              type="button"
              onClick={() => setDateRange({ from: "", to: "" })}
              className="mt-3 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent-600)]"
            >
              Limpiar fechas
            </button>
          )}
        </div>
      </aside>
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap gap-2" role="tablist" aria-label="Secciones de novedades">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition ${
                    isActive
                      ? "bg-[var(--accent-600)] text-white shadow-sm"
                      : "border border-[var(--hairline)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
              {filteredArticles.length} resultado{filteredArticles.length === 1 ? "" : "s"}
            </p>
            {canManage && (
              <Link
                href="/novedades/nueva"
                className="rounded-full bg-[var(--accent-600)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-[var(--accent-500)]"
              >
                Crear noticia
              </Link>
            )}
          </div>
        </header>

        <div className="space-y-6">
          {filteredArticles.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--hairline)] bg-[var(--card-muted)] p-10 text-center text-sm text-[var(--muted)]">
              No encontramos publicaciones que encajen con los filtros seleccionados.
            </div>
          ) : (
            filteredArticles.map((article) => <HeroCard key={article.id} article={article} />)
          )}
        </div>
      </div>
    </section>
  );
}

function matchesSearch(article: Article, normalizedQuery: string) {
  if (normalizedQuery.length === 0) return true;
  const haystack = [article.title, article.author, article.tags.join(" "), article.summary].join(" ").toLowerCase();
  return haystack.includes(normalizedQuery);
}

function toExcerpt(summary: string) {
  const words = summary.trim().split(/\s+/);
  if (words.length <= 100) {
    return summary.trim();
  }
  return `${words.slice(0, 100).join(" ")}â€¦`;
}

function formatReadableDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
    return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(parsed);
}

type HeroCardProps = {
  article: Article;
};

function HeroCard({ article }: HeroCardProps) {
  const excerpt = useMemo(() => toExcerpt(article.summary), [article.summary]);
  const formattedDate = useMemo(() => formatReadableDate(article.date), [article.date]);
  const href = `/novedades/${article.category}/${article.slug}`;

  return (
    <article className="overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--card)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative h-56 w-full bg-[var(--card-muted)]">
        <img src={article.banner} alt={`Banner de ${article.title}`} className="h-full w-full object-cover" />
      </div>
      <div className="space-y-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
          <span>{formattedDate}</span>
          <span>|</span>
          <span>{article.author}</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex-1 text-2xl font-semibold text-[var(--text)]">
            <Link href={href} className="transition hover:text-[var(--accent-600)]">
              {article.title}
            </Link>
          </h2>
          <ArticleShareButtons
            category={article.category}
            slug={article.slug}
            title={article.title}
            summary={article.summary}
            className="sm:ml-4"
            appearance="light"
          />
        </div>
        <p className="text-sm text-[var(--muted)]">{excerpt}</p>
        <div className="flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-[var(--accent-50)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-600)]">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

