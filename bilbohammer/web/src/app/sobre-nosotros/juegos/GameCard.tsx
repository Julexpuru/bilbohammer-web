'use client';

import { useRef, useState } from "react";
import type { MouseEvent } from "react";
import Image from "next/image";
import type { GameId } from "@/lib/games";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

const LEARNING_OPTIONS = ["Baja", "Media", "Alta"] as const;

type GameCardProps = {
  gameId: GameId;
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
  contactEmail: string | null;
  contactNote: string;
  canEdit: boolean;
  apiPath: string;
};

export function GameCard(props: GameCardProps) {
  const {
    gameId,
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
    contactEmail,
    contactNote,
    canEdit,
    apiPath,
  } = props;

  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [summaryState, setSummaryState] = useState(summary);
  const [contentState, setContentState] = useState(contentHtml);
  const [investmentState, setInvestmentState] = useState(investment);
  const [playtimeState, setPlaytimeState] = useState(playtime);
  const [learningState, setLearningState] = useState(learning);
  const [contactDisplayState, setContactDisplayState] = useState(contactDisplay);
  const [contactEmailState, setContactEmailState] = useState(contactEmail ?? "");
  const [contactNoteState, setContactNoteState] = useState(contactNote);

  const [editing, setEditing] = useState(false);
  const [formSummary, setFormSummary] = useState(summaryState);
  const [formContent, setFormContent] = useState(contentState);
  const [formInvestment, setFormInvestment] = useState(investmentState);
  const [formPlaytime, setFormPlaytime] = useState(playtimeState);
  const [formLearning, setFormLearning] = useState(
    LEARNING_OPTIONS.includes(learningState as any) ? learningState : "Media",
  );
  const [formContactEmail, setFormContactEmail] = useState(contactEmailState);
  const [formContactNote, setFormContactNote] = useState(contactNoteState);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const ensureOpen = () => {
    if (detailsRef.current && !detailsRef.current.open) {
      detailsRef.current.open = true;
    }
  };

  const handleEditClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    ensureOpen();
    setFormSummary(summaryState);
    setFormContent(contentState);
    setFormInvestment(investmentState);
    setFormPlaytime(playtimeState);
    setFormLearning(LEARNING_OPTIONS.includes(learningState as any) ? learningState : "Media");
    setFormContactEmail(contactEmailState);
    setFormContactNote(contactNoteState);
    setError(null);
    setSuccess(false);
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setError(null);
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const response = await fetch(apiPath, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId,
          summary: formSummary,
          contentHtml: formContent,
          investment: formInvestment,
          playtime: formPlaytime,
          learning: formLearning,
          contactEmail: formContactEmail.trim() ? formContactEmail.trim() : null,
          contactNote: formContactNote,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "No se pudo guardar los cambios.");
      }

      setSummaryState(payload.summary ?? formSummary);
      setContentState(payload.contentHtml ?? formContent);
      setInvestmentState(payload.investment ?? formInvestment);
      setPlaytimeState(payload.playtime ?? formPlaytime);
      setLearningState(payload.learning ?? formLearning);
      setContactDisplayState(payload.contactDisplay ?? contactDisplayState);
      setContactEmailState(payload.contactEmail ?? "");
      setContactNoteState(payload.contactNote ?? formContactNote);

      setEditing(false);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <details
      ref={detailsRef}
      className="group overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-6 transition duration-200 hover:border-[var(--accent-300)] hover:shadow-lg"
    >
      <summary className="flex cursor-pointer items-center gap-6 text-left outline-none">
        <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)]">
          <Image src={iconUrl} alt={name} fill className="object-contain p-3" />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-2xl font-semibold text-[var(--text)]">{name}</h2>
            <div className="flex items-center gap-2">
              {canEdit && (
                <button
                  type="button"
                  onClick={handleEditClick}
                  className="rounded-full border border-[var(--hairline)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)] transition hover:border-[var(--accent-400)] hover:text-[var(--accent-500)]"
                >
                  Editar textos
                </button>
              )}
              <span
                aria-hidden="true"
                className="text-xl font-semibold text-[var(--accent-600)] transition-transform duration-200 group-open:rotate-180"
              >
                v
              </span>
            </div>
          </div>
          <p className="text-sm text-[var(--muted)]">{summaryState}</p>
        </div>
      </summary>

      <div className="mt-6 space-y-6 text-sm text-[var(--muted)]">
        <div className="overflow-hidden rounded-3xl border border-[var(--hairline)]">
          <div className="relative h-56 w-full">
            <Image src={heroImageUrl} alt={`Ambientacion de ${name}`} fill className="object-cover" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-[var(--card)] opacity-90" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Category label="Inversion inicial" value={investmentState} />
          <Category label="Tiempo por partida" value={playtimeState} />
          <Category label="Curva de aprendizaje" value={learningState} />
          <Category
            label="Jugadores en el club"
            value={memberCount === 1 ? "1 persona" : `${memberCount} personas`}
          />
        </div>

        {editing ? (
          <div className="space-y-4 rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">
                Resumen
                <input
                  type="text"
                  value={formSummary}
                  onChange={(event) => setFormSummary(event.target.value)}
                  className="w-full rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-400)]"
                  placeholder="Resumen breve"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">
                Inversion inicial
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
                  onChange={(event) => setFormLearning(event.target.value)}
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
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">
                Descripcion detallada
              </p>
              <RichTextEditor
                value={formContent}
                onChange={setFormContent}
                placeholder="Describe actividades, ligas y recursos..."
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">
                Email de referencia (opcional)
                <input
                  type="email"
                  value={formContactEmail}
                  onChange={(event) => setFormContactEmail(event.target.value)}
                  className="w-full rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-400)]"
                  placeholder="socio@bilbohammer.test"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">
                Nota de contacto
                <input
                  type="text"
                  value={formContactNote}
                  onChange={(event) => setFormContactNote(event.target.value)}
                  className="w-full rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-400)]"
                  placeholder="Coordinacion del sistema, etc."
                />
              </label>
            </div>

            {error ? <p className="text-xs text-red-500">{error}</p> : null}
            {success ? <p className="text-xs text-green-500">Cambios guardados correctamente.</p> : null}

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-full border border-[var(--hairline)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)] transition hover:border-[var(--accent-200)] hover:text-[var(--accent-500)]"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-full bg-[var(--accent-600)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[var(--accent-500)] disabled:opacity-60"
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 text-[var(--text)]">
            <div dangerouslySetInnerHTML={{ __html: contentState }} className="space-y-3 text-sm leading-relaxed" />
            <div className="space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">
              <p>Referencia: {contactDisplayState}</p>
              {contactNoteState ? (
                <p className="text-[var(--muted)] normal-case">{contactNoteState}</p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

function Category({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">{label}</p>
      <p className="mt-1 text-base font-medium text-[var(--text)]">{value}</p>
    </div>
  );
}
