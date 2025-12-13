export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { extractRoles } from "@/lib/roles";
import { SlotsList } from "@/components/juego-organizado/SlotsList";
import { SlotForm } from "@/components/juego-organizado/SlotForm";

async function loadGames() {
  const games = await prisma.game.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });
  return games;
}

async function loadMyMatches(userId: number | null) {
  if (!userId) return [];
  const matches = await prisma.match.findMany({
    where: {
      participants: { some: { userId } },
    },
    orderBy: { startsAt: "asc" },
    include: {
      game: true,
      event: { select: { id: true, title: true } },
      participants: true,
      reservations: { include: { table: true } },
    },
  });
  return matches;
}

export default async function MisPartidasPage() {
  const session = await auth();
  const roles = extractRoles(session);
  const userIdRaw = (session?.user as any)?.id;
  const userId = typeof userIdRaw === "number" ? userIdRaw : typeof userIdRaw === "string" ? Number(userIdRaw) : null;
  const games = await loadGames();
  const matches = await loadMyMatches(userId);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-0">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Juego organizado</p>
        <h1 className="text-3xl font-bold text-[var(--text)] sm:text-4xl">Mis partidas</h1>
        <p className="max-w-3xl text-[var(--muted)]">
          Gestiona tus slots de disponibilidad, confirma rivales y revisa las partidas vinculadas.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--text)]">Slots de disponibilidad</h2>
            {roles.length === 0 && (
              <span className="text-xs text-[var(--muted)]">Inicia sesión para crear/gestionar.</span>
            )}
          </div>
          <div className="mt-4">
            <SlotsList games={games} onlyMine />
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4">
          <h3 className="text-lg font-semibold text-[var(--text)]">Crear slot</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Publica tu disponibilidad para que otros se apunten.</p>
          <div className="mt-3">
            <SlotForm games={games} onCreated={() => { /* SlotsList refetches via key change */ }} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4">
        <h3 className="text-lg font-semibold text-[var(--text)]">Mis partidas confirmadas</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">Partidas en las que estás como jugador, con mesa si aplica.</p>
        <div className="mt-4 space-y-3">
          {matches.length === 0 && <p className="text-sm text-[var(--muted)]">Aún no tienes partidas confirmadas.</p>}
          {matches.map((match) => {
            const table = match.reservations[0]?.table;
            return (
              <div
                key={match.id}
                className="flex flex-col gap-1 rounded-xl border border-[var(--hairline)] bg-[var(--card)] p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--text)]">
                      {match.game?.name || "Juego sin definir"}
                    </span>
                    <span className="rounded-full bg-[var(--accent-50)] px-2 py-[2px] text-[11px] font-semibold uppercase text-[var(--accent-600)]">
                      {match.status}
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
                    {new Date(match.startsAt).toLocaleDateString()} {new Date(match.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{" "}
                    → {new Date(match.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  {match.format && <div className="text-sm text-[var(--muted)]">{match.format}</div>}
                  {table && (
                    <div className="text-sm text-[var(--text)]">
                      Mesa: <span className="font-semibold">{table.name}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
