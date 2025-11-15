'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import clsx from "clsx";
import { GalleryAlbumCard } from "@/components/gallery/GalleryAlbumCard";
import { GalleryFilters } from "@/components/gallery/GalleryFilters";
import { GalleryViewer, StandalonePhotoEditPayload } from "@/components/gallery/GalleryViewer";
import { GalleryContentUploader, GalleryUploaderCompletePayload } from "@/components/gallery/GalleryContentUploader";
import type {
  GalleryAlbum,
  GalleryStandalonePhoto,
  GalleryViewerEntry,
  GalleryImage,
} from "@/components/gallery/types";

type GalleryPageContentProps = {
  albums: GalleryAlbum[];
  standalonePhotos: GalleryStandalonePhoto[];
  heroImages: GalleryImage[];
  canUpload: boolean;
};

type GalleryHeroProps = {
  images: GalleryImage[];
  albumCount: number;
  photoCount: number;
};

type HighlightCandidate =
  | { kind: "album"; album: GalleryAlbum; preview: GalleryImage; game: string; baseScore: number }
  | { kind: "photo"; photo: GalleryStandalonePhoto; preview: GalleryImage; game: string; baseScore: number };

type CombinedItem =
  | { kind: "album"; album: GalleryAlbum; score: number }
  | { kind: "photo"; photo: GalleryStandalonePhoto; score: number };

function pickNextIndex(current: number, total: number) {
  if (total <= 1) return current;
  let next = current;
  while (next === current) {
    next = Math.floor(Math.random() * total);
  }
  return next;
}

function getTimestamp(value?: string | null) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function computeRecencyWeight(primary?: string | null, secondary?: string | null) {
  const now = Date.now();
  const timestamp = getTimestamp(primary) ?? getTimestamp(secondary);
  if (!timestamp) {
    return 0.3;
  }
  const diffDays = Math.max(0, (now - timestamp) / 86_400_000);
  return 1 / (1 + diffDays / 30);
}

function computeReactionWeight(likes: number, comments: number) {
  const reaction = likes + comments * 2;
  return Math.log10(1 + reaction) + (reaction > 0 ? 0.35 : 0);
}

function calculateAlbumMetrics(album: GalleryAlbum) {
  const primaryImage = album.images[0];
  const recency = computeRecencyWeight(album.dateISO, primaryImage?.takenAt ?? primaryImage?.createdAt);
  const likes = album.images.reduce((total, image) => total + (image.likesCount ?? image.likes ?? 0), 0);
  const comments = album.images.reduce((total, image) => total + image.comments.length, 0);
  const reactions = computeReactionWeight(likes, comments);
  const score = recency * 0.6 + reactions * 0.4 + 0.25;
  return { recency, reactions, score, preview: primaryImage };
}

function calculatePhotoMetrics(photo: GalleryStandalonePhoto) {
  const recency = computeRecencyWeight(photo.image.takenAt, photo.image.createdAt);
  const reactions = computeReactionWeight(photo.image.likesCount ?? photo.image.likes ?? 0, photo.image.comments.length);
  const score = recency * 0.6 + reactions * 0.4 + 0.2;
  return { recency, reactions, score, preview: photo.image };
}

function buildHighlightCandidates(albums: GalleryAlbum[], photos: GalleryStandalonePhoto[]) {
  const candidates: HighlightCandidate[] = [];

  for (const album of albums) {
    if (album.images.length === 0) continue;
    const metrics = calculateAlbumMetrics(album);
    if (!metrics.preview) continue;
    candidates.push({
      kind: "album",
      album,
      preview: metrics.preview,
      game: album.facets.game,
      baseScore: metrics.score + Math.random() * 0.15,
    });
  }

  for (const photo of photos) {
    const metrics = calculatePhotoMetrics(photo);
    candidates.push({
      kind: "photo",
      photo,
      preview: metrics.preview,
      game: photo.facets.game,
      baseScore: metrics.score + Math.random() * 0.15,
    });
  }

  return candidates;
}

