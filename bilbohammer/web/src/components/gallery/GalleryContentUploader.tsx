'use client';

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import type { GalleryAlbum, GalleryStandalonePhoto } from "@/components/gallery/types";
import { uploadImageToR2 } from "@/lib/uploads/presign-client";
import { getUserDisplayName } from "@/lib/user-display";

export type UploadMode = "standalone" | "album";

export type UploadablePhoto = {
  id: string;
  file?: File;
  preview: string;
  title: string;
  date?: string;
  location?: string;
  existingImageId?: string;
  storagePath?: string;
  mimeType?: string;
  fileSize?: number;
};

export type CollaboratorOption = {
  id: string;
  name: string;
  nick?: string | null;
  email?: string | null;
};

export type AlbumMeta = {
  title: string;
  date: string;
  location: string;
  description: string;
  tags: string;
  game: string;
  format: string;
  collaborators: CollaboratorOption[];
  coverPhotoId: string | null;
  coverImage: string | null;
};

export type GalleryUploaderCompletePayload =
  | { kind: "album"; album: GalleryAlbum }
  | { kind: "standalone"; photos: GalleryStandalonePhoto[] };

type GalleryContentUploaderProps = {
  open: boolean;
  initialMode?: UploadMode;
  onClose: () => void;
  onComplete?: (payload: GalleryUploaderCompletePayload) => void;
  initialAlbum?: GalleryAlbum | null;
};

const DEFAULT_GAME = "General";
const DEFAULT_FORMAT = "Otros";

const GAME_OPTIONS = [
  "General",
  "Warhammer 40K",
  "Kill Team",
  "Age of Sigmar",
  "The Old World",
  "ESDLA",
  "Blood Bowl",
  "Juegos de mesa",
];

const FORMAT_OPTIONS = ["Exposición", "Liga", "Otros", "Social", "Taller", "Torneo"] as const;
const CANONICAL_FORMATS = new Set<string>(FORMAT_OPTIONS);
const LEGACY_FORMAT_NORMALIZATION: Record<string, string> = {
  Exposicion: "Exposición",
};

function normalizeFormatValue(input?: string | null) {
  if (!input) {
    return DEFAULT_FORMAT;
  }
  const remapped = LEGACY_FORMAT_NORMALIZATION[input] ?? input;
  return CANONICAL_FORMATS.has(remapped) ? remapped : DEFAULT_FORMAT;
}

const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const readFileAsDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("No se pudo procesar el fichero seleccionado."));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el fichero seleccionado."));
    reader.readAsDataURL(file);
  });

function buildInitialAlbumMeta(album?: GalleryAlbum | null): AlbumMeta {
  if (!album) {
    return {
      title: "",
      date: "",
      location: "",
      description: "",
      tags: "",
      game: DEFAULT_GAME,
      format: DEFAULT_FORMAT,
      collaborators: [],
      coverPhotoId: null,
      coverImage: null,
    };
  }

  const coverImage = album.images.find((image) => image.src === album.coverImage) ?? album.images[0] ?? null;
  const normalizedFormat = normalizeFormatValue(album.facets.format);
  return {
    title: album.title,
    date: album.dateISO ?? "",
    location: album.location ?? "",
    description: album.description ?? "",
    tags: album.tags.join(", "),
    game: album.facets.game,
    format: normalizedFormat,
    collaborators: album.collaborators?.map((collaborator) => ({ id: collaborator.id, name: collaborator.name })) ?? [],
    coverPhotoId: coverImage ? coverImage.id : null,
    coverImage: coverImage ? coverImage.src : null,
  };
}

