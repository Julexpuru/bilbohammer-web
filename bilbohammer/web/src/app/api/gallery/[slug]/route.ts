'use server';

import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { auth } from "@/auth";
import { userCanEditAlbum } from "@/lib/roles";
import prisma from "@/lib/prisma";
import { joinUploadRelativePath, resolveUploadAbsolute } from "@/lib/uploads/storage";

const ALBUMS_DIR = joinUploadRelativePath("gallery", "albums");

export async function DELETE(_: Request, { params }: { params: { slug: string } }) {
  try {
    const session = await auth();
    const slug = decodeURIComponent(params.slug);
    const album = await prisma.galleryAlbum.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        collaborators: { select: { userId: true } },
      },
    });
    if (!album) {
      return NextResponse.json({ error: "Album no encontrado" }, { status: 404 });
    }
    const collaboratorIds = album.collaborators.map((collaborator) => String(collaborator.userId));
    const permission = userCanEditAlbum(session, collaboratorIds);
    if (permission === "none") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.galleryImage.deleteMany({ where: { albumId: album.id } });
      await tx.galleryAlbumTag.deleteMany({ where: { albumId: album.id } });
      await tx.galleryAlbumCollaborator.deleteMany({ where: { albumId: album.id } });
      await tx.galleryAlbum.delete({ where: { id: album.id } });
    });

    const currentDir = resolveUploadAbsolute(joinUploadRelativePath("gallery", "albums", album.slug));
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const targetDir = resolveUploadAbsolute(
      joinUploadRelativePath("gallery", "albums", `${album.slug}__removed__${timestamp}`),
    );
    try {
      await fs.rename(currentDir, targetDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn("No se pudo renombrar la carpeta del album eliminado:", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error eliminando album", error);
    const message = error instanceof Error ? error.message : "No se pudo eliminar el album.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
