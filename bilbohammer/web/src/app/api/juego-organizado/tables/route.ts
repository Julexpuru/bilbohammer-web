export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { userCanManageTables } from "@/lib/roles";
import { parseIntOrNull, parseString, parseTableStatus, errorJson } from "../shared";

export async function GET() {
  const tables = await prisma.clubTable.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      layouts: true,
    },
  });
  return NextResponse.json(tables);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!userCanManageTables(session)) {
    return errorJson("No tienes permisos para crear mesas.", 403);
  }

  let raw: any;
  try {
    raw = await request.json();
  } catch {
    return errorJson("Cuerpo de la solicitud inválido.", 400);
  }

  const name = parseString(raw.name);
  if (!name) return errorJson("El nombre es obligatorio.");

  const posX = parseIntOrNull(raw.posX);
  const posY = parseIntOrNull(raw.posY);
  const width = parseIntOrNull(raw.width);
  const height = parseIntOrNull(raw.height);
  if (posX == null || posY == null || width == null || height == null) {
    return errorJson("posX, posY, width y height son obligatorios.");
  }

  const rotation = parseIntOrNull(raw.rotation) ?? 0;
  const sizeTag = parseString(raw.sizeTag);
  const notes = parseString(raw.notes);
  const status = parseTableStatus(raw.status) ?? "AVAILABLE";

  const table = await prisma.clubTable.create({
    data: {
      name,
      posX,
      posY,
      width,
      height,
      rotation,
      sizeTag,
      notes,
      status,
      isActive: raw.isActive !== false,
    },
  });

  return NextResponse.json(table, { status: 201 });
}
