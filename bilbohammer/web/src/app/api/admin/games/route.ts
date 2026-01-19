import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { extractRoles } from "@/lib/roles";
import { slugify } from "@/lib/slugify";
import prisma from "@/lib/prisma";
import { GAME_DEFAULT_CONTENT } from "@/lib/game-default-content";

type CreatePayload = {
  name?: string;
  slug?: string;
  legacyEnumKey?: string | null;
  isDefault?: boolean;
  iconImageUrl?: string | null;
  heroImageUrl?: string | null;
};

export async function POST(request: Request) {
  const session = await auth();
  const roles = extractRoles(session);
  if (!roles.includes("ADMIN") && !roles.includes("JUNTA")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as CreatePayload;
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
    }

    let slug = (body.slug ?? slugify(name)).trim().toLowerCase();
    if (!slug) {
      slug = slugify(name);
    }

    const existingSlug = await prisma.game.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existingSlug) {
      return NextResponse.json({ error: "Ya existe un juego con ese slug." }, { status: 400 });
    }

    const games = await prisma.game.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, slug: true, sortOrder: true },
    });
    const maxSort = games
      .filter((game) => game.slug !== "otros")
      .reduce((acc, game) => Math.max(acc, game.sortOrder), 0);
    const sortOrder = maxSort + 10;

    const created = await prisma.game.create({
      data: {
        name,
        slug,
        legacyEnumKey: body.legacyEnumKey?.trim() || null,
        isDefault: Boolean(body.isDefault),
        sortOrder,
        isActive: true,
      },
    });

    const iconImagePath = parseImageUrl(body.iconImageUrl);
    if ("error" in iconImagePath) {
      return NextResponse.json({ error: iconImagePath.error }, { status: 400 });
    }
    const heroImagePath = parseImageUrl(body.heroImageUrl);
    if ("error" in heroImagePath) {
      return NextResponse.json({ error: heroImagePath.error }, { status: 400 });
    }

    if (iconImagePath.url || heroImagePath.url) {
      await prisma.game.update({
        where: { id: created.id },
        data: {
          iconImagePath: iconImagePath.url ?? undefined,
          heroImagePath: heroImagePath.url ?? undefined,
        },
      });
    }

    const defaults = GAME_DEFAULT_CONTENT[slug] ?? {
      summary: "Resumen pendiente de completar.",
      contentHtml:
        "<p>Estamos preparando la información de este juego. Si quieres liderarlo, contacta con la junta a través de hola@bilbohammer.eus.</p>",
      investment: "Pendiente",
      playtime: "Pendiente",
      learning: "Media",
      contactDisplay: "Junta · Coordinación",
      contactNote: "Pendiente de asignar responsables.",
    };

    await prisma.gameInfo.upsert({
      where: { gameId: created.id },
      update: {},
      create: {
        gameId: created.id,
        summary: defaults.summary,
        contentHtml: defaults.contentHtml,
        investment: defaults.investment,
        playtime: defaults.playtime,
        learning: defaults.learning,
        contactNote: defaults.contactNote ?? "",
      },
    });

    await keepOtrosLast();

    revalidatePath("/sobre-nosotros/juegos");

    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    console.error("[admin/games] Error creando el juego", error);
    return NextResponse.json(
      { error: "No se pudo crear el juego. Inténtalo de nuevo más tarde." },
      { status: 500 },
    );
  }
}

function parseImageUrl(value: unknown) {
  if (value === null || value === undefined) return { url: null as string | null };
  if (typeof value !== "string") {
    return { error: "URL de imagen invalida." };
  }
  const trimmed = value.trim();
  if (!trimmed) return { url: null as string | null };
  if (trimmed.startsWith("data:")) {
    return { error: "No se aceptan imagenes en base64." };
  }
  return { url: trimmed };
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
