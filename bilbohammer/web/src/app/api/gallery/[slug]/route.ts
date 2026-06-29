'use server';

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { userCanEditAlbum } from "@/lib/roles";
import prisma from "@/lib/prisma";
import { copyUploadObject, deleteUploadObject } from "@/lib/uploads/r2";
import {
  ensureUploadsKey,
  resolveUploadsKey,
  stripUploadsPrefix,
} from "@/lib/uploads/public-url";

const REMOVED_PREFIX_ROOT = "removed/gallery/albums";

function buildRemovedPrefix(slug: string, timestamp: string) {
  const safeSlug = slug.trim() || "album";
  return ensureUploadsKey(`${REMOVED_PREFIX_ROOT}/${safeSlug}__removed__${timestamp}`);
}

function buildRemovedKey(removedPrefix: string, key: string) {
  const normalizedPrefix = removedPrefix.replace(/\/+$/, "");
  const normalizedKey = stripUploadsPrefix(key).replace(/^\/+/, "");
  return `${normalizedPrefix}/${normalizedKey}`;
}

async function moveObjectsToRemovedPrefix(keys: string[], removedPrefix: string) {
  const uniqueKeys = Array.from(new Set(keys));
  const concurrency = 5;
  for (let idx = 0; idx < uniqueKeys.length; idx += concurrency) {
    const batch = uniqueKeys.slice(idx, idx + concurrency);
    const results = await Promise.allSettled(
      batch.map(async (key) => {
        const targetKey = buildRemovedKey(removedPrefix, key);
        if (targetKey === key) return;
        await copyUploadObject(key, targetKey);
        await deleteUploadObject(key);
      })
    );
    results.forEach((result, offset) => {
      if (result.status === "rejected") {
        console.warn(
          "[gallery] No se pudo mover un archivo a la zona de eliminados:",
          batch[offset],
          result.reason
        );
      }
    });
  }
}

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
      return NextResponse.json({ error: "Álbum no encontrado" }, { status: 404 });
    }
    const collaboratorIds = album.collaborators.map((collaborator) => String(collaborator.userId));
    const permission = userCanEditAlbum(session, collaboratorIds);
    if (permission === "none") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const images = await prisma.galleryImage.findMany({
      where: { albumId: album.id },
      select: { storagePath: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.galleryImage.deleteMany({ where: { albumId: album.id } });
      await tx.galleryAlbumTag.deleteMany({ where: { albumId: album.id } });
      await tx.galleryAlbumCollaborator.deleteMany({ where: { albumId: album.id } });
      await tx.galleryAlbum.delete({ where: { id: album.id } });
    });

    const keys = images
      .map((image) => resolveUploadsKey(image.storagePath))
      .filter((value): value is string => Boolean(value));

    if (keys.length > 0) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const removedPrefix = buildRemovedPrefix(album.slug, timestamp);
      try {
        await moveObjectsToRemovedPrefix(keys, removedPrefix);
      } catch (error) {
        console.warn("No se pudo mover el contenido del álbum eliminado:", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error eliminando álbum", error);
    const message = error instanceof Error ? error.message : "No se pudo eliminar el álbum.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
