import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { Session } from "next-auth";

export const runtime = "nodejs";

type AppSession =
  | (Session & {
      user?: Session["user"] & {
        roles?: string[] | null;
        rol?: string | null;
      };
    })
  | null;

function canManageUsers(session: AppSession): boolean {
  if (!session?.user) return false;
  const roles = Array.isArray(session.user.roles)
    ? session.user.roles
    : session.user.rol
    ? [session.user.rol]
    : [];
  return roles.includes("ADMIN") || roles.includes("JUNTA");
}

export async function POST(request: Request, { params }: { params: { userId: string } }) {
  const session = (await auth()) as AppSession;
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canManageUsers(session)) {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  }

  const userId = Number.parseInt(params.userId, 10);
  if (!Number.isFinite(userId) || userId <= 0) {
    return NextResponse.json({ error: "Identificador invalido" }, { status: 400 });
  }

  let payload: { password?: string; confirm?: string };
  try {
    payload = (await request.json()) as { password?: string; confirm?: string };
  } catch {
    return NextResponse.json({ error: "Formato de entrada invalido" }, { status: 400 });
  }

  if (typeof payload.password !== "string" || typeof payload.confirm !== "string") {
    return NextResponse.json({ error: "La contraseña y su confirmacion son obligatorias" }, { status: 400 });
  }

  const password = payload.password.trim();
  const confirm = payload.confirm.trim();

  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }
  if (password !== confirm) {
    return NextResponse.json({ error: "Las contraseñas no coinciden" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!target) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const adminIdRaw = Number.parseInt(String(session.user.id ?? ""), 10);
  const adminId = Number.isFinite(adminIdRaw) ? adminIdRaw : null;
  const adminEmail =
    typeof session.user.email === "string" && session.user.email.length > 0 ? session.user.email : null;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await tx.userChangeLog.create({
      data: {
        userId,
        adminId: adminId ?? undefined,
        adminEmail: adminEmail ?? undefined,
        changes: [
          {
            field: "passwordHash",
            before: null,
            after: "Actualizada manualmente",
          },
        ],
      },
    });
  });

  return NextResponse.json({ ok: true });
}
