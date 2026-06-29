export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildArchivedTableName, buildNextMesaName, compareTableNames, extractMesaNumber } from "@/lib/organized-table-naming";
import { prisma } from "@/lib/prisma";
import { userCanManageTables } from "@/lib/roles";
import { errorJson, parseIntOrNull, parseString, parseTableStatus } from "../shared";

const GAME_SELECT = {
  id: true,
  slug: true,
  name: true,
  iconImagePath: true,
  heroImagePath: true,
};

export async function GET() {
  const tables = await prisma.clubTable.findMany({
    where: { isActive: true },
    include: {
      layouts: true,
      game: {
        select: GAME_SELECT,
      },
    },
  });

  tables.sort((a, b) => compareTableNames(a.name, b.name));

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

  const requestedName = parseString(raw.name);
  const shouldAutoName = raw.autoName === true || !requestedName;

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
  const gameLabel = parseString(raw.gameLabel);
  const layoutImagePath = parseString(raw.layoutImagePath);
  const sceneryImagePath = parseString(raw.sceneryImagePath);

  let gameId: string | null = null;
  const rawGameId = parseString(raw.gameId);
  if (rawGameId) {
    const gameExists = await prisma.game.findUnique({ where: { id: rawGameId }, select: { id: true } });
    if (!gameExists) return errorJson("Juego no encontrado.");
    gameId = rawGameId;
  }

  let name = requestedName;
  if (shouldAutoName) {
    const allTables = await prisma.clubTable.findMany({
      select: { id: true, name: true, isActive: true },
    });

    const legacyInactiveMesas = allTables.filter(
      (table) => table.isActive === false && extractMesaNumber(table.name) != null
    );

    if (legacyInactiveMesas.length > 0) {
      await prisma.$transaction(
        legacyInactiveMesas.map((table) =>
          prisma.clubTable.update({
            where: { id: table.id },
            data: { name: buildArchivedTableName(table.name, table.id) },
          })
        )
      );
    }

    name = buildNextMesaName(allTables.filter((table) => table.isActive !== false));
  }

  if (!name) return errorJson("El nombre es obligatorio.");

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
      gameId,
      gameLabel,
      layoutImagePath,
      sceneryImagePath,
      isActive: raw.isActive !== false,
    },
    include: {
      layouts: true,
      game: {
        select: GAME_SELECT,
      },
    },
  });

  return NextResponse.json(table, { status: 201 });
}
