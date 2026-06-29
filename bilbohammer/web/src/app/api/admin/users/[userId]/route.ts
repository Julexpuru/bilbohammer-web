import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

function canManageUsers(session: Session | null): boolean {
  if (!session?.user) return false;
  const roles = Array.isArray(session.user.roles)
    ? session.user.roles
    : session.user.rol
    ? [session.user.rol]
    : [];
  return roles.includes("ADMIN") || roles.includes("JUNTA");
}

export async function DELETE(_: Request, { params }: { params: { userId: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canManageUsers(session)) {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  }

  const userIdParam = params.userId;
  const userId = Number.parseInt(userIdParam, 10);
  if (!Number.isFinite(userId) || userId <= 0) {
    return NextResponse.json({ error: "Identificador inválido" }, { status: 400 });
  }

  if (Number(session.user.id) === userId) {
    return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
  }

  try {
    await prisma.user.delete({
      where: { id: userId },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    console.error("[api/admin/users] DELETE error", error);
    return NextResponse.json({ error: "Error eliminando el usuario" }, { status: 500 });
  }
}
