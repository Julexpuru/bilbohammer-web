"use client";

import { useEffect, useMemo, useState } from "react";
import { serializeSlotMetadata, extractSlotPreferences } from "@/lib/organized-slot-metadata";

type Game = { id: string; name: string };
type GamePreference = "wanted" | "open";

type SlotInput = {
  id: string;
  ids?: string[];
  gameId?: string | null;
  level?: string | null;
  note?: string | null;
  format?: string | null;
  start: string;
  end: string;
  wantedGameIds?: string[];
  openGameIds?: string[];
};

type Props = {
  open: boolean;
  slot: SlotInput | null;
  games: Game[];
  onClose: () => void;
  onSaved: () => void;
};

export function EditSlotModal({ open, slot, games, onClose, onSaved }: Props) {
  const [gamePreferences, setGamePreferences] = useState<Record<string, GamePreference>>({});
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [format, setFormat] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSummary = useMemo(() => {
    const wanted = Object.values(gamePreferences).filter((value) => value === "wanted").length;
    const openCount = Object.values(gamePreferences).filter((value) => value === "open").length;
    if (wanted === 0 && openCount === 0) return "Sin preferencia";
    const parts = [];
    if (wanted) parts.push(`${wanted} quiero jugar`);
    if (openCount) parts.push(`${openCount} abierto`);
    return parts.join(" - ");
  }, [gamePreferences]);

  useEffect(() => {
    if (!open || !slot) return;
    const parsed =
      slot.wantedGameIds || slot.openGameIds
        ? {
            wantedGameIds: slot.wantedGameIds ?? [],
            openGameIds: slot.openGameIds ?? [],
            note: slot.note ?? null,
          }
        : extractSlotPreferences(slot);
    const nextPreferences: Record<string, GamePreference> = {};
    for (const gameId of parsed.wantedGameIds) nextPreferences[gameId] = "wanted";
    for (const gameId of parsed.openGameIds) nextPreferences[gameId] = "open";

    const start = new Date(slot.start);
    const end = new Date(slot.end);
    setGamePreferences(nextPreferences);
    setDate(toDateInput(start));
    setStartTime(toTimeInput(start));
    setEndTime(toTimeInput(end));
    setFormat(slot.format ?? "");
    setNote(parsed.note ?? "");
    setSaving(false);
    setError(null);
  }, [open, slot]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open || !slot) return null;

  const cycleGame = (gameId: string) => {
    setGamePreferences((current) => {
      const next = { ...current };
      if (!next[gameId]) next[gameId] = "wanted";
      else if (next[gameId] === "wanted") next[gameId] = "open";
      else delete next[gameId];
      return next;
    });
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const start = buildIsoDateTime(date, startTime);
      const end = buildIsoDateTime(date, endTime);
      if (!start || !end) throw new Error("Fecha, inicio y fin son obligatorios.");
      if (new Date(start) >= new Date(end)) {
        throw new Error("La hora de inicio debe ser anterior a la de fin.");
      }

      const payload = {
        start,
        end,
        format: format || null,
        note: note || null,
        gameId: null,
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

      for (const slotId of slot.ids ?? [slot.id]) {
        const response = await fetch(`/api/juego-organizado/slots/${slotId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "No se pudo actualizar la oferta.");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || "No se pudo actualizar la oferta.");
    } finally {
      setSaving(false);
    }
  };

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-4 py-10 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-[var(--text)]">Editar oferta</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Ajusta juegos, franja horaria y detalles de la oferta publicada.
            </p>
          </div>
          <button type="button" className="btn px-3 py-2 text-sm" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[var(--muted)]">Juegos</div>
            <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--bg)] p-3">
              <div className="mb-3 text-sm font-semibold text-[var(--text)]">{selectedSummary}</div>
              <div className="flex flex-wrap gap-2">
                {games.map((game) => {
                  const preference = gamePreferences[game.id];
                  return (
                    <button
                      key={game.id}
                      type="button"
                      className={triStateClass(preference)}
                      onClick={() => cycleGame(game.id)}
                    >
                      <span className={triStateBoxClass(preference)} aria-hidden />
                      {game.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
              Fecha
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
              Inicio
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
              Fin
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
                required
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
            Formato
            <input
              value={format}
              onChange={(event) => setFormat(event.target.value)}
              className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
              placeholder="Casual, competitivo, demo..."
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
            Nota
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
            />
          </label>

          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</div>}

          <div className="flex justify-end gap-2">
            <button type="button" className="btn px-4 py-2 text-sm" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-accent px-4 py-2 text-sm disabled:opacity-50" disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function triStateClass(preference?: GamePreference) {
  const base =
    "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--accent-600)]";
  if (preference === "wanted") return `${base} border-emerald-500/50 bg-emerald-500/15 text-[var(--text)]`;
  if (preference === "open") return `${base} border-amber-400/60 bg-amber-400/15 text-[var(--text)]`;
  return `${base} border-[var(--hairline)] bg-[var(--card)] text-[var(--text)]`;
}

function triStateBoxClass(preference?: GamePreference) {
  const base = "h-3.5 w-3.5 rounded-sm border";
  if (preference === "wanted") return `${base} border-emerald-500 bg-emerald-500`;
  if (preference === "open") return `${base} border-amber-400 bg-amber-400`;
  return `${base} border-[var(--muted)] bg-transparent`;
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toTimeInput(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function buildIsoDateTime(date: string, time: string) {
  if (!date || !time) return null;
  const dateTime = new Date(`${date}T${time}`);
  return Number.isNaN(dateTime.getTime()) ? null : dateTime.toISOString();
}