function selectHighlights(candidates: HighlightCandidate[], maxItems: number) {
  const limit = Math.min(maxItems, candidates.length);
  if (limit === 0) {
    return [];
  }

  const selected: HighlightCandidate[] = [];
  const usedIds = new Set<string>();
  const gameUsage = new Map<string, number>();

  while (selected.length < limit) {
    let bestCandidate: HighlightCandidate | null = null;
    let bestScore = -Infinity;

    for (const candidate of candidates) {
      const identifier = candidate.kind === "album" ? candidate.album.id : candidate.photo.id;
      if (usedIds.has(identifier)) {
        continue;
      }

      const gameCount = gameUsage.get(candidate.game) ?? 0;
      const varietyFactor = Math.pow(0.85, gameCount);
      const jitter = 1 + Math.random() * 0.25;
      const adjustedScore = candidate.baseScore * varietyFactor * jitter;

      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestCandidate = candidate;
      }
    }

    if (!bestCandidate) {
      break;
    }

    selected.push(bestCandidate);
    const id = bestCandidate.kind === "album" ? bestCandidate.album.id : bestCandidate.photo.id;
    usedIds.add(id);
    gameUsage.set(bestCandidate.game, (gameUsage.get(bestCandidate.game) ?? 0) + 1);
  }

  return selected;
}

function GalleryHero({ images, albumCount, photoCount }: GalleryHeroProps) {
  const [activeIndex, setActiveIndex] = useState(() => (images.length > 0 ? Math.floor(Math.random() * images.length) : 0));
  const [visibleIndex, setVisibleIndex] = useState(activeIndex);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = window.setInterval(() => {
      setActiveIndex((current) => pickNextIndex(current, images.length));
    }, 30000);
    return () => window.clearInterval(id);
  }, [images.length]);

  useEffect(() => {
    setVisibleIndex(activeIndex);
  }, [activeIndex]);

  const heroImage = images[visibleIndex];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--card)] shadow-lg">
      {heroImage && (
        <Image
          key={heroImage.src}
          src={heroImage.src}
          alt={heroImage.alt}
          fill
          priority
          className="object-cover opacity-25 contrast-125 saturate-125 transition-opacity duration-700"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/80" aria-hidden />
      <div className="relative z-10 flex flex-col gap-8 px-8 py-12 sm:px-12 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Galeria Bilbohammer</p>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">Explora la galeria</h1>
          <p className="text-sm text-white/80">
            Un primer vistazo a como lucieron los albums, torneos y eventos especiales del club. Esta vista de prueba
            mezcla imagenes existentes mientras definimos la gestion y rotacion.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-white/80 sm:max-w-xs">
          <div className="rounded-2xl border border-white/15 bg-white/5 p-4 text-center">
            <dt className="text-xs uppercase tracking-[0.25em] text-white/60">Albums</dt>
            <dd className="text-2xl font-semibold">{albumCount}</dd>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-4 text-center">
            <dt className="text-xs uppercase tracking-[0.25em] text-white/60">Fotos totales</dt>
            <dd className="text-2xl font-semibold">{photoCount}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

type StandalonePhotoCardProps = {
  photo: GalleryStandalonePhoto;
  onSelect: () => void;
  variant?: "default" | "compact";
};

function StandalonePhotoCard({ photo, onSelect, variant = "default" }: StandalonePhotoCardProps) {
  const { image } = photo;
  const isCompact = variant === "compact";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--card)] text-left shadow transition hover:-translate-y-1 hover:border-[var(--border)] hover:shadow-lg",
        isCompact && "shadow-sm hover:-translate-y-0.5"
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="(min-width: 1280px) 320px, (min-width: 768px) 50vw, 100vw"
        />
        <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
          Foto
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">{photo.facets.game}</p>
          <h3 className="text-xl font-semibold leading-tight text-[var(--text)]">{image.title ?? "Sin titulo"}</h3>
          <p className="text-sm text-[var(--muted)]">
            {image.takenAt ?? "Fecha por confirmar"} - {image.location ?? "Ubicacion no indicada"}
          </p>
        </div>
        <div className="mt-auto text-sm text-[var(--muted)]">
          {image.likes} me gusta - {image.comments.length} comentarios
        </div>
      </div>
    </button>
  );
}

type HighlightsGridProps = {
  items: HighlightCandidate[];
  onSelectAlbum: (album: GalleryAlbum) => void;
  onSelectPhoto: (photo: GalleryStandalonePhoto) => void;
};

function HighlightsGrid({ items, onSelectAlbum, onSelectPhoto }: HighlightsGridProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Destacados</p>
        <h2 className="text-2xl font-semibold text-[var(--text)]">Lo que no puedes perderte</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {items.map((item) =>
          item.kind === "album" ? (
            <div key={`highlight-album-${item.album.id}`} className="relative">
              <span className="absolute left-3 top-3 z-10 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                Album
              </span>
              <GalleryAlbumCard album={item.album} onSelect={() => onSelectAlbum(item.album)} variant="condensed" />
            </div>
          ) : (
            <StandalonePhotoCard
              key={`highlight-photo-${item.photo.id}`}
              photo={item.photo}
              variant="compact"
              onSelect={() => onSelectPhoto(item.photo)}
            />
          )
        )}
      </div>
    </section>
  );
}

