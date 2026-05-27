"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useSession } from "next-auth/react";
import { extractSlotPreferences } from "@/lib/organized-slot-metadata";
import { getClubDateTimeFormatter } from "@/lib/date-format";
import {
  getEffectiveSlotStatus,
  getSlotStatusLabel,
  type EffectiveSlotStatus,
  type MatchLifecycleStatus,
  type PersistedSlotStatus,
} from "@/lib/organized-slot-status";
import { SlotProposalModal } from "@/components/juego-organizado/SlotProposalModal";
import { EditSlotModal } from "@/components/juego-organizado/EditSlotModal";

type ViewerProposal = {
  id: string;
  gameId: string | null;
  proposedStart: string;
  proposedEnd: string;
  note: string | null;
  status: string;
  createdAt: string;
};

type OwnerProposal = {
  id: string;
  requesterId: number;
  requesterName: string;
  gameId: string | null;
  gameName: string | null;
  proposedStart: string;
  proposedEnd: string;
  note: string | null;
  status: string;
  createdAt: string;
};

type Slot = {
  id: string;
  creatorId: number;
  gameId?: string | null;
  start: string;
  end: string;
  status: PersistedSlotStatus;
  level?: string | null;
  format?: string | null;
  note?: string | null;
  matchId?: string | null;
  matchStatus?: MatchLifecycleStatus | null;
  matchGameId?: string | null;
  matchGameName?: string | null;
  matchParticipants?: string[];
  pendingProposalCount: number;
  viewerProposal: ViewerProposal | null;
  proposals: OwnerProposal[];
};

type Game = { id: string; name: string };

type GroupedSlot = {
  ids: string[];
  creatorId: number;
  start: string;
  end: string;
  status: PersistedSlotStatus;
  effectiveStatus: EffectiveSlotStatus;
  format: string | null;
  note: string | null;
  matchIds: string[];
  matchStatus: MatchLifecycleStatus | null;
  matchGameId: string | null;
  matchGameName: string | null;
  matchParticipants: string[];
  wantedGameIds: string[];
  openGameIds: string[];
  pendingProposalCount: number;
  viewerProposal: ViewerProposal | null;
  proposals: OwnerProposal[];
};

type Props = {
  games: Game[];
  onlyMine?: boolean;
};

