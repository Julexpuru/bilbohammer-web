"use client";

import { useEffect, useMemo, useState } from "react";

type Game = { id: string; name: string };

type RecurringAvailability = {
  id: string;
  weekday: number;
  startMinutes: number;
  endMinutes: number;
  preferredGames: string[];
  preferencesNote: string | null;
};

type Props = {
  games: Game[];
};

type GamePreference = "wanted" | "open";

const weekdays = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function fromMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

function nextMondayInput() {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  now.setDate(now.getDate() - day);
  now.setHours(12, 0, 0, 0);
  return now.toISOString().slice(0, 10);
}

export function MyAvailabilityPlanner({ games }: Props) {
  const [rows, setRows] = useState<RecurringAvailability[]>([]);
  const [weekday, setWeekday] = useState("0");
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("21:00");
  const [preferredGames, setPreferredGames] = useState<string[]>([]);
  const [preferencesNote, setPreferencesNote] = useState("");
  const [weeklyGames, setWeeklyGames] = useState<Record<string, GamePreference>>({});
  const [weekStart, setWeekStart] = useState(nextMondayInput);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const gameName = useMemo(() => new Map(games.map((game) => [game.id, game.name])), [games]);

  async function loadRows() {
    setError(null);
    const response = await fetch("/api/juego-organizado/recurring-availability", { cache: "no-store" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "No se pudo cargar el horario habitual.");
    }
    setRows(await response.json());
  }

  useEffect(() => {
    loadRows().catch((err) => setError(err.message));
  }, []);

  function toggleValue(value: string, setter: (values: string[]) => void, current: string[]) {
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function cycleWeeklyGame(gameId: string) {
    setWeeklyGames((current) => {
      const next = { ...current };
      if (!next[gameId]) {
        next[gameId] = "wanted";
      } else if (next[gameId] === "wanted") {
        next[gameId] = "open";
      } else {
        delete next[gameId];
      }
      return next;
    });
  }

  async function saveRecurring(event: React.FormEvent) {
    event.preventDefault();
    const startMinutes = toMinutes(start);
    const endMinutes = toMinutes(end);
    if (startMinutes == null || endMinutes == null) return;

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/juego-organizado/recurring-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekday: Number(weekday),
          startMinutes,
          endMinutes,
          preferredGames,
          preferencesNote: preferencesNote || null,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo guardar el horario.");
      }
      setPreferredGames([]);
      setPreferencesNote("");
      setMessage("Horario habitual guardado.");
      await loadRows();
    } catch (err: any) {
      setError(err?.message || "No se pudo guardar el horario.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteRecurring(id: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/juego-organizado/recurring-availability/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo eliminar el horario.");
      }
      setMessage("Horario eliminado.");
      await loadRows();
    } catch (err: any) {
      setError(err?.message || "No se pudo eliminar el horario.");
    } finally {
      setBusy(false);
    }
  }

  async function publishWeek(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/juego-organizado/weekly-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart,
          gameIds: Object.entries(weeklyGames)
            .filter(([, preference]) => preference === "wanted")
            .map(([gameId]) => gameId),
          openGameIds: Object.entries(weeklyGames)
            .filter(([, preference]) => preference === "open")
            .map(([gameId]) => gameId),
          note: note || null,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo publicar la semana.");
      setMessage(`Publicadas ${body.created} ofertas para la semana seleccionada.`);
      window.dispatchEvent(new Event("availability-slots:changed"));
    } catch (err: any) {
      setError(err?.message || "No se pudo publicar la semana.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--text)]">Horario habitual</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Define bloques recurrentes para reutilizarlos al publicar cada semana.</p>

        <form className="mt-4 space-y-4" onSubmit={saveRecurring}>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
              Dia
              <select className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)]" value={weekday} onChange={(event) => setWeekday(event.target.value)}>
                {weekdays.map((label, index) => (
                  <option key={label} value={index}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
              Inicio
              <input type="time" className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)]" value={start} onChange={(event) => setStart(event.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
              Fin
              <input type="time" className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)]" value={end} onChange={(event) => setEnd(event.target.value)} />
            </label>
          </div>

          <GameChecks games={games} selected={preferredGames} onToggle={(id) => toggleValue(id, setPreferredGames, preferredGames)} />

          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
            Nota habitual
            <textarea className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)]" rows={2} value={preferencesNote} onChange={(event) => setPreferencesNote(event.target.value)} />
          </label>

          <button type="submit" className="btn btn-accent px-4 py-2 text-sm disabled:opacity-50" disabled={busy}>
            Guardar horario
          </button>
        </form>

        <div className="mt-5 space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--hairline)] bg-[var(--bg)] p-3">
              <div className="text-sm">
                <div className="font-semibold text-[var(--text)]">
                  {weekdays[row.weekday]} {fromMinutes(row.startMinutes)} - {fromMinutes(row.endMinutes)}
                </div>
                <div className="text-[var(--muted)]">
                  {row.preferredGames.length ? row.preferredGames.map((id) => gameName.get(id) ?? "Juego").join(", ") : "Sin juegos preferidos"}
                </div>
              </div>
              <button type="button" className="btn px-3 py-2 text-sm" disabled={busy} onClick={() => deleteRecurring(row.id)}>
                Eliminar
              </button>
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm text-[var(--muted)]">Aun no has guardado ningun horario habitual.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--text)]">Publicacion rapida semanal</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Convierte tu horario habitual en ofertas de disponibilidad para una semana concreta.</p>

        <form className="mt-4 space-y-4" onSubmit={publishWeek}>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
            Semana
            <input type="date" className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)]" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} />
          </label>

          <TriStateGameChecks games={games} selected={weeklyGames} onCycle={cycleWeeklyGame} />

          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
            Nota
            <textarea className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)]" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
          </label>

          <button type="submit" className="btn btn-accent px-4 py-2 text-sm disabled:opacity-50" disabled={busy}>
            Publicar semana
          </button>
        </form>

        {(message || error) && (
          <div className="mt-4 rounded-xl border border-[var(--hairline)] bg-[var(--bg)] px-3 py-2 text-sm">
            {message && <span className="text-emerald-700">{message}</span>}
            {error && <span className="text-red-600">{error}</span>}
          </div>
        )}
      </section>
    </div>
  );
}

