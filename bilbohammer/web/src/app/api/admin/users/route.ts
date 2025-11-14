import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeUsers } from "@/app/admin/gestion-usuarios/table-config";
import { Prisma, Rol } from "@prisma/client";
import type { Session } from "next-auth";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PASSWORD = "NuevoSocio";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AppSession =
  | (Session & {
      user?: Session["user"] & {
        roles?: string[] | null;
        rol?: string | null;
      };
    })
  | null;

type CreateUserPayload = {
  name?: string;
  nick?: string;
  email?: string;
  roles?: string | string[];
  etiquetas?: string | string[];
  isActive?: boolean;
  membershipSince?: string;
  membershipUntil?: string;
  descripcion?: string;
};

function canManageUsers(session: AppSession): boolean {
  if (!session?.user) return false;
  const roles = Array.isArray(session.user.roles)
    ? session.user.roles
    : session.user.rol
    ? [session.user.rol]
    : [];
  return roles.includes("ADMIN") || roles.includes("JUNTA");
}

function normalizeNullable(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseRoleList(value: unknown): Rol[] {
  const allowed = Object.values(Rol);
  const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const roles = source
    .map((role) => {
      if (typeof role !== "string") return null;
      const normalized = role.trim().toUpperCase();
      return allowed.includes(normalized as Rol) ? (normalized as Rol) : null;
    })
    .filter((role): role is Rol => role !== null);
  if (roles.length === 0) return [Rol.SOCIO];
  return Array.from(new Set(roles));
}

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((tag) => (typeof tag === "string" ? tag.trim() : null))
      .filter((tag): tag is string => Boolean(tag));
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }
  return [];
}

function parseBoolean(value: unknown, defaultValue = true): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (["false", "0", "no"].includes(normalized)) return false;
    if (["true", "1", "si"].includes(normalized)) return true;
  }
  return defaultValue;
}

function parseDateValue(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canManageUsers(session)) {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  }

  let payload: CreateUserPayload;
  try {
    payload = (await request.json()) as CreateUserPayload;
  } catch {
    return NextResponse.json({ error: "Formato de entrada invalido" }, { status: 400 });
  }

  const rawEmail = typeof payload.email === "string" ? payload.email.trim() : "";
  if (!rawEmail || !EMAIL_REGEX.test(rawEmail)) {
    return NextResponse.json({ error: "Email invalido", code: "INVALID_EMAIL" }, { status: 400 });
  }

  const normalizedEmail = rawEmail.toLowerCase();
  const nameValue = normalizeNullable(payload.name);
  const nickValue = normalizeNullable(payload.nick);
  const descripcion = normalizeNullable(payload.descripcion);
  const roles = parseRoleList(payload.roles);
  const etiquetas = parseTags(payload.etiquetas);
  const membershipSince = parseDateValue(payload.membershipSince);
  const membershipUntil = parseDateValue(payload.membershipUntil);
  const isActive = parseBoolean(payload.isActive, true);

  try {
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    const created = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: nameValue,
        nombre: nameValue,
        nick: nickValue,
        roles,
        etiquetas,
        isActive,
        membershipSince: membershipSince ?? undefined,
        membershipUntil: membershipUntil ?? undefined,
        descripcion: descripcion ?? undefined,
      },
      select: { id: true },
    });

    const fullUser = await prisma.user.findUnique({
      where: { id: created.id },
    });

    if (!fullUser) {
      throw new Error("No se pudo recuperar el usuario recien creado.");
    }

    const { rows } = serializeUsers([fullUser as Record<string, unknown>]);
    const row = rows[0] ?? null;
    return NextResponse.json({
      ok: true,
      row,
      message: `Usuario creado con la contrasena temporal ${DEFAULT_PASSWORD}.`,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "El email o nick ya existen en la base de datos.", code: "UNIQUE_CONSTRAINT" },
        { status: 409 },
      );
    }
    console.error("[admin/users] create", error);
    return NextResponse.json({ error: "No se pudo crear el usuario." }, { status: 500 });
  }
}
