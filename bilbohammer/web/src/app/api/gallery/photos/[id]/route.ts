'use server';

import { NextResponse } from "next/server";
import path from "path";
import { auth } from "@/auth";
import { userCanManageGallery } from "@/lib/roles";
import prisma from "@/lib/prisma";
import { mapStandaloneImage } from "@/lib/gallery/mappers";
import { deleteUploadFile } from "@/lib/uploads/storage";

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDate(value: unknown) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.valueOf())) {
    throw new Error("La fecha indicada no es valida.");
  }
  return parsed;
}

async function fetchStandalonePhoto(id: string) {
  const photo = await prisma.galleryImage.findUnique({
    where: { id },
  });
  if (!photo) {
    return null;
  }
  if (photo.albumId) {
    throw new Error("Solo se pueden gestionar fotos independientes mediante este endpoint.");
  }
  return photo;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!userCanManageGallery(session)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = (await request.json()) as {
      title?: string | null;
      date?: string | null;
      location?: string | null;
    };

    const photo = await fetchStandalonePhoto(params.id);
    if (!photo) {
      return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 });
    }

    const title = normalizeString(body.title);
    const location = normalizeString(body.location);
    let takenAt: Date | null = null;
    if (body.date !== undefined) {
      takenAt = parseDate(body.date);
    } else {
      takenAt = photo.takenAt;
    }

    const updated = await prisma.galleryImage.update({
      where: { id: photo.id },
      data: {
        title,
        altText: title ?? photo.altText ?? photo.title ?? path.posix.basename(photo.storagePath),
        location: body.location === undefined ? photo.location : location,
        takenAt,
      },
    });

    const mapped = mapStandaloneImage(updated);
    return NextResponse.json({ photo: mapped });
  } catch (error) {
    console.error("Error actualizando foto independiente", error);
    const message = error instanceof Error ? error.message : "No se pudo actualizar la foto.";
    const lower = message.toLowerCase();
    let status = 500;
    if (lower.includes("fecha")) {
      status = 400;
    } else if (lower.includes("solo se pueden")) {
      status = 400;
    }
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!userCanManageGallery(session)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const photo = await fetchStandalonePhoto(params.id);
    if (!photo) {
      return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 });
    }

    await prisma.galleryImage.delete({
      where: { id: photo.id },
    });

    if (photo.storagePath) {
      try {
        await deleteUploadFile(photo.storagePath);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "ENOENT") {
          console.warn("No se pudo eliminar el archivo de la foto:", error);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error eliminando foto independiente", error);
    const message = error instanceof Error ? error.message : "No se pudo eliminar la foto.";
    const lower = message.toLowerCase();
    const status = lower.includes("no autorizado") ? 403 : lower.includes("solo se pueden") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
