import { auth } from "@/auth";
import { extractRoles } from "@/lib/roles";

export default async function GestionDocumentalPage() {
  const session = await auth();
  const roles = extractRoles(session);
  const canManage = roles.includes("ADMIN") || roles.includes("JUNTA");

  if (!session?.user || !canManage) {
    return (
      <section className="card space-y-2">
        <h1 className="text-2xl font-semibold text-[var(--text)]">Acceso restringido</h1>
        <p className="text-sm text-[var(--muted)]">
          Necesitas permisos de administracion del club para ver la gestion documental.
        </p>
      </section>
    );
  }

  return (
    <section className="card space-y-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-[var(--text)]">Gestion documental</h1>
        <p className="text-sm text-[var(--muted)]">
          Este apartado alojara los flujos de archivos, actas y otros recursos internos. Lo iremos completando en los
          siguientes hitos.
        </p>
      </header>
      <div className="rounded-2xl border border-dashed border-[var(--hairline)] bg-[var(--card)] p-6 text-sm text-[var(--muted)]">
        Todavia no hay herramientas disponibles. Cuando definamos los procesos se mostraran aqui.
      </div>
    </section>
  );
}
