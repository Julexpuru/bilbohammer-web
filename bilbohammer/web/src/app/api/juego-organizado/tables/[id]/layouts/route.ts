export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { userCanManageTables } from "@/lib/roles";
import { parseIntOrNull, parseString, errorJson } from "../../../shared";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const layouts = await prisma.tableLayout.findMany({
    where: { tableId: id },
    orderBy: [{ isDefault: "desc" }, { title: "asc" }],
  });
  return NextResponse.json(layouts);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!userCanManageTables(session)) {
    return errorJson("No tienes permisos para editar layouts.", 403);
  }
  const { id } = params;

  let raw: any;
  try {
    raw = await request.json();
  } catch {
    return errorJson("Cuerpo de la solicitud inválido.", 400);
  }

  const title = parseString(raw.title);
  if (!title) return errorJson("El título es obligatorio.");

  const weekday = raw.weekday === undefined ? null : parseIntOrNull(raw.weekday);

  const created = await prisma.tableLayout.create({
    data: {
      tableId: id,
      title,
      description: parseString(raw.description),
      sceneryNotes: parseString(raw.sceneryNotes),
      isDefault: Boolean(raw.isDefault),
      weekday,
      gameId: parseString(raw.gameId),
    },
  });

  return NextResponse.json(created, { status: 201 });
}
