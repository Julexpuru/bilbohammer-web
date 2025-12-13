export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { userCanManageTables } from "@/lib/roles";
import { parseIntOrNull, parseString, parseTableStatus, errorJson } from "../../shared";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!userCanManageTables(session)) {
    return errorJson("No tienes permisos para editar mesas.", 403);
  }

  const { id } = params;
  let raw: any;
  try {
    raw = await request.json();
  } catch {
    return errorJson("Cuerpo de la solicitud inválido.", 400);
  }

  const data: any = {};
  if (raw.name !== undefined) {
    const name = parseString(raw.name);
    if (!name) return errorJson("El nombre no puede estar vacío.");
    data.name = name;
  }
  if (raw.posX !== undefined) data.posX = parseIntOrNull(raw.posX);
  if (raw.posY !== undefined) data.posY = parseIntOrNull(raw.posY);
  if (raw.width !== undefined) data.width = parseIntOrNull(raw.width);
  if (raw.height !== undefined) data.height = parseIntOrNull(raw.height);
  if (raw.rotation !== undefined) data.rotation = parseIntOrNull(raw.rotation) ?? 0;
  if (raw.sizeTag !== undefined) data.sizeTag = parseString(raw.sizeTag);
  if (raw.notes !== undefined) data.notes = parseString(raw.notes);
  if (raw.status !== undefined) {
    const status = parseTableStatus(raw.status);
    if (!status) return errorJson("Estado de mesa no válido.");
    data.status = status;
  }
  if (raw.isActive !== undefined) data.isActive = Boolean(raw.isActive);

  const updated = await prisma.clubTable.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!userCanManageTables(session)) {
    return errorJson("No tienes permisos para eliminar mesas.", 403);
  }
  const { id } = params;
  await prisma.clubTable.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
