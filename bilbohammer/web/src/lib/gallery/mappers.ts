import type {
  GalleryAlbum,
  GalleryImage,
  GalleryStandalonePhoto,
} from "@/components/gallery/types";
import type { Prisma } from "@prisma/client";

const DEFAULT_IMAGE_WIDTH = 1600;
const DEFAULT_IMAGE_HEIGHT = 1067;
const RAW_PUBLIC_UPLOAD_BASE =
  process.env.STORAGE_PUBLIC_BASE ??
  process.env.NEXT_PUBLIC_UPLOAD_BASE ??
  process.env.UPLOADS_PUBLIC_PREFIX ??
  "/uploads";
const PUBLIC_UPLOAD_PREFIX = RAW_PUBLIC_UPLOAD_BASE.trim().replace(/\/+$/, "") || "/uploads";
const LEGACY_FORMAT_NORMALIZATION = new Map<string, string>([["Exposicion", "Exposición"]]);
const REMOVAL_MARKERS = ["__removed__", "-eliminado-", "-eliminada-"];

type AlbumWithRelations = Prisma.GalleryAlbumGetPayload<{
  include: {
    images: true;
    tags: true;
    collaborators: { include: { user: true } };
  };
}>;

type ImageRecord = Prisma.GalleryImageGetPayload<{
  include?: { album?: true; uploader?: true };
}>;

export function storagePathMarkedAsRemoved(storagePath: string | null | undefined) {
  if (!storagePath) {
    return false;
  }
  const normalized = storagePath.toLowerCase();
  return REMOVAL_MARKERS.some((marker) => normalized.includes(marker));
}

function joinBaseAndPath(base: string, value: string) {
  const trimmedBase = base.replace(/\/+$/, "");
  const trimmedValue = value.replace(/^\/+/, "");
  return `${trimmedBase}/${trimmedValue}`;
}

function toPublicPath(storagePath: string | null | undefined) {
  if (!storagePath) {
    return null;
  }
  if (/^https?:\/\//i.test(storagePath)) {
    return storagePath;
  }
  if (storagePath.startsWith("/")) {
    return storagePath;
  }
  const normalized = storagePath.replace(/^\/+/, "");
  if (PUBLIC_UPLOAD_PREFIX.endsWith("/uploads") && normalized.startsWith("uploads/")) {
    return joinBaseAndPath(PUBLIC_UPLOAD_PREFIX, normalized.slice("uploads/".length));
  }
  return joinBaseAndPath(PUBLIC_UPLOAD_PREFIX, normalized);
}

export function mapImage(record: ImageRecord): GalleryImage {
  const src = toPublicPath(record.storagePath) ?? "";
  const takenAt = record.takenAt ? record.takenAt.toISOString().slice(0, 10) : undefined;
  const altBase = record.altText ?? record.title ?? "Imagen sin descripcion";

  return {
    id: record.id,
    src, 
    storagePath: record.storagePath,
    alt: altBase,
    width: record.width ?? DEFAULT_IMAGE_WIDTH,
    height: record.height ?? DEFAULT_IMAGE_HEIGHT,
    createdAt: record.createdAt.toISOString(),
    title: record.title ?? undefined,
    takenAt,
    location: record.location ?? undefined,
    likes: record.likesCount ?? 0,
    comments: [],
  };
}

export function mapAlbum(record: AlbumWithRelations): GalleryAlbum {
  const activeImages = record.images.filter((image) => !storagePathMarkedAsRemoved(image.storagePath));
  const images = activeImages
    .slice()
    .sort((a, b) => {
      const posA = a.position ?? 0;
      const posB = b.position ?? 0;
      if (posA === posB) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return posA - posB;
    })
    .map(mapImage);

  const resolvedCoverPath = storagePathMarkedAsRemoved(record.coverImagePath) ? null : record.coverImagePath;
  const coverImage = toPublicPath(resolvedCoverPath) ?? (images[0] ? images[0].src : null);

  const totalPhotos = images.length;

  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    date: record.displayDate ?? record.dateISO ?? null,
    dateISO: record.dateISO ?? null,
    location: record.location ?? null,
    description: record.description ?? null,
    coverImage,
    totalPhotos,
    tags: record.tags.map((tag) => tag.label),
    facets: {
      year: record.facetYear,
      game: record.facetGame,
      format: LEGACY_FORMAT_NORMALIZATION.get(record.facetFormat) ?? record.facetFormat,
    },
    images,
    albumComments: [],
    collaborators: record.collaborators.map((collaboration) => ({
      id: String(collaboration.userId),
      name: collaboration.user?.name ?? collaboration.user?.nick ?? "Colaborador",
    })),
  };
}

export function mapStandaloneImage(record: ImageRecord): GalleryStandalonePhoto {
  const image = mapImage(record);
  const year =
    image.takenAt?.slice(0, 4) ??
    (Number.isFinite(Date.parse(image.createdAt)) ? new Date(image.createdAt).getFullYear().toString() : new Date().getFullYear().toString());
  return {
    id: record.id,
    image,
    facets: {
      year,
      game: "General",
      format: "Otros",
    },
  };
}