function GameChecks({ games, selected, onToggle }: { games: Game[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-[var(--muted)]">Juegos</div>
      <div className="flex flex-wrap gap-2">
        {games.map((game) => (
          <label key={game.id} className="inline-flex items-center gap-2 rounded-xl border border-[var(--hairline)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]">
            <input type="checkbox" checked={selected.includes(game.id)} onChange={() => onToggle(game.id)} />
            {game.name}
          </label>
        ))}
      </div>
    </div>
  );
}

function TriStateGameChecks({
  games,
  selected,
  onCycle,
}: {
  games: Game[];
  selected: Record<string, GamePreference>;
  onCycle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="text-xs font-semibold text-[var(--muted)]">Juegos</div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[var(--muted)]">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" aria-hidden />
            quiero jugar
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" aria-hidden />
            abierto a jugar
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {games.map((game) => {
          const preference = selected[game.id];
          return (
            <button
              key={game.id}
              type="button"
              onClick={() => onCycle(game.id)}
              className={triStateClass(preference)}
              aria-pressed={Boolean(preference)}
            >
              <span className={triStateBoxClass(preference)} aria-hidden />
              {game.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function triStateClass(preference?: GamePreference) {
  const base =
    "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--accent-600)]";
  if (preference === "wanted") {
    return `${base} border-emerald-500/50 bg-emerald-500/15 text-[var(--text)]`;
  }
  if (preference === "open") {
    return `${base} border-amber-400/60 bg-amber-400/15 text-[var(--text)]`;
  }
  return `${base} border-[var(--hairline)] bg-[var(--bg)] text-[var(--text)]`;
}

function triStateBoxClass(preference?: GamePreference) {
  const base = "h-3.5 w-3.5 rounded-sm border";
  if (preference === "wanted") return `${base} border-emerald-500 bg-emerald-500`;
  if (preference === "open") return `${base} border-amber-400 bg-amber-400`;
  return `${base} border-[var(--muted)] bg-transparent`;
}
