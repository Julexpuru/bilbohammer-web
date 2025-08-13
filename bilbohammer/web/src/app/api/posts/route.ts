// src/app/api/posts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Endpoint tolerante:
 * - Usa prisma.post si existe; si no, prueba prisma.announcement (por si el modelo aún se llama así).
 * - Si el modelo no tiene campo "type", ignora el filtro "type".
 * - Paginación por cursor si el modelo tiene "id".
 */
export async function GET(req: Request) {
  const client = prisma as any;
  const postModel = client.post ?? client.announcement; // 👈 fallback
  if (!postModel) {
    return NextResponse.json(
      { error: "No existe un modelo Post/Announcement en Prisma. Revisa schema.prisma y vuelve a generar el cliente." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // ANUNCIO|EVENTO|NOTICIA_PRIVADA|all
  const cursor = searchParams.get("cursor") || undefined;
  const take = 10;

  // Construye "where" solo si el modelo soporta esos campos
  const where: any = {};
  // many esquemas usan "published"
  if ("published" in postModel) where.published = true;

  // Aplica filtro por tipo solo si hay campo "type" en el modelo
  const hasTypeField =
    client._dmmf?.mappingsMap?.get?.("Post")?.findMany?.args?.some?.((a: any) => a.name === "type") ||
    client._dmmf?.mappingsMap?.get?.("Announcement")?.findMany?.args?.some?.((a: any) => a.name === "type") ||
    true; // Prisma no expone fácil esta introspección en runtime; probamos más abajo

  if (type && type !== "all") {
    // intentaremos filtrar por type y si falla, hacemos catch y repetimos sin type
    where.type = type;
  }

  // include del evento si existe relación
  const include = {} as any;
  // Intentamos incluir "event" si el modelo lo soporta; si no, no pasa nada
  if ("event" in (client.post ?? {})) include.event = true;

  // Query con paginación por cursor (si hay "id")
  try {
    const args: any = {
      where,
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      ...include.event ? { include } : {},
    };

    let items = await postModel.findMany(args);
    const nextCursor = items.length > take ? items[items.length - 1].id : null;
    if (nextCursor) items.pop();

    return NextResponse.json({ items, nextCursor });
  } catch (e) {
    // Si falló por el filtro type (modelo sin ese campo), repetimos sin él
    try {
      const args2: any = {
        where: Object.fromEntries(Object.entries(where).filter(([k]) => k !== "type")),
        orderBy: { createdAt: "desc" },
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      };
      let items = await postModel.findMany(args2);
      const nextCursor = items.length > take ? items[items.length - 1].id : null;
      if (nextCursor) items.pop();
      return NextResponse.json({ items, nextCursor, note: "Modelo sin campo 'type': filtro ignorado." });
    } catch (e2) {
      return NextResponse.json(
        { error: "No se pudo listar posts/anuncios. ¿Modelo y migraciones actualizadas?" },
        { status: 500 }
      );
    }
  }
}
