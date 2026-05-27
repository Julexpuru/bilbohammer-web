"use client";

import { useMemo, useState } from "react";
import { ChevronIcon } from "@/components/ui/ChevronIcon";
import { serializeSlotMetadata } from "@/lib/organized-slot-metadata";

type Game = { id: string; name: string };
type GamePreference = "wanted" | "open";

type Props = {
  games: Game[];
  onCreated?: () => void;
};

export function SlotForm({ games, onCreated }: Props) {
  const [gamePreferences, setGamePreferences] = useState<Record<string, GamePreference>>({});
  const [gamesOpen, setGamesOpen] = useState(false);
  const [date, setDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [format, setFormat] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSummary = useMemo(() => {
    const wanted = Object.values(gamePreferences).filter((value) => value === "wanted").length;
    const open = Object.values(gamePreferences).filter((value) => value === "open").length;
    if (wanted === 0 && open === 0) return "Sin preferencia";
    const parts = [];
    if (wanted) parts.push(`${wanted} quiero jugar`);
    if (open) parts.push(`${open} abierto`);
    return parts.join(" · ");
  }, [gamePreferences]);

  function cycleGame(gameId: string) {
    setGamePreferences((current) => {
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

  function buildSlotPayload() {
    const start = buildIsoDateTime(date, startTime);
    const end = buildIsoDateTime(date, endTime);
    return {
      gameId: null,
      start,
      end,
      format: format || null,
      note: note || null,
      level: serializeSlotMetadata({
        wantedGameIds: Object.entries(gamePreferences)
          .filter(([, preference]) => preference === "wanted")
          .map(([gameId]) => gameId),
        openGameIds: Object.entries(gamePreferences)
          .filter(([, preference]) => preference === "open")
          .map(([gameId]) => gameId),
        source: "manual",
      }),
    };
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const start = buildIsoDateTime(date, startTime);
      const end = buildIsoDateTime(date, endTime);
      if (!start || !end) {
        throw new Error("Fecha, inicio y fin son obligatorios.");
      }
      if (new Date(start) >= new Date(end)) {
        throw new Error("La hora de inicio debe ser anterior a la de fin.");
      }
      const payload = buildSlotPayload();
      const res = await fetch("/api/juego-organizado/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo crear el slot.");
      }
      setGamePreferences({});
      setDate("");
      setStartTime("");
      setEndTime("");
      setFormat("");
      setNote("");
      setGamesOpen(false);
      window.dispatchEvent(new Event("availability-slots:changed"));
      onCreated?.();
    } catch (e: any) {
      setError(e?.message || "Error al crear slot.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
          Juego
          <button
            type="button"
            className="flex min-h-10 items-center justify-between rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-left text-sm font-semibold text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
            onClick={() => setGamesOpen((value) => !value)}
            aria-expanded={gamesOpen}
          >
            <span>{selectedSummary}</span>
            <ChevronIcon open={gamesOpen} />
          </button>

          {gamesOpen && (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-3 shadow-xl">
              <div className="mb-3 flex flex-wrap gap-3 text-[11px] font-semibold text-[var(--muted)]">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" aria-hidden />
                  quiero jugar
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" aria-hidden />
                  abierto
                </span>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {games.map((game) => {
                  const preference = gamePreferences[game.id];
                  return (
                    <button
                      key={game.id}
                      type="button"
                      className={triStateClass(preference)}
                      onClick={() => cycleGame(game.id)}
                      aria-pressed={Boolean(preference)}
                    >
                      <span className={triStateBoxClass(preference)} aria-hidden />
                      <span className="truncate">{game.name}</span>
                    </button>
                  );
                })}
              </div>
              {Object.keys(gamePreferences).length > 0 && (
                <button
                  type="button"
                  className="mt-3 text-xs font-semibold text-[var(--accent-600)]"
                  onClick={() => setGamePreferences({})}
                >
                  Limpiar seleccion
                </button>
              )}
            </div>
          )}
        </div>

        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
          Fecha
          <input
            type="date"
            className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
          Inicio
          <input
            type="time"
            className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
          Fin
          <input
            type="time"
            className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
          Formato
          <input
            className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            placeholder="Casual, competitivo, demo..."
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)] sm:col-span-2 lg:col-span-5">
          Nota
          <textarea
            className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Comentarios adicionales"
          />
        </label>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex justify-end">
        <button type="submit" className="btn btn-accent px-4 py-2 text-sm disabled:opacity-50" disabled={saving}>
          {saving ? "Creando..." : "Crear slot"}
        </button>
      </div>
    </form>
  );
}

function triStateClass(preference?: GamePreference) {
  const base =
    "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--accent-600)]";
  if (preference === "wanted") return `${base} border-emerald-500/50 bg-emerald-500/15 text-[var(--text)]`;
  if (preference === "open") return `${base} border-amber-400/60 bg-amber-400/15 text-[var(--text)]`;
  return `${base} border-[var(--hairline)] bg-[var(--bg)] text-[var(--text)]`;
}

function triStateBoxClass(preference?: GamePreference) {
  const base = "h-3.5 w-3.5 shrink-0 rounded-sm border";
  if (preference === "wanted") return `${base} border-emerald-500 bg-emerald-500`;
  if (preference === "open") return `${base} border-amber-400 bg-amber-400`;
  return `${base} border-[var(--muted)] bg-transparent`;
}

function buildIsoDateTime(date: string, time: string) {
  if (!date || !time) return null;
  const dateTime = new Date(`${date}T${time}`);
  return Number.isNaN(dateTime.getTime()) ? null : dateTime.toISOString();
}
