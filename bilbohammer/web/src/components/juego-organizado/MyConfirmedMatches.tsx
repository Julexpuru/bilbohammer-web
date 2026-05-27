"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getClubDateTimeFormatter } from "@/lib/date-format";
import { getEffectiveMatchStatus, type MatchLifecycleStatus } from "@/lib/organized-slot-status";

type MatchItem = {
  id: string;
  gameName: string;
  startsAt: string;
  endsAt: string;
  status: MatchLifecycleStatus;
  format: string | null;
  tableId: string | null;
  tableName: string | null;
  event: { id: string; title: string } | null;
  participants: string[];
};

type Props = {
  matches: MatchItem[];
};

type TableOption = {
  id: string;
  name: string;
  gameName: string | null;
  availability: "available" | "current" | "reserved" | "blocked";
  reason: string | null;
};

type MatchTableResponse = {
  reservation: { id: string; tableId: string; tableName: string } | null;
  tables: TableOption[];
};

const MATCH_DATE_LABEL = getClubDateTimeFormatter({
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

const MATCH_TIME_LABEL = getClubDateTimeFormatter({
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const MATCH_STATUS_STYLES: Record<"CONFIRMED" | "IN_PLAY", string> = {
  CONFIRMED: "bg-emerald-600 text-white",
  IN_PLAY: "bg-sky-600 text-white",
};

function getMatchStatusLabel(status: "CONFIRMED" | "IN_PLAY") {
  return status === "IN_PLAY" ? "En curso" : "Partida";
}

export function MyConfirmedMatches({ matches }: Props) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tableEditorMatch, setTableEditorMatch] = useState<MatchItem | null>(null);

  const visibleMatches = useMemo(
    () =>
      matches.filter((match) => {
        const effectiveStatus = getEffectiveMatchStatus({
          status: match.status,
          start: match.startsAt,
          end: match.endsAt,
        });
        return effectiveStatus === "CONFIRMED" || effectiveStatus === "IN_PLAY";
      }),
    [matches]
  );

  async function handleCancel(matchId: string) {
    setCancellingId(matchId);
    setError(null);
    try {
      const response = await fetch(`/api/juego-organizado/matches/${matchId}/cancel`, {
        method: "POST",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "No se pudo cancelar la partida.");
      }
      window.dispatchEvent(new Event("availability-slots:changed"));
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "No se pudo cancelar la partida.");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <>
      <div className="mt-4 space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {visibleMatches.length === 0 && <p className="text-sm text-[var(--muted)]">Aun no tienes partidas confirmadas.</p>}
        {visibleMatches.map((match) => {
          const effectiveStatus = getEffectiveMatchStatus({
            status: match.status,
            start: match.startsAt,
            end: match.endsAt,
          }) as "CONFIRMED" | "IN_PLAY";

          return (
            <div
              key={match.id}
              className="flex flex-col gap-3 rounded-xl border border-[var(--hairline)] bg-[var(--card)] p-3 shadow-sm sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--text)]">{match.gameName}</span>
                  <span className={`rounded-full px-2 py-[2px] text-[11px] font-semibold uppercase ${MATCH_STATUS_STYLES[effectiveStatus]}`}>
                    {getMatchStatusLabel(effectiveStatus)}
                  </span>
                  {match.event && (
                    <a
                      href={`/eventos/${match.event.id}`}
                      className="rounded-full bg-indigo-50 px-2 py-[2px] text-[11px] font-semibold uppercase text-indigo-700 underline"
                    >
                      {match.event.title}
                    </a>
                  )}
                </div>
                <div className="text-sm text-[var(--muted)]">
                  {MATCH_DATE_LABEL.format(new Date(match.startsAt))} {MATCH_TIME_LABEL.format(new Date(match.startsAt))} -{" "}
                  {MATCH_TIME_LABEL.format(new Date(match.endsAt))}
                </div>
                {match.participants.length > 0 && <div className="text-sm text-[var(--muted)]">Jugadores: {match.participants.join(" vs ")}</div>}
                {match.format && <div className="text-sm text-[var(--muted)]">{match.format}</div>}
                <div className="text-sm text-[var(--text)]">
                  Mesa:{" "}
                  {match.tableName ? (
                    <span className="font-semibold">{match.tableName}</span>
                  ) : (
                    <span className="text-[var(--muted)]">Sin mesa asignada</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn px-3 py-2 text-sm"
                  onClick={() => {
                    setError(null);
                    setTableEditorMatch(match);
                  }}
                >
                  {match.tableId ? "Cambiar mesa" : "Asignar mesa"}
                </button>
                <button
                  type="button"
                  className="btn px-3 py-2 text-sm disabled:opacity-50"
                  disabled={cancellingId === match.id}
                  onClick={() => handleCancel(match.id)}
                >
                  {cancellingId === match.id ? "Cancelando..." : "Cancelar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <MatchTableModal
        match={tableEditorMatch}
        onClose={() => setTableEditorMatch(null)}
        onSaved={() => {
          window.dispatchEvent(new Event("availability-slots:changed"));
          router.refresh();
          setTableEditorMatch(null);
        }}
      />
    </>
  );
}

function MatchTableModal({
  match,
  onClose,
  onSaved,
}: {
  match: MatchItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservation, setReservation] = useState<MatchTableResponse["reservation"]>(null);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [selectedTableId, setSelectedTableId] = useState("");

  useEffect(() => {
    if (!match) return;

    const matchId = match.id;
    let cancelled = false;
    const controller = new AbortController();

    async function loadOptions() {
      setLoading(true);
      setSaving(false);
      setError(null);
      try {
        const response = await fetch(`/api/juego-organizado/matches/${matchId}/table`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = (await response.json().catch(() => null)) as MatchTableResponse | { error?: string } | null;
        if (!response.ok || !body || !("tables" in body)) {
          throw new Error((body as { error?: string } | null)?.error || "No se pudo cargar la disponibilidad de mesas.");
        }
        if (cancelled) return;
        setReservation(body.reservation ?? null);
        setTables(body.tables);
        setSelectedTableId(body.reservation?.tableId ?? "");
      } catch (err: any) {
        if (cancelled || err?.name === "AbortError") return;
        setTables([]);
        setReservation(null);
        setSelectedTableId("");
        setError(err?.message || "No se pudo cargar la disponibilidad de mesas.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOptions();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [match]);

  useEffect(() => {
    if (!match) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [match, onClose, saving]);

  if (!match) return null;
  const activeMatch = match;

  const selectableTables = tables.filter(
    (table) => table.availability === "available" || table.availability === "current"
  );

  async function handleSave() {
    if (!selectedTableId) {
      setError("Debes seleccionar una mesa.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/juego-organizado/matches/${activeMatch.id}/table`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId: selectedTableId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo guardar la mesa.");
      onSaved();
    } catch (err: any) {
      setError(err?.message || "No se pudo guardar la mesa.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRelease() {
    if (!reservation) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/juego-organizado/matches/${activeMatch.id}/table`, {
        method: "DELETE",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo liberar la mesa.");
      onSaved();
    } catch (err: any) {
      setError(err?.message || "No se pudo liberar la mesa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4" onClick={() => !saving && onClose()}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-[var(--hairline)] bg-[var(--card)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--hairline)] px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text)]">Gestionar mesa</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {activeMatch.gameName} - {MATCH_DATE_LABEL.format(new Date(activeMatch.startsAt))} {MATCH_TIME_LABEL.format(new Date(activeMatch.startsAt))} -{" "}
              {MATCH_TIME_LABEL.format(new Date(activeMatch.endsAt))}
            </p>
          </div>
          <button
            type="button"
            className="rounded-md border border-[var(--hairline)] px-3 py-1.5 text-sm font-semibold text-[var(--text)] disabled:opacity-50"
            disabled={saving}
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-xl border border-[var(--hairline)] bg-[var(--bg)] p-3 text-sm text-[var(--text)]">
            Mesa actual:{" "}
            {reservation?.tableName ? (
              <span className="font-semibold">{reservation.tableName}</span>
            ) : (
              <span className="text-[var(--muted)]">Sin mesa asignada</span>
            )}
          </div>

          {loading ? (
            <div className="rounded-xl border border-dashed border-[var(--hairline)] bg-[var(--bg)] p-4 text-sm text-[var(--muted)]">
              Cargando disponibilidad...
            </div>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-sm font-semibold text-[var(--muted)]">
                Mesa disponible
                <select
                  className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
                  value={selectedTableId}
                  onChange={(event) => setSelectedTableId(event.target.value)}
                  disabled={saving}
                >
                  <option value="">Selecciona una mesa</option>
                  {selectableTables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {buildTableOptionLabel(table)}
                    </option>
                  ))}
                </select>
              </label>

              {tables.some((table) => table.availability === "reserved" || table.availability === "blocked") && (
                <div className="rounded-xl border border-[var(--hairline)] bg-[var(--bg)] p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">No disponibles en ese horario</div>
                  <div className="mt-2 space-y-2">
                    {tables
                      .filter((table) => table.availability === "reserved" || table.availability === "blocked")
                      .map((table) => (
                        <div key={table.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="font-medium text-[var(--text)]">{buildTableOptionLabel(table)}</span>
                          <span className="text-[var(--muted)]">{table.reason}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--hairline)] px-5 py-4">
          <div>
            {reservation && (
              <button
                type="button"
                className="btn px-3 py-2 text-sm disabled:opacity-50"
                disabled={saving}
                onClick={handleRelease}
              >
                Liberar mesa
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn px-3 py-2 text-sm disabled:opacity-50"
              disabled={saving}
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-accent px-3 py-2 text-sm disabled:opacity-50"
              disabled={saving || loading || !selectedTableId}
              onClick={handleSave}
            >
              {saving ? "Guardando..." : reservation ? "Guardar cambio" : "Reservar mesa"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildTableOptionLabel(table: TableOption) {
  return table.gameName ? `${table.name} - ${table.gameName}` : table.name;
}
