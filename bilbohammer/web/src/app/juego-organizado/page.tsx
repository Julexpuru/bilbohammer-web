import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractRoles, userCanAccessOrganizedPlay } from "@/lib/roles";
import { isZoneTableName } from "@/lib/organized-tables";
import { OrganizedHubTabs } from "@/components/juego-organizado/OrganizedHubTabs";

export const dynamic = "force-dynamic";

async function loadHubData() {
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
    console.error("[organized-hub-data]", error);
    return { tables: [], games: [], loadError: "No se pudo conectar con la base de datos." };
  }
}

export default async function JuegoOrganizadoHubPage() {
  const session = await auth();
  const roles = extractRoles(session);
  const canManage = roles.includes("ADMIN") || roles.includes("JUNTA");
  const canUseOrganizedPlay = session?.user ? await userCanAccessOrganizedPlay(session) : false;
  const { tables, games, loadError } = await loadHubData();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-0">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-[var(--text)] sm:text-4xl">Juego organizado</h1>
        <p className="max-w-3xl text-[var(--muted)]">
          Punto de entrada único al ecosistema: calendario vivo de partidas, gestiona tus partidas y disponibilidades y
          consulta del estado actual de las mesas del club.
        </p>
      </div>

      {!session?.user && (
        <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
          El área de consulta está abierta. Para usar <span className="font-semibold text-[var(--text)]">Mis partidas</span>{" "}
          necesitas iniciar sesión.
        </div>
      )}

      {session?.user && !canUseOrganizedPlay && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800">
          Para usar <span className="font-semibold">Mis partidas</span> y apuntarte a ofertas necesitas ser socio o
          estar inscrito en una liga activa publicada.
        </div>
      )}

      <OrganizedHubTabs
        games={games}
        tables={tables}
        initialError={loadError}
        canManage={canManage}
        canUseOrganizedPlay={canUseOrganizedPlay}
      />
    </div>
  );
}
