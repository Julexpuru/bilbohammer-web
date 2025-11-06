import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeUsers } from "@/app/admin/gestion-usuarios/table-config";
import type { PreparedRow } from "@/app/admin/gestion-usuarios/table-config";

export const runtime = "nodejs";

type UpdatePayload = {
  userId: number;
  changes: Record<string, string>;
};

type ChangeSummary = {
  field: string;
  before: string | null;
  after: string | null;
};

const ALLOWED_FIELDS = new Set([
  "name",
  "nick",
  "email",
  "roles",
  "etiquetas",
  "isActive",
  "membershipSince",
  "membershipUntil",
  "descripcion",
]);

function canManageUsers(session: Awaited<ReturnType<typeof auth>>): boolean {
  if (!session?.user) return false;
  const roles = Array.isArray(session.user.roles)
    ? session.user.roles
    : session.user.rol
    ? [session.user.rol]
    : [];
  return roles.includes("ADMIN") || roles.includes("JUNTA");
}

function normalizeForCompare(key: string, value: unknown): string {
  if (value == null) return "";
  switch (key) {
    case "roles": {
      const roles = Array.isArray(value)
        ? value.map((role) => String(role))
        : String(value)
            .split(",")
            .map((part) => part.trim());
      return roles
        .map((role) => role.toUpperCase())
        .filter(Boolean)
        .sort()
        .join("|");
    }
    case "etiquetas": {
      const tags = Array.isArray(value)
        ? value.map((tag) => String(tag))
        : String(value)
            .split(",")
            .map((part) => part.trim());
      return tags.filter(Boolean).join("|");
    }
    case "isActive":
      return value ? "true" : "false";
    case "membershipSince":
    case "membershipUntil":
      return value instanceof Date ? value.toISOString() : String(value ?? "").trim();
    default:
      return String(value ?? "").trim();
  }
}

function parseIncomingValue(key: string, value: string) {
  const trimmed = value.trim();
  switch (key) {
    case "roles":
      return trimmed
        .split(",")
        .map((role) => role.trim().toUpperCase())
        .filter(Boolean);
    case "etiquetas":
      return trimmed
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
    case "isActive": {
      const lowered = trimmed
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return lowered === "true" || lowered === "1" || lowered === "si";
    }
    case "membershipSince":
    case "membershipUntil": {
      if (!trimmed) return null;
      const parsed = new Date(trimmed);
      if (Number.isNaN(parsed.getTime())) return null;
      return parsed;
    }
    default:
      return trimmed.length === 0 ? null : trimmed;
  }
}

function formatDisplayValue(key: string, value: unknown): string | null {
  if (value == null) return null;
  if (key === "roles" || key === "etiquetas") {
    const parts = Array.isArray(value) ? value : String(value).split(",");
    const list = parts.map((part) => String(part).trim()).filter(Boolean);
    return list.length ? list.join(", ") : null;
  }
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canManageUsers(session)) {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  }

  let payload: { updates?: UpdatePayload[] };
  try {
    payload = (await request.json()) as { updates?: UpdatePayload[] };
  } catch {
    return NextResponse.json({ error: "Formato de entrada invalido" }, { status: 400 });
  }

  const updates = Array.isArray(payload.updates) ? payload.updates : [];
  if (updates.length === 0) {
    return NextResponse.json({ error: "No hay cambios para guardar" }, { status: 400 });
  }
  if (updates.length > 100) {
    return NextResponse.json({ error: "Demasiados cambios simultaneos" }, { status: 400 });
  }

  const adminId = Number.parseInt(String(session.user.id ?? ""), 10);
  const adminIdValue = Number.isFinite(adminId) ? adminId : null;
  const adminEmail =
    typeof session.user.email === "string" && session.user.email.length > 0
      ? session.user.email
      : null;

  const updatedRows: Array<{ userId: number; row: PreparedRow }> = [];
  const errors: Array<{ userId: number; message: string }> = [];

  await prisma.$transaction(async (tx) => {
    for (const update of updates) {
      const userId = Number(update.userId);
      if (!Number.isFinite(userId) || userId <= 0) {
        errors.push({ userId: Number(update.userId) || 0, message: "Identificador invalido" });
        continue;
      }

      const changes = update.changes ?? {};
      const requestedKeys = Object.keys(changes).filter((key) => ALLOWED_FIELDS.has(key));
      if (requestedKeys.length === 0) {
        continue;
      }

      const current = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          nick: true,
          email: true,
          roles: true,
          etiquetas: true,
          isActive: true,
          membershipSince: true,
          membershipUntil: true,
          descripcion: true,
        },
      });

      if (!current) {
        errors.push({ userId, message: "Usuario no encontrado" });
        continue;
      }

      const data: Record<string, unknown> = {};
      const fieldSummaries: ChangeSummary[] = [];

      for (const key of requestedKeys) {
        const incomingRaw = changes[key] ?? "";
        const normalizedCurrent = normalizeForCompare(key, (current as any)[key]);
        const parsedValue = parseIncomingValue(key, String(incomingRaw));
        const normalizedIncoming = normalizeForCompare(key, parsedValue);
        if (normalizedCurrent === normalizedIncoming) {
          continue;
        }

        data[key] = parsedValue;

        fieldSummaries.push({
          field: key,
          before: formatDisplayValue(key, (current as any)[key]),
          after: formatDisplayValue(key, parsedValue),
        });
      }

      if (Object.keys(data).length === 0) {
        continue;
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data,
      });

      await tx.userChangeLog.create({
        data: {
          userId,
          adminId: adminIdValue ?? undefined,
          adminEmail: adminEmail ?? undefined,
          changes: fieldSummaries,
        },
      });

      const serialized = serializeUsers([updated]);
      const row = serialized.rows[0];
      if (row) {
        updatedRows.push({ userId, row });
      }
    }
  });

  if (errors.length > 0 && updatedRows.length === 0) {
    return NextResponse.json({ error: "No se pudieron guardar los cambios", errors }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    updatedRows,
    errors,
  });
}