const SLOT_DATE_LABEL = getClubDateTimeFormatter({
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

const SLOT_TIME_LABEL = getClubDateTimeFormatter({
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return `${SLOT_DATE_LABEL.format(s)} ${SLOT_TIME_LABEL.format(s)} -> ${SLOT_TIME_LABEL.format(e)}`;
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
  const [proposalActionId, setProposalActionId] = useState<string | null>(null);
  const [filterGame, setFilterGame] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<EffectiveSlotStatus | "">("");
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [proposalTarget, setProposalTarget] = useState<GroupedSlot | null>(null);
  const [editingSlot, setEditingSlot] = useState<GroupedSlot | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/juego-organizado/slots", { cache: "no-store" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "No se pudieron cargar los slots.");
        }
        const data = (await res.json()) as Slot[];
        const filtered = onlyMine ? (userId ? data.filter((slot) => slot.creatorId === userId) : []) : data;
        setSlots(filtered || []);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "No se pudieron cargar los slots.");
      } finally {
        setLoading(false);
      }
    }

    load();

    function reloadSlots() {
      load();
    }

    window.addEventListener("availability-slots:changed", reloadSlots);
    return () => window.removeEventListener("availability-slots:changed", reloadSlots);
  }, [onlyMine, userId]);

  const groupedSlots = useMemo(() => groupSlots(slots), [slots]);

  const visibleSlots = useMemo(() => {
    return groupedSlots.filter((slot) => {
      if (filterStatus && slot.effectiveStatus !== filterStatus) return false;
      if (filterGame && !slot.wantedGameIds.includes(filterGame) && !slot.openGameIds.includes(filterGame)) return false;
      return true;
    });
  }, [filterGame, filterStatus, groupedSlots]);

  async function refreshList() {
    const res = await fetch("/api/juego-organizado/slots", { cache: "no-store" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "No se pudieron cargar los slots.");
    }
    const refreshed = (await res.json()) as Slot[];
    setSlots(onlyMine ? (userId ? refreshed.filter((slot) => slot.creatorId === userId) : []) : refreshed);
  }

  async function handleDelete(slotIds: string[]) {
    const targetId = slotIds[0];
    setJoining(targetId);
    setError(null);
    try {
      for (const slotId of slotIds) {
        const res = await fetch(`/api/juego-organizado/slots/${slotId}`, { method: "DELETE" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "No se pudo eliminar.");
        }
      }
      setSlots((current) => current.filter((slot) => !slotIds.includes(slot.id)));
      window.dispatchEvent(new Event("availability-slots:changed"));
    } catch (e: any) {
      setError(e?.message || "Error al eliminar.");
    } finally {
      setJoining(null);
    }
  }

  async function handleProposalAccept(proposalId: string) {
    setProposalActionId(proposalId);
    setError(null);
    try {
      const response = await fetch(`/api/juego-organizado/slot-proposals/${proposalId}/accept`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo confirmar la propuesta.");
      window.dispatchEvent(new Event("availability-slots:changed"));
    } catch (e: any) {
      setError(e?.message || "Error al confirmar la propuesta.");
    } finally {
      setProposalActionId(null);
    }
  }

  async function handleProposalReject(proposalId: string) {
    setProposalActionId(proposalId);
    setError(null);
    try {
      const response = await fetch(`/api/juego-organizado/slot-proposals/${proposalId}/reject`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo rechazar la propuesta.");
      window.dispatchEvent(new Event("availability-slots:changed"));
    } catch (e: any) {
      setError(e?.message || "Error al rechazar la propuesta.");
    } finally {
      setProposalActionId(null);
    }
  }

  const toggleExpanded = (key: string) => {
    setExpandedKeys((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[var(--hairline)] bg-[var(--bg)] p-4">
          <h3 className="text-sm font-semibold text-[var(--text)]">Filtros</h3>
          <div className="mt-3 space-y-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
              Juego
              <select
                value={filterGame ?? ""}
                onChange={(e) => setFilterGame(e.target.value || null)}
                className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
              >
                <option value="">Todos los juegos</option>
                {games.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
              Estado
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as EffectiveSlotStatus | "")}
                className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
              >
                <option value="">Todos</option>
                <option value="OPEN">Buscando rival</option>
                <option value="MATCHED">Pendiente confirmar</option>
                <option value="CONFIRMED">Partida</option>
                <option value="IN_PLAY">En curso</option>
                <option value="DONE">Terminada</option>
                <option value="EXPIRED">Caducada</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </label>
          </div>
        </aside>

        <div className="min-w-0 space-y-3">
          {loading && <span className="text-sm text-[var(--muted)]">Cargando...</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}

          {visibleSlots.map((slot) => {
            const isOwner = userId === slot.creatorId;
            const canEdit = isOwner && slot.effectiveStatus === "OPEN" && slot.pendingProposalCount === 0;
            const canDelete = isOwner && slot.effectiveStatus !== "CONFIRMED" && slot.effectiveStatus !== "IN_PLAY";
            const canPropose =
              userId != null &&
              !isOwner &&
              slot.effectiveStatus === "OPEN" &&
              slot.ids.length === 1 &&
              !slot.viewerProposal;
            const primaryId = slot.ids[0];
            const expandableKey = `${primaryId}-${slot.start}`;
            const expanded = expandedKeys[expandableKey] ?? false;
            return (
              <div
                key={`${slot.start}-${slot.end}-${slot.effectiveStatus}-${primaryId}`}
                className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--text)]">Franja de juego</span>
                      <span
                        className={clsx(
                          "rounded-full px-2 py-[2px] text-[11px] font-semibold uppercase tracking-wide",
                          slot.effectiveStatus === "OPEN" && "bg-emerald-50 text-emerald-700",
                          slot.effectiveStatus === "MATCHED" && "bg-amber-50 text-amber-700",
                          slot.effectiveStatus === "CONFIRMED" && "bg-emerald-600 text-white",
                          slot.effectiveStatus === "IN_PLAY" && "bg-sky-600 text-white",
                          (slot.effectiveStatus === "DONE" || slot.effectiveStatus === "EXPIRED" || slot.effectiveStatus === "CANCELLED") &&
                            "bg-slate-100 text-slate-700"
                        )}
                      >
                        {getSlotStatusLabel(slot.effectiveStatus)}
                      </span>
                      {slot.pendingProposalCount > 0 && (
                        <span className="rounded-full bg-amber-50 px-2 py-[2px] text-[11px] font-semibold uppercase text-amber-700">
                          {slot.pendingProposalCount} propuesta{slot.pendingProposalCount === 1 ? "" : "s"} pendiente{slot.pendingProposalCount === 1 ? "" : "s"}
                        </span>
                      )}
                      {slot.viewerProposal && (
                        <span className="rounded-full bg-[var(--bg)] px-2 py-[2px] text-[11px] font-semibold uppercase text-[var(--muted)]">
                          Propuesta enviada
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-[var(--muted)]">{formatRange(slot.start, slot.end)}</div>
                    <div className="text-sm text-[var(--muted)]">{slot.format || "Formato libre"}</div>
                    {(slot.effectiveStatus === "CONFIRMED" || slot.effectiveStatus === "IN_PLAY" || slot.effectiveStatus === "DONE" || slot.effectiveStatus === "CANCELLED") &&
                      slot.matchParticipants.length > 0 && (
                      <div className="text-sm text-[var(--muted)]">Jugadores: {slot.matchParticipants.join(" vs ")}</div>
                    )}

                    <div className="mt-2 flex flex-wrap gap-2">
                      {(slot.effectiveStatus === "CONFIRMED" ||
                        slot.effectiveStatus === "IN_PLAY" ||
                        slot.effectiveStatus === "DONE" ||
                        slot.effectiveStatus === "CANCELLED") &&
                      slot.matchGameId ? (
                        <PreferenceTag
                          key={`confirmed-${slot.matchGameId}`}
                          label={slot.matchGameName ?? gameName(games, slot.matchGameId)}
                          tone="wanted"
                        />
                      ) : (
                        <>
                          {slot.wantedGameIds.map((gameId) => (
                            <PreferenceTag key={`wanted-${gameId}`} label={gameName(games, gameId)} tone="wanted" />
                          ))}
                          {slot.openGameIds.map((gameId) => (
                            <PreferenceTag key={`open-${gameId}`} label={gameName(games, gameId)} tone="open" />
                          ))}
                        </>
                      )}
                    </div>

                    {slot.note && <div className="mt-1 text-sm text-[var(--text)]">{slot.note}</div>}
                    {slot.viewerProposal && (
                      <div className="mt-2 text-sm text-[var(--muted)]">
                        Tu propuesta: {formatRange(slot.viewerProposal.proposedStart, slot.viewerProposal.proposedEnd)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canPropose && (
                      <button
                        type="button"
                        className="btn btn-accent px-3 py-2 text-sm"
                        onClick={() => setProposalTarget(slot)}
                      >
                        Me apunto
                      </button>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        className="btn px-3 py-2 text-sm"
                        onClick={() => setEditingSlot(slot)}
                      >
                        Editar
                      </button>
                    )}
                    {isOwner && slot.proposals.length > 0 && (
                      <button
                        type="button"
                        className="btn px-3 py-2 text-sm"
                        onClick={() => toggleExpanded(expandableKey)}
                      >
                        {expanded ? "Ocultar propuestas" : `Ver propuestas (${slot.proposals.length})`}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        className="btn px-3 py-2 text-sm disabled:opacity-50"
                        disabled={joining === primaryId}
                        onClick={() => handleDelete(slot.ids)}
                      >
                        {joining === primaryId ? "Eliminando..." : "Eliminar"}
                      </button>
                    )}
                  </div>
                </div>

                {isOwner && slot.proposals.length > 0 && expanded && (
                  <div className="mt-4 space-y-3 border-t border-[var(--hairline)] pt-4">
                    {slot.proposals.map((proposal) => (
                      <div
                        key={proposal.id}
                        className="rounded-2xl border border-[var(--hairline)] bg-[var(--bg)] p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-[var(--text)]">{proposal.requesterName}</span>
                              <span className="rounded-full bg-amber-50 px-2 py-[2px] text-[11px] font-semibold uppercase text-amber-700">
                                Pendiente
                              </span>
                            </div>
                            <div className="text-sm text-[var(--muted)]">
                              {formatRange(proposal.proposedStart, proposal.proposedEnd)}
                            </div>
                            {proposal.gameName && <div className="text-sm text-[var(--muted)]">{proposal.gameName}</div>}
                            {proposal.note && <div className="text-sm text-[var(--text)]">{proposal.note}</div>}
                            <div className="text-xs text-[var(--muted)]">
                              Enviada el {new Date(proposal.createdAt).toLocaleDateString()} a las{" "}
                              {new Date(proposal.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="btn btn-accent px-3 py-2 text-sm disabled:opacity-50"
                              disabled={proposalActionId === proposal.id}
                              onClick={() => handleProposalAccept(proposal.id)}
                            >
                              {proposalActionId === proposal.id ? "Confirmando..." : "Confirmar"}
                            </button>
                            <button
                              type="button"
                              className="btn px-3 py-2 text-sm disabled:opacity-50"
                              disabled={proposalActionId === proposal.id}
                              onClick={() => handleProposalReject(proposal.id)}
                            >
                              {proposalActionId === proposal.id ? "Rechazando..." : "Rechazar"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {!loading && visibleSlots.length === 0 && <p className="text-sm text-[var(--muted)]">No hay slots con los filtros seleccionados.</p>}
        </div>
      </div>

      <SlotProposalModal
        open={Boolean(proposalTarget)}
        slot={
          proposalTarget
            ? {
                id: proposalTarget.ids[0],
                start: proposalTarget.start,
                end: proposalTarget.end,
                wantedGameIds: proposalTarget.wantedGameIds,
                openGameIds: proposalTarget.openGameIds,
              }
            : null
        }
        games={games}
        onClose={() => setProposalTarget(null)}
        onSubmitted={() => {
          window.dispatchEvent(new Event("availability-slots:changed"));
        }}
      />

      <EditSlotModal
        open={Boolean(editingSlot)}
        slot={
          editingSlot
            ? {
                id: editingSlot.ids[0],
                ids: editingSlot.ids,
                start: editingSlot.start,
                end: editingSlot.end,
                format: editingSlot.format,
                note: editingSlot.note,
                gameId: null,
                level: null,
                wantedGameIds: editingSlot.wantedGameIds,
                openGameIds: editingSlot.openGameIds,
              }
            : null
        }
        games={games}
        onClose={() => setEditingSlot(null)}
        onSaved={() => {
          window.dispatchEvent(new Event("availability-slots:changed"));
        }}
      />
    </>
  );
}

function groupSlots(slots: Slot[]) {
  const grouped = new Map<string, GroupedSlot>();

  for (const slot of slots) {
    const parsed = extractSlotPreferences(slot);
    const effectiveStatus = getEffectiveSlotStatus({
      status: slot.status,
      start: slot.start,
      end: slot.end,
      match: slot.matchStatus ? { status: slot.matchStatus, start: slot.start, end: slot.end } : null,
    });
    const key = [
      slot.creatorId,
      slot.start,
      slot.end,
      slot.status,
      slot.matchStatus ?? "",
      slot.format ?? "",
      parsed.note ?? "",
    ].join("|");

    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, {
        ids: [slot.id],
        creatorId: slot.creatorId,
        start: slot.start,
        end: slot.end,
        status: slot.status,
        effectiveStatus,
        format: slot.format ?? null,
        note: parsed.note,
        matchIds: slot.matchId ? [slot.matchId] : [],
        matchStatus: slot.matchStatus ?? null,
        matchGameId: slot.matchGameId ?? null,
        matchGameName: slot.matchGameName ?? null,
        matchParticipants: slot.matchParticipants ?? [],
        wantedGameIds: [...parsed.wantedGameIds],
        openGameIds: [...parsed.openGameIds],
        pendingProposalCount: slot.pendingProposalCount,
        viewerProposal: slot.viewerProposal,
        proposals: [...slot.proposals],
      });
      continue;
    }

    current.ids.push(slot.id);
    if (slot.matchId && !current.matchIds.includes(slot.matchId)) current.matchIds.push(slot.matchId);
    current.matchStatus = current.matchStatus ?? slot.matchStatus ?? null;
    current.matchGameId = current.matchGameId ?? slot.matchGameId ?? null;
    current.matchGameName = current.matchGameName ?? slot.matchGameName ?? null;
    current.matchParticipants = unique([...current.matchParticipants, ...(slot.matchParticipants ?? [])]);
    current.wantedGameIds = unique([...current.wantedGameIds, ...parsed.wantedGameIds]);
    current.openGameIds = unique([...current.openGameIds, ...parsed.openGameIds]).filter(
      (gameId) => !current.wantedGameIds.includes(gameId)
    );
    current.pendingProposalCount += slot.pendingProposalCount;
    current.viewerProposal = current.viewerProposal ?? slot.viewerProposal;
    current.proposals = dedupeProposals([...current.proposals, ...slot.proposals]);
  }

  return Array.from(grouped.values()).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

function dedupeProposals(proposals: OwnerProposal[]) {
  const seen = new Set<string>();
  return proposals.filter((proposal) => {
    if (seen.has(proposal.id)) return false;
    seen.add(proposal.id);
    return true;
  });
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function gameName(games: Game[], gameId: string) {
  return games.find((game) => game.id === gameId)?.name ?? "Juego";
}

function PreferenceTag({ label, tone }: { label: string; tone: "wanted" | "open" }) {
  return (
    <span
      className={clsx(
        "rounded-full px-2 py-[3px] text-xs font-semibold",
        tone === "wanted" ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-400/20 text-amber-700"
      )}
    >
      {label}
    </span>
  );
}
