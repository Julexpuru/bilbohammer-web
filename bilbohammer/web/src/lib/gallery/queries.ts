import prisma from "@/lib/prisma";
import { mapAlbum, mapStandaloneImage, storagePathMarkedAsRemoved } from "@/lib/gallery/mappers";

export async function fetchGalleryOverview() {
  const [albumRecords, standaloneRecords] = await Promise.all([
    prisma.galleryAlbum.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        images: true,
        tags: true,
        collaborators: { include: { user: true } },
      },
    }),
    prisma.galleryImage.findMany({
      where: { albumId: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const albums = albumRecords
    .filter(
      (album) =>
        !storagePathMarkedAsRemoved(album.slug) &&
        !storagePathMarkedAsRemoved(album.title)
    )
    .map(mapAlbum);

  const standalonePhotos = standaloneRecords
    .filter((record) => !storagePathMarkedAsRemoved(record.storagePath))
    .map(mapStandaloneImage);

  return {
    albums,
    standalonePhotos,
    featuredAlbums: albums.slice(0, 5),
    featuredPhotos: albums
      .slice(0, 5)
      .flatMap((album) =>
        album.images.slice(0, 1).map((image) => ({ album, image, kind: "album" as const }))
      ),
    heroImages: albums.flatMap((album) => album.images.filter((image) => image.width >= 1280)),
  };
}

export async function fetchAlbumBySlug(slug: string) {
  const albumRecord = await prisma.galleryAlbum.findUnique({
    where: { slug },
    include: {
      images: true,
      tags: true,
      collaborators: { include: { user: true } },
    },
  });

  return albumRecord ? mapAlbum(albumRecord) : null;
}

export async function fetchAlbumSlugs() {
  const albums = await prisma.galleryAlbum.findMany({
    select: { slug: true },
  });
  return albums.map((album) => album.slug);
}
