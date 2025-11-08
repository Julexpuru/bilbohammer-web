'use client';

import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import type { GalleryImage, GalleryViewerEntry } from "@/components/gallery/types";
import { formatClubDateTime } from "@/lib/date-format";

export type StandalonePhotoEditPayload = {
  title: string | null;
  date: string | null;
  location: string | null;
};

type AlbumPhotoLightboxProps = {
  entry: GalleryViewerEntry;
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

export function AlbumPhotoLightbox({
  entry,
  entries,
  activeIndex,
  onClose,
  onNext,
  onPrev,
  onSelectIndex,
  canManageStandalone = false,
  onEditStandalone,
  onDeleteStandalone,
}: AlbumPhotoLightboxProps) {
  const safeEntries = entries.length ? entries : [entry];
  const boundedIndex = Math.min(Math.max(activeIndex, 0), safeEntries.length - 1);
  const currentEntry = safeEntries[boundedIndex] ?? null;
  const image = currentEntry?.image ?? null;
  const album = currentEntry?.album ?? null;
  const kind = currentEntry?.kind ?? null;

  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | "edit" | "delete">(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [titleInput, setTitleInput] = useState(image?.title ?? "");
  const [dateInput, setDateInput] = useState(image?.takenAt ?? "");
  const [locationInput, setLocationInput] = useState(image?.location ?? "");

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onNext();
      if (event.key === "ArrowLeft") onPrev();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onNext, onPrev]);

  useEffect(() => {
    if (!image) return;
    setTitleInput(image.title ?? "");
    setDateInput(image.takenAt ?? "");
    setLocationInput(image.location ?? "");
    setIsEditing(false);
    setPendingAction(null);
    setActionError(null);
    setLastSavedAt(null);
  }, [image?.id, image?.title, image?.takenAt, image?.location, image]);

  const formattedComments = useMemo(() => {
    return (image?.comments ?? []).map((comment) => {
      const createdAtDate = comment.createdAt ? new Date(comment.createdAt) : null;
      return {
        ...comment,
        formattedDate:
          comment.formattedDate ??
          (createdAtDate ? formatClubDateTime(createdAtDate, { dateStyle: "short", timeStyle: "short" }) : undefined),
      };
    });
  }, [image?.comments]);

  if (!image) {
    return null;
  }

  const photoTitle = image.title ?? "Sin titulo";
  const photoAlt = image.alt || photoTitle;
  const fallbackSrc = album?.coverImage ?? image.src;
  const photoSrc = image.src || fallbackSrc;
  const mediaMaxHeight = "calc(100vh - 220px)";
  const likeKey = `${image.src}-${boundedIndex}`;

  const toggleLike = () => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(likeKey)) {
        next.delete(likeKey);
      } else {
        next.add(likeKey);
      }
      return next;
    });
  };

  const isCurrentLiked = liked.has(likeKey);
  const isSaving = pendingAction === "edit";
  const isDeleting = pendingAction === "delete";

  const handleEditSubmit = async () => {
    if (!onEditStandalone) {
      setIsEditing(false);
      return;
    }
    setPendingAction("edit");
    setActionError(null);
    try {
      await onEditStandalone(image, {
        title: titleInput.trim().length > 0 ? titleInput.trim() : null,
        date: dateInput.trim().length > 0 ? dateInput : null,
        location: locationInput.trim().length > 0 ? locationInput.trim() : null,
      });
      setIsEditing(false);
      setLastSavedAt(Date.now());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar los cambios de la foto.";
      setActionError(message);
    } finally {
      setPendingAction(null);
    }
  };

  const handleDelete = async () => {
    if (!onDeleteStandalone) return;
    if (!window.confirm("Seguro que quieres eliminar esta foto?")) return;
    setPendingAction("delete");
    setActionError(null);
    try {
      await onDeleteStandalone(image);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo eliminar la foto.";
      setActionError(message);
    } finally {
      setPendingAction(null);
    }
  };

  const resetEditForm = () => {
    setTitleInput(image.title ?? "");
    setDateInput(image.takenAt ?? "");
    setLocationInput(image.location ?? "");
    setActionError(null);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center px-4 py-10">
        <div className="flex w-full max-w-6xl flex-col gap-6">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              {kind === "album" && album ? (
                <>
                  <p className="text-xs uppercase tracking-[0.3em] text-sky-300">
                    {album.facets.year} - {album.facets.format}
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
                    {album.title}
                  </h2>
                  <p className="text-sm text-slate-300">
                    {album.date} - {album.location} - {album.totalPhotos} fotografias
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Foto</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
                    {photoTitle}
                  </h2>
                  <p className="text-sm text-slate-300">
                    {(image.takenAt ?? "Fecha desconocida") +
                      " - " +
                      (image.location ?? "Ubicacion no indicada")}
                  </p>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 self-end">
              {kind === "album" && album && (
                <Link
                  href={`/galeria/${album.slug}`}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:border-white/60 hover:text-white"
                >
                  Ir al album
                </Link>
              )}
              {kind === "standalone" && canManageStandalone && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditing) {
                        resetEditForm();
                      } else {
                        setIsEditing(true);
                        setLastSavedAt(null);
                        setActionError(null);
                      }
                    }}
                    className={clsx(
                      "rounded-full border px-4 py-2 text-sm font-medium transition",
                      isEditing
                        ? "border-white/60 bg-white/10 text-white"
                        : "border-white/20 bg-transparent text-white hover:border-white/60 hover:text-white"
                    )}
                  >
                    {isEditing ? "Cancelar" : "Editar"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500/20"
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Eliminando..." : "Eliminar"}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={toggleLike}
                className={clsx(
                  "rounded-full border px-4 py-2 text-sm font-medium transition",
                  isCurrentLiked
                    ? "border-pink-400/60 bg-pink-500/20 text-pink-200"
                    : "border-white/20 text-white hover:border-white/60 hover:text-white"
                )}
              >
                {isCurrentLiked ? "Quitar me gusta" : "Me gusta"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:border-white/60 hover:text-white"
              >
                Cerrar
              </button>
            </div>
          </header>

          {actionError && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {actionError}
            </div>
          )}
          {lastSavedAt && (
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
              Cambios guardados {formatClubDateTime(lastSavedAt, { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}

          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="flex-1">
              <div className="relative flex items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4">
                <Image
                  src={photoSrc}
                  alt={photoAlt}
                  width={1200}
                  height={800}
                  className="h-auto w-full rounded-lg object-contain"
                  style={{ maxHeight: mediaMaxHeight }}
                  priority
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span>{boundedIndex + 1}</span>
                  <span className="opacity-50">/</span>
                  <span>{safeEntries.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onPrev}
                    className="rounded-full border border-white/20 px-3 py-1 text-white transition hover:border-white/60 hover:text-white"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={onNext}
                    className="rounded-full border border-white/20 px-3 py-1 text-white transition hover-border-white/60 hover:text-white"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
            <aside className="w-full max-w-sm space-y-4 rounded-xl border border-white/10 bg-black/30 p-4">
              <header>
                <h3 className="text-lg font-semibold text-white">{photoTitle}</h3>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{photoAlt}</p>
              </header>

              <div className="space-y-3 text-sm text-slate-200">
                <div>
                  <span className="text-slate-400">Tomada:</span> {image.takenAt ?? "Fecha desconocida"}
                </div>
                <div>
                  <span className="text-slate-400">Lugar:</span> {image.location ?? "Ubicacion no indicada"}
                </div>
                <div>
                  <span className="text-slate-400">Favoritos:</span> {image.likesCount ?? image.likes ?? 0}
                </div>
              </div>

              {isEditing && canManageStandalone && (
                <form
                  className="space-y-3 rounded-lg border border-white/15 bg-black/40 p-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleEditSubmit();
                  }}
                >
                  <label className="block text-sm text-slate-200">
                    Titulo
                    <input
                      className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-1.5 text-sm text-white focus:border-sky-400 focus:outline-none"
                      value={titleInput}
                      onChange={(event) => setTitleInput(event.target.value)}
                    />
                  </label>
                  <label className="block text-sm text-slate-200">
                    Fecha
                    <input
                      type="date"
                      className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-1.5 text-sm text-white focus:border-sky-400 focus:outline-none"
                      value={dateInput}
                      onChange={(event) => setDateInput(event.target.value)}
                    />
                  </label>
                  <label className="block text-sm text-slate-200">
                    Ubicacion
                    <input
                      className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-1.5 text-sm text-white focus:border-sky-400 focus:outline-none"
                      value={locationInput}
                      onChange={(event) => setLocationInput(event.target.value)}
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="rounded-full border border-emerald-400/50 bg-emerald-500/20 px-4 py-1.5 text-sm font-medium text-emerald-200 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? "Guardando..." : "Guardar"}
                    </button>
                    <button
                      type="button"
                      onClick={resetEditForm}
                      className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-white transition hover:border-white/40 hover:text-white"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {formattedComments.length > 0 && (
                <section className="space-y-2">
                  <h4 className="text-xs uppercase tracking-[0.3em] text-slate-400">Comentarios</h4>
                  <ul className="space-y-2">
                    {formattedComments.map((comment) => (
                      <li
                        key={comment.id ?? comment.createdAt}
                        className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-200"
                      >
                        <p className="font-medium text-white">{comment.author}</p>
                        <p className="text-xs text-slate-400">{comment.formattedDate}</p>
                      <p className="mt-1 text-sm text-slate-100">
                        {comment.body ?? comment.message ?? ""}
                      </p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {safeEntries.map((item, index) => {
              const isActive = index === boundedIndex;
              return (
                <button
                  key={item.image.id ?? index}
                  type="button"
                  onClick={() => onSelectIndex(index)}
                  className={clsx(
                    "h-3 w-3 rounded-full transition",
                    isActive ? "bg-white" : "bg-white/30 hover:bg-white/60"
                  )}
                  aria-current={isActive ? "true" : "false"}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
