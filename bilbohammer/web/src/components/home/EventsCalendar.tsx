"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { getClubDateTimeFormatter } from "@/lib/date-format";

type EventPayload = {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
  status?: string | null;
  type?: string | null;
};

type NormalizedEvent = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  status: string | null;
  type: string | null;
};

type DayCell = {
  date: Date;
  inMonth: boolean;
  key: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday as first column

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
  if (!input) return input;
  return input.charAt(0).toUpperCase() + input.slice(1);
}

export default function EventsCalendar() {
  const { data, error } = useSWR<EventPayload[]>("/api/events", fetcher);
  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => startOfDay(new Date()), []);

  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<Date>(() => today);

  const events: NormalizedEvent[] = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data
      .map((event): NormalizedEvent | null => {
        const startsAt = new Date(event.startsAt);
        if (Number.isNaN(startsAt.getTime())) return null;
        const endsAt = event.endsAt ? new Date(event.endsAt) : null;
        return {
          id: event.id,
          title: event.title,
          startsAt,
          endsAt: endsAt && Number.isNaN(endsAt.getTime()) ? null : endsAt,
          location: event.location ?? null,
          status: event.status ?? null,
          type: event.type ?? null,
        };
      })
      .filter((item): item is NormalizedEvent => !!item)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }, [data]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, NormalizedEvent[]>();
    for (const event of events) {
      const key = toDayKey(event.startsAt);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(event);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    }
    return map;
  }, [events]);

  useEffect(() => {
    if (!isSameMonth(selectedDate, currentMonth)) {
      const candidate = events.find((event) => isSameMonth(event.startsAt, currentMonth));
      const fallback = startOfMonth(currentMonth);
      setSelectedDate(candidate ? startOfDay(candidate.startsAt) : fallback);
    }
  }, [currentMonth, events, selectedDate]);

  const cells = useMemo(() => buildMonthGrid(currentMonth), [currentMonth]);

  const selectedKey = toDayKey(selectedDate);
  const eventsForSelected = eventsByDay.get(selectedKey) ?? [];

  const upcomingEvents = useMemo(() => {
    return events.filter((event) => event.startsAt.getTime() >= now.getTime()).slice(0, 5);
  }, [events, now]);

  const monthLabel = capitalize(MONTH_LABEL.format(currentMonth));
  const selectedLabel = capitalize(DAY_LABEL.format(selectedDate));

  const isLoading = !data && !error;

  const handleDaySelect = (cell: DayCell) => {
    const cloned = startOfDay(cell.date);
    if (!cell.inMonth) {
      setCurrentMonth(startOfMonth(cloned));
    }
    setSelectedDate(cloned);
  };

  const renderStatus = (status: string | null | undefined) => {
    if (!status || status === "PUBLISHED") return null;
    return (
      <span className="rounded-full border border-[var(--accent-600)] bg-[var(--accent-50)] px-3 py-1 text-xs font-semibold text-[var(--accent-600)]">
        {status === status.toUpperCase() ? status : status.toUpperCase()}
      </span>
    );
  };

  return (
    <section className="mt-16">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.15fr)]">
        <div className="rounded-[32px] border border-[var(--hairline)] bg-[var(--card)] p-6 shadow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Calendario del club</h2>
              <p className="text-sm text-[var(--muted)]">Navega por meses y selecciona un día para ver detalles.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentMonth((prev) => addMonths(prev, -1))}
                className="rounded-full bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--accent)] hover:text-[#0b1216] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-600)]"
                aria-label="Mes anterior"
              >
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="block"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className="rounded-full bg-transparent px-4 py-2 text-sm font-semibold uppercase tracking-[0.28em] text-[var(--text)]">
                {monthLabel}
              </span>
              <button
                type="button"
                onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                className="rounded-full bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--accent)] hover:text-[#0b1216] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-600)]"
                aria-label="Mes siguiente"
              >
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="block"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
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
              const dayEvents = eventsByDay.get(cell.key) ?? [];
              const isSelected = isSameDay(cell.date, selectedDate);
              const isToday = isSameDay(cell.date, today);

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => handleDaySelect(cell)}
                  className={clsx(
                    "flex min-h-[92px] flex-col items-center justify-between rounded-2xl px-2 py-2 text-sm transition",
                    cell.inMonth
                      ? "border border-[var(--hairline)] bg-[var(--card)] text-[var(--text)] hover:border-[var(--border)]"
                      : "border border-transparent text-[var(--muted)] opacity-50",
                    isSelected && "border-[var(--accent-600)] bg-[var(--accent-50)] text-[var(--text)] shadow-lg",
                    !isSelected && isToday && "border border-[var(--border)]"
                  )}
                >
                  <span className="text-base font-semibold">{cell.date.getDate()}</span>
                  <div className="flex gap-1 pb-1">
                    {dayEvents.slice(0, 3).map((event, index) => (
                      <span
                        key={`${event.id}-${index}`}
                        className="h-1.5 w-1.5 rounded-full bg-[var(--accent-600)]"
                        aria-hidden
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="mt-6 rounded-3xl border border-dashed border-[var(--hairline)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted)]">
              Cargando eventos…
            </div>
          ) : null}
          {error ? (
            <div className="mt-6 rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-200">
              No se pudieron cargar los eventos ahora mismo. Inténtalo más tarde.
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-[var(--hairline)] bg-[var(--card)] p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-[var(--text)]">Agenda del día</h3>
                <p className="text-sm text-[var(--muted)]">{selectedLabel}</p>
              </div>
              <span className="rounded-full border border-[var(--hairline)] bg-[var(--card)] px-3 py-1 text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
                {eventsForSelected.length} evento{eventsForSelected.length === 1 ? "" : "s"}
              </span>
            </div>

            {eventsForSelected.length === 0 ? (
              <p className="mt-6 text-sm text-[var(--muted)]">
                No hay actividades programadas para este día. Puedes usar el calendario para cambiar de fecha o
                proponer un evento nuevo.
              </p>
            ) : (
              <ul className="mt-6 space-y-4">
                {eventsForSelected.map((event) => (
                  <li
                    key={event.id}
                    className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-4 py-4 shadow-sm transition hover:border-[var(--border)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1">
                        <Link
                          href={`/eventos/${event.id}`}
                          className="text-base font-semibold text-[var(--text)] hover:text-[var(--accent-600)]"
                          prefetch={false}
                        >
                          {event.title}
                        </Link>
                        <div className="text-xs text-[var(--muted)]">
                          {TIME_LABEL.format(event.startsAt)}
                          {event.location ? ` · ${event.location}` : null}
                        </div>
                      </div>
                      {renderStatus(event.status)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-[28px] border border-[var(--hairline)] bg-[var(--card)] p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-[var(--text)]">Próximos eventos</h3>
              <Link
                href="/eventos"
                className="text-sm font-medium text-[var(--accent-600)] hover:text-[var(--accent)]"
                prefetch={false}
              >
                Ver agenda completa
              </Link>
            </div>

            {upcomingEvents.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--muted)]">
                Todavía no hay eventos publicados en el futuro. Revisa más tarde o crea el tuyo desde el panel de
                eventos.
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {upcomingEvents.map((event) => (
                  <li key={event.id} className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <Link
                        href={`/eventos/${event.id}`}
                        className="text-sm font-semibold text-[var(--text)] hover:text-[var(--accent-600)]"
                        prefetch={false}
                      >
                        {event.title}
                      </Link>
                      <div className="text-xs text-[var(--muted)]">
                        {DATE_LABEL.format(event.startsAt)} · {TIME_LABEL.format(event.startsAt)}
                        {event.location ? ` · ${event.location}` : ""}
                      </div>
                    </div>
                    <span className="rounded-full border border-[var(--hairline)] bg-[var(--card)] px-2 py-1 text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
                      {capitalize((event.type ?? "Evento").toLowerCase())}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
