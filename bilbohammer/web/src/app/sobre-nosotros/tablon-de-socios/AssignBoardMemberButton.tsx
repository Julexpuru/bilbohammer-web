"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { BoardSlotId } from "@/lib/member-directory";

type SearchResult = {
  id: string;
  name: string;
  nick?: string | null;
  email?: string | null;
};

type AssignMode = "set" | "append" | "replace";

export function AssignBoardMemberButton({
  slotId,
  slotLabel,
  mode = "set",
  targetId = null,
  buttonLabel = "Asignar",
}: {
  slotId: BoardSlotId;
  slotLabel: string;
  mode?: AssignMode;
  targetId?: number | null;
  buttonLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    if (query.trim().length < 2) {
      setResults([]);
      setError(null);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/members/search?q=${encodeURIComponent(query)}&role=junta`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("SEARCH_ERROR");
        return response.json();
      })
      .then((payload) => {
        setResults(Array.isArray(payload?.results) ? payload.results : []);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError("No se pudo completar la búsqueda. Inténtalo de nuevo.");
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [open, query]);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const handleAssign = async (userId: string) => {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { slot: slotId, userId };
      if (slotId === "VOCAL") {
        payload.mode = mode === "append" ? "append" : "replace";
        if (targetId != null) payload.targetId = targetId;
      }

      const response = await fetch("/api/admin/board-assignments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("ASSIGN_ERROR");
      }
      setOpen(false);
      setQuery("");
      setResults([]);
      router.refresh();
    } catch (assignError) {
      setError("No se pudo asignar el cargo. Comprueba el rol de la persona e intentalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="rounded-full border border-[var(--hairline)] bg-[var(--card)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text)] transition hover:border-[var(--border)] hover:text-[var(--accent)]"
        onClick={() => setOpen(true)}
      >
        {buttonLabel}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-6 shadow-2xl">
            <header className="space-y-1">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Asignar cargo</p>
              <h3 className="text-2xl font-semibold text-[var(--text)]">{slotLabel}</h3>
              <p className="text-sm text-[var(--muted)]">
                Busca entre las personas con rol de junta y asigna este cargo. Escribe al menos 2 caracteres.
              </p>
            </header>

            <div className="mt-4 space-y-2">
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre, nick o email"
                className="w-full rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] px-4 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
              />
              {error && <p className="text-sm text-rose-500">{error}</p>}
            </div>

            <div className="mt-4 max-h-64 overflow-y-auto rounded-2xl border border-dashed border-[var(--hairline)] bg-[var(--card-muted)] p-2">
              {query.trim().length < 2 ? (
                <p className="text-sm text-[var(--muted)] px-2 py-4">
                  Escribe al menos 2 caracteres para iniciar la búsqueda.
                </p>
              ) : loading ? (
                <p className="text-sm text-[var(--muted)] px-2 py-4">Buscando...</p>
              ) : results.length === 0 ? (
                <p className="text-sm text-[var(--muted)] px-2 py-4">No se han encontrado personas con rol de junta.</p>
              ) : (
                <ul className="space-y-2">
                  {results.map((result) => (
                    <li key={result.id}>
                      <button
                        type="button"
                        className="w-full rounded-2xl border border-transparent bg-[var(--card)] px-3 py-2 text-left transition hover:border-[var(--accent)]"
                        onClick={() => handleAssign(result.id)}
                        disabled={saving}
                      >
                        <p className="text-sm font-semibold text-[var(--text)]">{result.nick || result.name}</p>
                        {result.nick && result.name !== result.nick && (
                          <p className="text-xs font-normal text-[var(--muted)]">{result.name}</p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="rounded-full border border-[var(--hairline)] bg-transparent px-4 py-2 text-sm text-[var(--text)] transition hover:border-[var(--border)]"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function RemoveBoardMemberButton({
  slotId,
  targetId,
  buttonLabel = "Quitar",
}: {
  slotId: "VOCAL";
  targetId: number;
  buttonLabel?: string;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemove = async () => {
    setRemoving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/board-assignments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot: slotId, mode: "remove", targetId }),
      });
      if (!response.ok) throw new Error("REMOVE_ERROR");
      router.refresh();
    } catch (err) {
      setError("No se pudo eliminar este cargo. Inténtalo de nuevo.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className="rounded-full border border-[var(--hairline)] bg-transparent px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)] transition hover:border-rose-400 hover:text-rose-400"
        onClick={handleRemove}
        disabled={removing}
      >
        {removing ? "Quitando..." : buttonLabel}
      </button>
      {error && <span className="text-[10px] text-rose-400">{error}</span>}
    </div>
  );
}
