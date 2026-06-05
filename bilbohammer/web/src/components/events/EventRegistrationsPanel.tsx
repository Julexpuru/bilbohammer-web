"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

type RegistrationStatus = "INSCRITO" | "PAGADO" | "CANCELLED";

type Registration = {
  id: string;
  eventId: string;
  userId: number | null;
  playerName: string;
  factionLabel: string | null;
  status: RegistrationStatus;
  notes: string | null;
  registeredAt: string;
};

type MemberSearchResult = {
  id: string;
  name: string;
  nick?: string | null;
  email?: string | null;
};

type Props = {
  eventId: string;
  currentUserId: number | null;
  canManage: boolean;
  canRegister: boolean;
  capacityMax: number | null;
  registrations: Registration[];
};

const STATUS_LABELS: Record<RegistrationStatus, string> = {
  INSCRITO: "Inscrito",
  PAGADO: "Pagado",
  CANCELLED: "Cancelado",
};

const STATUS_STYLES: Record<RegistrationStatus, string> = {
  INSCRITO: "border-amber-400/40 bg-amber-500/15 text-amber-100",
  PAGADO: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
  CANCELLED: "border-white/15 bg-white/5 text-white/50",
};

function registrationSortValue(status: RegistrationStatus) {
  if (status === "PAGADO") return 0;
  if (status === "INSCRITO") return 1;
  return 2;
}

