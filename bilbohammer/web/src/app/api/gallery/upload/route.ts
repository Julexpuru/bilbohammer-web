import { NextResponse } from "next/server";
import path from "path";
import { auth } from "@/auth";
import { userCanEditAlbum, userCanManageGallery } from "@/lib/roles";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { mapAlbum, mapStandaloneImage } from "@/lib/gallery/mappers";

type UploadMode = "album" | "standalone";

type IncomingPhoto = {
  id: string;
  title?: string;
  date?: string;
  location?: string;
  imageUrl?: string;
  originalName?: string;
  mimeType?: string | null;
  fileSize?: number | null;
  existingImageId?: string;
  storagePath?: string | null;
  order?: number;
};

type IncomingAlbumMeta = {
  title: string;
  date?: string;
  location?: string;
  description?: string;
  tags: string[];
  collaborators: string[];
  coverPhotoId: string | null;
  game: string;
  format: string;
};

type UploadRequestBody = {
  mode: UploadMode;
  album?: IncomingAlbumMeta;
  photos: IncomingPhoto[];
  albumId?: string;
};

const ALLOWED_FORMATS = new Set(["Exposición", "Liga", "Otros", "Social", "Taller", "Torneo"]);
const LEGACY_FORMAT_NORMALIZATION = new Map<string, string>([["Exposicion", "Exposición"]]);

function normalizeImageUrl(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;
  return trimmed;
}

function resolveIncomingStoragePath(photo: IncomingPhoto) {
  return normalizeImageUrl(photo.imageUrl ?? photo.storagePath ?? null);
}

function normalizeFileSize(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.floor(value);
}

function normalizeMimeType(value?: string | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function generateAlbumSlug(title: string, existingAlbumId?: string) {
  const base = slugify(title, "album");
  let candidate = base;
  let attempt = 2;
  while (true) {
    const existing = await prisma.galleryAlbum.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || (existingAlbumId && existing.id === existingAlbumId)) {
      return candidate;
    }
    candidate = `${base}-${attempt}`;
    attempt += 1;
  }
}

function safeDateInput(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return null;
  }
  return parsed;
}

function formatDisplayDate(value: Date | null) {
  if (!value) {
    return null;
  }
  return value.toLocaleDateString("es-ES", { dateStyle: "long" });
}

function getFacetYear(date: Date | null) {
  if (!date) {
    return String(new Date().getFullYear());
  }
  return String(date.getFullYear());
}

async function handleStandaloneUpload(photos: IncomingPhoto[], uploaderId: number | null) {
  const savedPhotos = [];

  for (const photo of photos) {
    const storagePath = resolveIncomingStoragePath(photo);
    if (!storagePath) {
      continue;
    }
    const normalizedTitle = normalizeTitle(photo.title);
    const baseName = normalizedTitle ?? photo.originalName ?? path.posix.basename(storagePath);

    const takenAt = safeDateInput(photo.date);

    const imageRecord = await prisma.galleryImage.create({
      data: {
        albumId: null,
        uploaderId,
        storagePath,
        thumbnailPath: null,
        title: normalizedTitle,
        altText: normalizedTitle ?? baseName,
        description: null,
        takenAt,
        location: photo.location ?? null,
        width: null,
        height: null,
        fileSize: normalizeFileSize(photo.fileSize),
        mimeType: normalizeMimeType(photo.mimeType),
        position: null,
      },
    });

    savedPhotos.push(mapStandaloneImage(imageRecord));
  }

  if (savedPhotos.length === 0) {
    throw new Error("No se pudo procesar ninguna imagen.");
  }

  return savedPhotos;
}

