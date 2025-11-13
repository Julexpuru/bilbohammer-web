"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import type { Article, ArticleBlock, ArticleCategory } from "./data";
import { CATEGORY_LABELS } from "./data";

type ArticleEditorMode = "create" | "edit";

type EditableBlock = (ArticleBlock & { id: string; file?: File | null; previewUrl?: string | null });
type EditableArticle = Omit<Article, "comments">;
type ArticleImageBlock = Extract<ArticleBlock, { type: "image" }>;

type Props = {
  mode: ArticleEditorMode;
  initialValue?: EditableArticle;
  initialComments?: Article["comments"];
  defaultCategory?: ArticleCategory;
  linkEventId?: string | null;
  returnTo?: string | null;
};

export function ArticleEditor({
  mode,
  initialValue,
  initialComments = [],
  defaultCategory = "news",
  linkEventId,
  returnTo,
}: Props) {
  const router = useRouter();

  const [title, setTitle] = useState(initialValue?.title ?? "");
  const [slug, setSlug] = useState(initialValue?.slug ?? "");
  const normalizedDefaultCategory: ArticleCategory =
    defaultCategory === "news" || defaultCategory === "chronicles" || defaultCategory === "members"
      ? defaultCategory
      : "news";
  const initialCategories =
    initialValue?.categories && initialValue.categories.length > 0
      ? initialValue.categories
      : initialValue
        ? [initialValue.category]
        : [normalizedDefaultCategory];
  const [categories, setCategories] = useState<ArticleCategory[]>(initialCategories);
  const [author, setAuthor] = useState(initialValue?.author ?? "");
  const [date, setDate] = useState(initialValue?.date ?? new Date().toISOString().slice(0, 10));
  const [banner, setBanner] = useState(initialValue?.banner ?? "");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);
  const [tags, setTags] = useState(initialValue?.tags.join(", ") ?? "");
  const [summary, setSummary] = useState(initialValue?.summary ?? "");
  const [blocks, setBlocks] = useState<EditableBlock[]>(() =>
    (initialValue?.body ?? []).map((block) => ({
      ...block,
      id: generateId(),
      file: null,
      previewUrl: null,
    })),
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pageTitle = mode === "create" ? "Crear nueva noticia" : "Editar noticia";
  const submitLabel = mode === "create" ? "Crear noticia" : "Guardar cambios";

  const isValid = useMemo(() => {
    const hasBanner = Boolean(bannerFile || banner);
    return (
      hasBanner &&
      categories.length > 0 &&
      title.trim().length > 3 &&
      summary.trim().length > 10 &&
      blocks.length > 0
    );
  }, [banner, bannerFile, blocks.length, categories.length, summary, title]);

  useEffect(() => {
    return () => {
      if (bannerPreviewUrl && bannerPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(bannerPreviewUrl);
      }
    };
  }, [bannerPreviewUrl]);

  const toggleCategory = (value: ArticleCategory) => {
    setCategories((prev) => {
      if (prev.includes(value)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== value);
      }
      return [...prev, value];
    });
  };

  const handleBannerFileChange = (file: File) => {
    if (bannerPreviewUrl && bannerPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(bannerPreviewUrl);
    }
    const objectUrl = URL.createObjectURL(file);
    setBannerFile(file);
    setBannerPreviewUrl(objectUrl);
    setBanner(objectUrl);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) {
      setStatusMessage(
        "Completa al menos el titulo, el resumen, selecciona una categoria y anade contenido al cuerpo de la noticia.",
      );
      return;
    }

    setSaving(true);
    setStatusMessage("Guardando noticia...");
    try {
      const selectedCategories: ArticleCategory[] =
        categories.length > 0 ? categories : (["news"] as ArticleCategory[]);
      const slugValue = (slug || generateSlug(title)).trim();
      const bannerDataUrl = bannerFile ? await fileToDataUrl(bannerFile) : banner;
      const bodyBlocks = await Promise.all(blocks.map((block) => serializeBlock(block)));

      const article: Article = {
        id: initialValue?.id ?? generateId(),
        category: selectedCategories[0],
        categories: selectedCategories,
        slug: slugValue,
        title: title.trim(),
        author: author.trim() || "Equipo Bilbohammer",
        date,
        banner: bannerDataUrl,
        tags: parseTags(tags),
        summary: summary.trim(),
        body: bodyBlocks,
        comments: initialComments,
      };

      const response = await fetch("/api/novedades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo guardar la noticia.");
      }

      const data = (await response.json()) as { id: string; slug: string; category: ArticleCategory };

      if (linkEventId) {
        const chronicleResponse = await fetch(
          `/api/events/${encodeURIComponent(linkEventId)}/chronicle`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chronicleArticleId: data.id }),
          },
        );
        if (!chronicleResponse.ok) {
          const chroniclePayload = await chronicleResponse.json().catch(() => null);
          throw new Error(
            chroniclePayload?.error ?? "No se pudo vincular la cronica con el evento.",
          );
        }
      }

      setStatusMessage("Noticia guardada correctamente. Redirigiendo...");
      const targetUrl =
        returnTo && returnTo.length > 0
          ? returnTo
          : `/novedades/${data.category}/${data.slug}`;
      router.push(targetUrl);
      router.refresh();
    } catch (error) {
      console.error("[novedades] error guardando noticia", error);
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Ocurrio un problema al guardar la noticia. Intentalo de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  };


  const updateBlock = (id: string, changes: Partial<EditableBlock>) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== id) return block;
        if (block.type === "image" && "previewUrl" in changes) {
          if (block.previewUrl && block.previewUrl.startsWith("blob:") && block.previewUrl !== changes.previewUrl) {
            URL.revokeObjectURL(block.previewUrl);
          }
        }
        return { ...block, ...changes };
      }),
    );
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => {
      const target = prev.find((block) => block.id === id);
      if (target && target.type === "image" && target.previewUrl && target.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((block) => block.id !== id);
    });
  };

  const addBlock = (type: ArticleBlock["type"]) => {
    const base: EditableBlock = {
      id: generateId(),
      type,
      ...(type === "paragraph"
        ? { text: "" }
        : type === "heading"
          ? { level: 2, text: "" }
          : type === "image"
            ? { src: "", alt: "", caption: "", layout: "full", file: null, previewUrl: null }
            : { text: "", attribution: "" }),
    } as EditableBlock;
    setBlocks((prev) => [...prev, base]);
  };

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-8">
        <h1 className="text-3xl font-bold text-[var(--text)] sm:text-4xl">{pageTitle}</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Completa la información, añade bloques de contenido (texto, citas, imágenes) y guarda el borrador para
          publicarlo más tarde.
        </p>
        {statusMessage && (
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-600)]">
            {statusMessage}
          </p>
        )}
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-6 md:grid-cols-2">
          <LabeledInput label="Título" required>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] px-4 py-3 text-sm text-[var(--text)] focus:border-[var(--accent-400)] focus:outline-none"
              placeholder="Ej. Nueva campaña de iniciación"
              required
            />
          </LabeledInput>
          <LabeledInput label="Slug" helper="Si lo dejas vacío se generará automáticamente desde el título.">
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className="w-full rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] px-4 py-3 text-sm text-[var(--text)] focus:border-[var(--accent-400)] focus:outline-none"
              placeholder="campana-iniciacion-otono-2025"
            />
          </LabeledInput>
          <LabeledFieldset
            label="Categorías"
            helper="Selecciona al menos una categoría. La primera determinará la ruta principal de la noticia."
            required
          >
            <div className="flex flex-col gap-2">
              {(Object.keys(CATEGORY_LABELS) as ArticleCategory[]).map((value) => {
                const id = `article-category-${value}`;
                const checked = categories.includes(value);
                return (
                  <div key={value} className="flex items-center gap-3">
                    <input
                      id={id}
                      type="checkbox"
                      className="h-4 w-4 rounded border border-[var(--hairline)] bg-[var(--card)] text-[var(--accent-600)] focus:ring-2 focus:ring-[var(--accent-400)]"
                      checked={checked}
                      onChange={() => toggleCategory(value)}
                    />
                    <label htmlFor={id} className="text-sm text-[var(--text)]">
                      {CATEGORY_LABELS[value]}
                    </label>
                  </div>
                );
              })}
            </div>
          </LabeledFieldset>
          <LabeledInput label="Autor">
            <input
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              className="w-full rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] px-4 py-3 text-sm text-[var(--text)] focus:border-[var(--accent-400)] focus:outline-none"
              placeholder="Nombre visible en la publicación"
            />
          </LabeledInput>
          <LabeledInput label="Fecha de publicación">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] px-4 py-3 text-sm text-[var(--text)] focus:border-[var(--accent-400)] focus:outline-none"
            />
          </LabeledInput>
          <LabeledInput
            label="Banner"
            helper="Selecciona un archivo para la imagen principal de la tarjeta hero y la cabecera."
          >
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      handleBannerFileChange(file);
                    }
                  }}
                  className="w-full rounded-2xl border border-dashed border-[var(--hairline)] bg-[var(--card-muted)] px-4 py-3 text-sm text-[var(--muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--accent-600)] file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.3em] file:text-white hover:file:bg-[var(--accent-500)] focus:border-[var(--accent-400)] focus:outline-none sm:max-w-sm"
                />
                {bannerFile && (
                  <span className="text-xs text-[var(--muted)]">Archivo seleccionado: {bannerFile.name}</span>
                )}
              </div>
              {banner && (
                <div className="overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)]">
                  <img src={banner} alt="Vista previa del banner" className="h-32 w-full object-cover" />
                </div>
              )}
            </div>
          </LabeledInput>
          <LabeledInput label="Etiquetas">
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              className="w-full rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] px-4 py-3 text-sm text-[var(--text)] focus:border-[var(--accent-400)] focus:outline-none"
              placeholder="comunidad, eventos"
            />
          </LabeledInput>
        </div>

        <div className="rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-6">
          <LabeledInput
            label="Resumen"
            helper="Se mostrará en las tarjetas hero y como introducción rápida de la noticia."
            required
          >
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] px-4 py-3 text-sm text-[var(--text)] focus:border-[var(--accent-400)] focus:outline-none"
              placeholder="Describe en pocas líneas el contenido principal…"
              required
            />
          </LabeledInput>
        </div>

        <div className="space-y-4 rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--text)]">Contenido principal</h2>
            <div className="flex flex-wrap gap-2">
              <AddBlockButton label="Añadir párrafo" onClick={() => addBlock("paragraph")} />
              <AddBlockButton label="Añadir encabezado" onClick={() => addBlock("heading")} />
              <AddBlockButton label="Añadir imagen" onClick={() => addBlock("image")} />
              <AddBlockButton label="Añadir cita" onClick={() => addBlock("quote")} />
            </div>
          </header>

          {blocks.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-[var(--hairline)] bg-[var(--card-muted)] p-6 text-center text-sm text-[var(--muted)]">
              Todavía no has añadido bloques. Empieza por un párrafo o una imagen para dar forma a la noticia.
            </p>
          ) : (
            <div className="space-y-4">
              {blocks.map((block, index) => (
                <BlockEditor
                  key={block.id}
                  block={block}
                  index={index}
                  onChange={(changes) => updateBlock(block.id, changes)}
                  onRemove={() => removeBlock(block.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!isValid || saving}
            className="rounded-full bg-[var(--accent-600)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-[var(--accent-500)] disabled:opacity-60"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}

type LabeledInputProps = {
  label: string;
  helper?: string;
  required?: boolean;
  children: ReactNode;
};

type LabeledFieldsetProps = {
  label: string;
  helper?: string;
  required?: boolean;
  children: ReactNode;
};

function LabeledInput({ label, helper, required, children }: LabeledInputProps) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
      {helper && <span className="block text-xs text-[var(--muted)]">{helper}</span>}
    </label>
  );
}

function LabeledFieldset({ label, helper, required, children }: LabeledFieldsetProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
        {label}
        {required ? " *" : ""}
      </legend>
      {children}
      {helper && <span className="block text-xs text-[var(--muted)]">{helper}</span>}
    </fieldset>
  );
}

type AddBlockButtonProps = {
  label: string;
  onClick: () => void;
};

function AddBlockButton({ label, onClick }: AddBlockButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-[var(--hairline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)] transition hover:text-[var(--text)]"
    >
      {label}
    </button>
  );
}

