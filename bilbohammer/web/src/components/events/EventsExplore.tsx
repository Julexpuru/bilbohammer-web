"use client";
import React from "react";
import Image from "next/image";
import clsx from "clsx";
import EventStatusBadge from "@/components/events/EventStatusBadge";
import EventShareButtons from "@/components/events/EventShareButtons";
import Link from "next/link";
import { useGamesCatalog } from "@/lib/use-games-catalog";

type Props = { canCreate: boolean };

type Item = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  startsAt: string;
  endsAt: string;
  timezone?: string | null;
  venueName?: string | null;
  city?: string | null;
  bannerUrl?: string | null;
  status: string;
  priceGeneral?: string | null;
  priceSocios?: string | null;
  isInternal?: boolean;
  organizations?: string[];
  roles?: any[];
  tags?: string[];
};

type RoleEntry = {
  id: string;
  role: string;
  user?: {
    id?: string;
    nick?: string;
    name?: string;
    email?: string;
  };
};

function useDebounced<T>(value: T, delay = 350) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

const ALL_TYPES = ["TOURNAMENT", "LEAGUE", "WORKSHOP", "SOCIAL"] as const;
const TYPE_LABEL: Record<(typeof ALL_TYPES)[number], string> = {
  TOURNAMENT: "Torneo",
  LEAGUE: "Liga",
  WORKSHOP: "Taller",
  SOCIAL: "Social",
};

const currencyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

const parseAmount = (value: string | null | undefined): number | null => {
  if (value == null) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return amount;
};

const describePrice = (amount: number | null, audience: string): string | null => {
  if (amount == null) return null;
  if (amount <= 0) return `${audience}: Gratis`;
  return `${audience}: ${currencyFormatter.format(amount)}`;
};

