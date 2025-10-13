export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlbumDetailView } from "@/components/gallery/AlbumDetailView";
import { auth } from "@/lib/auth";
import { userCanEditAlbum } from "@/lib/roles";
import { fetchAlbumBySlug } from "@/lib/gallery/queries";

export async function generateMetadata({ params }: { params: { albumId: string } }): Promise<Metadata> {
  const album = await fetchAlbumBySlug(params.albumId);
  if (!album) {
    return {
      title: "Album no encontrado - Galeria Bilbohammer",
      description: "El album solicitado no existe o ha sido retirado.",
    };
  }

  return {
    title: `${album.title} - Galeria Bilbohammer`,
    description: album.description ?? undefined,
  };
}

export default async function AlbumPage({ params }: { params: { albumId: string } }) {
  const session = await auth();
  const album = await fetchAlbumBySlug(params.albumId);
  if (!album) {
    notFound();
  }

  const collaboratorIds = album.collaborators?.map((collaborator) => collaborator.id) ?? [];
  const editAccess = userCanEditAlbum(session, collaboratorIds);

  return <AlbumDetailView album={album} editAccess={editAccess} />;
}

