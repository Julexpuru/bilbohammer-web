import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractRoles } from "@/lib/roles";
import { UserManagementView } from "./UserManagementView";
import { serializeUsers } from "./table-config";

export default async function GestionUsuariosPage() {
  const session = await auth();
  const roles = extractRoles(session);
  const canManage = roles.includes("ADMIN") || roles.includes("JUNTA");

  if (!session?.user || !canManage) {
    return (
      <section className="card space-y-2">
        <h1 className="text-2xl font-semibold text-[var(--text)]">Acceso restringido</h1>
        <p className="text-sm text-[var(--muted)]">Necesitas permisos de administración del club para ver este panel.</p>
      </section>
    );
  }

  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
  });

  const { columns, rows } = serializeUsers(users as Array<Record<string, unknown>>);

  return <UserManagementView columns={columns} initialRows={rows} />;
}