export default function EventsExplore({ canCreate }: Props) {
  const [q, setQ] = React.useState("");
  const [orgBilbo, setOrgBilbo] = React.useState(true);
  const [orgOtros, setOrgOtros] = React.useState(true);
  const [types, setTypes] = React.useState<string[]>([]);
  const [selectedGames, setSelectedGames] = React.useState<string[]>([]);
  const [free, setFree] = React.useState(false);
  const [past, setPast] = React.useState(false);
  const [sort, setSort] = React.useState<"asc" | "desc">("asc");
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const { games: catalogGames } = useGamesCatalog();
  const gameFilters = catalogGames;

  const [items, setItems] = React.useState<Item[]>([]);
  const [nextCursor, setNextCursor] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const nextCursorRef = React.useRef<any>(null);
  const debQ = useDebounced(q, 350);

  const hasFilters = React.useMemo(() => {
    return (
      q.trim().length > 0 ||
      !orgBilbo ||
      !orgOtros ||
      types.length > 0 ||
      selectedGames.length > 0 ||
      free ||
      past
    );
  }, [q, orgBilbo, orgOtros, types, selectedGames, free, past]);

  const toggleOrganizer = (key: "bilbo" | "otros") => {
    if (key === "bilbo") setOrgBilbo((prev) => !prev);
    if (key === "otros") setOrgOtros((prev) => !prev);
  };

  const toggleType = (value: (typeof ALL_TYPES)[number]) => {
    setTypes((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const toggleGame = (slug: string) => {
    setSelectedGames((prev) => (prev.includes(slug) ? prev.filter((item) => item !== slug) : [...prev, slug]));
  };

  const resetFilters = () => {
    setQ("");
    setOrgBilbo(true);
    setOrgOtros(true);
    setTypes([]);
    setSelectedGames([]);
    setFree(false);
    setPast(false);
  };

  const buildSearchParams = React.useCallback(
    (reset: boolean) => {
      const params = new URLSearchParams();
      if (debQ) params.set("q", debQ);
      const orgsList: string[] = [];
      if (orgBilbo) orgsList.push("bilbohammer");
      if (orgOtros) orgsList.push("otros");
      if (orgsList.length === 1) params.set("orgs", orgsList.join(","));
      if (types.length) params.set("types", types.join(","));
      if (selectedGames.length) params.set("games", selectedGames.join(","));
      if (free) params.set("free", "1");
      if (past) params.set("past", "1");
      params.set("sort", sort);
      params.set("take", "12");
      const cursorValue = reset ? null : nextCursorRef.current;
      if (cursorValue) params.set("cursor", JSON.stringify(cursorValue));
      return params;
    },
    [debQ, orgBilbo, orgOtros, types, selectedGames, free, past, sort]
  );

  const fetchPage = React.useCallback(
    async (reset = false) => {
      setLoading(true);
      try {
        const params = buildSearchParams(reset);
        const res = await fetch(`/api/events/search?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error((data && data.error) || "Search failed");
        }
        setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
        setNextCursor(data.nextCursor || null);
        nextCursorRef.current = data.nextCursor || null;
      } catch (error) {
        console.error("[events] search failed", error);
      } finally {
        setLoading(false);
      }
    },
    [buildSearchParams]
  );

  React.useEffect(() => {
    nextCursorRef.current = null;
    setNextCursor(null);
    fetchPage(true);
  }, [fetchPage]);

  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && nextCursor && !loading) {
            fetchPage(false);
          }
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [fetchPage, nextCursor, loading]);

  const closeFilters = React.useCallback(() => setFiltersOpen(false), []);

  React.useEffect(() => {
    if (!filtersOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filtersOpen]);

  const renderFilterChip = (label: string, active: boolean, onClick: () => void, key?: React.Key) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-full border px-4 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-600)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]",
        active
          ? "border-[var(--accent-600)] bg-[var(--accent-50)] text-[var(--accent-600)] font-semibold shadow-[0_0_0_1px_rgba(14,165,233,0.35)]"
          : "border-[var(--hairline)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--text)]"
      )}
      aria-pressed={active}
    >
      {label}
    </button>
  );

  const FiltersPanel = ({ inputId }: { inputId: string }) => (
    <div className="space-y-6">
      <header className="space-y-4 rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-[var(--text)]">Filtros</h2>
        </div>

        <div className="space-y-2">
          <label htmlFor={inputId} className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
            Buscar por nombre o etiqueta
          </label>
          <input
            id={inputId}
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Ej. torneo, liga, narrativa"
            className="w-full rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-4 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={resetFilters}
          className={clsx("btn text-sm transition", hasFilters ? "opacity-100" : "opacity-50 cursor-not-allowed")}
          disabled={!hasFilters}
        >
          Limpiar filtros
        </button>
      </header>

      <section className="space-y-3 rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-6">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Organizador</h3>
        <div className="flex flex-wrap gap-2">
          {renderFilterChip("Bilbohammer", orgBilbo, () => toggleOrganizer("bilbo"))}
          {renderFilterChip("Otros colectivos", orgOtros, () => toggleOrganizer("otros"))}
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-6">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Formato</h3>
        <div className="flex flex-wrap gap-2">
          {ALL_TYPES.map((type) => renderFilterChip(TYPE_LABEL[type], types.includes(type), () => toggleType(type), type))}
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-6">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Juego</h3>
        <div className="flex flex-wrap gap-2">
          {gameFilters.map((game) =>
            renderFilterChip(
              game.name ?? game.slug,
              selectedGames.includes(game.slug),
              () => toggleGame(game.slug),
              game.slug
            )
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-6">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Estado</h3>
        <div className="flex flex-wrap gap-2">
          {renderFilterChip("Solo gratuitos", free, () => setFree((prev) => !prev))}
          {renderFilterChip("Incluir pasados", past, () => setPast((prev) => !prev))}
        </div>
      </section>
    </div>
  );

  return (
    <>
      <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--muted)]">Agenda</p>
          <h1 className="text-3xl font-semibold text-[var(--text)] sm:text-4xl">Eventos</h1>
          <p className="text-sm text-[var(--muted)]">
            Consulta partidas abiertas, jornadas temáticas y torneos tanto del club como de colectivos amigos.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            className="w-full rounded-full border border-[var(--hairline)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--text)] shadow-sm transition hover:border-[var(--accent)] sm:w-auto"
            onClick={() => setSort((prev) => (prev === "asc" ? "desc" : "asc"))}
          >
            Orden: {sort === "asc" ? "ascendente" : "descendente"}
          </button>
          <button
            type="button"
            className="w-full rounded-full border border-[var(--hairline)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--text)] shadow-sm transition hover:border-[var(--accent)] sm:w-auto lg:hidden"
            onClick={() => setFiltersOpen(true)}
          >
            Mostrar filtros
          </button>
          {canCreate && (
            <Link
              href="/eventos/nuevo"
              className="w-full rounded-full bg-emerald-500 px-4 py-2 text-center text-sm font-semibold text-white shadow transition hover:bg-emerald-400 sm:w-auto"
            >
              Crear evento
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <aside className="hidden lg:sticky lg:top-[calc(var(--nav-h)+1.5rem)] lg:block">
          <FiltersPanel inputId="events-search-desktop" />
        </aside>

        <section className="space-y-3">
          {items.map((ev) => {
            const start = new Date(ev.startsAt);
            const end = new Date(ev.endsAt);
            const tz = ev.timezone || "Europe/Madrid";
            const dateRange = new Intl.DateTimeFormat("es-ES", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: tz,
            }).formatRange(start, end);
            const where = [ev.venueName, ev.city].filter(Boolean).join(" - ");
            const roles = Array.isArray(ev.roles) ? (ev.roles as RoleEntry[]) : [];
            const organizers: React.ReactNode[] = [];
            const generalAmount = parseAmount(ev.priceGeneral);
            const sociosAmount = parseAmount(ev.priceSocios);
            const hasPriceInfo = generalAmount != null || sociosAmount != null;
            const allKnownPricesAreFree =
              hasPriceInfo &&
              (generalAmount == null || generalAmount <= 0) &&
              (sociosAmount == null || sociosAmount <= 0);
            const priceBadges: string[] = [];

            if (!hasPriceInfo || allKnownPricesAreFree) {
              priceBadges.push("Entrada gratuita");
            } else {
              const generalLabel = describePrice(generalAmount, "General");
              const sociosLabel = describePrice(sociosAmount, "Socios");
              if (generalLabel) priceBadges.push(generalLabel);
              if (sociosLabel) priceBadges.push(sociosLabel);
            }

            (ev.organizations || []).forEach((name, index) => {
              if (!name) return;
              organizers.push(<span key={`org-${index}`}>{name}</span>);
            });

            roles
              .filter((role) => role.role === "ORGANIZER" && role.user)
              .forEach((role) => {
                const user = role.user;
                const label = user?.nick || user?.name || user?.email;
                if (!label) return;
                organizers.push(
                  <Link key={`user-${user?.id ?? label}`} href={`/usuarios/${user?.id ?? ""}`} className="underline hover:no-underline">
                    {label}
                  </Link>
                );
              });

            const tags = Array.isArray(ev.tags) ? ev.tags : [];

            return (
              <article
                key={ev.id}
                className="flex flex-col gap-4 rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-4 shadow-sm transition hover:border-[var(--accent)] md:grid md:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/eventos/${ev.slug}`}
                      className="text-lg font-semibold text-[var(--text)] hover:underline"
                    >
                      {ev.title}
                    </Link>
                    <span className="md:hidden">
                      <EventStatusBadge status={ev.status as any} />
                    </span>
                    {ev.status !== "DRAFT" && ev.status !== "CANCELLED" && (
                      <div className="hidden md:flex items-center gap-2">
                        <EventShareButtons
                          eventSlug={ev.slug}
                          title={ev.title}
                          startsAt={ev.startsAt}
                          endsAt={ev.endsAt}
                          location={where || undefined}
                        />
                      </div>
                    )}
                  </div>
                  {ev.subtitle && <div className="text-sm opacity-80">{ev.subtitle}</div>}
                  <div className="text-sm opacity-90">
                    <strong>Cuando:</strong>{" "}
                    <span suppressHydrationWarning>{dateRange}</span>
                  </div>
                  {where && (
                    <div className="text-sm opacity-90">
                      <strong>Donde:</strong> {where}
                    </div>
                  )}
                  {organizers.length > 0 && (
                    <div className="text-sm opacity-90">
                      <strong>Organiza:</strong>{" "}
                      <span>
                        {organizers.map((node, index) => (
                          <React.Fragment key={index}>{index > 0 ? ", " : null}{node}</React.Fragment>
                        ))}
                      </span>
                    </div>
                  )}
                  {priceBadges.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {priceBadges.map((label) => (
                        <span
                          key={label}
                          className="rounded-full border border-[var(--accent-600)] bg-[var(--accent-50)] px-3 py-0.5 text-xs font-medium text-[var(--accent-600)]"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                  {tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {ev.status !== "DRAFT" && ev.status !== "CANCELLED" && (
                    <div className="mt-3 space-y-1 md:hidden">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Compartir</p>
                      <EventShareButtons
                        eventSlug={ev.slug}
                        title={ev.title}
                        startsAt={ev.startsAt}
                        endsAt={ev.endsAt}
                        location={where || undefined}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-start gap-3 md:flex-col md:items-end md:gap-4">
                  <span className="hidden md:block">
                    <EventStatusBadge status={ev.status as any} />
                  </span>
                  <div className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-black/30 md:h-28 md:w-28">
                    {ev.bannerUrl ? (
                      <Image
                        src={ev.bannerUrl}
                        alt="Banner del evento"
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="text-xs opacity-60">Sin imagen</div>
                    )}
                  </div>
                  {ev.status !== "DRAFT" && ev.status !== "CANCELLED" && (
                    <div className="hidden md:block">
                      <EventShareButtons
                        eventSlug={ev.slug}
                        title={ev.title}
                        startsAt={ev.startsAt}
                        endsAt={ev.endsAt}
                        location={where || undefined}
                      />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
          <div ref={sentinelRef} />
          {loading && <div className="text-sm opacity-70">Cargando...</div>}
          {!loading && items.length === 0 && <div className="text-sm opacity-70">Sin resultados.</div>}
        </section>
      </div>
      </main>

      {filtersOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeFilters} aria-hidden="true" />
          <div className="absolute inset-y-0 right-0 flex h-full w-full max-w-md flex-col overflow-hidden rounded-l-3xl bg-[var(--bg)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--hairline)] px-6 py-4">
              <p className="text-base font-semibold text-[var(--text)]">Filtros</p>
              <button
                type="button"
                className="rounded-full border border-[var(--hairline)] px-4 py-1 text-sm text-[var(--text)]"
                onClick={closeFilters}
              >
                Cerrar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <FiltersPanel inputId="events-search-mobile" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}



