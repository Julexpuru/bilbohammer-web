export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { TableMap } from "@/components/juego-organizado/TableMap";
import { extractRoles } from "@/lib/roles";

export default async function MesasPage() {
  const session = await auth();
  const roles = extractRoles(session);
  const canManage = roles.includes("ADMIN") || roles.includes("JUNTA");

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6">
      <div className="min-w-0 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Juego organizado</p>
        <h1 className="break-words text-3xl font-bold text-[var(--text)] sm:text-4xl">Mapa de mesas</h1>
        <p className="max-w-3xl break-words text-[var(--muted)]">
          Vista interactiva del plano del club. Consulta disponibilidad en tiempo real y, si eres admin, ajusta
          posiciones, tamaños y estado de cada mesa.
        </p>
      </div>

      <TableMap canManage={canManage} />
    </div>
  );
}
