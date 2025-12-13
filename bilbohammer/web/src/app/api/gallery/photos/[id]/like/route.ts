import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type LikeAction = "like" | "unlike";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = decodeURIComponent(params.id);
    const body = (await request.json().catch(() => ({}))) as { action?: LikeAction };
    const action: LikeAction = body.action === "unlike" ? "unlike" : "like";
    const delta = action === "unlike" ? -1 : 1;

    const image = await prisma.galleryImage.findUnique({
      where: { id },
      select: { id: true, likesCount: true },
    });
    if (!image) {
      return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 });
    }

    const nextLikes = Math.max(0, (image.likesCount ?? 0) + delta);
    const updated = await prisma.galleryImage.update({
      where: { id },
      data: { likesCount: nextLikes },
      select: { likesCount: true },
    });

    return NextResponse.json({ likesCount: updated.likesCount });
  } catch (error) {
    console.error("[gallery] error actualizando likes", error);
    return NextResponse.json({ error: "No se pudo actualizar la reacción." }, { status: 500 });
  }
}