async function createAlbum(meta: IncomingAlbumMeta, photos: IncomingPhoto[], uploaderId: number | null) {
  if (photos.length === 0) {
    throw new Error("Un album debe incluir al menos una fotografia.");
  }

  const eventDate = safeDateInput(meta.date);
  const displayDate = formatDisplayDate(eventDate);
  const facetYear = getFacetYear(eventDate);
  const albumSlug = await generateAlbumSlug(meta.title);

  const collaboratorIds = meta.collaborators
    .map((id) => Number(id))
    .filter((value) => Number.isInteger(value) && value > 0);
  const normalizedFormat = normalizeFormat(meta.format);

  return prisma.$transaction(async (tx) => {
    const albumRecord = await tx.galleryAlbum.create({
      data: {
        slug: albumSlug,
        title: meta.title,
        description: meta.description ?? null,
        location: meta.location ?? null,
        displayDate,
        dateISO: eventDate ? eventDate.toISOString().slice(0, 10) : null,
        coverImagePath: null,
        coverImageAlt: null,
        totalPhotos: 0,
        facetYear,
        facetGame: meta.game,
        facetFormat: normalizedFormat,
      },
    });

    if (meta.tags.length > 0) {
      await tx.galleryAlbumTag.createMany({
        data: meta.tags.map((label) => ({
          albumId: albumRecord.id,
          label,
        })),
      });
    }

    if (collaboratorIds.length > 0) {
      await Promise.allSettled(
        collaboratorIds.map((userId) =>
          tx.galleryAlbumCollaborator.create({
            data: {
              albumId: albumRecord.id,
              userId,
            },
          })
        )
      );
    }

    const createdPhotos: { recordId: string; clientId: string; storagePath: string; altText: string | null }[] = [];

    for (const photo of photos) {
      const storagePath = resolveIncomingStoragePath(photo);
      if (!storagePath) {
        continue;
      }
      const normalizedTitle = normalizeTitle(photo.title);
      const baseName = normalizedTitle ?? photo.originalName ?? path.posix.basename(storagePath);
      const takenAt = safeDateInput(photo.date);
      const position = typeof photo.order === "number" ? photo.order : createdPhotos.length;

      const imageRecord = await tx.galleryImage.create({
        data: {
          albumId: albumRecord.id,
          uploaderId,
          storagePath,
          thumbnailPath: null,
          title: normalizedTitle,
          altText: normalizedTitle ?? baseName,
          description: null,
          takenAt,
          location: photo.location ?? null,
          width: null,
          height: null,
          fileSize: normalizeFileSize(photo.fileSize),
          mimeType: normalizeMimeType(photo.mimeType),
          position,
        },
      });

      createdPhotos.push({
        recordId: imageRecord.id,
        clientId: photo.id,
        storagePath,
        altText: imageRecord.altText,
      });
    }

    if (createdPhotos.length === 0) {
      throw new Error("No se pudo procesar ninguna imagen.");
    }

    const coverImageMatch = meta.coverPhotoId
      ? createdPhotos.find((photo) => photo.clientId === meta.coverPhotoId) ?? null
      : null;
    const coverImage = coverImageMatch ?? createdPhotos[0] ?? null;

    await tx.galleryAlbum.update({
      where: { id: albumRecord.id },
      data: {
        coverImagePath: coverImage?.storagePath ?? null,
        coverImageAlt: coverImage?.altText ?? null,
        totalPhotos: createdPhotos.length,
      },
    });

    const persisted = await tx.galleryAlbum.findUniqueOrThrow({
      where: { id: albumRecord.id },
      include: {
        images: true,
        tags: true,
        collaborators: { include: { user: true } },
      },
    });

    return mapAlbum(persisted);
  });
}

async function updateAlbum(
  albumId: string,
  meta: IncomingAlbumMeta,
  photos: IncomingPhoto[],
  uploaderId: number | null
) {
  const existing = await prisma.galleryAlbum.findUnique({
    where: { id: albumId },
    include: { images: true },
  });
  if (!existing) {
    throw new Error("El album indicado no existe.");
  }

  const eventDate = safeDateInput(meta.date);
  const displayDate = formatDisplayDate(eventDate);
  const facetYear = getFacetYear(eventDate);
  const collaboratorIds = meta.collaborators
    .map((id) => Number(id))
    .filter((value) => Number.isInteger(value) && value > 0);
  const normalizedFormat = normalizeFormat(meta.format);

  const newSlug = await generateAlbumSlug(meta.title, albumId);

  const existingImageMap = new Map(existing.images.map((image) => [image.id, image]));

  return prisma.$transaction(async (tx) => {
    const albumRecord = await tx.galleryAlbum.update({
      where: { id: albumId },
      data: {
        slug: newSlug,
        title: meta.title,
        description: meta.description ?? null,
        location: meta.location ?? null,
        displayDate,
        dateISO: eventDate ? eventDate.toISOString().slice(0, 10) : null,
        facetYear,
        facetGame: meta.game,
        facetFormat: normalizedFormat,
        updatedAt: new Date(),
      },
    });

    await tx.galleryAlbumTag.deleteMany({ where: { albumId } });
    if (meta.tags.length > 0) {
      await tx.galleryAlbumTag.createMany({
        data: meta.tags.map((label) => ({
          albumId,
          label,
        })),
      });
    }

    await tx.galleryAlbumCollaborator.deleteMany({ where: { albumId } });
    if (collaboratorIds.length > 0) {
      await Promise.allSettled(
        collaboratorIds.map((userId) =>
          tx.galleryAlbumCollaborator.create({
            data: {
              albumId,
              userId,
            },
          })
        )
      );
    }

    const createdPhotos: { recordId: string; clientId: string; storagePath: string; altText: string | null }[] = [];
    const updatedPhotos: { recordId: string; storagePath: string; altText: string | null }[] = [];
    const seenImageIds = new Set<string>();

    for (const photo of photos) {
      const position = typeof photo.order === "number" ? photo.order : 0;
      if (photo.existingImageId && existingImageMap.has(photo.existingImageId)) {
        const original = existingImageMap.get(photo.existingImageId)!;
        seenImageIds.add(original.id);
        const takenAt = safeDateInput(photo.date);
        const normalizedTitle = normalizeTitle(photo.title);
        const storagePath = original.storagePath;
        const updated = await tx.galleryImage.update({
          where: { id: original.id },
          data: {
            title: normalizedTitle,
            altText: normalizedTitle ?? original.altText ?? path.posix.basename(storagePath),
            description: original.description,
            takenAt,
            location: photo.location ?? null,
            position,
            storagePath,
          },
        });
        updatedPhotos.push({
          recordId: updated.id,
          storagePath: updated.storagePath,
          altText: updated.altText,
        });
      } else {
        const storagePath = resolveIncomingStoragePath(photo);
        if (!storagePath) {
          continue;
        }
        const normalizedTitle = normalizeTitle(photo.title);
        const baseName = normalizedTitle ?? photo.originalName ?? path.posix.basename(storagePath);
        const takenAt = safeDateInput(photo.date);
        const imageRecord = await tx.galleryImage.create({
          data: {
            albumId,
            uploaderId,
            storagePath,
            thumbnailPath: null,
            title: normalizedTitle,
            altText: normalizedTitle ?? baseName,
            description: null,
            takenAt,
            location: photo.location ?? null,
            width: null,
            height: null,
            fileSize: normalizeFileSize(photo.fileSize),
            mimeType: normalizeMimeType(photo.mimeType),
            position,
          },
        });
        seenImageIds.add(imageRecord.id);
        createdPhotos.push({
          recordId: imageRecord.id,
          clientId: photo.id,
          storagePath,
          altText: imageRecord.altText,
        });
      }
    }

    const idsToDelete = existing.images
      .map((image) => image.id)
      .filter((id) => !seenImageIds.has(id));
    if (idsToDelete.length > 0) {
      await tx.galleryImage.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }

    const requestedCover = meta.coverPhotoId
      ? createdPhotos.find((photo) => photo.clientId === meta.coverPhotoId) ??
        updatedPhotos.find((photo) => photo.recordId === meta.coverPhotoId) ??
        null
      : null;
    const coverImage = requestedCover ?? createdPhotos[0] ?? updatedPhotos[0] ?? null;

    await tx.galleryAlbum.update({
      where: { id: albumRecord.id },
      data: {
        coverImagePath: coverImage?.storagePath ?? null,
        coverImageAlt: coverImage?.altText ?? null,
        totalPhotos: seenImageIds.size,
      },
    });

    const persisted = await tx.galleryAlbum.findUniqueOrThrow({
      where: { id: albumRecord.id },
      include: {
        images: true,
        tags: true,
        collaborators: { include: { user: true } },
      },
    });

    return mapAlbum(persisted);
  });
}

