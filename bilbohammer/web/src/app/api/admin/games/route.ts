import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { extractRoles } from "@/lib/roles";
import { slugify } from "@/lib/slugify";
import prisma from "@/lib/prisma";
import { GAME_DEFAULT_CONTENT } from "@/lib/game-default-content";

const MEDIA_ROOT = path.join(process.cwd(), "public", "uploads", "games");
const ICON_DIR = path.join(MEDIA_ROOT, "icons");
const HERO_DIR = path.join(MEDIA_ROOT, "hero");

type CreatePayload = {
  name?: string;
  slug?: string;
  legacyEnumKey?: string | null;
  isDefault?: boolean;
  iconDataUrl?: string | null;
  heroDataUrl?: string | null;
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

    await ensureMediaDirectories();

    let iconImagePath: string | null = null;
    if (body.iconDataUrl) {
      iconImagePath = await saveMediaFile(slug, body.iconDataUrl, "icon");
    }
    let heroImagePath: string | null = null;
    if (body.heroDataUrl) {
      heroImagePath = await saveMediaFile(slug, body.heroDataUrl, "hero");
    }

    if (iconImagePath || heroImagePath) {
      await prisma.game.update({
        where: { id: created.id },
        data: {
          iconImagePath: iconImagePath ?? undefined,
          heroImagePath: heroImagePath ?? undefined,
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

async function ensureMediaDirectories() {
  await fs.mkdir(ICON_DIR, { recursive: true });
  await fs.mkdir(HERO_DIR, { recursive: true });
}

async function saveMediaFile(slug: string, dataUrl: string, kind: "icon" | "hero") {
  const { buffer, extension } = parseDataUrl(dataUrl);
  const filename = `${slug}-${kind}-${Date.now()}.${extension}`;
  const targetDir = kind === "icon" ? ICON_DIR : HERO_DIR;
  const targetPath = path.join(targetDir, filename);
  await fs.writeFile(targetPath, buffer);
  return kind === "icon" ? `/uploads/games/icons/${filename}` : `/uploads/games/hero/${filename}`;
}

function parseDataUrl(dataUrl: string) {
  const match = /^data:(.+);base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    throw new Error("Formato de imagen no válido.");
  }
  const mimeType = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");
  const extension = mimeToExtension(mimeType);
  return { buffer, extension };
}

function mimeToExtension(mime: string) {
  switch (mime.toLowerCase()) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
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
