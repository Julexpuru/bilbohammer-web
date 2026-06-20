"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useSession } from "next-auth/react";
import { ChevronIcon } from "@/components/ui/ChevronIcon";
import { getClubDateTimeFormatter } from "@/lib/date-format";
import { getEffectiveSlotStatus, getSlotStatusLabel, type MatchLifecycleStatus, type PersistedSlotStatus } from "@/lib/organized-slot-status";
import { SlotProposalModal } from "@/components/juego-organizado/SlotProposalModal";

type CalendarProposal = {
  id: string;
  status: string;
  gameId: string | null;
  gameName: string | null;
  proposedStart: string;
  proposedEnd: string;
  note: string | null;
  createdAt: string;
};

type CalendarItem = {
  id: string;
  type: "reservation" | "match" | "slot";
  title: string;
  start: string;
  end: string;
  status: string;
  gameId: string | null;
  gameName: string | null;
  tableId: string | null;
  tableName: string | null;
  ownerId?: number | null;
  ownerName: string | null;
  format: string | null;
  note: string | null;
  eventTitle: string | null;
  matchId?: string | null;
  matchStatus?: MatchLifecycleStatus | null;
  matchParticipants?: string[];
  wantedGameIds?: string[];
  openGameIds?: string[];
  pendingProposalCount?: number;
  viewerProposal?: CalendarProposal | null;
};

type FilterItem = { id: string; name: string };

type DayCell = {
  date: Date;
  inMonth: boolean;
  key: string;
};

type Props = {
  games: FilterItem[];
  tables: FilterItem[];
  initialError?: string | null;
  canUseOrganizedPlay: boolean;
};

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

const MONTH_LABEL = getClubDateTimeFormatter({
  month: "long",
  year: "numeric",
});

const DAY_LABEL = getClubDateTimeFormatter({
  weekday: "long",
  day: "2-digit",
  month: "long",
});

const DATE_LABEL = getClubDateTimeFormatter({
  day: "2-digit",
  month: "short",
});

const TIME_LABEL = getClubDateTimeFormatter({
  hour: "2-digit",
  minute: "2-digit",
});

const reservationStatusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  IN_PLAY: "En juego",
  ENDED: "Terminada",
  DONE: "Terminada",
};

const matchStatusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Partida",
  IN_PLAY: "En curso",
  DONE: "Terminada",
  CANCELLED: "Cancelada",
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toDayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildMonthGrid(reference: Date): DayCell[] {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells: DayCell[] = [];

  for (let i = startOffset; i > 0; i--) {
    const date = new Date(year, month, 1 - i);
    cells.push({ date, inMonth: false, key: toDayKey(date) });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    cells.push({ date, inMonth: true, key: toDayKey(date) });
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    const date = new Date(year, month + 1, nextDay++);
    cells.push({ date, inMonth: false, key: toDayKey(date) });
  }

  return cells;
}

function capitalize(input: string) {
  return input ? input.charAt(0).toUpperCase() + input.slice(1) : input;
}

function formatHour(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : TIME_LABEL.format(date);
}

function rangeForGrid(cells: DayCell[]) {
  const from = startOfDay(cells[0].date);
  const to = startOfDay(cells[cells.length - 1].date);
  to.setDate(to.getDate() + 1);
  return { from, to };
}

