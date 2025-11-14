import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, Rol } from "@prisma/client";
import type { Session } from "next-auth";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppSession =
  | (Session & {
      user?: Session["user"] & {
        roles?: string[] | null;
        rol?: string | null;
      };
    })
  | null;

type InviteResponse = {
  id: string;
  email: string;
  token: string;
  role: Rol;
  url: string;
  createdAt: string;
};

type AnyObject = Record<string, unknown>;
type InviteRow = Awaited<ReturnType<typeof prisma.userInvite.findFirst>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function canManageUsers(session: AppSession): boolean {
  if (!session?.user) return false;
  const roles = Array.isArray(session.user.roles)
    ? session.user.roles
    : session.user.rol
    ? [session.user.rol]
    : [];
  return roles.includes("ADMIN") || roles.includes("JUNTA");
}

function resolveBaseUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
  ];
  const candidate = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
  return candidate?.trim() ?? "http://localhost:3000";
}

function buildInviteUrl(token: string): string {
  const base = resolveBaseUrl();
  try {
    return new URL(`/register/invite/${token}`, base).toString();
  } catch {
    const sanitized = base.endsWith("/") ? base.slice(0, -1) : base;
    return `${sanitized}/register/invite/${token}`;
  }
}

function serializeInvite(invite: { id: string; email: string; token: string; role: Rol; createdAt: Date }): InviteResponse {
  return {
    id: invite.id,
    email: invite.email,
    token: invite.token,
    role: invite.role,
    url: buildInviteUrl(invite.token),
    createdAt: invite.createdAt.toISOString(),
  };
}

function inviteTableMissing(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === "string"
      ? error.toLowerCase()
      : "";
  if (!message) return false;
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
    const meta = JSON.stringify(error.meta ?? {}).toLowerCase();
    if (meta.includes("userinvite")) return true;
  }
  if (message.includes("userinvite")) return true;
  if (message.includes("updatemany") && message.includes("undefined")) return true;
  return false;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canManageUsers(session)) {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  }

  let payload: { email?: string };
  try {
    payload = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "Formato de entrada invalido" }, { status: 400 });
  }

  const rawEmail = (payload.email ?? "").trim();
  const normalizedEmail = rawEmail.toLowerCase();
  if (!rawEmail || !EMAIL_REGEX.test(rawEmail)) {
    return NextResponse.json({ error: "Email invalido", code: "INVALID_EMAIL" }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existingUser) {
    return NextResponse.json(
      { error: "Ese email ya tiene una cuenta en el club.", code: "ALREADY_REGISTERED" },
      { status: 409 },
    );
  }

  const inviteModel = ((prisma as unknown) as AnyObject).userInvite as typeof prisma.userInvite | undefined;
  if (!inviteModel) {
    return NextResponse.json(
      {
        error: "El cliente de Prisma no tiene el modelo UserInvite. Ejecuta `npx prisma generate` y reinicia el servidor.",
        code: "INVITE_MODEL_MISSING",
      },
      { status: 503 },
    );
  }
  const concreteInviteModel = inviteModel as typeof prisma.userInvite;

  let pendingInvite: InviteRow | null = null;
  try {
    pendingInvite = await concreteInviteModel.findFirst({
      where: { email: normalizedEmail, usedAt: null },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    if (inviteTableMissing(error)) {
      return NextResponse.json(
        {
          error: "El sistema de invitaciones no esta inicializado. Ejecuta la migracion que crea la tabla UserInvite.",
          code: "INVITE_TABLE_MISSING",
        },
        { status: 503 },
      );
    }
    throw error;
  }

  if (pendingInvite) {
    return NextResponse.json({
      ok: true,
      status: "pending",
      invite: serializeInvite(pendingInvite),
      message: "Ya existe un formulario pendiente para ese correo.",
    });
  }

  const adminId = Number.parseInt(String(session.user.id ?? ""), 10);
  const createdById = Number.isFinite(adminId) ? adminId : null;

  let invite: Awaited<ReturnType<typeof prisma.userInvite.create>>;
  try {
    invite = await concreteInviteModel.create({
      data: {
        email: normalizedEmail,
        token: crypto.randomBytes(24).toString("hex"),
        role: Rol.SOCIO,
        createdById: createdById ?? undefined,
      },
    });
  } catch (error) {
    if (inviteTableMissing(error)) {
      return NextResponse.json(
        {
          error: "El sistema de invitaciones no esta inicializado. Ejecuta la migracion que crea la tabla UserInvite.",
          code: "INVITE_TABLE_MISSING",
        },
        { status: 503 },
      );
    }
    throw error;
  }

  return NextResponse.json(
    {
      ok: true,
      status: "created",
      invite: serializeInvite(invite),
      message: "Enlace generado. Comparte la URL con la persona invitada.",
    },
    { status: 201 },
  );
}
