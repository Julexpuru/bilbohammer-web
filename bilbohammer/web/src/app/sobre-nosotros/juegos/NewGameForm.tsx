'use client';

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { slugify } from "@/lib/slugify";
import { uploadImageToR2 } from "@/lib/uploads/presign-client";

export function NewGameForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slugValue, setSlugValue] = useState("");
  const [legacyKey, setLegacyKey] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const suggestedSlug = useMemo(() => slugify(name || "juego"), [name]);

  const iconInputRef = useRef<HTMLInputElement | null>(null);
  const heroInputRef = useRef<HTMLInputElement | null>(null);

  const handleReset = () => {
    setName("");
    setSlugValue("");
    setLegacyKey("");
    setIsDefault(false);
    setIconFile(null);
    setHeroFile(null);
    setError(null);
    if (iconInputRef.current) iconInputRef.current.value = "";
    if (heroInputRef.current) heroInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Introduce un nombre para el juego.");
      return;
    }
    const slug = (slugValue || suggestedSlug).trim();
    if (!slug) {
      setError("No se pudo generar un slug válido.");
      return;
    }
    setBusy(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        slug,
        legacyEnumKey: legacyKey.trim() || null,
        isDefault,
      };
      if (iconFile) {
        const { publicUrl } = await uploadImageToR2(iconFile);
        payload.iconImageUrl = publicUrl;
      }
      if (heroFile) {
        const { publicUrl } = await uploadImageToR2(heroFile);
        payload.heroImageUrl = publicUrl;
      }

      const response = await fetch("/api/admin/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(typeof json?.error === "string" ? json.error : "No se pudo crear el juego.");
      }

      handleReset();
      setOpen(false);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo crear el juego.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="mt-10 flex justify-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-[var(--accent-300)] px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)] hover:bg-[var(--accent-50)]"
        >
          Añadir nuevo juego
        </button>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-6 rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Nuevo juego</h2>
        <button
          type="button"
          onClick={() => {
            handleReset();
            setOpen(false);
          }}
          className="rounded-full border border-[var(--hairline)] px-3 py-1 text-xs uppercase tracking-wide text-[var(--muted)] hover:text-[var(--accent-600)]"
        >
          Cancelar
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)] sm:col-span-2">
          Nombre
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-xl border border-[var(--hairline)] bg-[var(--card-muted)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-400)]"
            placeholder="Nombre visible del juego"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">
          Slug
          <input
            type="text"
            value={slugValue}
            onChange={(event) => setSlugValue(event.target.value)}
            className="w-full rounded-xl border border-[var(--hairline)] bg-[var(--card-muted)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-400)]"
            placeholder={suggestedSlug}
          />
        </label>
        <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">
          Clave legacy (opcional)
          <input
            type="text"
            value={legacyKey}
            onChange={(event) => setLegacyKey(event.target.value.toUpperCase())}
            className="w-full rounded-xl border border-[var(--hairline)] bg-[var(--card-muted)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-400)]"
            placeholder="W40K, AOS..."
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(event) => setIsDefault(event.target.checked)}
          />
          Mostrar por defecto
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">
          Icono
          <input
            ref={iconInputRef}
            type="file"
            accept="image/*"
            onChange={(event) => setIconFile(event.target.files?.[0] ?? null)}
            className="w-full rounded-xl border border-[var(--hairline)] bg-[var(--card-muted)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-400)]"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">
          Banner
          <input
            ref={heroInputRef}
            type="file"
            accept="image/*"
            onChange={(event) => setHeroFile(event.target.files?.[0] ?? null)}
            className="w-full rounded-xl border border-[var(--hairline)] bg-[var(--card-muted)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-400)]"
          />
        </label>
      </div>

      {error ? <p className="text-xs text-red-500">{error}</p> : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded-full bg-[var(--accent-600)] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-[var(--accent-500)] disabled:opacity-60"
          disabled={busy}
        >
          {busy ? "Creando..." : "Crear juego"}
        </button>
      </div>
    </div>
  );
}
