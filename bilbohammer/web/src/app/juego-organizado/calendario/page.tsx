export const dynamic = "force-dynamic";

import { OrganizedCalendarView } from "@/components/juego-organizado/OrganizedCalendarView";
import { isZoneTableName } from "@/lib/organized-tables";
import { prisma } from "@/lib/prisma";

async function loadFilters() {
  try {
    const [tables, games] = await Promise.all([
      prisma.clubTable.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.game.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true },
      }),
    ]);

    return {
      tables: tables.filter((table) => !isZoneTableName(table.name)),
      games,
      loadError: null,
    };
  } catch (error) {
    console.error("[organized-calendar-filters]", error);
    return { tables: [], games: [], loadError: "No se pudo conectar con la base de datos." };
  }
}

export default async function CalendarioPage() {
  const { tables, games, loadError } = await loadFilters();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-0">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Juego organizado</p>
        <h1 className="text-3xl font-bold text-[var(--text)] sm:text-4xl">Calendario de partidas</h1>
        <p className="max-w-3xl text-[var(--muted)]">
          Consulta partidas, reservas internas y ofertas de disponibilidad en una vista visual o en un listado filtrable.
        </p>
      </div>

      <OrganizedCalendarView games={games} tables={tables} initialError={loadError} />
    </div>
  );
}