export function GalleryPageContent({
  albums,
  standalonePhotos,
  heroImages,
  canUpload,
}: GalleryPageContentProps) {
  const [albumStore, setAlbumStore] = useState<GalleryAlbum[]>(albums);
  const [standaloneStore, setStandaloneStore] = useState<GalleryStandalonePhoto[]>(standalonePhotos);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [tagQuery, setTagQuery] = useState("");
  const [viewerEntries, setViewerEntries] = useState<GalleryViewerEntry[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [uploaderOpen, setUploaderOpen] = useState(false);

  const heroImageStore = useMemo(() => {
    const seen = new Set<string>();
    const collected: GalleryImage[] = [];

    for (const album of albumStore) {
      for (const image of album.images) {
        if (image.width >= 1280 && !seen.has(image.id)) {
          seen.add(image.id);
          collected.push(image);
        }
      }
    }

    for (const photo of standaloneStore) {
      if (!seen.has(photo.image.id)) {
        seen.add(photo.image.id);
        collected.push(photo.image);
      }
    }

    if (collected.length === 0) {
      return heroImages;
    }
    return collected;
  }, [albumStore, standaloneStore, heroImages]);

  const albumCount = albumStore.length;
  const totalPhotos = useMemo(() => {
    const albumPhotos = albumStore.reduce((total, album) => total + album.images.length, 0);
    return albumPhotos + standaloneStore.length;
  }, [albumStore, standaloneStore]);

  const highlightItems = useMemo(() => {
    const candidates = buildHighlightCandidates(albumStore, standaloneStore);
    return selectHighlights(candidates, 8);
  }, [albumStore, standaloneStore]);

  const filterGroups = useMemo(() => {
    const yearMap = new Map<string, number>();
    const gameMap = new Map<string, number>();
    const formatMap = new Map<string, number>();

    for (const album of albumStore) {
      yearMap.set(album.facets.year, (yearMap.get(album.facets.year) ?? 0) + 1);
      gameMap.set(album.facets.game, (gameMap.get(album.facets.game) ?? 0) + 1);
      formatMap.set(album.facets.format, (formatMap.get(album.facets.format) ?? 0) + 1);
    }

    for (const photo of standaloneStore) {
      yearMap.set(photo.facets.year, (yearMap.get(photo.facets.year) ?? 0) + 1);
      gameMap.set(photo.facets.game, (gameMap.get(photo.facets.game) ?? 0) + 1);
      formatMap.set(photo.facets.format, (formatMap.get(photo.facets.format) ?? 0) + 1);
    }

    const toOptions = (entries: [string, number][], sort: (a: [string, number], b: [string, number]) => number) =>
      entries.slice().sort(sort).map(([value, count]) => ({ id: value, label: value, count }));

    const yearOptions = toOptions(Array.from(yearMap.entries()), (a, b) => Number(b[0]) - Number(a[0]));
    const gameOptions = toOptions(Array.from(gameMap.entries()), (a, b) => a[0].localeCompare(b[0]));
    const formatOptions = toOptions(Array.from(formatMap.entries()), (a, b) => a[0].localeCompare(b[0]));

    return [
      { id: "year", title: "Año", options: yearOptions },
      { id: "game", title: "Juego", options: gameOptions },
      { id: "format", title: "Formato", options: formatOptions },
    ];
  }, [albumStore, standaloneStore]);

  const activeFilterList = useMemo(() => Array.from(activeFilters), [activeFilters]);
  const isFiltering = activeFilterList.length > 0 || tagQuery.trim().length > 0;

  const filteredAlbums = useMemo(() => {
    const query = tagQuery.trim().toLowerCase();
    return albumStore.filter((album) => {
      const matchesFilters = activeFilterList.every((filterId) => {
        const [group, value] = filterId.split("::");
        if (group === "year") return album.facets.year === value;
        if (group === "game") return album.facets.game === value;
        if (group === "format") return album.facets.format === value;
        return true;
      });

      if (!matchesFilters) return false;
      if (query.length === 0) return true;

      const haystack = [album.title, album.description, album.location, ...album.tags].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [albumStore, activeFilterList, tagQuery]);

  const filteredStandalone = useMemo(() => {
    const query = tagQuery.trim().toLowerCase();
    return standaloneStore.filter((photo) => {
      const matchesFilters = activeFilterList.every((filterId) => {
        const [group, value] = filterId.split("::");
        if (group === "year") return photo.facets.year === value;
        if (group === "game") return photo.facets.game === value;
        if (group === "format") return photo.facets.format === value;
        return true;
      });

      if (!matchesFilters) return false;
      if (query.length === 0) return true;

      const haystack = [photo.image.title ?? "", photo.image.location ?? "", photo.image.alt]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [standaloneStore, activeFilterList, tagQuery]);

  const combinedResults = useMemo<CombinedItem[]>(() => {
    const albumItems: CombinedItem[] = filteredAlbums.map((album) => ({
      kind: "album",
      album,
      score: calculateAlbumMetrics(album).score + Math.random() * 0.05,
    }));

    const photoItems: CombinedItem[] = filteredStandalone.map((photo) => ({
      kind: "photo",
      photo,
      score: calculatePhotoMetrics(photo).score + Math.random() * 0.05,
    }));

    return [...albumItems, ...photoItems].sort((a, b) => b.score - a.score);
  }, [filteredAlbums, filteredStandalone]);

  const totalItems = albumStore.length + standaloneStore.length;
  const listSummary = isFiltering
    ? `${combinedResults.length} resultado${combinedResults.length === 1 ? "" : "s"} filtrado${combinedResults.length === 1 ? "" : "s"} de ${totalItems} elementos - ${totalPhotos} fotos en total`
    : `${totalItems} elemento${totalItems === 1 ? "" : "s"} disponibles - ${totalPhotos} fotos en total`;

  const viewerLastIndex = viewerEntries.length > 0 ? viewerEntries.length - 1 : 0;
  const viewerOpen = viewerEntries.length > 0;

  const closeViewer = useCallback(() => {
    setViewerEntries([]);
    setViewerIndex(0);
  }, []);

  const openAlbum = useCallback((album: GalleryAlbum, imageIndex = 0) => {
    const entries = album.images.map((image) => ({ album, image, kind: "album" as const }));
    setViewerEntries(entries);
    const safeIndex = Math.max(0, Math.min(imageIndex, entries.length - 1));
    setViewerIndex(safeIndex);
  }, []);

  const openStandalone = useCallback(
    (photo: GalleryStandalonePhoto, collection: GalleryStandalonePhoto[] = filteredStandalone) => {
      if (collection.length === 0) {
        const singleEntry = [{ album: undefined, image: photo.image, kind: "standalone" as const }];
        setViewerEntries(singleEntry);
        setViewerIndex(0);
        return;
      }
      const entries = collection.map((item) => ({ album: undefined, image: item.image, kind: "standalone" as const }));
      setViewerEntries(entries);
      const index = collection.findIndex((item) => item.image.id === photo.image.id);
      setViewerIndex(index >= 0 ? index : 0);
    },
    [filteredStandalone]
  );

  const openFeaturedEntry = useCallback(
    (candidate: HighlightCandidate) => {
      if (candidate.kind === "album") {
        const imageIndex = candidate.album.images.findIndex((image) => image.id === candidate.preview.id);
        openAlbum(candidate.album, imageIndex >= 0 ? imageIndex : 0);
      } else {
        openStandalone(candidate.photo);
      }
    },
    [openAlbum, openStandalone]
  );

  const handleNext = () => {
    setViewerIndex((current) => Math.min(current + 1, viewerLastIndex));
  };

  const handlePrev = () => {
    setViewerIndex((current) => Math.max(current - 1, 0));
  };

  const handleSelectIndex = (index: number) => {
    const safeIndex = Math.max(0, Math.min(index, viewerLastIndex));
    setViewerIndex(safeIndex);
  };

  const handleToggleFilter = (id: string) => {
    setActiveFilters((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClearFilters = () => {
    setActiveFilters(new Set());
    setTagQuery("");
  };

  const handleUploaderComplete = (payload: GalleryUploaderCompletePayload) => {
    setUploaderOpen(false);

    if (payload.kind === "album") {
      setAlbumStore((current) => {
        const deduped = current.filter((album) => album.id !== payload.album.id);
        return [payload.album, ...deduped];
      });

      if (payload.album.images.length > 0) {
        const entries = payload.album.images.map((image) => ({
          album: payload.album,
          image,
          kind: "album" as const,
        }));
        setViewerEntries(entries);
        setViewerIndex(0);
      }
      return;
    }

    if (payload.photos.length > 0) {
      setStandaloneStore((current) => [...payload.photos, ...current]);
      const entries = payload.photos.map((photo) => ({
        album: undefined,
        image: photo.image,
        kind: "standalone" as const,
      }));
      setViewerEntries(entries);
      setViewerIndex(0);
    }
  };

  const handleStandaloneEdit = useCallback(
    async (image: GalleryImage, payload: StandalonePhotoEditPayload) => {
      const response = await fetch(`/api/gallery/photos/${encodeURIComponent(image.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "No se pudo guardar los cambios de la foto.");
      }

      const result = (await response.json()) as { photo: GalleryStandalonePhoto };
      const updated = result.photo;

      setStandaloneStore((current) =>
        current.map((photo) => (photo.image.id === image.id ? updated : photo))
      );

      setViewerEntries((current) =>
        current.map((entry) =>
          entry.kind === "standalone" && entry.image.id === image.id
            ? { ...entry, image: updated.image }
            : entry
        )
      );
    },
    []
  );

  const handleStandaloneDelete = useCallback(async (image: GalleryImage) => {
    const response = await fetch(`/api/gallery/photos/${encodeURIComponent(image.id)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || "No se pudo eliminar la foto.");
    }

    setStandaloneStore((current) => current.filter((photo) => photo.image.id !== image.id));

    setViewerEntries((current) => {
      const filtered = current.filter(
        (entry) => !(entry.kind === "standalone" && entry.image.id === image.id)
      );
      if (filtered.length === 0) {
        setViewerIndex(0);
        return [];
      }
      setViewerIndex((prev) => Math.min(prev, filtered.length - 1));
      return filtered;
    });
  }, []);

  return (
    <div className="space-y-12">
      <GalleryHero images={heroImageStore} albumCount={albumCount} photoCount={totalPhotos} />

      <HighlightsGrid
        items={highlightItems}
        onSelectAlbum={openAlbum}
        onSelectPhoto={(photo) => openStandalone(photo, standaloneStore)}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        <GalleryFilters
          groups={filterGroups}
          activeFilters={activeFilters}
          tagQuery={tagQuery}
          onTagQueryChange={setTagQuery}
          onToggle={handleToggleFilter}
          onClear={handleClearFilters}
        />

        <div className="space-y-10">
          <section className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Listado principal</p>
                <h2 className="text-2xl font-semibold text-[var(--text)]">Albums y fotos</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
                <span>{listSummary}</span>
                {canUpload && (
                  <button
                    type="button"
                    onClick={() => setUploaderOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)] bg-[var(--accent-50)] px-4 py-1.5 font-medium text-[var(--accent-600)] transition hover:border-[var(--accent-600)] hover:bg-[var(--accent-100)]"
                  >
                    Subir contenido
                  </button>
                )}
              </div>
            </div>

            {combinedResults.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-[var(--hairline)] bg-[var(--bg)] p-8 text-center text-sm text-[var(--muted)]">
                No hay resultados que coincidan con los filtros seleccionados. Ajusta los filtros o busca otra etiqueta.
              </p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {combinedResults.map((item) =>
                  item.kind === "album" ? (
                    <div key={`album-${item.album.id}`} className="relative">
                      <span className="absolute left-3 top-3 z-10 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                        Album
                      </span>
                      <GalleryAlbumCard album={item.album} onSelect={() => openAlbum(item.album)} />
                    </div>
                  ) : (
                    <StandalonePhotoCard
                      key={`photo-${item.photo.id}`}
                      photo={item.photo}
                      onSelect={() => openStandalone(item.photo)}
                    />
                  )
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {viewerOpen && (
        <GalleryViewer
          entries={viewerEntries}
          activeIndex={viewerIndex}
          onClose={closeViewer}
          onNext={handleNext}
          onPrev={handlePrev}
          onSelectIndex={handleSelectIndex}
          canManageStandalone={canUpload}
          onEditStandalone={handleStandaloneEdit}
          onDeleteStandalone={handleStandaloneDelete}
        />
      )}

      {canUpload && (
        <GalleryContentUploader
          open={uploaderOpen}
          onClose={() => setUploaderOpen(false)}
          onComplete={handleUploaderComplete}
        />
      )}
    </div>
  );
}
