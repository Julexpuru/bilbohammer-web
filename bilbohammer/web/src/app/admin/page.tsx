import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  return (
    <section className="card">
      <h1 className="text-2xl font-bold mb-2">Panel de Administración</h1>
      {!session?.user ? (
        <p>No tienes acceso.</p>
      ) : (
        <div>
          <p>Bienvenido, {session.user.email}</p>
          <ul className="mt-4 list-disc ml-6 text-[var(--muted)]">
            <li>Gestión de noticias (pendiente)</li>
            <li>Gestión de galería (pendiente)</li>
            <li>Gestión de usuarios y roles (pendiente)</li>
          </ul>
        </div>
      )}
    </section>
  );
}
