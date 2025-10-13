export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { userCanManageGallery } from "@/lib/roles";
import { GalleryPageContent } from "@/components/gallery/GalleryPageContent";
import { fetchGalleryOverview } from "@/lib/gallery/queries";

export default async function GalleryPage() {
  const session = await auth();
  const canUpload = userCanManageGallery(session);
  const { albums, standalonePhotos, heroImages } = await fetchGalleryOverview();

  return (
    <GalleryPageContent
      albums={albums}
      standalonePhotos={standalonePhotos}
      heroImages={heroImages}
      canUpload={canUpload}
    />
  );
}
