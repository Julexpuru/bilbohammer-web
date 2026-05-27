"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";

type Game = { id: string; name: string };

type SlotProposalModalSlot = {
  id: string;
  start: string;
  end: string;
  wantedGameIds: string[];
  openGameIds: string[];
};

type Props = {
  open: boolean;
  slot: SlotProposalModalSlot | null;
  games: Game[];
  onClose: () => void;
  onSubmitted: () => void;
};

export function SlotProposalModal({ open, slot, games, onClose, onSubmitted }: Props) {
  const [selectedGameId, setSelectedGameId] = useState("");
  const [proposedStart, setProposedStart] = useState("");
  const [proposedEnd, setProposedEnd] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gameMap = useMemo(() => new Map(games.map((game) => [game.id, game.name])), [games]);
  const availableGames = useMemo(() => {
    if (!slot) return [];
    const ids = Array.from(new Set([...slot.wantedGameIds, ...slot.openGameIds]));
    return ids.map((id) => ({
      id,
      name: gameMap.get(id) ?? "Juego",
      tone: slot.wantedGameIds.includes(id) ? "wanted" : "open",
    }));
  }, [gameMap, slot]);

  useEffect(() => {
    if (!open || !slot) return;
    setSelectedGameId(availableGames[0]?.id ?? "");
    setProposedStart(toDatetimeLocal(slot.start));
    setProposedEnd(toDatetimeLocal(slot.end));
    setNote("");
    setSaving(false);
    setError(null);
  }, [availableGames, open, slot]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open || !slot) return null;

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/juego-organizado/slots/${slot.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: selectedGameId || null,
          proposedStart: fromDatetimeLocal(proposedStart),
          proposedEnd: fromDatetimeLocal(proposedEnd),
          note: note || null,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo enviar la propuesta.");
      onSubmitted();
      onClose();
    } catch (err: any) {
      setError(err?.message || "No se pudo enviar la propuesta.");
    } finally {
      setSaving(false);
    }
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
            <h3 className="text-xl font-semibold text-[var(--text)]">Enviar propuesta</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Elige juego y franja dentro de la oferta original.
            </p>
          </div>
          <button type="button" className="btn px-3 py-2 text-sm" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={submit}>
          {availableGames.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[var(--muted)]">Juego</div>
              <div className="flex flex-wrap gap-2">
                {availableGames.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => setSelectedGameId(game.id)}
                    className={clsx(
                      "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                      selectedGameId === game.id
                        ? "border-[var(--accent-600)] bg-[var(--accent-50)] text-[var(--text)]"
                        : "border-[var(--hairline)] bg-[var(--bg)] text-[var(--text)]",
                      game.tone === "wanted" && selectedGameId !== game.id && "border-emerald-500/30 text-emerald-300",
                      game.tone === "open" && selectedGameId !== game.id && "border-amber-400/30 text-amber-300"
                    )}
                  >
                    {game.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
              Inicio propuesto
              <input
                type="datetime-local"
                value={proposedStart}
                onChange={(event) => setProposedStart(event.target.value)}
                className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
              Fin propuesto
              <input
                type="datetime-local"
                value={proposedEnd}
                onChange={(event) => setProposedEnd(event.target.value)}
                className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
                required
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
            Comentario
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
              placeholder="Puedes indicar formato, puntos, o cualquier detalle"
            />
          </label>

          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</div>}

          <div className="flex justify-end gap-2">
            <button type="button" className="btn px-4 py-2 text-sm" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-accent px-4 py-2 text-sm disabled:opacity-50" disabled={saving}>
              {saving ? "Enviando..." : "Enviar propuesta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function toDatetimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function fromDatetimeLocal(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
