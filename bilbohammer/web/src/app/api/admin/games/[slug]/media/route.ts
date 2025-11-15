import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { extractRoles } from "@/lib/roles";
import prisma from "@/lib/prisma";
import {
  deleteUploadFile,
  joinUploadRelativePath,
  saveUploadFile,
  toPublicPath,
} from "@/lib/uploads/storage";

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
    const { buffer, extension } = parseDataUrl(body.dataUrl);
    const timestamp = Date.now();
    const filename = `${game.slug}-${timestamp}.${extension}`;
    const relativePath = joinUploadRelativePath(
      "games",
      body.kind === "icon" ? "icons" : "hero",
      filename,
    );
    await saveUploadFile(relativePath, buffer);
    const publicPath = toPublicPath(relativePath);

    if (body.kind === "icon" && game.iconImagePath) {
      void deleteUploadFile(game.iconImagePath);
    }
    if (body.kind === "hero" && game.heroImagePath) {
      void deleteUploadFile(game.heroImagePath);
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