type BlockEditorProps = {
  block: EditableBlock;
  index: number;
  onChange: (changes: Partial<EditableBlock>) => void;
  onRemove: () => void;
};

function BlockEditor({ block, index, onChange, onRemove }: BlockEditorProps) {
  const handleImageUrlChange = (value: string) => {
    if (block.type !== "image") {
      onChange({ src: value });
      return;
    }
    const updates: Partial<EditableBlock> = { src: value };
    if (block.previewUrl && block.previewUrl.startsWith("blob:")) {
      updates.previewUrl = null;
      updates.file = null;
    }
    onChange(updates);
  };

  const handleImageFileChange = (file: File) => {
    if (block.type !== "image") return;
    const objectUrl = URL.createObjectURL(file);
    onChange({
      file,
      previewUrl: objectUrl,
      src: objectUrl,
    });
  };

  return (
    <div className="space-y-3 rounded-3xl border border-[var(--hairline)] bg-[var(--card-muted)] p-6">
      <header className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
          Bloque {index + 1}: {renderBlockLabel(block.type)}
        </p>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-600)] hover:text-[var(--accent-500)]"
        >
          Eliminar
        </button>
      </header>

      {block.type === "paragraph" && (
        <textarea
          value={block.text}
          onChange={(event) => onChange({ text: event.target.value })}
          rows={4}
          className="w-full rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] focus:border-[var(--accent-400)] focus:outline-none"
          placeholder="Escribe el párrafo…"
        />
      )}

      {block.type === "heading" && (
        <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
          <select
            value={block.level}
            onChange={(event) => onChange({ level: Number(event.target.value) as 2 | 3 })}
            className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] focus:border-[var(--accent-400)] focus:outline-none"
          >
            <option value={2}>Encabezado H2</option>
            <option value={3}>Encabezado H3</option>
          </select>
          <input
            value={block.text}
            onChange={(event) => onChange({ text: event.target.value })}
            className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] focus:border-[var(--accent-400)] focus:outline-none"
            placeholder="Título del bloque"
          />
        </div>
      )}

      {block.type === "image" && (
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={block.src}
            onChange={(event) => handleImageUrlChange(event.target.value)}
            className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] focus:border-[var(--accent-400)] focus:outline-none"
            placeholder="URL de la imagen"
          />
          <input
            value={block.alt}
            onChange={(event) => onChange({ alt: event.target.value })}
            className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] focus:border-[var(--accent-400)] focus:outline-none"
            placeholder="Texto alternativo"
          />
          <div className="md:col-span-2 space-y-2">
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  handleImageFileChange(file);
                }
              }}
              className="w-full rounded-2xl border border-dashed border-[var(--hairline)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--accent-600)] file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.3em] file:text-white hover:file:bg-[var(--accent-500)] focus:border-[var(--accent-400)] focus:outline-none"
            />
            {block.file instanceof File && (
              <span className="text-xs text-[var(--muted)]">Archivo seleccionado: {block.file.name}</span>
            )}
            {(block.previewUrl || block.src) && (
              <div className="overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)]">
                <img
                  src={block.previewUrl ?? block.src}
                  alt={block.alt || "Vista previa de la imagen"}
                  className="h-40 w-full object-cover"
                />
              </div>
            )}
          </div>
          <input
            value={block.caption ?? ""}
            onChange={(event) => onChange({ caption: event.target.value })}
            className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] focus:border-[var(--accent-400)] focus:outline-none md:col-span-2"
            placeholder="Pie de foto (opcional)"
          />
          <select
            value={block.layout ?? "full"}
            onChange={(event) => onChange({ layout: event.target.value as ArticleImageBlock["layout"] })}
            className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] focus:border-[var(--accent-400)] focus:outline-none"
          >
            <option value="full">Ancho completo</option>
            <option value="float-left">Flotar a la izquierda</option>
            <option value="float-right">Flotar a la derecha</option>
          </select>
        </div>
      )}

      {block.type === "quote" && (
        <div className="space-y-3">
          <textarea
            value={block.text}
            onChange={(event) => onChange({ text: event.target.value })}
            rows={3}
            className="w-full rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] focus:border-[var(--accent-400)] focus:outline-none"
            placeholder="Texto de la cita"
          />
          <input
            value={block.attribution ?? ""}
            onChange={(event) => onChange({ attribution: event.target.value })}
            className="w-full rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] focus:border-[var(--accent-400)] focus:outline-none"
            placeholder="Atribución (opcional)"
          />
        </div>
      )}
    </div>
  );
}

async function serializeBlock(block: EditableBlock): Promise<ArticleBlock> {
  if (block.type === "image") {
    let src = block.src;
    if (block.file instanceof File) {
      src = await fileToDataUrl(block.file);
    }
    const { id: _id, file: _file, previewUrl: _previewUrl, ...rest } = block;
    return { ...rest, src } as ArticleBlock;
  }
  const { id: _id, file: _file, previewUrl: _previewUrl, ...rest } = block as EditableBlock & Record<string, unknown>;
  return rest as ArticleBlock;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("No se pudo leer el archivo seleccionado."));
      }
    };
    reader.onerror = () => {
      reject(new Error("No se pudo leer el archivo seleccionado."));
    };
    reader.readAsDataURL(file);
  });
}

function renderBlockLabel(type: ArticleBlock["type"]) {
  switch (type) {
    case "paragraph":
      return "Párrafo";
    case "heading":
      return "Encabezado";
    case "image":
      return "Imagen";
    case "quote":
      return "Cita";
    default:
      return "Bloque";
  }
}

function generateId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function generateSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function parseTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    ),
  );
}

