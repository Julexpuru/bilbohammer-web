export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { extractRoles } from "@/lib/roles";
import { SlotsList } from "@/components/juego-organizado/SlotsList";
import { SlotForm } from "@/components/juego-organizado/SlotForm";
import { MyAvailabilityPlanner } from "@/components/juego-organizado/MyAvailabilityPlanner";
import { MyConfirmedMatches } from "@/components/juego-organizado/MyConfirmedMatches";
import { SlotCleanupButton } from "@/components/juego-organizado/SlotCleanupButton";

async function loadGames() {
  try {
    const games = await prisma.game.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    });
    return { games, error: null };
  } catch (error) {
    console.error("[my-matches-games]", error);
    return { games: [], error: "No se pudo conectar con la base de datos." };
  }
}

async function loadMyMatches(userId: number | null) {
  if (!userId) return { matches: [], error: null };
  try {
    const matches = await prisma.match.findMany({
      where: {
        participants: { some: { userId } },
        status: { in: ["CONFIRMED", "IN_PLAY", "DONE"] },
      },
      orderBy: { startsAt: "asc" },
      include: {
        game: true,
        event: { select: { id: true, title: true } },
        participants: { include: { user: { select: { id: true, name: true, nick: true } } } },
        reservations: {
          where: { status: { not: "CANCELLED" } },
          include: { table: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    return { matches, error: null };
  } catch (error) {
    console.error("[my-matches]", error);
    return { matches: [], error: "No se pudieron cargar tus partidas confirmadas." };
  }
}

export default async function MisPartidasPage() {
  const session = await auth();
  const roles = extractRoles(session);
  const userIdRaw = (session?.user as any)?.id;
  const userId = typeof userIdRaw === "number" ? userIdRaw : typeof userIdRaw === "string" ? Number(userIdRaw) : null;
  const [{ games, error: gamesError }, { matches, error: matchesError }] = await Promise.all([
    loadGames(),
    loadMyMatches(userId),
  ]);
  const loadError = gamesError ?? matchesError;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-0">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Juego organizado</p>
        <h1 className="text-3xl font-bold text-[var(--text)] sm:text-4xl">Mis partidas</h1>
        <p className="max-w-3xl text-[var(--muted)]">
          Gestiona tus slots de disponibilidad y consulta tus partidas cerradas.
        </p>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600">
          {loadError}
        </div>
      )}

      <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4">
        <h3 className="text-lg font-semibold text-[var(--text)]">Mis partidas confirmadas</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">Partidas confirmadas o en curso en las que estas como jugador, con mesa si aplica.</p>
        <MyConfirmedMatches
          matches={matches.map((match) => ({
            id: match.id,
            gameName: match.game?.name || "Juego sin definir",
            startsAt: match.startsAt.toISOString(),
            endsAt: match.endsAt.toISOString(),
            status: match.status,
            format: match.format ?? null,
            tableId: match.reservations[0]?.table?.id ?? null,
            tableName: match.reservations[0]?.table?.name ?? null,
            event: match.event ? { id: match.event.id, title: match.event.title } : null,
            participants: match.participants
              .slice()
              .sort((a, b) => {
                if (a.role === b.role) return 0;
                if (a.role === "HOST") return -1;
                if (b.role === "HOST") return 1;
                return 0;
              })
              .map((participant) => participant.user.nick ?? participant.user.name ?? "Socio"),
          }))}
        />
      </div>

      <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[var(--text)]">Mis Slots</h2>
          <div className="flex items-center gap-3">
            <SlotCleanupButton />
            {roles.length === 0 && (
              <span className="text-xs text-[var(--muted)]">Inicia sesion para crear/gestionar.</span>
            )}
          </div>
        </div>
        <div className="mt-4">
          <SlotsList games={games} onlyMine />
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[var(--text)]">Crear slot</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Publica tu disponibilidad para que otros se apunten.</p>
        </div>
        <SlotForm games={games} />
      </div>

      <MyAvailabilityPlanner games={games} />
    </div>
  );
}
