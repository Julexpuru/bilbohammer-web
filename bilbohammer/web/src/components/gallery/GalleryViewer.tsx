'use client';

import { useEffect } from "react";
import { AlbumPhotoLightbox, StandalonePhotoEditPayload } from "./AlbumPhotoLightbox";
import type { GalleryImage, GalleryViewerEntry } from "./types";

type GalleryViewerProps = {
  entries: GalleryViewerEntry[];
  activeIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSelectIndex: (index: number) => void;
  canManageStandalone?: boolean;
  onEditStandalone?: (image: GalleryImage, payload: StandalonePhotoEditPayload) => Promise<void>;
  onDeleteStandalone?: (image: GalleryImage) => Promise<void>;
};

export function GalleryViewer({
  entries,
  activeIndex,
  onClose,
  onNext,
  onPrev,
  onSelectIndex,
  canManageStandalone,
  onEditStandalone,
  onDeleteStandalone,
}: GalleryViewerProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onNext();
      if (event.key === "ArrowLeft") onPrev();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onNext, onPrev]);

  if (entries.length === 0) {
    return null;
  }

  const safeIndex = Math.max(0, Math.min(activeIndex, entries.length - 1));
  const currentEntry = entries[safeIndex];

  return (
    <AlbumPhotoLightbox
      entry={currentEntry}
      entries={entries}
      activeIndex={safeIndex}
      onClose={onClose}
      onNext={onNext}
      onPrev={onPrev}
      onSelectIndex={onSelectIndex}
      canManageStandalone={canManageStandalone}
      onEditStandalone={onEditStandalone}
      onDeleteStandalone={onDeleteStandalone}
    />
  );
}

export type { StandalonePhotoEditPayload } from "./AlbumPhotoLightbox";