export function OrganizedCalendarView({ games, tables, initialError = null, canUseOrganizedPlay }: Props) {
  const { data: session } = useSession();
  const userId = useMemo(() => {
    const raw = (session?.user as any)?.id;
    if (typeof raw === "number") return raw;
    if (typeof raw === "string") {
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }, [session]);

  const today = useMemo(() => startOfDay(new Date()), []);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<Date>(() => today);
  const [gameId, setGameId] = useState("");
  const [tableId, setTableId] = useState("");
  const [kind, setKind] = useState("");
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(initialError);
  const [refreshToken, setRefreshToken] = useState(0);
  const [proposalTarget, setProposalTarget] = useState<CalendarItem | null>(null);

  const cells = useMemo(() => buildMonthGrid(currentMonth), [currentMonth]);

  useEffect(() => {
    const controller = new AbortController();
    const { from, to } = rangeForGrid(cells);

    async function loadItems() {
      setLoading(true);
      setError(initialError);
      try {
        const params = new URLSearchParams({
          from: from.toISOString(),
          to: to.toISOString(),
        });
        const response = await fetch(`/api/juego-organizado/calendar?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error || "No se pudo cargar el calendario.");
        setItems(Array.isArray(body) ? body : []);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setItems([]);
        setError(err?.message || "No se pudo cargar el calendario.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadItems();
    return () => controller.abort();
  }, [cells, initialError, refreshToken]);

  useEffect(() => {
    function reloadItems() {
      setRefreshToken((current) => current + 1);
    }

    window.addEventListener("availability-slots:changed", reloadItems);
    return () => window.removeEventListener("availability-slots:changed", reloadItems);
  }, []);

  useEffect(() => {
    if (!isSameMonth(selectedDate, currentMonth)) {
      setSelectedDate(startOfMonth(currentMonth));
    }
  }, [currentMonth, selectedDate]);

  const filtered = useMemo(() => {
    return items
      .filter((item) => {
        if (gameId && item.gameId !== gameId && !item.wantedGameIds?.includes(gameId) && !item.openGameIds?.includes(gameId)) return false;
        if (tableId && item.tableId !== tableId) return false;
        if (kind && item.type !== kind) return false;
        return true;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [gameId, items, kind, tableId]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of filtered) {
      const key = toDayKey(new Date(item.start));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [filtered]);

  const selectedKey = toDayKey(selectedDate);
  const selectedItems = itemsByDay.get(selectedKey) ?? [];
  const monthLabel = capitalize(MONTH_LABEL.format(currentMonth));
  const selectedLabel = capitalize(DAY_LABEL.format(selectedDate));

  const handleDaySelect = (cell: DayCell) => {
    const cloned = startOfDay(cell.date);
    if (!cell.inMonth) setCurrentMonth(startOfMonth(cloned));
    setSelectedDate(cloned);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-[var(--hairline)] bg-[var(--bg)] p-1">
            <button type="button" onClick={() => setView("calendar")} className={viewButtonClass(view === "calendar")}>
              Calendario
            </button>
            <button type="button" onClick={() => setView("list")} className={viewButtonClass(view === "list")}>
              Listado
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterSelect
              label="Tipo"
              value={kind}
              onChange={setKind}
              items={[
                { id: "match", name: "Partidas" },
                { id: "slot", name: "Ofertas" },
                { id: "reservation", name: "Reservas" },
              ]}
            />
            <FilterSelect label="Juego" value={gameId} onChange={setGameId} items={games} />
            <FilterSelect label="Mesa" value={tableId} onChange={setTableId} items={tables} />
          </div>
        </div>
        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</div>}
      </div>

      {view === "calendar" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)]">
          <section className="rounded-[28px] border border-[var(--hairline)] bg-[var(--card)] p-5 shadow">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text)]">Calendario mensual</h2>
                <p className="text-sm text-[var(--muted)]">Navega por meses y selecciona un dia para ver las partidas.</p>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setCurrentMonth((prev) => addMonths(prev, -1))} className="rounded-full bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--accent)] hover:text-[#0b1216]" aria-label="Mes anterior">
                  <ChevronIcon direction="left" className="h-3.5 w-3.5" />
                </button>
                <span className="rounded-full bg-transparent px-4 py-2 text-sm font-semibold uppercase tracking-[0.28em] text-[var(--text)]">
                  {monthLabel}
                </span>
                <button type="button" onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))} className="rounded-full bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--accent)] hover:text-[#0b1216]" aria-label="Mes siguiente">
                  <ChevronIcon direction="right" className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="rounded-xl bg-[var(--hairline)]/30 py-2">
                  {label}
                </div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-2">
              {cells.map((cell) => {
                const dayItems = itemsByDay.get(cell.key) ?? [];
                const isSelected = isSameDay(cell.date, selectedDate);
                const isToday = isSameDay(cell.date, today);

                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => handleDaySelect(cell)}
                    className={clsx(
                      "flex min-h-[92px] flex-col items-center justify-between rounded-2xl px-2 py-2 text-sm transition",
                      cell.inMonth ? "border border-[var(--hairline)] bg-[var(--card)] text-[var(--text)] hover:border-[var(--border)]" : "border border-transparent text-[var(--muted)] opacity-50",
                      isSelected && "border-[var(--accent-600)] bg-[var(--accent-50)] text-[var(--text)] shadow-lg",
                      !isSelected && isToday && "border border-[var(--border)]"
                    )}
                  >
                    <span className="text-base font-semibold">{cell.date.getDate()}</span>
                    <div className="flex gap-1 pb-1">
                      {dayItems.slice(0, 4).map((item, index) => (
                        <span key={`${item.type}-${item.id}-${index}`} className={clsx("h-1.5 w-1.5 rounded-full", item.type === "slot" ? "bg-emerald-600" : "bg-[var(--accent-600)]")} aria-hidden />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {loading && <div className="mt-6 rounded-3xl border border-dashed border-[var(--hairline)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted)]">Cargando partidas...</div>}
          </section>

          <section className="rounded-[28px] border border-[var(--hairline)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-[var(--text)]">Agenda del dia</h3>
                <p className="text-sm text-[var(--muted)]">{selectedLabel}</p>
              </div>
              <span className="rounded-full border border-[var(--hairline)] bg-[var(--card)] px-3 py-1 text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
                {selectedItems.length}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {selectedItems.map((item) => (
              <CalendarTicket
                key={`${item.type}-${item.id}`}
                item={item}
                userId={userId}
                canUseOrganizedPlay={canUseOrganizedPlay}
                onOpenProposal={() => setProposalTarget(item)}
              />
            ))}
              {!loading && selectedItems.length === 0 && <p className="text-sm text-[var(--muted)]">No hay partidas, reservas ni ofertas para este dia.</p>}
            </div>
          </section>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((item) => (
            <CalendarTicket
              key={`${item.type}-${item.id}`}
              item={item}
              showDate
              userId={userId}
              canUseOrganizedPlay={canUseOrganizedPlay}
              onOpenProposal={() => setProposalTarget(item)}
            />
          ))}
          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-5 text-sm text-[var(--muted)]">
              No hay partidas, reservas ni ofertas con los filtros seleccionados.
            </div>
          )}
        </div>
      )}

      <SlotProposalModal
        open={proposalTarget?.type === "slot"}
        slot={
          proposalTarget?.type === "slot"
            ? {
                id: proposalTarget.id,
                start: proposalTarget.start,
                end: proposalTarget.end,
                wantedGameIds: proposalTarget.wantedGameIds ?? [],
                openGameIds: proposalTarget.openGameIds ?? [],
              }
            : null
        }
        games={games}
        onClose={() => setProposalTarget(null)}
        onSubmitted={() => {
          window.dispatchEvent(new Event("availability-slots:changed"));
        }}
      />
    </div>
  );
}

function viewButtonClass(active: boolean) {
  return clsx("rounded-lg px-3 py-2 text-sm font-semibold", active ? "bg-[var(--card)] text-[var(--text)] shadow-sm" : "text-[var(--muted)]");
}

function FilterSelect({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: FilterItem[];
}) {
  return (
    <label className="flex min-w-36 flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
      {label}
      <select
        className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
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

function CalendarTicket({
  item,
  showDate = false,
  userId,
  canUseOrganizedPlay,
  onOpenProposal,
}: {
  item: CalendarItem;
  showDate?: boolean;
  userId: number | null;
  canUseOrganizedPlay: boolean;
  onOpenProposal: () => void;
}) {
  const startDate = new Date(item.start);
  const slotStatus =
    item.type === "slot"
      ? getEffectiveSlotStatus({
          status: item.status as PersistedSlotStatus,
          start: item.start,
          end: item.end,
          match: item.matchStatus ? { status: item.matchStatus, start: item.start, end: item.end } : null,
        })
      : null;
  const isOwner = item.type === "slot" && userId != null && item.ownerId === userId;
  const canPropose =
    item.type === "slot" &&
    userId != null &&
    canUseOrganizedPlay &&
    !isOwner &&
    slotStatus === "OPEN" &&
    !item.viewerProposal;

  return (
    <article className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4 shadow-sm transition hover:border-[var(--border)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[var(--text)]">{item.title}</span>
            {!(item.type === "slot" && slotStatus && ["CONFIRMED", "IN_PLAY", "DONE", "CANCELLED"].includes(slotStatus)) && (
              <span
                className={clsx(
                  "rounded-full px-2 py-[2px] text-[11px] font-semibold uppercase",
                  item.type === "slot" && "bg-emerald-50 text-emerald-700",
                  item.type === "match" && "bg-sky-50 text-sky-700",
                  item.type === "reservation" && "bg-[var(--accent-50)] text-[var(--accent-600)]"
                )}
              >
                {item.type === "slot" ? "Oferta" : item.type === "match" ? "Partida" : "Reserva"}
              </span>
            )}
            {slotStatus && (
              <span
                className={clsx(
                  "rounded-full px-2 py-[2px] text-[11px] font-semibold uppercase",
                  slotStatus === "OPEN" && "bg-emerald-50 text-emerald-700",
                  slotStatus === "MATCHED" && "bg-amber-50 text-amber-700",
                  slotStatus === "CONFIRMED" && "bg-emerald-600 text-white",
                  slotStatus === "IN_PLAY" && "bg-sky-600 text-white",
                  (slotStatus === "DONE" || slotStatus === "EXPIRED" || slotStatus === "CANCELLED") && "bg-slate-100 text-slate-700"
                )}
              >
                {getSlotStatusLabel(slotStatus)}
              </span>
            )}
            {item.type === "slot" && Boolean(item.viewerProposal) && (
              <span className="rounded-full bg-amber-50 px-2 py-[2px] text-[11px] font-semibold uppercase text-amber-700">
                Propuesta enviada
              </span>
            )}
            {item.type === "slot" && !item.viewerProposal && !isOwner && (item.pendingProposalCount ?? 0) > 0 && (
              <span className="rounded-full bg-[var(--bg)] px-2 py-[2px] text-[11px] font-semibold uppercase text-[var(--muted)]">
                {item.pendingProposalCount} pendiente{item.pendingProposalCount === 1 ? "" : "s"}
              </span>
            )}
            {item.type === "slot" && isOwner && (item.pendingProposalCount ?? 0) > 0 && (
              <span className="rounded-full bg-amber-50 px-2 py-[2px] text-[11px] font-semibold uppercase text-amber-700">
                {item.pendingProposalCount} propuesta{item.pendingProposalCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--muted)]">
            {showDate && !Number.isNaN(startDate.getTime()) ? `${DATE_LABEL.format(startDate)} - ` : ""}
            {formatHour(item.start)} - {formatHour(item.end)}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
            <span>{slotStatus ? getSlotStatusLabel(slotStatus) : item.type === "match" ? matchStatusLabels[item.status] ?? item.status : reservationStatusLabels[item.status] ?? item.status}</span>
            {item.ownerName &&
              !(slotStatus && ["CONFIRMED", "IN_PLAY", "DONE", "CANCELLED"].includes(slotStatus) && (item.matchParticipants?.length ?? 0) > 0) && <span>{item.ownerName}</span>}
            {item.tableName && <span>Mesa: {item.tableName}</span>}
            {item.type === "match" && !item.tableName && <span>Sin mesa asignada</span>}
            {item.format && <span>{item.format}</span>}
            {item.eventTitle && <span>{item.eventTitle}</span>}
          </div>
          {((slotStatus && ["CONFIRMED", "IN_PLAY", "DONE", "CANCELLED"].includes(slotStatus)) || item.type === "match") && (item.matchParticipants?.length ?? 0) > 0 && (
            <p className="text-sm text-[var(--muted)]">Jugadores: {item.matchParticipants!.join(" vs ")}</p>
          )}
          {item.viewerProposal && (
            <p className="text-sm text-[var(--muted)]">
              Tu propuesta: {formatHour(item.viewerProposal.proposedStart)} - {formatHour(item.viewerProposal.proposedEnd)}
              {item.viewerProposal.gameName ? ` - ${item.viewerProposal.gameName}` : ""}
            </p>
          )}
          {item.note && <p className="text-sm text-[var(--text)]">{item.note}</p>}
        </div>

        {canPropose && (
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-accent px-3 py-2 text-sm" onClick={onOpenProposal}>
              Me apunto
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