function StatusBadge({ status }: { status: RegistrationStatus }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function normalizeRegistration(registration: Registration): Registration {
  return {
    ...registration,
    factionLabel: registration.factionLabel ?? "",
    notes: registration.notes ?? "",
  };
}

export default function EventRegistrationsPanel({
  eventId,
  currentUserId,
  canManage,
  canRegister,
  capacityMax,
  registrations,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [memberResults, setMemberResults] = React.useState<MemberSearchResult[]>([]);
  const [selectedMember, setSelectedMember] = React.useState<MemberSearchResult | null>(null);
  const [newName, setNewName] = React.useState("");
  const [newFaction, setNewFaction] = React.useState("");
  const [newStatus, setNewStatus] = React.useState<RegistrationStatus>("INSCRITO");
  const [drafts, setDrafts] = React.useState<Record<string, Registration>>({});

  const orderedRegistrations = React.useMemo(
    () =>
      [...registrations].sort((a, b) => {
        const byStatus = registrationSortValue(a.status) - registrationSortValue(b.status);
        if (byStatus !== 0) return byStatus;
        return a.playerName.localeCompare(b.playerName, "es");
      }),
    [registrations],
  );

  React.useEffect(() => {
    setDrafts(Object.fromEntries(registrations.map((registration) => [registration.id, normalizeRegistration(registration)])));
  }, [registrations]);

  React.useEffect(() => {
    if (!canManage || search.trim().length < 2) {
      setMemberResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/members/search?q=${encodeURIComponent(search.trim())}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        setMemberResults(Array.isArray(data.results) ? data.results : []);
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          console.error("[events] member search failed", fetchError);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [canManage, search]);

  const activeRegistrations = registrations.filter((registration) => registration.status !== "CANCELLED");
  const currentRegistration = currentUserId
    ? registrations.find((registration) => registration.userId === currentUserId)
    : null;
  const currentActiveRegistration =
    currentRegistration && currentRegistration.status !== "CANCELLED" ? currentRegistration : null;
  const capacityLabel =
    capacityMax != null && capacityMax > 0
      ? `${activeRegistrations.length}/${capacityMax} plazas`
      : `${activeRegistrations.length} participantes`;

  async function submitRequest(url: string, init: RequestInit, busyKey: string) {
    setBusy(busyKey);
    setError(null);
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init.headers ?? {}),
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "No se pudo guardar el cambio.");
      }
      router.refresh();
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo guardar el cambio.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function handleSelfRegister() {
    await submitRequest(
      `/api/events/${eventId}/registrations`,
      { method: "POST", body: JSON.stringify({}) },
      "self-register",
    );
  }

  async function handleSelfCancel() {
    if (!currentRegistration) return;
    await submitRequest(
      `/api/events/${eventId}/registrations/${currentRegistration.id}`,
      { method: "PATCH", body: JSON.stringify({ status: "CANCELLED" }) },
      `cancel-${currentRegistration.id}`,
    );
  }

  async function handleAddRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const userId = selectedMember ? Number(selectedMember.id) : null;
    const ok = await submitRequest(
      `/api/events/${eventId}/registrations`,
      {
        method: "POST",
        body: JSON.stringify({
          userId,
          playerName: selectedMember?.name ?? newName,
          factionLabel: newFaction,
          status: newStatus,
        }),
      },
      "add",
    );
    if (ok) {
      setSearch("");
      setMemberResults([]);
      setSelectedMember(null);
      setNewName("");
      setNewFaction("");
      setNewStatus("INSCRITO");
    }
  }

  async function handleSaveRegistration(registrationId: string) {
    const draft = drafts[registrationId];
    if (!draft) return;
    await submitRequest(
      `/api/events/${eventId}/registrations/${registrationId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          playerName: draft.playerName,
          factionLabel: draft.factionLabel,
          status: draft.status,
          notes: draft.notes,
        }),
      },
      `save-${registrationId}`,
    );
  }

  async function handleDeleteRegistration(registrationId: string) {
    await submitRequest(
      `/api/events/${eventId}/registrations/${registrationId}`,
      { method: "DELETE" },
      `delete-${registrationId}`,
    );
  }

  function updateDraft(registrationId: string, patch: Partial<Registration>) {
    setDrafts((prev) => ({
      ...prev,
      [registrationId]: {
        ...(prev[registrationId] ?? registrations.find((registration) => registration.id === registrationId)!),
        ...patch,
      },
    }));
  }

  return (
    <section className="space-y-5 rounded-3xl border border-white/10 bg-black/20 p-6 shadow-lg">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Participantes</p>
          <h2 className="mt-1 text-xl font-semibold text-white">{capacityLabel}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {!currentUserId && canRegister && (
            <Link
              href="/login"
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white hover:bg-white/10"
            >
              Iniciar sesión
            </Link>
          )}
          {currentUserId && !currentActiveRegistration && canRegister && (
            <button
              type="button"
              onClick={handleSelfRegister}
              disabled={busy === "self-register"}
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-black disabled:opacity-60"
            >
              {busy === "self-register" ? "Guardando" : "Apuntarme"}
            </button>
          )}
          {currentActiveRegistration && (
            <button
              type="button"
              onClick={handleSelfCancel}
              disabled={busy === `cancel-${currentActiveRegistration.id}`}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white hover:bg-white/10 disabled:opacity-60"
            >
              {busy === `cancel-${currentActiveRegistration.id}` ? "Guardando" : "Cancelar plaza"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}

      {orderedRegistrations.length > 0 ? (
        <div className="space-y-2">
          {orderedRegistrations.map((registration) => {
            const draft = drafts[registration.id] ?? normalizeRegistration(registration);
            return (
              <div key={registration.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                {canManage ? (
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_150px_auto_auto]">
                    <input
                      value={draft.playerName}
                      onChange={(event) => updateDraft(registration.id, { playerName: event.target.value })}
                      className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                    />
                    <input
                      value={draft.factionLabel ?? ""}
                      onChange={(event) => updateDraft(registration.id, { factionLabel: event.target.value })}
                      placeholder="Facción/lista opcional"
                      className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                    />
                    <select
                      value={draft.status}
                      onChange={(event) => updateDraft(registration.id, { status: event.target.value as RegistrationStatus })}
                      className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                    >
                      <option value="INSCRITO">Inscrito</option>
                      <option value="PAGADO">Pagado</option>
                      <option value="CANCELLED">Cancelado</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleSaveRegistration(registration.id)}
                      disabled={busy === `save-${registration.id}`}
                      className="rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white hover:bg-white/10 disabled:opacity-60"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRegistration(registration.id)}
                      disabled={busy === `delete-${registration.id}`}
                      className="rounded-xl border border-red-400/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-100 hover:bg-red-500/10 disabled:opacity-60"
                    >
                      Eliminar
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-white">{registration.playerName}</p>
                      {registration.factionLabel && (
                        <p className="text-sm text-[var(--muted)]">{registration.factionLabel}</p>
                      )}
                    </div>
                    <StatusBadge status={registration.status} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">Todavía no hay participantes inscritos.</p>
      )}

      {canManage && (
        <form onSubmit={handleAddRegistration} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Añadir participante</p>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_150px_auto]">
            <div className="relative">
              <input
                value={selectedMember ? selectedMember.name : search || newName}
                onChange={(event) => {
                  setSelectedMember(null);
                  setSearch(event.target.value);
                  setNewName(event.target.value);
                }}
                placeholder="Buscar socio o escribir nombre"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
              />
              {memberResults.length > 0 && !selectedMember && (
                <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-950 shadow-xl">
                  {memberResults.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setSelectedMember(member);
                        setSearch(member.name);
                        setNewName(member.name);
                        setMemberResults([]);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10"
                    >
                      {member.name}
                      {member.nick && <span className="ml-2 text-xs text-[var(--muted)]">{member.nick}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              value={newFaction}
              onChange={(event) => setNewFaction(event.target.value)}
              placeholder="Facción/lista opcional"
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
            />
            <select
              value={newStatus}
              onChange={(event) => setNewStatus(event.target.value as RegistrationStatus)}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
            >
              <option value="INSCRITO">Inscrito</option>
              <option value="PAGADO">Pagado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
            <button
              type="submit"
              disabled={busy === "add" || (!selectedMember && !newName.trim())}
              className="rounded-xl bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black disabled:opacity-60"
            >
              Añadir
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
