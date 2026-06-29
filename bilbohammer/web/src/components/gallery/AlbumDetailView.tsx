'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GalleryContentUploader, GalleryUploaderCompletePayload } from "@/components/gallery/GalleryContentUploader";
import { GalleryViewer } from "@/components/gallery/GalleryViewer";
import { GalleryShareButtons } from "@/components/gallery/GalleryShareButtons";
import type { GalleryAlbum, GalleryImage, GalleryViewerEntry } from "@/components/gallery/types";

type AlbumDetailViewProps = {
  album: GalleryAlbum;
  editAccess?: "none" | "edit" | "admin";
};

const heartIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733C11.285 4.876 9.623 3.75 7.688 3.75 5.099 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
    />
  </svg>
);

const commentIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m4.5 7.5-3-3H8.25A2.25 2.25 0 0 1 6 13.5v-6A2.25 2.25 0 0 1 8.25 5.25h7.5A2.25 2.25 0 0 1 18 7.5v6a2.25 2.25 0 0 1-2.25 2.25H15Z" />
  </svg>
);

const DEFAULT_IMAGE_WIDTH = 1600;
const DEFAULT_IMAGE_HEIGHT = 1067;
const PLACEHOLDER_IMAGE_SRC = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

type PreparedAlbumImage = {
  image: GalleryImage;
  usesPlaceholder: boolean;
};

