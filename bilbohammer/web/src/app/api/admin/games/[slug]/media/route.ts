import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { extractRoles } from "@/lib/roles";
import prisma from "@/lib/prisma";

const MEDIA_ROOT = path.join(process.cwd(), "public", "uploads", "games");
const ICON_DIR = path.join(MEDIA_ROOT, "icons");
const HERO_DIR = path.join(MEDIA_ROOT, "hero");

type MediaPayload = {
  kind?: "icon" | "hero";
  dataUrl?: string;
};

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const session = await auth();
  const roles = extractRoles(session);
  if (!roles.includes("ADMIN") && !roles.includes("JUNTA")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const slugParam = params.slug?.trim().toLowerCase();
  if (!slugParam) {
    return NextResponse.json({ error: "Juego no reconocido." }, { status: 400 });
  }

  const body = (await request.json()) as MediaPayload;
  if (!body || (body.kind !== "icon" && body.kind !== "hero") || typeof body.dataUrl !== "string") {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const game = await prisma.game.findFirst({
    where: { OR: [{ slug: slugParam }, { legacyEnumKey: slugParam.toUpperCase() }] },
    select: { id: true, slug: true, iconImagePath: true, heroImagePath: true },
  });

  if (!game) {
    return NextResponse.json({ error: "Juego no encontrado." }, { status: 404 });
  }

  try {
    await ensureMediaDirectories();
    const { buffer, extension } = parseDataUrl(body.dataUrl);
    const timestamp = Date.now();
    const filename = `${game.slug}-${timestamp}.${extension}`;
    const targetDir = body.kind === "icon" ? ICON_DIR : HERO_DIR;
    const targetPath = path.join(targetDir, filename);
    await fs.writeFile(targetPath, buffer);

    const publicPath =
      body.kind === "icon" ? `/uploads/games/icons/${filename}` : `/uploads/games/hero/${filename}`;

    if (body.kind === "icon" && game.iconImagePath?.startsWith("/uploads/games/icons/")) {
      void deleteIfExists(path.join(process.cwd(), "public", game.iconImagePath));
    }
    if (body.kind === "hero" && game.heroImagePath?.startsWith("/uploads/games/hero/")) {
      void deleteIfExists(path.join(process.cwd(), "public", game.heroImagePath));
    }

    const update =
      body.kind === "icon"
        ? { iconImagePath: publicPath }
        : { heroImagePath: publicPath };

    await prisma.game.update({
      where: { id: game.id },
      data: update,
    });

    revalidatePath("/sobre-nosotros/juegos");

    return NextResponse.json(update);
  } catch (error) {
    console.error("[games-media] Error al actualizar la imagen", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la imagen. Inténtalo de nuevo más tarde." },
      { status: 500 },
    );
  }
}

async function ensureMediaDirectories() {
  await fs.mkdir(ICON_DIR, { recursive: true });
  await fs.mkdir(HERO_DIR, { recursive: true });
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

async function deleteIfExists(fullPath: string) {
  try {
    await fs.unlink(fullPath);
  } catch {
    // Ignore
  }
}
