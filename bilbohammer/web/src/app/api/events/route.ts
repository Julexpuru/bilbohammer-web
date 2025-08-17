export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// src/app/api/events/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
  const events = await prisma.event.findMany({
    orderBy: { startsAt: "asc" },
    take: 100,
  });
  return NextResponse.json(events);

  } catch (err) {
    // Evita romper el build en Docker (DB no disponible en etapa de build)
    // En runtime el contenedor DB sí estará disponible.
    return NextResponse.json([], { headers: { "x-bh-warning": "db-unavailable-during-build" } });
  }
}