import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function MiPerfilPage() {
  const session = await auth();
  if (!session?.user) {
    // Con middleware ya vendrá autenticado, pero por si alguien entra directo
    redirect("/api/auth/signin");
  }

  const u = session.user as any;
  const avatarUrl: string | null = u?.avatarUrl || u?.image || null;
  const displayName: string = u?.nick || u?.name || u?.email || "Usuario";
  const initial = displayName?.trim()?.[0]?.toUpperCase?.() ?? "?";

  return (
    <main style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Mi Perfil</h1>
      <section
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          background: "var(--bh-surface, #0b2530)",
          color: "#e8f3f8",
          padding: 16,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 9999,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,.2)",
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(135deg,#1b8bb4,#0e3f53)",
            fontWeight: 700,
            fontSize: 28,
          }}
          aria-label="Avatar"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{displayName}</div>
          {u?.email && (
            <div style={{ opacity: 0.7, fontSize: 14 }}>{u.email}</div>
          )}
        </div>
      </section>

      <section
        style={{
          marginTop: 18,
          background: "var(--bh-surface, #0b2530)",
          color: "#e8f3f8",
          padding: 16,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Ajustes (próximamente)</h2>
        <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.9 }}>
          <li>Editar datos básicos (nick, nombre, descripción)</li>
          <li>Actualizar imagen de perfil</li>
          <li>Preferencias de notificaciones</li>
        </ul>
      </section>
    </main>
  );
}