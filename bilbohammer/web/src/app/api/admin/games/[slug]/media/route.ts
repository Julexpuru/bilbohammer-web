import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { extractRoles } from "@/lib/roles";
import prisma from "@/lib/prisma";
import { deleteUploadFile } from "@/lib/uploads/storage";

type MediaPayload = {
  kind?: "icon" | "hero";
  imageUrl?: string;
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
  if (!body || (body.kind !== "icon" && body.kind !== "hero")) {
    return NextResponse.json({ error: "Peticion invalida." }, { status: 400 });
  }

  const parsedImageUrl = parseImageUrl(body.imageUrl);
  if ("error" in parsedImageUrl) {
    return NextResponse.json({ error: parsedImageUrl.error }, { status: 400 });
  }

  const game = await prisma.game.findFirst({
    where: { OR: [{ slug: slugParam }, { legacyEnumKey: slugParam.toUpperCase() }] },
    select: { id: true, slug: true, iconImagePath: true, heroImagePath: true },
  });

  if (!game) {
    return NextResponse.json({ error: "Juego no encontrado." }, { status: 404 });
  }

  try {
    const publicPath = parsedImageUrl.url;

    if (body.kind === "icon" && game.iconImagePath) {
      void deleteUploadFile(game.iconImagePath);
    }
    if (body.kind === "hero" && game.heroImagePath) {
      void deleteUploadFile(game.heroImagePath);
    }

    const update = body.kind === "icon" ? { iconImagePath: publicPath } : { heroImagePath: publicPath };

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

function parseImageUrl(value: unknown) {
  if (value === null || value === undefined) return { error: "URL de imagen requerida." };
  if (typeof value !== "string") {
    return { error: "URL de imagen invalida." };
  }
  const trimmed = value.trim();
  if (!trimmed) return { error: "URL de imagen requerida." };
  if (trimmed.startsWith("data:")) {
    return { error: "No se aceptan imagenes en base64." };
  }
  return { url: trimmed };
}
