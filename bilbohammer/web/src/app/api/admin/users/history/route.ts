import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function canManageUsers(session: Awaited<ReturnType<typeof auth>>): boolean {
  if (!session?.user) return false;
  const roles = Array.isArray(session.user.roles)
    ? session.user.roles
    : session.user.rol
    ? [session.user.rol]
    : [];
  return roles.includes("ADMIN") || roles.includes("JUNTA");
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canManageUsers(session)) {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  }

  const entries = await prisma.userChangeLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, email: true, name: true, nick: true } },
      admin: { select: { id: true, email: true, name: true, nick: true } },
    },
  });

  const result = entries.map((entry) => ({
    id: entry.id,
    createdAt: entry.createdAt.toISOString(),
    userId: entry.userId,
    userLabel: entry.user?.nick ?? entry.user?.name ?? entry.user?.email ?? `Usuario ${entry.userId}`,
    adminId: entry.adminId,
    adminLabel:
      entry.admin?.nick ??
      entry.admin?.name ??
      entry.admin?.email ??
      entry.adminEmail ??
      "Administrador",
    adminEmail: entry.adminEmail ?? entry.admin?.email ?? null,
    changes: entry.changes,
  }));

  return NextResponse.json({ ok: true, entries: result });
}
