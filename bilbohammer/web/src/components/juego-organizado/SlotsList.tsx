"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useSession } from "next-auth/react";

type SlotStatus = "OPEN" | "MATCHED" | "CANCELLED";

type Slot = {
  id: string;
  creatorId: number;
  gameId?: string | null;
  start: string;
  end: string;
  status: SlotStatus;
  level?: string | null;
  format?: string | null;
  note?: string | null;
  matchId?: string | null;
};

type Game = { id: string; name: string };

type Props = {
  games: Game[];
  onlyMine?: boolean;
};

function formatRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString()} ${s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} → ${e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function SlotsList({ games, onlyMine = false }: Props) {
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

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState<string | null>(null);
  const [filterGame, setFilterGame] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const url = filterGame ? `/api/juego-organizado/slots?gameId=${filterGame}` : "/api/juego-organizado/slots";
        const res = await fetch(url, { cache: "no-store" });
        const data = (await res.json()) as Slot[];
        const filtered = onlyMine && userId ? data.filter((s) => s.creatorId === userId) : data;
        setSlots(filtered || []);
      } catch (e) {
        console.error(e);
        setError("No se pudieron cargar los slots.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filterGame, onlyMine, userId]);

  async function handleJoin(slotId: string) {
    setJoining(slotId);
    setError(null);
    try {
      const res = await fetch(`/api/juego-organizado/slots/${slotId}/join`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo apuntar.");
      }
      // Refresh list
      const refreshed = await fetch(filterGame ? `/api/juego-organizado/slots?gameId=${filterGame}` : "/api/juego-organizado/slots", {
        cache: "no-store",
      }).then((r) => r.json());
      setSlots((onlyMine && userId ? refreshed.filter((s: Slot) => s.creatorId === userId) : refreshed) || []);
    } catch (e: any) {
      setError(e?.message || "Error al apuntarte.");
    } finally {
      setJoining(null);
    }
  }

  async function handleAccept(slotId: string, matchId: string) {
    setJoining(slotId);
    setError(null);
    try {
      const res = await fetch(`/api/juego-organizado/slots/${slotId}/accept`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo confirmar.");
      }
      const refreshed = await fetch(filterGame ? `/api/juego-organizado/slots?gameId=${filterGame}` : "/api/juego-organizado/slots", {
        cache: "no-store",
      }).then((r) => r.json());
      setSlots((onlyMine && userId ? refreshed.filter((s: Slot) => s.creatorId === userId) : refreshed) || []);
    } catch (e: any) {
      setError(e?.message || "Error al confirmar.");
    } finally {
      setJoining(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterGame ?? ""}
          onChange={(e) => setFilterGame(e.target.value || null)}
          className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
        >
          <option value="">Todos los juegos</option>
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        {loading && <span className="text-sm text-[var(--muted)]">Cargando...</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      <div className="grid gap-3">
        {slots.map((slot) => {
          const isOwner = userId === slot.creatorId;
          const canJoin = slot.status === "OPEN" && !isOwner;
          const canAccept = isOwner && slot.status === "MATCHED" && slot.matchId;
          const gameName = slot.gameId ? games.find((g) => g.id === slot.gameId)?.name : "Sin juego";
          return (
            <div
              key={slot.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4 shadow-sm"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--text)]">{gameName}</span>
                  <span
                    className={clsx(
                      "rounded-full px-2 py-[2px] text-[11px] font-semibold uppercase tracking-wide",
                      slot.status === "OPEN" && "bg-emerald-50 text-emerald-700",
                      slot.status === "MATCHED" && "bg-amber-50 text-amber-700",
                      slot.status === "CANCELLED" && "bg-slate-100 text-slate-700"
                    )}
                  >
                    {slot.status === "OPEN" ? "Buscando rival" : slot.status === "MATCHED" ? "Pendiente confirmar" : "Cancelado"}
                  </span>
                </div>
                <div className="text-sm text-[var(--muted)]">{formatRange(slot.start, slot.end)}</div>
                <div className="text-sm text-[var(--muted)]">{slot.format || "Formato libre"}</div>
                {slot.note && <div className="text-sm text-[var(--text)]">{slot.note}</div>}
              </div>

              <div className="flex items-center gap-2">
                {canJoin && (
                  <button
                    type="button"
                    className="btn btn-accent px-3 py-2 text-sm disabled:opacity-50"
                    disabled={joining === slot.id}
                    onClick={() => handleJoin(slot.id)}
                  >
                    {joining === slot.id ? "Enviando..." : "Me apunto"}
                  </button>
                )}
                {canAccept && (
                  <button
                    type="button"
                    className="btn px-3 py-2 text-sm disabled:opacity-50"
                    disabled={joining === slot.id}
                    onClick={() => handleAccept(slot.id, slot.matchId!)}
                  >
                    {joining === slot.id ? "Confirmando..." : "Confirmar"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {!loading && slots.length === 0 && <p className="text-sm text-[var(--muted)]">No hay slots abiertos.</p>}
      </div>
    </div>
  );
}
