'use client';

import { useCallback, useState } from "react";
import Link from "next/link";
import { cloneContactContent, type ContactPageContent, type WhatsappEntry } from "@/lib/contact-content-data";
import { MembersCounter } from "./MembersCounter";

type Props = {
  content: ContactPageContent;
  canEdit: boolean;
  canSeeDiscord: boolean;
  memberCount: number;
  mapEmbedUrl: string | null;
  mapSourceUrl: string;
};

type StatusMessage = { type: "success" | "error"; text: string } | null;

const API_PATH = "/api/admin/contact-content";

export function ContactContentView({
  content: initialContent,
  canEdit,
  canSeeDiscord,
  memberCount,
  mapEmbedUrl,
  mapSourceUrl,
}: Props) {
  const [content, setContent] = useState<ContactPageContent>(initialContent);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<StatusMessage>(null);

  const [editingIntro, setEditingIntro] = useState(false);
  const [introDraft, setIntroDraft] = useState(() => content.intro);

  const [editingWhatsapp, setEditingWhatsapp] = useState(false);
  const [whatsappDraft, setWhatsappDraft] = useState(() => cloneWhatsappBlock(content.whatsapp));

  const [editingInstagram, setEditingInstagram] = useState(false);
  const [instagramDraft, setInstagramDraft] = useState(() => ({ ...content.instagram }));

  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState(() => ({ ...content.email }));

  const [editingDiscord, setEditingDiscord] = useState(false);
  const [discordDraft, setDiscordDraft] = useState(() => ({ ...content.discord }));

  const [editingVisit, setEditingVisit] = useState(false);
  const [visitDraft, setVisitDraft] = useState(() => ({
    description: content.visit.description,
    scheduleLines: content.visit.schedule.lines.join("\n"),
    accessLines: content.visit.access.lines.join("\n"),
  }));

  const [editingMembership, setEditingMembership] = useState(false);
  const [membershipDraft, setMembershipDraft] = useState(() => ({ ...content.membership }));

  const showDiscordCard = canSeeDiscord || canEdit;

  const persistContent = useCallback(
    async (mutator: (draft: ContactPageContent) => void) => {
      if (!canEdit) return false;
      const draft = cloneContactContent(content);
      mutator(draft);

      setSaving(true);
      setStatus(null);
      try {
        const response = await fetch(API_PATH, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "Error desconocido");
        }
        setContent(draft);
        setStatus({ type: "success", text: "Cambios guardados." });
        return true;
      } catch (error) {
        console.error("[contacto] Error guardando contenido", error);
        setStatus({ type: "error", text: "No se pudo guardar. Revisa la conexion e intenta de nuevo." });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [canEdit, content],
  );

  const handleIntroSave = async () => {
    if (!canEdit) return;
    const value = introDraft.trim();
    const ok = await persistContent((draft) => {
      draft.intro = value;
    });
    if (ok) {
      setEditingIntro(false);
    }
  };

  const handleWhatsappSave = async () => {
    if (!canEdit) return;
    const normalizedEntries = whatsappDraft.entries
      .map((entry) => normalizeEntry(entry))
      .filter((entry) => entry.phone.trim().length > 0);
    const community =
      whatsappDraft.community && whatsappDraft.community.url.trim()
        ? {
            label: whatsappDraft.community.label.trim() || "Comunidad de WhatsApp",
            url: whatsappDraft.community.url.trim(),
            description: whatsappDraft.community.description?.trim() || null,
          }
        : null;

    const ok = await persistContent((draft) => {
      draft.whatsapp.description = whatsappDraft.description.trim();
      draft.whatsapp.entries = normalizedEntries;
      draft.whatsapp.community = community;
    });
    if (ok) {
      setEditingWhatsapp(false);
    }
  };

  const handleInstagramSave = async () => {
    if (!canEdit) return;
    const ok = await persistContent((draft) => {
      draft.instagram.description = instagramDraft.description.trim();
      draft.instagram.handle = instagramDraft.handle.trim() || "@bilbohammerclub";
      draft.instagram.url = instagramDraft.url.trim() || "https://www.instagram.com/bilbohammerclub/";
    });
    if (ok) {
      setEditingInstagram(false);
    }
  };

  const handleEmailSave = async () => {
    if (!canEdit) return;
    const ok = await persistContent((draft) => {
      draft.email.description = emailDraft.description.trim();
      draft.email.address = emailDraft.address.trim();
    });
    if (ok) {
      setEditingEmail(false);
    }
  };

  const handleDiscordSave = async () => {
    if (!canEdit) return;
    const ok = await persistContent((draft) => {
      draft.discord.description = discordDraft.description.trim();
      draft.discord.inviteUrl = discordDraft.inviteUrl.trim();
    });
    if (ok) {
      setEditingDiscord(false);
    }
  };

  const handleVisitSave = async () => {
    if (!canEdit) return;
    const ok = await persistContent((draft) => {
      draft.visit.description = visitDraft.description.trim();
      draft.visit.schedule.lines = splitLines(visitDraft.scheduleLines);
      draft.visit.access.lines = splitLines(visitDraft.accessLines);
    });
    if (ok) {
      setEditingVisit(false);
    }
  };

  const handleMembershipSave = async () => {
    if (!canEdit) return;
    const ok = await persistContent((draft) => {
      draft.membership.intro = membershipDraft.intro.trim();
      draft.membership.requirements = membershipDraft.requirements.trim();
      draft.membership.pricing = membershipDraft.pricing.trim();
      draft.membership.benefits = membershipDraft.benefits.trim();
    });
    if (ok) {
      setEditingMembership(false);
    }
  };

  const statusStyles =
    status?.type === "success"
      ? "rounded-full border border-green-400 bg-green-900/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-green-300"
      : "rounded-full border border-red-300 bg-red-900/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-red-200";

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">Contacto</h1>
        <section className="card space-y-3">
          {editingIntro && canEdit ? (
            <>
              <textarea
                value={introDraft}
                onChange={(event) => setIntroDraft(event.target.value)}
                className="min-h-[120px] w-full rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-3 text-sm"
                disabled={saving}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleIntroSave}
                  className="rounded-full bg-[var(--accent-600)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white disabled:opacity-60"
                  disabled={saving}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIntroDraft(content.intro);
                    setEditingIntro(false);
                  }}
                  className="rounded-full border border-[var(--hairline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em]"
                  disabled={saving}
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              <p>{content.intro}</p>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setIntroDraft(content.intro);
                    setEditingIntro(true);
                  }}
                  className="rounded-full border border-[var(--hairline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em]"
                  disabled={saving}
                >
                  Editar texto
                </button>
              )}
            </>
          )}
        </section>
      </div>

      <section className="mx-auto w-full max-w-sm">
        <div className="card flex flex-col items-center gap-1 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--accent-600)]">
            Socios actuales
          </span>
          <div className="text-4xl font-semibold text-[var(--text)]">
            <MembersCounter target={memberCount} />
          </div>
          <p className="text-xs text-[var(--muted)]">Personas activas registradas en la plataforma</p>
        </div>
      </section>

      <section className="card space-y-6">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold">Canales de contacto</h2>
          <p className="text-sm text-[var(--muted)]">
            Elige el canal que mejor se ajuste a tu consulta. La junta revisa todo a diario.
          </p>
        </header>

        <div className="space-y-5">
          {renderWhatsappCard({
            canEdit,
            saving,
            content: content.whatsapp,
            editing: editingWhatsapp,
            draft: whatsappDraft,
            onDraftChange: setWhatsappDraft,
            onEdit: () => {
              setWhatsappDraft(cloneWhatsappBlock(content.whatsapp));
              setEditingWhatsapp(true);
            },
            onCancel: () => {
              setWhatsappDraft(cloneWhatsappBlock(content.whatsapp));
              setEditingWhatsapp(false);
            },
            onSave: handleWhatsappSave,
          })}

          {renderInstagramCard({
            canEdit,
            saving,
            content: content.instagram,
            editing: editingInstagram,
            draft: instagramDraft,
            onDraftChange: setInstagramDraft,
            onEdit: () => {
              setInstagramDraft({ ...content.instagram });
              setEditingInstagram(true);
            },
            onCancel: () => {
              setInstagramDraft({ ...content.instagram });
              setEditingInstagram(false);
            },
            onSave: handleInstagramSave,
          })}

          {renderEmailCard({
            canEdit,
            saving,
            content: content.email,
            editing: editingEmail,
            draft: emailDraft,
            onDraftChange: setEmailDraft,
            onEdit: () => {
              setEmailDraft({ ...content.email });
              setEditingEmail(true);
            },
            onCancel: () => {
              setEmailDraft({ ...content.email });
              setEditingEmail(false);
            },
            onSave: handleEmailSave,
          })}

          {(showDiscordCard &&
            renderDiscordCard({
              canEdit,
              saving,
              content: content.discord,
              editing: editingDiscord,
              draft: discordDraft,
              onDraftChange: setDiscordDraft,
              onEdit: () => {
                setDiscordDraft({ ...content.discord });
                setEditingDiscord(true);
              },
              onCancel: () => {
                setDiscordDraft({ ...content.discord });
                setEditingDiscord(false);
              },
              onSave: handleDiscordSave,
            })) ||
            null}
        </div>
      </section>

      <section className="card space-y-6">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold">Visitanos</h2>
          {editingVisit && canEdit ? (
            <textarea
              value={visitDraft.description}
              onChange={(event) => setVisitDraft((prev) => ({ ...prev, description: event.target.value }))}
              className="min-h-[100px] w-full rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-3 text-sm"
              disabled={saving}
            />
          ) : (
            <p className="text-sm text-[var(--muted)]">{content.visit.description}</p>
          )}
        </header>

        {mapEmbedUrl ? (
          <div className="overflow-hidden rounded-3xl border border-[var(--hairline)]">
            <iframe
              src={mapEmbedUrl}
              title="Ubicacion del local Bilbohammer"
              className="h-72 w-full"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[var(--hairline)] bg-[var(--card-muted)] p-6 text-sm text-[var(--muted)]">
            No se pudo cargar el mapa.{" "}
            <a href={mapSourceUrl} target="_blank" rel="noreferrer" className="underline">
              Abre la ubicacion en Google Maps
            </a>
            .
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-5">
            <h3 className="text-base font-semibold text-[var(--text)]">{content.visit.schedule.title}</h3>
            {editingVisit && canEdit ? (
              <textarea
                value={visitDraft.scheduleLines}
                onChange={(event) =>
                  setVisitDraft((prev) => ({
                    ...prev,
                    scheduleLines: event.target.value,
                  }))
                }
                className="mt-2 min-h-[100px] w-full rounded-xl border border-[var(--hairline)] bg-[var(--card)] p-3 text-sm"
                disabled={saving}
              />
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                {content.visit.schedule.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-5">
            <h3 className="text-base font-semibold text-[var(--text)]">{content.visit.access.title}</h3>
            {editingVisit && canEdit ? (
              <textarea
                value={visitDraft.accessLines}
                onChange={(event) =>
                  setVisitDraft((prev) => ({
                    ...prev,
                    accessLines: event.target.value,
                  }))
                }
                className="mt-2 min-h-[100px] w-full rounded-xl border border-[var(--hairline)] bg-[var(--card)] p-3 text-sm"
                disabled={saving}
              />
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                {content.visit.access.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="flex gap-2">
            {editingVisit ? (
              <>
                <button
                  type="button"
                  onClick={handleVisitSave}
                  className="rounded-full bg-[var(--accent-600)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white disabled:opacity-60"
                  disabled={saving}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVisitDraft({
                      description: content.visit.description,
                      scheduleLines: content.visit.schedule.lines.join("\n"),
                      accessLines: content.visit.access.lines.join("\n"),
                    });
                    setEditingVisit(false);
                  }}
                  className="rounded-full border border-[var(--hairline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em]"
                  disabled={saving}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setVisitDraft({
                    description: content.visit.description,
                    scheduleLines: content.visit.schedule.lines.join("\n"),
                    accessLines: content.visit.access.lines.join("\n"),
                  });
                  setEditingVisit(true);
                }}
                className="rounded-full border border-[var(--hairline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em]"
                disabled={saving}
              >
                Editar seccion
              </button>
            )}
          </div>
        )}
      </section>

      <section className="card space-y-6">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold">Hacerse socio</h2>
          {editingMembership && canEdit ? (
            <textarea
              value={membershipDraft.intro}
              onChange={(event) => setMembershipDraft((prev) => ({ ...prev, intro: event.target.value }))}
              className="min-h-[100px] w-full rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-3 text-sm"
              disabled={saving}
            />
          ) : (
            <p className="text-sm text-[var(--muted)]">{content.membership.intro}</p>
          )}
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {renderMembershipCard({
            title: "¿Que necesito?",
            value: content.membership.requirements,
            editing: editingMembership && canEdit,
            draftValue: membershipDraft.requirements,
            onChange: (value) => setMembershipDraft((prev) => ({ ...prev, requirements: value })),
            saving,
          })}
          {renderMembershipCard({
            title: "¿Cuanto cuesta?",
            value: content.membership.pricing,
            editing: editingMembership && canEdit,
            draftValue: membershipDraft.pricing,
            onChange: (value) => setMembershipDraft((prev) => ({ ...prev, pricing: value })),
            saving,
          })}
          {renderMembershipCard({
            title: "Beneficios",
            value: content.membership.benefits,
            editing: editingMembership && canEdit,
            draftValue: membershipDraft.benefits,
            onChange: (value) => setMembershipDraft((prev) => ({ ...prev, benefits: value })),
            saving,
          })}
        </div>

        {canEdit && (
          <div className="flex gap-2">
            {editingMembership ? (
              <>
                <button
                  type="button"
                  onClick={handleMembershipSave}
                  className="rounded-full bg-[var(--accent-600)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white disabled:opacity-60"
                  disabled={saving}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMembershipDraft({ ...content.membership });
                    setEditingMembership(false);
                  }}
                  className="rounded-full border border-[var(--hairline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em]"
                  disabled={saving}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMembershipDraft({ ...content.membership });
                  setEditingMembership(true);
                }}
                className="rounded-full border border-[var(--hairline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em]"
                disabled={saving}
              >
                Editar seccion
              </button>
            )}
          </div>
        )}
      </section>

      {status && (
        <div className="flex justify-end">
          <div className={statusStyles}>{status.text}</div>
        </div>
      )}
    </div>
  );
}

