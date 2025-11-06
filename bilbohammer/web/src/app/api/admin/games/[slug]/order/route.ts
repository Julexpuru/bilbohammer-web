import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { extractRoles } from "@/lib/roles";
import prisma from "@/lib/prisma";

type OrderPayload = { direction?: "up" | "down" };

export async function PATCH(request: Request, { params }: { params: { slug: string } }) {
  const session = await auth();
  const roles = extractRoles(session);
  if (!roles.includes("ADMIN") && !roles.includes("JUNTA")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const slugParam = params.slug?.trim().toLowerCase();
  if (!slugParam) {
    return NextResponse.json({ error: "Juego no reconocido." }, { status: 400 });
  }

  const body = (await request.json()) as OrderPayload;
  if (body.direction !== "up" && body.direction !== "down") {
    return NextResponse.json({ error: "Dirección inválida." }, { status: 400 });
  }

  if (slugParam === "otros") {
    return NextResponse.json({ error: "El juego \"Otros\" debe permanecer al final." }, { status: 400 });
  }

  const games = await prisma.game.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, sortOrder: true },
  });

  const index = games.findIndex((game) => game.slug === slugParam);
  if (index === -1) {
    return NextResponse.json({ error: "Juego no encontrado." }, { status: 404 });
  }

  const targetIndex = body.direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= games.length) {
    return NextResponse.json({ ok: true });
  }

  const targetGame = games[targetIndex];
  if (!targetGame || targetGame.slug === "otros") {
    return NextResponse.json({ error: "No se puede reordenar más allá de \"Otros\"." }, { status: 400 });
  }

  const current = games[index];

  await prisma.$transaction([
    prisma.game.update({
      where: { id: current.id },
      data: { sortOrder: targetGame.sortOrder },
    }),
    prisma.game.update({
      where: { id: targetGame.id },
      data: { sortOrder: current.sortOrder },
    }),
  ]);

  await keepOtrosLast();

  revalidatePath("/sobre-nosotros/juegos");
  return NextResponse.json({ ok: true });
}

async function keepOtrosLast() {
  const otros = await prisma.game.findFirst({
    where: { slug: "otros" },
    select: { id: true, sortOrder: true },
  });
  if (!otros) return;

  const max = await prisma.game.aggregate({
    where: { slug: { not: "otros" } },
    _max: { sortOrder: true },
  });

  const desired = (max._max.sortOrder ?? 0) + 10;
  if ((otros.sortOrder ?? 0) >= desired) return;

  await prisma.game.update({
    where: { id: otros.id },
    data: { sortOrder: desired },
  });
}