function parseTags(input: string) {
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export function GalleryContentUploader({
  open,
  initialMode,
  onClose,
  onComplete,
  initialAlbum,
}: GalleryContentUploaderProps) {
  const editingAlbumId = initialAlbum?.id ?? null;
  const defaultMode: UploadMode = initialAlbum ? "album" : initialMode ?? "standalone";
  const [mode, setMode] = useState<UploadMode>(defaultMode);
  const [photos, setPhotos] = useState<UploadablePhoto[]>([]);
  const [albumMeta, setAlbumMeta] = useState<AlbumMeta>(buildInitialAlbumMeta(initialAlbum));
  const [memberQuery, setMemberQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CollaboratorOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initialAlbum) {
      setMode("album");
      setAlbumMeta(buildInitialAlbumMeta(initialAlbum));
      const preparedPhotos = initialAlbum.images.map((image) => ({
        id: image.id,
        existingImageId: image.id,
        storagePath: image.storagePath,
        preview: image.src,
        title: image.title ?? "",
        date: image.takenAt ?? "",
        location: image.location ?? "",
      }));
      setPhotos(preparedPhotos);
    } else {
      setMode(defaultMode);
      setAlbumMeta(buildInitialAlbumMeta());
      setPhotos([]);
    }

    setMemberQuery("");
    setSearchResults([]);
    setSearchError(null);
    setSubmitError(null);

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
      searchAbortRef.current = null;
    }
  }, [open, initialAlbum, defaultMode]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const query = memberQuery.trim();
    if (query.length < 2) {
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
        searchAbortRef.current = null;
      }
      setIsSearching(false);
      setSearchError(null);
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    searchAbortRef.current = controller;

    const timeoutId = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        setSearchError(null);
        const response = await fetch(`/api/members/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Error ${response.status}`);
        }
        const payload = await response.json();
        const rawResults = Array.isArray(payload.results) ? payload.results : [];
        setSearchResults(
          rawResults.map((candidate: any) => ({
            id: String(candidate.id),
            name: getUserDisplayName(candidate, "Socio sin nombre") ?? "Socio sin nombre",
            nick: candidate.nick ?? null,
            email: candidate.email ?? null,
          }))
        );
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("No se pudo buscar colaboradores", error);
          setSearchError("No se pudo buscar los colaboradores. Inténtalo de nuevo más tarde.");
          setSearchResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [memberQuery, open]);

  useEffect(() => {
    if (!open) {
      setPhotos([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [open]);

  const selectedCollaboratorIds = useMemo(
    () => new Set(albumMeta.collaborators.map((collaborator) => collaborator.id)),
    [albumMeta.collaborators]
  );

  const filteredMembers = useMemo(() => {
    if (searchResults.length === 0) {
      return [];
    }
    return searchResults.filter((member) => !selectedCollaboratorIds.has(member.id));
  }, [searchResults, selectedCollaboratorIds]);

  const handleFilePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fallbackDate = mode === "album" ? albumMeta.date || "" : "";
    const fallbackLocation = mode === "album" ? albumMeta.location || "" : "";

    const nextPhotos: UploadablePhoto[] = [];
    for (const file of Array.from(files)) {
      try {
        const preview = await readFileAsDataURL(file);
        nextPhotos.push({
          id: generateId(),
          file,
          preview,
          title: "",
          date: fallbackDate,
          location: fallbackLocation,
          mimeType: file.type || undefined,
          fileSize: file.size,
        });
      } catch (error) {
        console.error("No se pudo preparar la imagen seleccionada", error);
      }
    }

    if (nextPhotos.length === 0) {
      return;
    }

    setPhotos((prev) => [...prev, ...nextPhotos]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setAlbumMeta((prev) => {
      if (prev.coverPhotoId || nextPhotos.length === 0) {
        return prev;
      }
      const first = nextPhotos[0];
      return {
        ...prev,
        coverPhotoId: first.id,
        coverImage: first.preview,
      };
    });
  };

  const handleRemove = (id: string) => {
    setPhotos((prev) => {
      const remaining = prev.filter((item) => item.id !== id);
      if (albumMeta.coverPhotoId === id) {
        const fallback = remaining[0] ?? null;
        setAlbumMeta((meta) => ({
          ...meta,
          coverPhotoId: fallback ? fallback.id : null,
          coverImage: fallback ? fallback.preview : null,
        }));
      }
      return remaining;
    });
  };

  const handlePhotoIndexChange = (id: string, targetIndex: number) => {
    setPhotos((prev) => {
      const currentIndex = prev.findIndex((photo) => photo.id === id);
      if (currentIndex === -1) {
        return prev;
      }
      const clamped = Math.max(0, Math.min(targetIndex, prev.length - 1));
      if (currentIndex === clamped) {
        return prev;
      }
      const next = [...prev];
      const [item] = next.splice(currentIndex, 1);
      next.splice(clamped, 0, item);
      return next;
    });
  };

  const movePhoto = (index: number, direction: -1 | 1) => {
    setPhotos((prev) => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) {
        return prev;
      }
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  };

  const handlePhotoMetaChange = (id: string, field: keyof UploadablePhoto, value: string) => {
    setPhotos((prev) => prev.map((photo) => (photo.id === id ? { ...photo, [field]: value } : photo)));
  };

  const handleAlbumMetaChange = (field: keyof AlbumMeta, value: string | string[]) => {
    setAlbumMeta((prev) => ({ ...prev, [field]: value }));
  };

  const canSubmit =
    photos.length > 0 &&
    (mode === "standalone" || albumMeta.title.trim().length > 0);

  const handleConfirm = async () => {
    if (!canSubmit || isSubmitting) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    const coverCandidate =
      albumMeta.coverPhotoId && photos.length > 0
        ? photos.find((photo) => photo.id === albumMeta.coverPhotoId) ?? photos[0]
        : photos[0] ?? null;

    const collaborators = albumMeta.collaborators.map((collaborator) => collaborator.id);
    const parsedTags = parseTags(albumMeta.tags);

    try {
      const preparedPhotos = [];
      for (let index = 0; index < photos.length; index += 1) {
        const photo = photos[index];
        const trimmedTitle = photo.title.trim();
        const normalizedTitle = trimmedTitle.length > 0 ? trimmedTitle : null;
        const base = {
          id: photo.id,
          title: normalizedTitle,
          date: photo.date ?? "",
          location: photo.location ?? "",
          order: index,
        };

        if (photo.file) {
          const { publicUrl } = await uploadImageToR2(photo.file);
          preparedPhotos.push({
            ...base,
            imageUrl: publicUrl,
            originalName: photo.file.name || `${photo.id}.jpg`,
            mimeType: photo.mimeType ?? photo.file.type ?? null,
            fileSize: photo.fileSize ?? photo.file.size ?? null,
          });
          continue;
        }

        if (!photo.storagePath) {
          continue;
        }

        preparedPhotos.push({
          ...base,
          existingImageId: photo.existingImageId ?? photo.id,
          storagePath: photo.storagePath,
        });
      }

      const body = {
        mode,
        albumId: editingAlbumId ?? undefined,
        album:
          mode === "album"
            ? {
                title: albumMeta.title,
                date: albumMeta.date,
                location: albumMeta.location,
                description: albumMeta.description,
                tags: parsedTags,
                collaborators,
                coverPhotoId: coverCandidate ? coverCandidate.id : null,
                game: albumMeta.game,
                format: albumMeta.format,
              }
            : undefined,
        photos: preparedPhotos,
      };

      const response = await fetch("/api/gallery/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `Error ${response.status}`);
      }

      const result: GalleryUploaderCompletePayload = await response.json();
      if (onComplete) {
        onComplete(result);
      }

      setPhotos([]);
      setAlbumMeta(buildInitialAlbumMeta());
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      onClose();
    } catch (error) {
      console.error("No se pudo guardar el contenido de la galería", error);
      const message =
        error instanceof Error ? error.message : "No se pudo guardar el contenido. Inténtalo de nuevo.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) {
    return null;
  }

  const renderCollaboratorChips = () => (
    <div className="flex flex-wrap gap-2">
      {albumMeta.collaborators.map((collaborator) => (
        <span
          key={collaborator.id}
          className="flex items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--card)] px-3 py-1 text-sm text-[var(--muted)]"
        >
          <span className="font-medium text-[var(--text)]">{collaborator.name}</span>
          {collaborator.nick && <span className="text-xs">@{collaborator.nick}</span>}
          <button
            type="button"
            className="text-xs text-[var(--accent-600)]"
            onClick={() =>
              setAlbumMeta((prev) => ({
                ...prev,
                collaborators: prev.collaborators.filter((item) => item.id !== collaborator.id),
              }))
            }
          >
            Quitar
          </button>
        </span>
      ))}
    </div>
  );

  const renderMemberResults = () => {
    const query = memberQuery.trim();
    return (
      <div className="max-h-40 space-y-2 overflow-y-auto">
        {query.length < 2 ? (
          <p className="text-sm text-[var(--muted)]">Escribe al menos 2 caracteres para buscar socios.</p>
        ) : isSearching ? (
          <p className="text-sm text-[var(--muted)]">Buscando socios...</p>
        ) : searchError ? (
          <p className="text-sm text-red-500">{searchError}</p>
        ) : filteredMembers.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Sin coincidencias.</p>
        ) : (
          filteredMembers.map((member) => (
            <button
              key={member.id}
              type="button"
              className="w-full rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-left text-sm text-[var(--muted)] hover:text-[var(--text)]"
              onClick={() =>
                setAlbumMeta((prev) => {
                  if (prev.collaborators.some((item) => item.id === member.id)) {
                    return prev;
                  }
                  return {
                    ...prev,
                    collaborators: [...prev.collaborators, { ...member }],
                  };
                })
              }
              disabled={selectedCollaboratorIds.has(member.id)}
            >
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-[var(--text)]">{member.nick || member.name}</span>
                {member.nick && member.nick !== member.name && (
                  <span className="text-xs font-normal text-[var(--muted)]">{member.name}</span>
                )}
                {!member.nick && member.email && <span className="text-xs text-[var(--muted)]">{member.email}</span>}
              </span>
            </button>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-8 shadow-xl max-h-[calc(100vh-5rem)] overflow-y-auto">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Gestor de la galería</h2>
            <p className="text-sm text-[var(--muted)]">
                Sube fotos o prepara un nuevo álbum. El contenido se guardará en el servidor cuando confirmes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--hairline)] px-4 py-2 text-sm font-medium"
          >
            Cerrar
          </button>
        </header>

        {!initialAlbum && (
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--card)] p-1 text-sm">
            <button
              type="button"
              className={clsx(
                "rounded-full px-4 py-2 transition",
                mode === "standalone" ? "bg-[var(--accent)] text-black" : "text-[var(--muted)] hover:text-[var(--text)]"
              )}
              onClick={() => setMode("standalone")}
            >
              Fotos
            </button>
            <button
              type="button"
              className={clsx(
                "rounded-full px-4 py-2 transition",
                mode === "album" ? "bg-[var(--accent)] text-black" : "text-[var(--muted)] hover:text-[var(--text)]"
              )}
              onClick={() => setMode("album")}
            >
              Crear álbum
            </button>
          </div>
        )}

        {mode === "album" && (
          <section className="grid gap-4 rounded-3xl border border-[var(--hairline)] bg-[var(--bg)] p-4">
            <h3 className="text-lg font-semibold">Metadatos del álbum</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="text-[var(--muted)]">Titulo</span>
                <input
                  value={albumMeta.title}
                  onChange={(event) => handleAlbumMetaChange("title", event.target.value)}
                  className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
                  placeholder="Ej. Campana Sector Vermis"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-[var(--muted)]">Fecha</span>
                <input
                  type="date"
                  value={albumMeta.date}
                  onChange={(event) => handleAlbumMetaChange("date", event.target.value)}
                  className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-[var(--muted)]">Ubicación</span>
                <input
                  value={albumMeta.location}
                  onChange={(event) => handleAlbumMetaChange("location", event.target.value)}
                  className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
                  placeholder="Ej. Bilbao"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-[var(--muted)]">Tags (separadas por comas)</span>
                <input
                  value={albumMeta.tags}
                  onChange={(event) => handleAlbumMetaChange("tags", event.target.value)}
                  className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
                  placeholder="torneo, streaming, comunidad"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-[var(--muted)]">Juego</span>
                <select
                  value={albumMeta.game}
                  onChange={(event) => handleAlbumMetaChange("game", event.target.value)}
                  className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
                >
                  {GAME_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-[var(--muted)]">Formato</span>
                <select
                  value={albumMeta.format}
                  onChange={(event) => handleAlbumMetaChange("format", event.target.value)}
                  className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
                >
                  {FORMAT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              <span className="text-[var(--muted)]">Descripción</span>
              <textarea
                value={albumMeta.description}
                onChange={(event) => handleAlbumMetaChange("description", event.target.value)}
                className="h-24 rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
                placeholder="Resumen del evento, narrativa, detalles logisticos"
              />
            </label>
            <div className="grid gap-2 text-sm">
              <span className="text-[var(--muted)]">Colaboradores</span>
              <div className="space-y-2">
                <input
                  type="search"
                  value={memberQuery}
                  onChange={(event) => setMemberQuery(event.target.value)}
                  placeholder="Buscar socio por nombre o alias"
                  className="w-full rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
                />
                {renderMemberResults()}
                {albumMeta.collaborators.length > 0 && <div>{renderCollaboratorChips()}</div>}
              </div>
            </div>
          </section>
        )}

        <section className="space-y-4 rounded-3xl border border-[var(--hairline)] bg-[var(--bg)] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold">{mode === "album" ? "Tus fotos para el álbum" : "Fotos"}</h3>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFilePick}
              />
              <button
                type="button"
                className="rounded-full border border-[var(--accent)] bg-[var(--accent-50)] px-4 py-2 text-sm font-medium text-[var(--accent-600)]"
                onClick={() => fileInputRef.current?.click()}
              >
                Añadir imágenes
              </button>
            </div>
          </div>

          {photos.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--hairline)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted)]">
              Todavía no hay fotos seleccionadas. Sube algunas imágenes para definir el orden y la información asociada.
            </p>
          ) : (
            <ul className="space-y-3">
              {photos.map((photo, index) => (
                <li
                  key={photo.id}
                  className="flex flex-col gap-3 rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-4 shadow-sm md:flex-row"
                >
                  <div className="relative h-32 w-full overflow-hidden rounded-2xl border border-[var(--hairline)] md:h-24 md:w-40">
                    <Image
                      src={photo.preview}
                      alt={photo.title || "Previsualizacion"}
                      fill
                      sizes="(min-width: 768px) 160px, 100vw"
                      className="object-cover"
                    />
                    {albumMeta.coverPhotoId === photo.id && (
                      <span className="absolute left-2 top-2 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
                        Portada
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 text-sm">
                    <div className="grid gap-2 md:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="text-[var(--muted)]">Titulo (opcional)</span>
                        <input
                          value={photo.title}
                          onChange={(event) => handlePhotoMetaChange(photo.id, "title", event.target.value)}
                          className="rounded-2xl border border-[var(--hairline)] bg-[var(--bg)] px-3 py-2 focus:border-[var(--accent)] focus:outline-none"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-[var(--muted)]">Fecha</span>
                        <input
                          type="date"
                          value={photo.date ?? ""}
                          onChange={(event) => handlePhotoMetaChange(photo.id, "date", event.target.value)}
                          className="rounded-2xl border border-[var(--hairline)] bg-[var(--bg)] px-3 py-2 focus:border-[var(--accent)] focus:outline-none"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-[var(--muted)]">Ubicación</span>
                        <input
                          value={photo.location ?? ""}
                          onChange={(event) => handlePhotoMetaChange(photo.id, "location", event.target.value)}
                          className="rounded-2xl border border-[var(--hairline)] bg-[var(--bg)] px-3 py-2 focus:border-[var(--accent)] focus:outline-none"
                          placeholder="Ej. Bilbao"
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {mode === "album" && (
                        <button
                          type="button"
                          className={clsx(
                            "rounded-full px-3 py-1 text-xs transition",
                            albumMeta.coverPhotoId === photo.id
                              ? "border border-[var(--accent-600)] bg-[var(--accent-600)]/15 text-[var(--accent-600)]"
                              : "border border-[var(--hairline)] text-[var(--muted)] hover:text-[var(--text)]"
                          )}
                          onClick={() =>
                            setAlbumMeta((prev) => ({
                              ...prev,
                              coverPhotoId: photo.id,
                              coverImage: photo.preview,
                            }))
                          }
                          disabled={albumMeta.coverPhotoId === photo.id}
                        >
                          {albumMeta.coverPhotoId === photo.id ? "Portada actual" : "Marcar portada"}
                        </button>
                      )}
                      <button
                        type="button"
                        className="rounded-full border border-[var(--hairline)] px-3 py-1 text-xs text-[var(--muted)] hover:text-[var(--text)]"
                        onClick={() => movePhoto(index, -1)}
                        disabled={index === 0}
                      >
                        Subir
                      </button>
                      <label className="flex items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--muted)]">
                        Indice
                        <input
                          type="number"
                          min={1}
                          max={photos.length}
                          value={index + 1}
                          onChange={(event) => {
                            const raw = Number(event.target.value);
                            if (Number.isNaN(raw)) {
                              return;
                            }
                            const clamped = Math.max(1, Math.min(photos.length, Math.floor(raw)));
                            handlePhotoIndexChange(photo.id, clamped - 1);
                          }}
                          className="w-16 rounded-full border border-[var(--hairline)] bg-[var(--card)] px-2 py-1 text-center text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                        />
                      </label>
                      <button
                        type="button"
                        className="rounded-full border border-[var(--hairline)] px-3 py-1 text-xs text-[var(--muted)] hover:text-[var(--text)]"
                        onClick={() => movePhoto(index, 1)}
                        disabled={index === photos.length - 1}
                      >
                        Bajar
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-red-200/50 bg-red-500/10 px-3 py-1 text-xs text-red-400 hover:bg-red-500/20"
                        onClick={() => handleRemove(photo.id)}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-[var(--muted)]">
            <p>
              Los archivos se guardarán en el servidor y quedarán disponibles en la galería nada más confirmar este paso.
            </p>
            {submitError && <p className="mt-1 text-red-400">{submitError}</p>}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-full border border-[var(--hairline)] px-4 py-2 text-sm"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black shadow transition hover:bg-[var(--accent-600)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleConfirm}
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting
                ? "Guardando..."
                : mode === "album"
                  ? editingAlbumId
                    ? "Guardar cambios"
                    : "Crear álbum"
                  : "Guardar fotos"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
