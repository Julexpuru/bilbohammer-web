'use client';
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { assetUrl } from "@/lib/assets";
import { uploadImageToR2 } from "@/lib/uploads/presign-client";

type GameCardProps = {
  slug: string;
  name: string;
  iconUrl: string;
  heroImageUrl: string;
  summary: string;
  contentHtml: string;
  investment: string;
  playtime: string;
  learning: string;
  memberCount: number;
  contactDisplay: string;
  contactUserId: number | null;
  contactEmail: string | null;
  contactNote: string;
  canEdit: boolean;
  apiPath: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  initiallyOpen?: boolean;
};

type MemberSearchResult = {
  id: number;
  nick: string | null;
  name: string | null;
  email: string | null;
  roles: string[];
};

const LEARNING_OPTIONS = ["Baja", "Media", "Alta"] as const;

export function GameCard(props: GameCardProps) {
  const {
    slug,
    name,
    iconUrl,
    heroImageUrl,
    summary,
    contentHtml,
    investment,
    playtime,
    learning,
    memberCount,
    contactDisplay,
    contactUserId,
    contactEmail,
  contactNote,
  canEdit,
  apiPath,
  canMoveUp,
  canMoveDown,
  initiallyOpen = false,
} = props;

  const router = useRouter();
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const autoOpenedRef = useRef(false);

  const [summaryState, setSummaryState] = useState(summary);
  const [contentState, setContentState] = useState(contentHtml);
  const [investmentState, setInvestmentState] = useState(investment);
  const [playtimeState, setPlaytimeState] = useState(playtime);
  const [learningState, setLearningState] = useState(learning);
  const [contactNoteState, setContactNoteState] = useState(contactNote);
  const [contactDisplayState, setContactDisplayState] = useState(contactDisplay);
  const [contactEmailState, setContactEmailState] = useState(contactEmail);

  const [iconPreview, setIconPreview] = useState(iconUrl);
  const [heroPreview, setHeroPreview] = useState(heroImageUrl);

  const [editing, setEditing] = useState(false);
  const [formSummary, setFormSummary] = useState(summaryState);
  const [formContent, setFormContent] = useState(contentState);
  const [formInvestment, setFormInvestment] = useState(investmentState);
  const [formPlaytime, setFormPlaytime] = useState(playtimeState);
  const [formLearning, setFormLearning] = useState<"Baja" | "Media" | "Alta">(
    LEARNING_OPTIONS.includes(learningState as (typeof LEARNING_OPTIONS)[number]) ? (learningState as any) : "Media",
  );
  const [formContactNote, setFormContactNote] = useState(contactNoteState);

  const initialContact = useMemo(
    () =>
      contactUserId
        ? {
            id: contactUserId,
            display: contactDisplay,
            email: contactEmail,
          }
        : null,
    [contactDisplay, contactEmail, contactUserId],
  );
  const [selectedContact, setSelectedContact] = useState(initialContact);
  const [contactSearch, setContactSearch] = useState("");
  const { results: contactResults, loading: contactLoading } = useMemberSearch(contactSearch);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [iconUploading, setIconUploading] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [reorderBusy, setReorderBusy] = useState(false);

  const iconInputRef = useRef<HTMLInputElement | null>(null);
  const heroInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSummaryState(summary);
    setContentState(contentHtml);
    setInvestmentState(investment);
    setPlaytimeState(playtime);
    setLearningState(learning);
    setContactNoteState(contactNote);
    setFormSummary(summary);
    setFormContent(contentHtml);
    setFormInvestment(investment);
    setFormPlaytime(playtime);
    setFormLearning(LEARNING_OPTIONS.includes(learning as any) ? (learning as any) : "Media");
    setFormContactNote(contactNote);
    setSelectedContact(initialContact);
    setContactDisplayState(contactDisplay);
    setContactEmailState(contactEmail);
  }, [summary, contentHtml, investment, playtime, learning, contactNote, initialContact, contactDisplay, contactEmail]);

  useEffect(() => {
    if (initiallyOpen && detailsRef.current && !autoOpenedRef.current) {
      detailsRef.current.open = true;
      autoOpenedRef.current = true;
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }
  }, [initiallyOpen]);

  const handleEditClick = () => {
    if (detailsRef.current && !detailsRef.current.open) {
      detailsRef.current.open = true;
    }
    setEditing(true);
    setSuccess(false);
    setSaveError(null);
  };

  const handleCancel = () => {
    setEditing(false);
    setSaveError(null);
    setSuccess(false);
    setFormSummary(summaryState);
    setFormContent(contentState);
    setFormInvestment(investmentState);
    setFormPlaytime(playtimeState);
    setFormLearning(LEARNING_OPTIONS.includes(learningState as any) ? (learningState as any) : "Media");
    setFormContactNote(contactNoteState);
    setSelectedContact(initialContact);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSuccess(false);
    try {
      const response = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: formSummary,
          contentHtml: formContent,
          investment: formInvestment,
          playtime: formPlaytime,
          learning: formLearning,
          contactUserId: selectedContact?.id ?? null,
          contactNote: formContactNote,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "No se pudieron guardar los cambios.");
      }

      setSummaryState(payload.summary ?? formSummary);
      setContentState(payload.contentHtml ?? formContent);
      setInvestmentState(payload.investment ?? formInvestment);
      setPlaytimeState(payload.playtime ?? formPlaytime);
      setLearningState(payload.learning ?? formLearning);
      setContactNoteState(payload.contactNote ?? formContactNote);
      setContactDisplayState(payload.contactDisplay ?? contactDisplayState);
      setContactEmailState(payload.contactEmail ?? contactEmailState);
      setSelectedContact(
        payload.contactUserId
          ? {
              id: payload.contactUserId,
              display: payload.contactDisplay ?? contactDisplayState,
              email: payload.contactEmail ?? null,
            }
          : null,
      );
      setSuccess(true);
      setEditing(false);
      router.refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Error desconocido al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageButton = (kind: "icon" | "hero") => {
    if (!canEdit) return;
    const target = kind === "icon" ? iconInputRef.current : heroInputRef.current;
    target?.click();
  };

  const handleImageSelected = async (kind: "icon" | "hero", file: File | null) => {
    if (!file) return;
    setUploadError(null);
    const setUploading = kind === "icon" ? setIconUploading : setHeroUploading;
    setUploading(true);
    try {
      const { publicUrl } = await uploadImageToR2(file);
      const response = await fetch(`/api/admin/games/${encodeURIComponent(slug)}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, imageUrl: publicUrl }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Error actualizando la imagen.");
      }

      if (payload.iconImagePath && kind === "icon") {
        setIconPreview(payload.iconImagePath);
      }
      if (payload.heroImagePath && kind === "hero") {
        setHeroPreview(payload.heroImagePath);
      }
      router.refresh();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
      if (kind === "icon" && iconInputRef.current) iconInputRef.current.value = "";
      if (kind === "hero" && heroInputRef.current) heroInputRef.current.value = "";
    }
  };

  const handleReorder = async (direction: "up" | "down") => {
    if (reorderBusy) return;
    setReorderBusy(true);
    try {
      const response = await fetch(`/api/admin/games/${encodeURIComponent(slug)}/order`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "No se pudo reordenar el juego.");
      }
      router.refresh();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "No se pudo reordenar el juego.");
    } finally {
      setReorderBusy(false);
    }
  };

  const coordinatorDisplay = selectedContact?.display ?? contactDisplayState;
  const coordinatorEmail = selectedContact?.email ?? contactEmailState;

  return (
    <details id={slug} ref={detailsRef} className="group rounded-3xl border border-[var(--hairline)] bg-[var(--card)] shadow-sm transition">
      <summary className="flex flex-col gap-4 rounded-3xl px-5 py-4 transition hover:bg-[var(--card-muted)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative h-36 w-36 overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)]">
            <Image
              src={iconPreview || heroPreview || assetUrl("/assets/icons/games/otros.png")}
              alt={`${name} icon`}
              fill
              className="object-contain p-3"
              sizes="144px"
            />
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-semibold">{name}</h3>
              {canEdit && (
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  <button
                    type="button"
                    onClick={handleEditClick}
                    className="rounded-full border border-[var(--accent-200)] px-3 py-1 text-[var(--accent-600)] hover:bg-[var(--accent-50)]"
                  >
                    Editar ficha
                  </button>
                  <button
                    type="button"
                    onClick={() => handleImageButton("icon")}
                    className="rounded-full border border-[var(--accent-200)] px-3 py-1 text-[var(--accent-600)] hover:bg-[var(--accent-50)]"
                    disabled={iconUploading}
                  >
                    {iconUploading ? "Subiendo icono..." : "Cambiar icono"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleImageButton("hero")}
                    className="rounded-full border border-[var(--accent-200)] px-3 py-1 text-[var(--accent-600)] hover:bg-[var(--accent-50)]"
                    disabled={heroUploading}
                  >
                    {heroUploading ? "Subiendo banner..." : "Cambiar banner"}
                  </button>
                  <input
                    ref={iconInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => handleImageSelected("icon", event.target.files?.[0] ?? null)}
                  />
                  <input
                    ref={heroInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => handleImageSelected("hero", event.target.files?.[0] ?? null)}
                  />
                </div>
              )}
            </div>
            <p className="text-sm text-[var(--muted)]">{summaryState}</p>
          </div>

          <div className="flex w-full justify-end md:w-auto">
            {canEdit && (
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                <span className="hidden md:inline">Orden</span>
                <button
                  type="button"
                  onClick={() => handleReorder("up")}
                  className="rounded-full border border-[var(--hairline)] px-3 py-1 transition hover:text-[var(--accent-600)] disabled:opacity-40"
                  disabled={!canMoveUp || reorderBusy}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => handleReorder("down")}
                  className="rounded-full border border-[var(--hairline)] px-3 py-1 transition hover:text-[var(--accent-600)] disabled:opacity-40"
                  disabled={!canMoveDown || reorderBusy}
                >
                  ↓
                </button>
              </div>
            )}
          </div>
        </div>
        {uploadError ? <p className="text-xs text-red-500">{uploadError}</p> : null}
      </summary>

      <div className="overflow-hidden border-t border-[var(--hairline)]">
        <div className="relative h-64 w-full">
          <Image
            src={heroPreview || assetUrl("/assets/img/placeholder-game-hero.png")}
            alt={`${name} banner`}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-[var(--card)]" />
        </div>
        <div className="space-y-6 px-6 py-6">
          {editing ? (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">
                  Resumen
                  <input
                    type="text"
                    value={formSummary}
                    onChange={(event) => setFormSummary(event.target.value)}
                    className="w-full rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-400)]"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">
                  Inversión inicial
                  <input
                    type="text"
                    value={formInvestment}
                    onChange={(event) => setFormInvestment(event.target.value)}
                    className="w-full rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-400)]"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">
                  Tiempo por partida
                  <input
                    type="text"
                    value={formPlaytime}
                    onChange={(event) => setFormPlaytime(event.target.value)}
                    className="w-full rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-400)]"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">
                  Curva de aprendizaje
                  <select
                    value={formLearning}
                    onChange={(event) => setFormLearning(event.target.value as (typeof LEARNING_OPTIONS)[number])}
                    className="w-full rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-400)]"
                  >
                    {LEARNING_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">Descripción</p>
                <RichTextEditor
                  value={formContent}
                  onChange={setFormContent}
                  placeholder="Describe actividades, ligas y recursos..."
                  className="border-[var(--hairline)] bg-[var(--card)]"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">
                  Coordinador/a del juego
                </p>
                <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-[var(--hairline)] p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {selectedContact ? (
                      <div className="rounded-full border border-[var(--accent-200)] px-4 py-1 text-sm text-[var(--accent-600)]">
                        {selectedContact.display}
                      </div>
                    ) : (
                      <span className="text-sm text-[var(--muted)]">Sin coordinador asignado</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedContact(null)}
                      className="rounded-full border border-[var(--hairline)] px-3 py-1 text-xs uppercase tracking-wide text-[var(--muted)] hover:text-[var(--accent-600)]"
                    >
                      Limpiar
                    </button>
                  </div>
                  <input
                    type="text"
                    value={contactSearch}
                    onChange={(event) => setContactSearch(event.target.value)}
                    placeholder="Busca socios por nombre, nick o email..."
                    className="w-full rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-400)]"
                  />
                  {contactLoading ? <p className="text-xs text-[var(--muted)]">Buscando...</p> : null}
                  {contactResults.length > 0 && (
                    <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
                      {contactResults.map((member) => (
                        <li key={member.id}>
                          <button
                            type="button"
                            onClick={() => {
                              const display = buildContactLabel(member);
                              setSelectedContact({ id: member.id, display, email: member.email });
                              setContactSearch("");
                            }}
                            className="w-full rounded-xl border border-[var(--hairline)] bg-[var(--card-muted)] px-3 py-2 text-left hover:border-[var(--accent-200)] hover:text-[var(--accent-600)]"
                          >
                            <span className="font-semibold">
                              {member.nick ?? member.name ?? `Socio ${member.id}`}
                            </span>
                            {member.email ? <span className="ml-2 text-xs text-[var(--muted)]">{member.email}</span> : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">
                    Nota interna
                    <input
                      type="text"
                      value={formContactNote}
                      onChange={(event) => setFormContactNote(event.target.value)}
                      className="w-full rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-400)]"
                      placeholder="Coordinación del sistema, tareas, etc."
                    />
                  </label>
                </div>
              </div>

              {saveError ? <p className="text-xs text-red-500">{saveError}</p> : null}
              {success ? <p className="text-xs text-green-500">Cambios guardados correctamente.</p> : null}

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-full border border-[var(--hairline)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)] hover:border-[var(--accent-200)] hover:text-[var(--accent-500)]"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-full bg-[var(--accent-600)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-[var(--accent-500)] disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 text-sm leading-relaxed text-[var(--text)]">
              <div className="grid gap-3 text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)] sm:grid-cols-2 lg:grid-cols-4">
                <MetricBlock label="Jugadores activos" value={`${memberCount}`} />
                <MetricBlock label="Inversión inicial" value={investmentState || "Pendiente"} />
                <MetricBlock label="Tiempo por partida" value={playtimeState || "Pendiente"} />
                <MetricBlock label="Curva de aprendizaje" value={learningState || "Pendiente"} />
              </div>

              <div dangerouslySetInnerHTML={{ __html: contentState }} className="space-y-3 leading-relaxed" />

              <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">Coordinación</p>
                <p className="mt-1 text-sm font-medium text-[var(--text)]">{coordinatorDisplay}</p>
                {contactNoteState ? (
                  <p className="mt-2 text-xs text-[var(--muted)]">{contactNoteState}</p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </details>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-base font-medium text-[var(--text)]">{value}</p>
    </div>
  );
}

function buildContactLabel(member: MemberSearchResult) {
  const base = member.nick ?? member.name ?? `Socio ${member.id}`;
  const roles = member.roles?.length ? member.roles.join(" - ") : null;
  return roles ? `${base} - ${roles}` : base;
}

function useMemberSearch(query: string) {
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/members/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Estado ${response.status}`);
        }
        const payload = await response.json();
        const list = Array.isArray(payload?.results)
          ? (payload.results as MemberSearchResult[])
          : Array.isArray(payload?.members)
            ? (payload.members as MemberSearchResult[])
            : [];
        if (!cancelled) {
          setResults(list);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("[GameCard] Fallo al buscar socios", error);
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  return { results, loading };
}

