export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { buildEventSlug } from "@/lib/events/slug";

type FilterParams = {
  gameId?: string | null;
  tableId?: string | null;
  status?: string | null;
};

async function loadReservations(filters: FilterParams) {
  const now = new Date();
  const to = new Date();
  to.setDate(now.getDate() + 7);
  const reservations = await prisma.tableReservation.findMany({
    where: {
      start: { lt: to },
      end: { gt: now },
      status: filters.status ? (filters.status as any) : { not: "CANCELLED" },
      ...(filters.tableId ? { tableId: filters.tableId } : {}),
      ...(filters.gameId
        ? {
            match: { gameId: filters.gameId },
          }
        : {}),
    },
    orderBy: { start: "asc" },
    include: {
      table: true,
      match: { include: { game: true, event: true } },
    },
  });
  return reservations;
}

async function loadTables() {
  return prisma.clubTable.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

async function loadGames() {
  return prisma.game.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });
}

export default async function CalendarioPage({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const gameId = typeof searchParams?.gameId === "string" ? searchParams?.gameId : null;
  const tableId = typeof searchParams?.tableId === "string" ? searchParams?.tableId : null;
  const status = typeof searchParams?.status === "string" ? searchParams?.status : null;

  const [reservations, tables, games] = await Promise.all([
    loadReservations({ gameId, tableId, status }),
    loadTables(),
    loadGames(),
  ]);
  const grouped = groupByDay(reservations);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-0">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Juego organizado</p>
        <h1 className="text-3xl font-bold text-[var(--text)] sm:text-4xl">Calendario de partidas</h1>
        <p className="max-w-3xl text-[var(--muted)]">
          Próximos 7 días: reservas de mesa y partidas confirmadas. Más adelante se integrará un calendario completo.
        </p>
      </div>
      <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4">
        <h2 className="text-lg font-semibold text-[var(--text)]">Próximas reservas</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Incluye reservas vinculadas a partidas y bloqueos activos.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <FilterSelect label="Juego" name="gameId" items={games} current={gameId} />
          <FilterSelect label="Mesa" name="tableId" items={tables} current={tableId} />
          <FilterSelect
            label="Estado"
            name="status"
            current={status}
            items={[
              { id: "PENDING", name: "Pendiente" },
              { id: "CONFIRMED", name: "Confirmada" },
              { id: "IN_PLAY", name: "En juego" },
              { id: "ENDED", name: "Terminada" },
            ]}
          />
        </div>
        <div className="mt-4 space-y-4">
          {reservations.length === 0 && <p className="text-sm text-[var(--muted)]">No hay reservas en los próximos 7 días.</p>}
          {Object.entries(grouped).map(([dayKey, items]) => (
            <div key={dayKey} className="space-y-2">
              <div className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">{dayKey}</div>
              <div className="space-y-2">
                {items.map((res) => {
                  const start = new Date(res.start);
                  const end = new Date(res.end);
                  const eventSlug = res.match?.event ? buildEventSlug(res.match.event.id, res.match.event.title) : null;
                  return (
                    <div
                      key={res.id}
                      className="flex flex-col gap-1 rounded-xl border border-[var(--hairline)] bg-[var(--card)] p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--text)]">
                            {res.match?.game?.name || "Reserva de mesa"}
                          </span>
                          <span className="rounded-full bg-[var(--accent-50)] px-2 py-[2px] text-[11px] font-semibold uppercase text-[var(--accent-600)]">
                            {res.status}
                          </span>
                          {eventSlug && (
                            <a
                              href={`/eventos/${eventSlug}`}
                              className="rounded-full bg-indigo-50 px-2 py-[2px] text-[11px] font-semibold uppercase text-indigo-700 underline"
                            >
                              {res.match?.event?.title}
                            </a>
                          )}
                        </div>
                        <div className="text-sm text-[var(--muted)]">
                          {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} →{" "}
                          {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        {res.table && (
                          <div className="text-sm text-[var(--text)]">
                            Mesa: <span className="font-semibold">{res.table.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type FilterItem = { id: string; name: string };

function FilterSelect({
  label,
  name,
  items,
  current,
}: {
  label: string;
  name: string;
  items: FilterItem[];
  current: string | null;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
      {label}
      <select
        className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
        value={current ?? ""}
        onChange={(e) => {
          const params = new URLSearchParams(window.location.search);
          if (e.target.value) {
            params.set(name, e.target.value);
          } else {
            params.delete(name);
          }
          const next = params.toString();
          window.location.search = next ? `?${next}` : "";
        }}
      >
        <option value="">Todos</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function groupByDay(reservations: Awaited<ReturnType<typeof loadReservations>>) {
  return reservations.reduce<Record<string, typeof reservations>>((acc, res) => {
    const date = new Date(res.start);
    const key = date.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(res);
    return acc;
  }, {});
}
