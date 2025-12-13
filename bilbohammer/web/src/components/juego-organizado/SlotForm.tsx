"use client";

import { useState } from "react";

type Game = { id: string; name: string };

type Props = {
  games: Game[];
  onCreated?: () => void;
};

export function SlotForm({ games, onCreated }: Props) {
  const [gameId, setGameId] = useState<string>("");
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");
  const [format, setFormat] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/juego-organizado/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: gameId || null,
          start,
          end,
          format: format || null,
          note: note || null,
          level: level || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo crear el slot.");
      }
      setGameId("");
      setStart("");
      setEnd("");
      setFormat("");
      setNote("");
      setLevel("");
      onCreated?.();
    } catch (e: any) {
      setError(e?.message || "Error al crear slot.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
          Juego
          <select
            className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
          >
            <option value="">Sin preferencia</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
          Nivel / tipo
          <input
            className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            placeholder="Casual, competitivo, demo..."
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
          Inicio
          <input
            type="datetime-local"
            className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
          Fin
          <input
            type="datetime-local"
            className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)] sm:col-span-2">
          Formato
          <input
            className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            placeholder="2000 pts, narrativo, friendly..."
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)] sm:col-span-2">
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
