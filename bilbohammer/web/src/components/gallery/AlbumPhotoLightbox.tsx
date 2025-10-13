'use client';

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import type { GalleryImage, GalleryViewerEntry } from "@/components/gallery/types";

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
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | "edit" | "delete">(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [titleInput, setTitleInput] = useState(() => entry.image.title ?? "");
  const [dateInput, setDateInput] = useState(() => entry.image.takenAt ?? "");
  const [locationInput, setLocationInput] = useState(() => entry.image.location ?? "");

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

  const { album, image, kind } = entry;
  const photoTitle = image.title ?? "Sin titulo";
  const photoAlt = image.alt || photoTitle;
  const fallbackSrc = album?.coverImage ?? image.src;
  const photoSrc = image.src || fallbackSrc;
  const mediaMaxHeight = "calc(100vh - 220px)";
  const likeKey = `${image.src}-${activeIndex}`;

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
  const formattedComments = image.comments.map((comment) => ({
    ...comment,
    formattedDate: new Date(comment.createdAt).toLocaleString("es-ES", {
      dateStyle: "short",
      timeStyle: "short",
    }),
  }));
  const isSaving = pendingAction === "edit";
  const isDeleting = pendingAction === "delete";

  useEffect(() => {
    setTitleInput(image.title ?? "");
    setDateInput(image.takenAt ?? "");
    setLocationInput(image.location ?? "");
    setIsEditing(false);
    setPendingAction(null);
    setActionError(null);
    setLastSavedAt(null);
  }, [image.id]);

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
      const message = error instanceof Error ? error.message : "No se pudo guardar los cambios de la foto.";
      setActionError(message);
    } finally {
      setPendingAction(null);
    }
  };

  const handleDelete = async () => {
    if (!onDeleteStandalone) {
      return;
    }
    if (!window.confirm("¿Seguro que quieres eliminar esta foto?")) {
      return;
    }
    setPendingAction("delete");
    setActionError(null);
    try {
      await onDeleteStandalone(image);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar la foto.";
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
              {album ? (
                <>
                  <p className="text-xs uppercase tracking-[0.3em] text-sky-300">
                    {album.facets.year} - {album.facets.format}
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">{album.title}</h2>
                  <p className="text-sm text-slate-300">
                    {album.date} - {album.location} - {album.totalPhotos} fotografias
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Foto</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">{photoTitle}</h2>
                  <p className="text-sm text-slate-300">
                    {(image.takenAt ?? "Fecha desconocida") + " - " + (image.location ?? "Ubicacion no indicada")}
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
                    disabled={isSaving || isDeleting}
                    className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:border-white"
                  >
                    {isEditing ? "Cancelar" : "Editar"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSaving || isDeleting}
                    className={clsx(
                      "rounded-full border px-4 py-2 text-sm font-medium transition",
                      isDeleting ? "border-red-400 text-red-300 opacity-75" : "border-red-400 text-red-300 hover:border-red-300 hover:text-red-200"
                    )}
                  >
                    {isDeleting ? "Eliminando..." : "Eliminar"}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:border-white"
              >
                Cerrar
              </button>
            </div>
          </header>

          {kind === "standalone" && canManageStandalone && isEditing && (
            <div className="space-y-4 rounded-3xl border border-white/15 bg-black/40 p-5 text-white">
              <div className="grid gap-3 md:grid-cols-3">
                <label className="grid gap-1 text-sm">
                  <span className="uppercase tracking-[0.2em] text-white/60">Titulo</span>
                  <input
                    value={titleInput}
                    onChange={(event) => setTitleInput(event.target.value)}
                    className="rounded-2xl border border-white/20 bg-black/60 px-3 py-2 text-sm text-white focus:border-[var(--accent)] focus:outline-none"
                    placeholder="Sin titulo"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="uppercase tracking-[0.2em] text-white/60">Fecha</span>
                  <input
                    type="date"
                    value={dateInput}
                    onChange={(event) => setDateInput(event.target.value)}
                    className="rounded-2xl border border-white/20 bg-black/60 px-3 py-2 text-sm text-white focus:border-[var(--accent)] focus:outline-none"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="uppercase tracking-[0.2em] text-white/60">Ubicacion</span>
                  <input
                    value={locationInput}
                    onChange={(event) => setLocationInput(event.target.value)}
                    className="rounded-2xl border border-white/20 bg-black/60 px-3 py-2 text-sm text-white focus:border-[var(--accent)] focus:outline-none"
                    placeholder="Ubicacion no indicada"
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleEditSubmit}
                  disabled={isSaving || isDeleting}
                  className={clsx(
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    isSaving
                      ? "border-white/30 text-white/60"
                      : "border-[var(--accent)] bg-[var(--accent-50)] text-[var(--accent-200)] hover:border-[var(--accent-200)] hover:text-[var(--accent-100)]"
                  )}
                >
                  {isSaving ? "Guardando..." : "Guardar cambios"}
                </button>
                <button
                  type="button"
                  onClick={resetEditForm}
                  disabled={isSaving}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:border-white"
                >
                  Restablecer
                </button>
                {lastSavedAt && (
                  <span className="text-xs text-emerald-300">
                    Cambios guardados {new Date(lastSavedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
              {actionError && <p className="text-sm text-red-300">{actionError}</p>}
            </div>
          )}

          {actionError && !(isEditing && canManageStandalone && kind === "standalone") && (
            <p className="rounded-3xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{actionError}</p>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,2.1fr)_minmax(300px,1fr)] lg:items-start">
            <div
              className="relative flex w-full items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-black"
              style={{ minHeight: 360, maxHeight: mediaMaxHeight }}
            >
              <Image
                src={photoSrc}
                alt={photoAlt}
                fill
                sizes="(min-width: 1024px) 65vw, 100vw"
                className="object-contain"
              />

              <button
                type="button"
                onClick={onPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 text-white shadow transition hover:bg-black/80"
                aria-label="Ver foto anterior"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>

              <button
                type="button"
                onClick={onNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 text-white shadow transition hover:bg-black/80"
                aria-label="Ver foto siguiente"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>

            <aside
              className="flex flex-col gap-4 overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-5 text-white"
              style={{ maxHeight: mediaMaxHeight }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium uppercase tracking-[0.2em] text-white/70">Interacciones</span>
                <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/80">
                  {image.likes + (isCurrentLiked ? 1 : 0)} me gusta
                </span>
              </div>
              <button
                type="button"
                onClick={toggleLike}
                className={clsx(
                  "flex items-center justify-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition",
                  isCurrentLiked
                    ? "border-[var(--accent)] bg-[var(--accent-50)] text-[var(--accent-600)]"
                    : "border-white/20 text-white hover:border-white/40"
                )}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill={isCurrentLiked ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733C11.285 4.876 9.623 3.75 7.688 3.75 5.099 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                  />
                </svg>
                {isCurrentLiked ? "Te gusta" : "Me gusta"}
              </button>

              <div className="flex flex-1 flex-col space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">Comentarios</p>
                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {formattedComments.length === 0 && (
                    <p className="text-sm text-white/60">Se la primera persona en comentar esta foto.</p>
                  )}
                  {formattedComments.map((comment) => (
                    <article key={comment.id} className="rounded-2xl border border-white/10 bg-black/40 p-3">
                      <header className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium text-white">{comment.author}</span>
                        <time className="text-xs text-white/50" suppressHydrationWarning>
                          {comment.formattedDate}
                        </time>
                      </header>
                      <p className="text-sm text-white/80">{comment.message}</p>
                    </article>
                  ))}
                </div>
                <div className="space-y-2">
                  <textarea
                    className="h-20 w-full resize-none rounded-2xl border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[var(--accent)] focus:outline-none"
                    placeholder="Comparte tu impresion (proximamente)"
                    readOnly
                  />
                  <p className="text-xs text-white/40">
                    Pronto habilitaremos los comentarios. Por ahora solo podemos revisarlos.
                  </p>
                </div>
              </div>
            </aside>
          </div>

          <div className="flex snap-x gap-3 overflow-x-auto pb-2">
            {entries.map((item, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={`${item.image.src}-${index}`}
                  type="button"
                  onClick={() => onSelectIndex(index)}
                  className={clsx(
                    "relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-2xl border transition",
                    isActive ? "border-[var(--accent)]" : "border-white/10 opacity-60 hover:opacity-100"
                  )}
                  aria-label={`Ver imagen ${index + 1}`}
                >
                  <Image
                    src={item.image.src}
                    alt={item.image.alt}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
