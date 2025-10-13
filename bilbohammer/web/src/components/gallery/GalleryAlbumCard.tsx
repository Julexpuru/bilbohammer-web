import Image from "next/image";
import clsx from "clsx";
import type { GalleryAlbum } from "@/components/gallery/types";

type GalleryAlbumCardProps = {
  album: GalleryAlbum;
  onSelect: () => void;
  variant?: "default" | "condensed";
};

export function GalleryAlbumCard({ album, onSelect, variant = "default" }: GalleryAlbumCardProps) {
  const isCondensed = variant === "condensed";
  const displayDate = album.date ?? "Fecha por confirmar";
  const displayLocation = album.location ?? "Ubicacion por confirmar";
  const displayDescription = album.description ?? "Sin descripcion disponible.";

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--card)] text-left shadow transition hover:-translate-y-1 hover:border-[var(--border)] hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {album.coverImage ? (
          <Image
            src={album.coverImage}
            alt={album.title}
            fill
            sizes="(min-width: 1280px) 320px, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--muted)]">Sin imagen</div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="space-y-2">
          <span className="badge uppercase tracking-[0.2em]">{album.facets.game}</span>
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
            {album.facets.format} - {displayDate}
          </p>
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-semibold leading-tight text-[var(--text)]">{album.title}</h3>
          <p className="text-sm text-[var(--muted)]">{displayLocation}</p>
        </div>

        {!isCondensed && (
          <>
            <p className="text-sm text-[var(--muted)]">{displayDescription}</p>
            <div className="flex flex-wrap gap-2">
              {album.tags.map((tag) => (
                <span key={tag} className="badge">
                  {tag}
                </span>
              ))}
            </div>
          </>
        )}

        <div
          className={clsx(
            "mt-auto flex items-center text-sm font-medium",
            isCondensed ? "justify-start gap-2 text-[var(--accent-600)]" : "justify-between text-[var(--muted)]"
          )}
        >
          {!isCondensed && <span>{album.totalPhotos} fotos</span>}
          <span className="inline-flex items-center gap-2">
            Ver album
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-4 w-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12l-7.5 7.5M21 12H3" />
            </svg>
          </span>
        </div>
      </div>
    </button>
  );
}