async function handleAlbumUpload(
  meta: IncomingAlbumMeta,
  photos: IncomingPhoto[],
  uploaderId: number | null,
  albumId?: string
) {
  if (albumId) {
    return updateAlbum(albumId, meta, photos, uploaderId);
  }
  return createAlbum(meta, photos, uploaderId);
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const hasGalleryPrivileges = userCanManageGallery(session);
    const uploaderId = Number((session?.user as any)?.id);
    const numericUploaderId = Number.isInteger(uploaderId) ? uploaderId : null;

    const body = (await request.json()) as UploadRequestBody;
    if (!body || !Array.isArray(body.photos) || body.photos.length === 0) {
      return NextResponse.json({ error: "Debes adjuntar al menos una imagen." }, { status: 400 });
    }

    if (body.mode !== "album" && body.mode !== "standalone") {
      return NextResponse.json({ error: "Modo de subida no soportado." }, { status: 400 });
    }

    if (body.mode === "standalone") {
      if (!hasGalleryPrivileges) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }

      const photos = await handleStandaloneUpload(body.photos, numericUploaderId);
      return NextResponse.json({ kind: "standalone", photos }, { status: 201 });
    }

    if (body.albumId) {
      const albumForPermissions = await prisma.galleryAlbum.findUnique({
        where: { id: body.albumId },
        select: {
          id: true,
          collaborators: { select: { userId: true } },
        },
      });
      if (!albumForPermissions) {
        return NextResponse.json({ error: "Album no encontrado" }, { status: 404 });
      }
      const collaboratorIds = albumForPermissions.collaborators.map((collaborator) => String(collaborator.userId));
      const accessLevel = userCanEditAlbum(session, collaboratorIds);
      if (accessLevel === "none") {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
    } else if (!hasGalleryPrivileges) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (!body.album) {
      return NextResponse.json({ error: "Faltan metadatos del album." }, { status: 400 });
    }

    const album = await handleAlbumUpload(body.album, body.photos, numericUploaderId, body.albumId);
    return NextResponse.json({ kind: "album", album }, { status: 201 });
  } catch (error) {
    console.error("Fallo al procesar la subida de la galería", error);
    const message =
      error instanceof Error ? error.message : "No se pudo procesar la subida. Inténtalo de nuevo más tarde.";
    const lower = message.toLowerCase();
    const status = lower.includes("imagen") || lower.includes("album") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

function normalizeFormat(input?: string | null) {
  if (!input) {
    return "Otros";
  }
  const remapped = LEGACY_FORMAT_NORMALIZATION.get(input) ?? input;
  return ALLOWED_FORMATS.has(remapped) ? remapped : "Otros";
}

function normalizeTitle(value?: string | null) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
