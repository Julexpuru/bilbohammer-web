import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { auth } from "@/auth";
import { userCanEditAlbum, userCanManageGallery } from "@/lib/roles";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { mapAlbum, mapStandaloneImage } from "@/lib/gallery/mappers";
import {
  joinUploadRelativePath,
  resolveUploadAbsolute,
  saveUploadFile,
} from "@/lib/uploads/storage";

type UploadMode = "album" | "standalone";

type IncomingPhoto = {
  id: string;
  title?: string;
  date?: string;
  location?: string;
  dataUrl?: string;
  originalName?: string;
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

const ALBUMS_DIR = joinUploadRelativePath("gallery", "albums");
const STANDALONE_DIR = joinUploadRelativePath("gallery", "standalone");
const ALLOWED_FORMATS = new Set(["Exposición", "Liga", "Otros", "Social", "Taller", "Torneo"]);
const LEGACY_FORMAT_NORMALIZATION = new Map<string, string>([["Exposicion", "Exposición"]]);

async function ensureBaseDirectories() {
  await fs.mkdir(resolveUploadAbsolute(ALBUMS_DIR), { recursive: true });
  await fs.mkdir(resolveUploadAbsolute(STANDALONE_DIR), { recursive: true });
}

function parseDataUrl(dataUrl: string) {
  const match = /^data:(.+);base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    throw new Error("Formato de imagen no valido.");
  }
  const mimeType = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");

  const extension = mimeTypeToExtension(mimeType);
  return { buffer, mimeType, extension };
}

function mimeTypeToExtension(mimeType: string) {
  switch (mimeType.toLowerCase()) {
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

function sanitizeFilename(filename: string) {
  const base = slugify(filename.replace(/\.[^.]+$/, ""), "imagen");
  return base;
}

async function uniqueFilename(dir: string, baseName: string, extension: string) {
  let candidate = `${baseName}.${extension}`;
  let attempt = 2;
  while (true) {
    try {
      await fs.access(path.join(dir, candidate));
      candidate = `${baseName}-${attempt}.${extension}`;
      attempt += 1;
    } catch {
      return candidate;
    }
  }
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
  const now = new Date();
  const yearSegment = String(now.getFullYear());
  const yearDirRelative = joinUploadRelativePath("gallery", "standalone", yearSegment);
  const yearDir = resolveUploadAbsolute(yearDirRelative);
  await fs.mkdir(yearDir, { recursive: true });

  for (const photo of photos) {
    if (!photo.dataUrl) {
      continue;
    }
    const { buffer, mimeType, extension } = parseDataUrl(photo.dataUrl);
    const normalizedTitle = normalizeTitle(photo.title);
    const baseNameSeed = normalizedTitle ?? photo.originalName ?? photo.id;
    const baseName = sanitizeFilename(baseNameSeed);
    const filename = await uniqueFilename(yearDir, baseName, extension);
    const relativePath = joinUploadRelativePath("gallery", "standalone", yearSegment, filename);
    await saveUploadFile(relativePath, buffer);

    const takenAt = safeDateInput(photo.date);

    const imageRecord = await prisma.galleryImage.create({
      data: {
        albumId: null,
        uploaderId,
        storagePath: relativePath,
        thumbnailPath: null,
        title: normalizedTitle,
        altText: normalizedTitle ?? baseName,
        description: null,
        takenAt,
        location: photo.location ?? null,
        width: null,
        height: null,
        fileSize: buffer.length,
        mimeType,
        position: null,
      },
    });

    savedPhotos.push(mapStandaloneImage(imageRecord));
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
  const albumDirRelative = joinUploadRelativePath("gallery", "albums", albumSlug);
  const albumDir = resolveUploadAbsolute(albumDirRelative);
  await fs.mkdir(albumDir, { recursive: true });

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
      if (!photo.dataUrl) {
        continue;
      }
      const normalizedTitle = normalizeTitle(photo.title);
      const { buffer, mimeType, extension } = parseDataUrl(photo.dataUrl);
      const baseNameSeed = normalizedTitle ?? photo.originalName ?? photo.id;
      const baseName = sanitizeFilename(baseNameSeed);
      const filename = await uniqueFilename(albumDir, baseName, extension);
      const relativePath = joinUploadRelativePath("gallery", "albums", albumSlug, filename);
      await saveUploadFile(relativePath, buffer);

      const takenAt = safeDateInput(photo.date);
      const position = typeof photo.order === "number" ? photo.order : createdPhotos.length;

      const imageRecord = await tx.galleryImage.create({
        data: {
          albumId: albumRecord.id,
          uploaderId,
          storagePath: relativePath,
          thumbnailPath: null,
          title: normalizedTitle,
          altText: normalizedTitle ?? baseName,
          description: null,
          takenAt,
          location: photo.location ?? null,
          width: null,
          height: null,
          fileSize: buffer.length,
          mimeType,
          position,
        },
      });

      createdPhotos.push({
        recordId: imageRecord.id,
        clientId: photo.id,
        storagePath: relativePath,
        altText: imageRecord.altText,
      });
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
  const currentDir = resolveUploadAbsolute(joinUploadRelativePath("gallery", "albums", existing.slug));
  const targetDir = resolveUploadAbsolute(joinUploadRelativePath("gallery", "albums", newSlug));
  if (existing.slug !== newSlug) {
    try {
      await fs.mkdir(path.dirname(targetDir), { recursive: true });
      await fs.rename(currentDir, targetDir);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        throw error;
      }
    }
  }
  await fs.mkdir(targetDir, { recursive: true });

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
        const storagePath =
          albumRecord.slug !== original.storagePath.split("/")[2]
            ? path.posix.join("gallery", "albums", albumRecord.slug, path.posix.basename(original.storagePath))
            : original.storagePath;
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
      } else if (photo.dataUrl) {
        const normalizedTitle = normalizeTitle(photo.title);
        const { buffer, mimeType, extension } = parseDataUrl(photo.dataUrl);
        const baseNameSeed = normalizedTitle ?? photo.originalName ?? photo.id;
        const baseName = sanitizeFilename(baseNameSeed);
        const filename = await uniqueFilename(targetDir, baseName, extension);
        const relativePath = joinUploadRelativePath("gallery", "albums", albumRecord.slug, filename);
        await saveUploadFile(relativePath, buffer);

        const takenAt = safeDateInput(photo.date);
        const imageRecord = await tx.galleryImage.create({
          data: {
            albumId,
            uploaderId,
            storagePath: relativePath,
            thumbnailPath: null,
            title: normalizedTitle,
            altText: normalizedTitle ?? baseName,
            description: null,
            takenAt,
            location: photo.location ?? null,
            width: null,
            height: null,
            fileSize: buffer.length,
            mimeType,
            position,
          },
        });
        seenImageIds.add(imageRecord.id);
        createdPhotos.push({
          recordId: imageRecord.id,
          clientId: photo.id,
          storagePath: relativePath,
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

    await ensureBaseDirectories();

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
    return NextResponse.json({ error: message }, { status: 500 });
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