type WhatsappDraft = ReturnType<typeof cloneWhatsappBlock>;

type WhatsappEditorProps = {
  canEdit: boolean;
  saving: boolean;
  content: ContactPageContent["whatsapp"];
  editing: boolean;
  draft: WhatsappDraft;
  onDraftChange: (draft: WhatsappDraft) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
};

type InstagramEditorProps = {
  canEdit: boolean;
  saving: boolean;
  content: ContactPageContent["instagram"];
  editing: boolean;
  draft: ContactPageContent["instagram"];
  onDraftChange: (draft: ContactPageContent["instagram"]) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
};

type EmailEditorProps = {
  canEdit: boolean;
  saving: boolean;
  content: ContactPageContent["email"];
  editing: boolean;
  draft: ContactPageContent["email"];
  onDraftChange: (draft: ContactPageContent["email"]) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
};

type DiscordEditorProps = {
  canEdit: boolean;
  saving: boolean;
  content: ContactPageContent["discord"];
  editing: boolean;
  draft: ContactPageContent["discord"];
  onDraftChange: (draft: ContactPageContent["discord"]) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
};

type MembershipCardProps = {
  title: string;
  value: string;
  editing: boolean;
  draftValue: string;
  onChange: (value: string) => void;
  saving: boolean;
};

function renderWhatsappCard(props: WhatsappEditorProps) {
  const { canEdit, saving, content, editing, draft, onDraftChange, onEdit, onCancel, onSave } = props;

  if (editing && canEdit) {
    return (
      <div className="space-y-4 rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-[var(--text)]">WhatsApp y Telefono</h3>
        </div>
        <textarea
          value={draft.description}
          onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
          className="min-h-[80px] w-full rounded-xl border border-[var(--hairline)] bg-[var(--card)] p-3 text-sm"
          disabled={saving}
        />

        <div className="space-y-3">
          {draft.entries.map((entry) => (
            <div key={entry.id} className="space-y-3 rounded-xl border border-[var(--hairline)] bg-[var(--card)] p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                  Rol o funcion
                  <input
                    type="text"
                    value={entry.role}
                    onChange={(event) => updateEntry(onDraftChange, draft, entry.id, { role: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-[var(--hairline)] bg-[var(--card-muted)] px-3 py-2 text-sm"
                    disabled={saving}
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                  Nombre
                  <input
                    type="text"
                    value={entry.name}
                    onChange={(event) => updateEntry(onDraftChange, draft, entry.id, { name: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-[var(--hairline)] bg-[var(--card-muted)] px-3 py-2 text-sm"
                    disabled={saving}
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                  Telefono
                  <input
                    type="text"
                    value={entry.phone}
                    onChange={(event) => updateEntry(onDraftChange, draft, entry.id, { phone: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-[var(--hairline)] bg-[var(--card-muted)] px-3 py-2 text-sm"
                    disabled={saving}
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                  Enlace WhatsApp
                  <input
                    type="url"
                    value={entry.whatsappUrl ?? ""}
                    onChange={(event) =>
                      updateEntry(onDraftChange, draft, entry.id, { whatsappUrl: event.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-[var(--hairline)] bg-[var(--card-muted)] px-3 py-2 text-sm"
                    disabled={saving}
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                Nota
                <textarea
                  value={entry.note ?? ""}
                  onChange={(event) => updateEntry(onDraftChange, draft, entry.id, { note: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-[var(--hairline)] bg-[var(--card-muted)] px-3 py-2 text-sm"
                  rows={2}
                  disabled={saving}
                />
              </label>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removeEntry(onDraftChange, draft, entry.id)}
                  className="rounded-full border border-[var(--hairline)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-red-400 hover:border-red-400"
                  disabled={saving || draft.entries.length <= 1}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addEntry(onDraftChange, draft)}
            className="rounded-full border border-dashed border-[var(--accent-400)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent-600)] hover:bg-[var(--accent-50)] disabled:opacity-60"
            disabled={saving}
          >
            Anadir contacto
          </button>
        </div>

        <div className="space-y-2 rounded-xl border border-[var(--hairline)] bg-[var(--card)] p-4">
          <h4 className="text-sm font-semibold">Comunidad de WhatsApp</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
              Etiqueta
              <input
                type="text"
                value={draft.community?.label ?? ""}
                onChange={(event) =>
                  onDraftChange({
                    ...draft,
                    community: {
                      label: event.target.value,
                      url: draft.community?.url ?? "",
                      description: draft.community?.description ?? "",
                    },
                  })
                }
                className="mt-1 w-full rounded-lg border border-[var(--hairline)] bg-[var(--card-muted)] px-3 py-2 text-sm"
                disabled={saving}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
              URL
              <input
                type="url"
                value={draft.community?.url ?? ""}
                onChange={(event) =>
                  onDraftChange({
                    ...draft,
                    community: {
                      label: draft.community?.label ?? "",
                      url: event.target.value,
                      description: draft.community?.description ?? "",
                    },
                  })
                }
                className="mt-1 w-full rounded-lg border border-[var(--hairline)] bg-[var(--card-muted)] px-3 py-2 text-sm"
                disabled={saving}
              />
            </label>
          </div>
          <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
            Nota
            <textarea
              value={draft.community?.description ?? ""}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  community: {
                    label: draft.community?.label ?? "",
                    url: draft.community?.url ?? "",
                    description: event.target.value,
                  },
                })
              }
              className="mt-1 w-full rounded-lg border border-[var(--hairline)] bg-[var(--card-muted)] px-3 py-2 text-sm"
              rows={2}
              disabled={saving}
            />
          </label>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSave}
            className="rounded-full bg-[var(--accent-600)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white disabled:opacity-60"
            disabled={saving}
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[var(--hairline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em]"
            disabled={saving}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-[var(--text)]">WhatsApp y telefono</h3>
        {canEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-[var(--hairline)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em]"
            disabled={saving}
          >
            Editar
          </button>
        )}
      </div>
      <p className="text-sm text-[var(--muted)]">{content.description}</p>
      <ul className="space-y-3">
        {content.entries.map((entry) => (
          <li key={entry.id} className="space-y-2 rounded-xl border border-[var(--hairline)] bg-[var(--card)] p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent-600)]">
                {entry.role}
              </span>
              <span className="text-sm font-semibold text-[var(--text)]">{entry.name}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              <a href={`tel:${entry.phone}`} className="font-semibold text-[var(--accent-600)]">
                {entry.phone}
              </a>
              {entry.whatsappUrl && (
                <a
                  href={entry.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[var(--accent-200)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent-600)] hover:bg-[var(--accent-50)]"
                >
                  Abrir WhatsApp
                </a>
              )}
            </div>
            {entry.note && <p className="text-xs text-[var(--muted)]">{entry.note}</p>}
          </li>
        ))}
      </ul>
      {content.community && (
        <div className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-[var(--text)]">{content.community.label}</span>
            <a
              href={content.community.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[var(--accent-200)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent-600)] hover:bg-[var(--accent-50)]"
            >
              Entrar
            </a>
          </div>
          {content.community.description && (
            <p className="mt-2 text-xs text-[var(--muted)]">{content.community.description}</p>
          )}
        </div>
      )}
    </div>
  );
}

function renderInstagramCard(props: InstagramEditorProps) {
  const { canEdit, saving, content, editing, draft, onDraftChange, onEdit, onCancel, onSave } = props;
  if (editing && canEdit) {
    return (
      <div className="space-y-3 rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-[var(--text)]">Instagram</h3>
        </div>
        <textarea
          value={draft.description}
          onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
          className="min-h-[80px] w-full rounded-xl border border-[var(--hairline)] bg-[var(--card)] p-3 text-sm"
          disabled={saving}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
            Handle
            <input
              type="text"
              value={draft.handle}
              onChange={(event) => onDraftChange({ ...draft, handle: event.target.value })}
              className="mt-1 w-full rounded-lg border border-[var(--hairline)] bg-[var(--card-muted)] px-3 py-2 text-sm"
              disabled={saving}
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
            URL
            <input
              type="url"
              value={draft.url}
              onChange={(event) => onDraftChange({ ...draft, url: event.target.value })}
              className="mt-1 w-full rounded-lg border border-[var(--hairline)] bg-[var(--card-muted)] px-3 py-2 text-sm"
              disabled={saving}
            />
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSave}
            className="rounded-full bg-[var(--accent-600)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white disabled:opacity-60"
            disabled={saving}
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[var(--hairline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em]"
            disabled={saving}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-[var(--text)]">Instagram</h3>
        {canEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-[var(--hairline)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em]"
            disabled={saving}
          >
            Editar
          </button>
        )}
      </div>
      <p className="text-sm text-[var(--muted)]">{content.description}</p>
      <Link
        href={content.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-200)] px-4 py-2 text-sm font-semibold text-[var(--accent-600)] hover:bg-[var(--accent-50)]"
      >
        {content.handle}
      </Link>
    </div>
  );
}

function renderEmailCard(props: EmailEditorProps) {
  const { canEdit, saving, content, editing, draft, onDraftChange, onEdit, onCancel, onSave } = props;

  if (editing && canEdit) {
    return (
      <div className="space-y-3 rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-[var(--text)]">Correo electronico</h3>
        </div>
        <textarea
          value={draft.description}
          onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
          className="min-h-[80px] w-full rounded-xl border border-[var(--hairline)] bg-[var(--card)] p-3 text-sm"
          disabled={saving}
        />
        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
          Email
          <input
            type="email"
            value={draft.address}
            onChange={(event) => onDraftChange({ ...draft, address: event.target.value })}
            className="mt-1 w-full rounded-lg border border-[var(--hairline)] bg-[var(--card-muted)] px-3 py-2 text-sm"
            disabled={saving}
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSave}
            className="rounded-full bg-[var(--accent-600)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white disabled:opacity-60"
            disabled={saving}
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[var(--hairline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em]"
            disabled={saving}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-[var(--text)]">Correo electronico</h3>
        {canEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-[var(--hairline)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em]"
            disabled={saving}
          >
            Editar
          </button>
        )}
      </div>
      <p className="text-sm text-[var(--muted)]">{content.description}</p>
      <a
        href={`mailto:${content.address}`}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-200)] px-4 py-2 text-sm font-semibold text-[var(--accent-600)] hover:bg-[var(--accent-50)]"
      >
        {content.address}
      </a>
    </div>
  );
}

function renderDiscordCard(props: DiscordEditorProps) {
  const { canEdit, saving, content, editing, draft, onDraftChange, onEdit, onCancel, onSave } = props;
  if (editing && canEdit) {
    return (
      <div className="space-y-3 rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-[var(--text)]">Discord</h3>
        </div>
        <textarea
          value={draft.description}
          onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
          className="min-h-[80px] w-full rounded-xl border border-[var(--hairline)] bg-[var(--card)] p-3 text-sm"
          disabled={saving}
        />
        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
          Invitacion
          <input
            type="url"
            value={draft.inviteUrl}
            onChange={(event) => onDraftChange({ ...draft, inviteUrl: event.target.value })}
            className="mt-1 w-full rounded-lg border border-[var(--hairline)] bg-[var(--card-muted)] px-3 py-2 text-sm"
            disabled={saving}
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSave}
            className="rounded-full bg-[var(--accent-600)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white disabled:opacity-60"
            disabled={saving}
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[var(--hairline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em]"
            disabled={saving}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-[var(--text)]">Discord</h3>
        {canEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-[var(--hairline)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em]"
            disabled={saving}
          >
            Editar
          </button>
        )}
      </div>
      <p className="text-sm text-[var(--muted)]">{content.description}</p>
      <a
        href={content.inviteUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-200)] px-4 py-2 text-sm font-semibold text-[var(--accent-600)] hover:bg-[var(--accent-50)]"
      >
        Abrir Discord
      </a>
    </div>
  );
}

function renderMembershipCard(props: MembershipCardProps) {
  const { title, value, editing, draftValue, onChange, saving } = props;
  return (
    <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-5">
      <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
      {editing ? (
        <textarea
          value={draftValue}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 min-h-[120px] w-full rounded-xl border border-[var(--hairline)] bg-[var(--card)] p-3 text-sm"
          disabled={saving}
        />
      ) : (
        <p className="mt-2 text-sm text-[var(--muted)]">{value}</p>
      )}
    </div>
  );
}

function cloneWhatsappBlock(block: ContactPageContent["whatsapp"]) {
  return {
    description: block.description,
    entries: block.entries.map((entry) => ({ ...entry })),
    community: block.community
      ? { label: block.community.label, url: block.community.url, description: block.community.description ?? "" }
      : { label: "", url: "", description: "" },
  };
}

function addEntry(onChange: (next: WhatsappDraft) => void, draft: WhatsappDraft) {
  const next: WhatsappEntry = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36),
    role: "",
    name: "",
    phone: "",
    note: "",
    whatsappUrl: "",
  };
  onChange({ ...draft, entries: [...draft.entries, next] });
}

function removeEntry(onChange: (next: WhatsappDraft) => void, draft: WhatsappDraft, id: string) {
  const filtered = draft.entries.filter((entry) => entry.id !== id);
  if (filtered.length === 0) return;
  onChange({ ...draft, entries: filtered });
}

function updateEntry(
  onChange: (next: WhatsappDraft) => void,
  draft: WhatsappDraft,
  id: string,
  changes: Partial<WhatsappEntry>,
) {
  onChange({
    ...draft,
    entries: draft.entries.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)),
  });
}

function normalizeEntry(entry: WhatsappEntry): WhatsappEntry {
  const role = entry.role.trim();
  const name = entry.name.trim();
  const phone = entry.phone.trim();
  const note = entry.note?.trim() || null;
  const whatsappUrl = entry.whatsappUrl?.trim() || null;
  return {
    id: entry.id,
    role: role || "Contacto",
    name: name || "Miembro del club",
    phone,
    note,
    whatsappUrl,
  };
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
