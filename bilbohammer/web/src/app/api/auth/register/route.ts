export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Prisma, Rol } from "@prisma/client";

type RegisterPayload = {
  email?: string;
  contrasena?: string;
  password?: string;
  nombre?: string;
  name?: string;
  nick?: string;
  inviteToken?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type AnyObject = Record<string, unknown>;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeOptional(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isInviteTableMissing(error: unknown): boolean {
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

export async function POST(req: Request) {
  let payload: RegisterPayload;
  try {
    payload = (await req.json()) as RegisterPayload;
  } catch {
    return NextResponse.json({ error: "Formato de entrada invalido" }, { status: 400 });
  }

  const rawEmail = payload.email ?? "";
  if (!rawEmail || !EMAIL_REGEX.test(rawEmail)) {
    return NextResponse.json({ error: "Email invalido", code: "INVALID_EMAIL" }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(rawEmail);
  const plainPassword = payload.contrasena ?? payload.password ?? "";
  if (!plainPassword) {
    return NextResponse.json({ error: "La contrasena es obligatoria" }, { status: 400 });
  }

  const inviteToken = normalizeOptional(payload.inviteToken);
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    return NextResponse.json(
      { error: "Ese email ya esta registrado.", code: "ALREADY_REGISTERED" },
      { status: 409 },
    );
  }

  const inviteModel = (prisma as AnyObject).userInvite as typeof prisma.userInvite | undefined;
  const hasInviteModel = Boolean(inviteModel && typeof inviteModel.findUnique === "function");

  let invite: Awaited<ReturnType<typeof inviteModel.findUnique>> | null = null;
  let inviteTableAvailable = hasInviteModel;
  if (inviteToken) {
    if (!hasInviteModel) {
      return NextResponse.json(
        {
          error:
            "El cliente de Prisma no tiene el modelo UserInvite. Ejecuta `npx prisma generate` y reinicia el servidor.",
          code: "INVITE_MODEL_MISSING",
        },
        { status: 503 },
      );
    }
    try {
      invite = await inviteModel.findUnique({ where: { token: inviteToken } });
    } catch (error) {
      if (isInviteTableMissing(error)) {
        return NextResponse.json(
          {
            error:
              "El sistema de invitaciones no esta inicializado. Ejecuta la migracion que crea la tabla UserInvite.",
            code: "INVITE_TABLE_MISSING",
          },
          { status: 503 },
        );
      }
      throw error;
    }
    if (!invite) {
      return NextResponse.json(
        { error: "El enlace de invitacion no existe.", code: "INVITE_NOT_FOUND" },
        { status: 400 },
      );
    }
    if (invite.usedAt) {
      return NextResponse.json(
        { error: "El enlace de invitacion ya fue usado.", code: "INVITE_ALREADY_USED" },
        { status: 400 },
      );
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "El enlace de invitacion ha caducado.", code: "INVITE_EXPIRED" },
        { status: 400 },
      );
    }
    if (normalizeEmail(invite.email) !== normalizedEmail) {
      return NextResponse.json(
        { error: "El email no coincide con la invitacion.", code: "INVITE_EMAIL_MISMATCH" },
        { status: 400 },
      );
    }
  }

  const name = normalizeOptional(payload.nombre ?? payload.name);
  const nick = normalizeOptional(payload.nick);
  const passwordHash = await bcrypt.hash(plainPassword, 12);
  const assignedRole = invite?.role ?? Rol.AMIGO;
  const now = new Date();

  try {
    const createdUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name,
          nombre: name,
          nick,
          roles: [assignedRole],
        },
        select: { id: true, email: true },
      });

      if (inviteTableAvailable) {
        const txInviteModel = (tx as AnyObject).userInvite as
          | { updateMany: typeof prisma.userInvite.updateMany }
          | undefined;
        if (!txInviteModel || typeof txInviteModel.updateMany !== "function") {
          inviteTableAvailable = false;
        } else {
          try {
            await txInviteModel.updateMany({
              where: { email: normalizedEmail, usedAt: null },
              data: { usedAt: now, usedById: user.id },
            });
          } catch (error) {
            if (isInviteTableMissing(error)) {
              inviteTableAvailable = false;
            } else {
              throw error;
            }
          }
        }
      }

      return user;
    });

    return NextResponse.json({
      ok: true,
      userId: createdUser.id,
      role: assignedRole,
      inviteClaimed: Boolean(inviteToken),
      message: inviteToken
        ? "Cuenta creada como SOCIO. Ya puedes iniciar sesion."
        : "Cuenta creada como AMIGO. Espera a que un administrador te promocione.",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "El email o nick ya estan registrados.", code: "UNIQUE_CONSTRAINT" },
        { status: 409 },
      );
    }
    console.error("[register] error", error);
    const debug =
      process.env.NODE_ENV !== "production"
        ? {
            details:
              error instanceof Error
                ? error.message
                : typeof error === "string"
                ? error
                : "Error desconocido",
          }
        : {};
    return NextResponse.json({ error: "Error al registrar", ...debug }, { status: 500 });
  }
}