function normalizeImageSrc(src?: string | null) {
  if (!src) {
    return null;
  }
  const trimmed = src.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (/^[a-z][a-z0-9+\-.]*:/i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  const withoutTraversal = trimmed.replace(/^(\.\.\/)+/, "").replace(/^(\.\/)+/, "");
  const sanitized = withoutTraversal.replace(/^\/+/, "");
  if (sanitized.length === 0) {
    return null;
  }
  return `/${sanitized}`;
}

function prepareAlbumImage(image: GalleryImage, fallbackSrc: string | null | undefined, index: number): PreparedAlbumImage {
  const normalizedSrc = normalizeImageSrc(image.src);
  const normalizedFallback = normalizeImageSrc(fallbackSrc);
  const finalSrc = normalizedSrc ?? normalizedFallback ?? PLACEHOLDER_IMAGE_SRC;
  const fallbackTitle = image.title ?? `Foto ${index + 1}`;
  const altCandidate = typeof image.alt === "string" && image.alt.trim().length > 0 ? image.alt : fallbackTitle;
  const width = typeof image.width === "number" && Number.isFinite(image.width) ? image.width : DEFAULT_IMAGE_WIDTH;
  const height = typeof image.height === "number" && Number.isFinite(image.height) ? image.height : DEFAULT_IMAGE_HEIGHT;

  return {
    image: {
      ...image,
      src: finalSrc,
      alt: altCandidate,
      width,
      height,
    },
    usesPlaceholder: finalSrc === PLACEHOLDER_IMAGE_SRC,
  };
}

export function AlbumDetailView({ album, editAccess = "none" }: AlbumDetailViewProps) {
  const router = useRouter();
  const [albumData, setAlbumData] = useState<GalleryAlbum>(album);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setAlbumData(album);
  }, [album]);

  const preparedImages = useMemo<PreparedAlbumImage[]>(
    () => albumData.images.map((image, index) => prepareAlbumImage(image, albumData.coverImage, index)),
    [albumData]
  );

  const entries: GalleryViewerEntry[] = useMemo(
    () =>
      preparedImages.map((prepared) => ({
        album: albumData,
        image: prepared.image,
        kind: "album" as const,
      })),
    [albumData, preparedImages]
  );

  const lastIndex = entries.length > 0 ? entries.length - 1 : 0;
  const viewerIndex = lightboxIndex < 0 ? 0 : Math.min(lightboxIndex, lastIndex);
  const viewerOpen = lightboxIndex >= 0 && entries.length > 0;
  const canEdit = editAccess !== "none";

  const handleUploaderComplete = (payload: GalleryUploaderCompletePayload) => {
    if (payload.kind === "album") {
      setAlbumData(payload.album);
      setEditorOpen(false);
      router.refresh();
    }
  };

  const handleDelete = async () => {
    if (!canEdit) return;
    if (!window.confirm("¿Seguro que quieres eliminar este álbum?")) {
      return;
    }
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/gallery/${albumData.slug}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("No se pudo eliminar el álbum");
      }
      router.push("/galeria");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("No se pudo eliminar el álbum. Inténtalo de nuevo.");
      setIsDeleting(false);
    }
  };

  const handleOpen = (index: number) => {
    if (entries.length === 0) return;
    setLightboxIndex(Math.max(0, Math.min(index, lastIndex)));
  };

  const handleClose = () => setLightboxIndex(-1);

  const handleNext = () => {
    setLightboxIndex((current) => {
      if (current < 0) return 0;
      return Math.min(current + 1, lastIndex);
    });
  };

  const handlePrev = () => {
    setLightboxIndex((current) => {
      if (current < 0) return 0;
      return Math.max(current - 1, 0);
    });
  };

  const handleSelect = (index: number) => {
    setLightboxIndex(Math.max(0, Math.min(index, lastIndex)));
  };

  const commentSection = albumData.albumComments.length > 0 && (
    <section className="space-y-4 rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-8 shadow-sm">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Comentarios del álbum</p>
        <h2 className="text-2xl font-semibold text-[var(--text)]">Reacción de la comunidad</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {albumData.albumComments.map((comment) => {
          const displayDate =
            comment.formattedDate ?? (comment.createdAt ? new Date(comment.createdAt).toLocaleDateString("es-ES") : "");
          return (
            <article
              key={comment.id}
              className="flex flex-col gap-2 rounded-2xl border border-[var(--hairline)] bg-[var(--bg)] p-4"
            >
              <header className="flex items-center justify-between text-sm text-[var(--muted)]">
                <span className="font-medium text-[var(--text)]">{comment.author}</span>
                <time className="text-xs" dateTime={comment.createdAt ?? undefined}>
                  {displayDate}
                </time>
              </header>
              <p className="text-sm text-[var(--muted)]">{comment.message ?? comment.body ?? ""}</p>
            </article>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="space-y-12">
      <header className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-[var(--hairline)] bg-black">
          {albumData.coverImage ? (
            <Image src={albumData.coverImage} alt={albumData.title} fill sizes="(min-width: 1024px) 640px, 100vw" className="object-contain" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--muted)]">Sin portada</div>
          )}
        </div>
        <div className="space-y-5 rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-8 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                {albumData.facets.year} - {albumData.facets.game} - {albumData.facets.format}
              </p>
              <h1 className="text-3xl font-semibold text-[var(--text)]">{albumData.title}</h1>
              <p className="text-sm text-[var(--muted)]">
                {albumData.date ?? "Fecha por confirmar"} - {albumData.location ?? "Ubicación por confirmar"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <GalleryShareButtons
                slug={albumData.slug}
                title={albumData.title}
                summary={albumData.description ?? undefined}
                appearance="light"
              />
              {canEdit && (
                <>
                  <button
                    type="button"
                    onClick={() => setEditorOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)] bg-[var(--accent-50)] px-4 py-2 text-sm font-medium text-[var(--accent-600)] transition hover:border-[var(--accent-600)] hover:bg-[var(--accent-100)]"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeleting ? "Eliminando..." : "Eliminar"}
                  </button>
                </>
              )}
            </div>
          </div>
          <p className="text-sm leading-relaxed text-[var(--muted)]">{albumData.description ?? "Sin descripción disponible."}</p>
          <dl className="flex flex-wrap gap-4 text-xs text-[var(--muted)]">
            <div className="flex flex-col rounded-2xl border border-[var(--hairline)] bg-[var(--bg)] px-4 py-3">
              <dt className="uppercase tracking-[0.2em]">Total fotos</dt>
              <dd className="text-lg font-semibold text-[var(--text)]">{albumData.totalPhotos}</dd>
            </div>
            <div className="flex flex-col rounded-2xl border border-[var(--hairline)] bg-[var(--bg)] px-4 py-3">
              <dt className="uppercase tracking-[0.2em]">Colaboradores</dt>
              <dd className="text-lg font-semibold text-[var(--text)]">{albumData.collaborators?.length ?? 0}</dd>
            </div>
          </dl>
          {albumData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {albumData.tags.map((tag) => (
                <span key={tag} className="badge">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {commentSection}

      <section className="space-y-4">
        <div>
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Galería del álbum</p>
        <h2 className="text-2xl font-semibold text-[var(--text)]">{albumData.totalPhotos} fotografías individuales</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Haz clic en cualquier foto para verla en detalle, revisar los comentarios asociados y navegar por la galería.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {preparedImages.map(({ image: preparedImage, usesPlaceholder }, index) => {
            const photoTitle = preparedImage.title ?? `Foto ${index + 1}`;
            const photoAlt = preparedImage.alt || photoTitle;
            const locationLabel = preparedImage.location ?? "Ubicación no indicada";
            const takenAtLabel = preparedImage.takenAt ?? "Fecha no indicada";

            return (
              <button
                key={`${albumData.id}-${index}`}
                type="button"
                onClick={() => handleOpen(index)}
                className="group relative overflow-hidden rounded-3xl border border-[var(--hairline)] bg-black shadow transition hover:-translate-y-1 hover:border-[var(--border)]"
                aria-label={`Abrir ${photoTitle}`}
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={preparedImage.src}
                    alt={photoAlt}
                    fill
                    priority={index < 2}
                    sizes="(min-width: 1600px) 280px, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover transition duration-300 group-hover:scale-105"
                  />
                  {usesPlaceholder && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg)] text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Imagen no disponible
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-4 pt-12 text-left text-white">
                    <div className="space-y-1 text-xs uppercase tracking-[0.2em] text-white/70">
                      <span>
                        {takenAtLabel}  {locationLabel}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold leading-tight">{photoTitle}</h3>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/80">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
                        {heartIcon}
                        {preparedImage.likes}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
                        {commentIcon}
                        {preparedImage.comments.length}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {viewerOpen && (
        <GalleryViewer
          entries={entries}
          activeIndex={viewerIndex}
          onClose={handleClose}
          onNext={handleNext}
          onPrev={handlePrev}
          onSelectIndex={handleSelect}
        />
      )}

      {canEdit && (
        <GalleryContentUploader
          open={editorOpen}
          initialMode="album"
          initialAlbum={albumData}
          onClose={() => setEditorOpen(false)}
          onComplete={handleUploaderComplete}
        />
      )}
    </div>
  );
}



