"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { formatClubDateTime } from "@/lib/date-format";

import type { Article, ArticleBlock, ArticleComment } from "./data";
import { CATEGORY_LABELS } from "./data";
import { ArticleShareButtons } from "./ArticleShareButtons";

type Props = {
  article: Article;
  relatedPhotos: string[];
  canManage: boolean;
  canComment: boolean;
  currentUserName: string | null;
};

type CommentDrafts = Record<string, string>;
type ArticleImageBlock = Extract<ArticleBlock, { type: "image" }>;
const RICH_TEXT_CLASS =
  "space-y-2 leading-relaxed text-[var(--muted)] [&_p]:text-[var(--muted)] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_strong]:text-[var(--text)] [&_b]:text-[var(--text)] [&_em]:text-[var(--text)] [&_u]:text-[var(--text)] [&_a]:text-[var(--accent-600)] [&_a]:underline [&_a]:hover:no-underline";

export function ArticleDetailView({ article, relatedPhotos, canManage, canComment, currentUserName }: Props) {
  const [activeTab, setActiveTab] = useState<"comments" | "photos">("comments");
  const [comments, setComments] = useState<ArticleComment[]>(() => cloneComments(article.comments));
  const [newComment, setNewComment] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<CommentDrafts>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string; alt?: string } | null>(null);

  const formattedDate = useMemo(() => formatReadableDate(article.date), [article.date]);
  const isDraft = article.status === "draft";
  const showShareButtons = !isDraft;
  const categoryLabel = CATEGORY_LABELS[article.category];
  const commentCount = useMemo(() => countComments(comments), [comments]);

  const handlePublishComment = async () => {
    if (!canComment || submittingId) return;
    const trimmed = newComment.trim();
    if (!trimmed) {
      setStatusMessage("El comentario no puede estar vacío.");
      return;
    }
    setSubmittingId("new");
    try {
      const response = await fetch(`/api/novedades/${article.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo guardar el comentario.");
      }
      setComments(data.comments ?? []);
      setNewComment("");
      setStatusMessage("Comentario publicado.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el comentario.";
      setStatusMessage(message);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!canComment || submittingId) return;
    const trimmed = replyDrafts[parentId]?.trim() ?? "";
    if (!trimmed) {
      setStatusMessage("La respuesta no puede estar vacía.");
      return;
    }
    setSubmittingId(parentId);
    try {
      const response = await fetch(`/api/novedades/${article.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, parentId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo guardar la respuesta.");
      }
      setComments(data.comments ?? []);
      setReplyDrafts((drafts) => ({ ...drafts, [parentId]: "" }));
      setStatusMessage("Respuesta publicada.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar la respuesta.";
      setStatusMessage(message);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleDelete = () => {
    setStatusMessage("Acción de eliminar pendiente de implementación.");
  };

  useEffect(() => {
    if (!previewImage) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewImage(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [previewImage]);

  useEffect(() => {
    if (!previewImage) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewImage(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [previewImage]);

  return (
    <>
    <article className="space-y-10">
      <section className="overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--card)]">
        <header className="space-y-4 p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
              <span>{categoryLabel}</span>
              <span>|</span>
              <span>{formattedDate}</span>
              <span>|</span>
              <span>{article.author}</span>
              {isDraft && (
                <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-yellow-300">
                  Borrador
                </span>
              )}
            </div>
            {showShareButtons && (
              <ArticleShareButtons
                category={article.category}
                slug={article.slug}
                title={article.title}
                summary={article.summary}
                appearance="light"
              />
            )}
          </div>
          <h1 className="text-3xl font-bold text-[var(--text)] sm:text-5xl">{article.title}</h1>
          <p className="whitespace-pre-line text-base text-[var(--muted)] sm:text-lg">{article.summary}</p>
          {canManage && (
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href={`/novedades/${article.category}/${article.slug}/editar`}
                className="rounded-full bg-[var(--accent-600)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-[var(--accent-500)]"
              >
                Editar
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-full border border-[var(--hairline)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)] transition hover:text-[var(--text)]"
              >
                Eliminar
              </button>
            </div>
          )}
          {statusMessage && (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-600)]">{statusMessage}</p>
          )}
        </header>
        <div className="border-t border-[var(--hairline)] bg-[var(--card-muted)]">
          <img
            src={article.banner}
            alt={`Imagen destacada de ${article.title}`}
            className="h-full w-full max-h-[420px] object-cover"
          />
        </div>
        <div className="border-t border-[var(--hairline)] p-8 text-[var(--text)]">
          <ArticleBody blocks={article.body} onPreview={setPreviewImage} />
          <div className="mt-8 flex flex-wrap gap-2 text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
            <span>Etiquetas</span>
            {article.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-[var(--accent-50)] px-3 py-1 text-[var(--accent-600)]">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6 rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-6 sm:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap gap-2" role="tablist" aria-label="Detalles adicionales de la noticia">
            <TabButton
              id="comments"
              label={`Comentarios (${commentCount})`}
              isActive={activeTab === "comments"}
              onSelect={setActiveTab}
            />
            <TabButton
              id="photos"
              label={`Fotos relacionadas (${relatedPhotos.length})`}
              isActive={activeTab === "photos"}
              onSelect={setActiveTab}
            />
          </nav>
        </header>
        {activeTab === "comments" ? (
          <CommentsSection
            comments={comments}
            canComment={canComment}
            currentUserName={currentUserName}
            newComment={newComment}
            onNewCommentChange={setNewComment}
            onPublish={handlePublishComment}
            replyDrafts={replyDrafts}
            onReplyDraftChange={(commentId, value) =>
              setReplyDrafts((drafts) => ({
                ...drafts,
                [commentId]: value,
              }))
            }
            onReply={handleReply}
            submittingId={submittingId}
          />
        ) : (
          <PhotosSection photos={relatedPhotos} onPreview={setPreviewImage} />
        )}
      </section>
    </article>
    {previewImage && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Vista ampliada de la imagen"
        onClick={() => setPreviewImage(null)}
      >
        <div className="relative max-h-full max-w-5xl">
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-black/70 px-3 py-1 text-sm font-semibold text-white"
            onClick={() => setPreviewImage(null)}
          >
            Cerrar
          </button>
          <img
            src={previewImage.src}
            alt={previewImage.alt || "Imagen de la noticia"}
            className="max-h-[80vh] rounded-3xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      </div>
    )}
    </>
  );
}

type TabButtonProps = {
  id: "comments" | "photos";
  label: string;
  isActive: boolean;
  onSelect: (tab: "comments" | "photos") => void;
};

function TabButton({ id, label, isActive, onSelect }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onSelect(id)}
      className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition ${
        isActive
          ? "bg-[var(--accent-600)] text-white shadow-sm"
          : "border border-[var(--hairline)] bg-[var(--card-muted)] text-[var(--muted)] hover:text-[var(--text)]"
      }`}
    >
      {label}
    </button>
  );
}

type CommentsSectionProps = {
  comments: ArticleComment[];
  canComment: boolean;
  currentUserName: string | null;
  newComment: string;
  onNewCommentChange: (value: string) => void;
  onPublish: () => void;
  replyDrafts: CommentDrafts;
  onReplyDraftChange: (commentId: string, value: string) => void;
  onReply: (commentId: string) => void;
  submittingId: string | null;
};

function CommentsSection({
  comments,
  canComment,
  currentUserName,
  newComment,
  onNewCommentChange,
  onPublish,
  replyDrafts,
  onReplyDraftChange,
  onReply,
  submittingId,
}: CommentsSectionProps) {
  return (
    <div className="space-y-6">
      {canComment ? (
        <div className="rounded-3xl border border-[var(--hairline)] bg-[var(--card-muted)] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Añadir comentario</p>
          <textarea
            value={newComment}
            onChange={(event) => onNewCommentChange(event.target.value)}
            rows={4}
            placeholder="Comparte tus impresiones con el resto de la comunidad..."
            className="mt-3 w-full rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] focus:border-[var(--accent-400)] focus:outline-none"
          />
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onPublish}
              disabled={submittingId === "new"}
              className="rounded-full bg-[var(--accent-600)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-[var(--accent-500)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submittingId === "new" ? "Publicando..." : "Publicar"}
            </button>
          </div>
        </div>
      ) : (
        <p className="rounded-3xl border border-[var(--hairline)] bg-[var(--card-muted)] p-6 text-sm text-[var(--muted)]">
          Solo las personas registradas pueden participar en los comentarios. Inicia sesión para sumarte a la conversación.
        </p>
      )}

      <div className="space-y-6">
        {comments.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-[var(--hairline)] bg-[var(--card-muted)] p-6 text-center text-sm text-[var(--muted)]">
            Todavía no hay comentarios. ¡Sé la primera persona en opinar!
          </p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              canComment={canComment}
              currentUserName={currentUserName}
              replyDrafts={replyDrafts}
              onReplyDraftChange={onReplyDraftChange}
              onReply={onReply}
              submittingId={submittingId}
            />
          ))
        )}
      </div>
    </div>
  );
}

type CommentItemProps = {
  comment: ArticleComment;
  canComment: boolean;
  currentUserName: string | null;
  replyDrafts: CommentDrafts;
  onReplyDraftChange: (commentId: string, value: string) => void;
  onReply: (commentId: string) => void;
  submittingId: string | null;
};

function CommentItem({ comment, canComment, currentUserName, replyDrafts, onReplyDraftChange, onReply, submittingId }: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const formattedDate = useMemo(() => formatReadableDate(comment.postedAt, true), [comment.postedAt]);
  const replyDraft = replyDrafts[comment.id] ?? "";
  const isReplying = submittingId === comment.id;

  return (
    <div className="rounded-3xl border border-[var(--hairline)] bg-[var(--card-muted)] p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-100)] text-sm font-semibold text-[var(--accent-600)]">
          {comment.avatarInitials}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            <span>{comment.author}</span>
            <span>|</span>
            <span>{formattedDate}</span>
          </div>
          <p className="text-sm text-[var(--text)]">{comment.message}</p>
          {canComment && (
            <button
              type="button"
              onClick={() => setShowReplyForm((value) => !value)}
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-600)] disabled:opacity-60"
              disabled={Boolean(submittingId)}
            >
              {showReplyForm ? "Cancelar" : "Responder"}
            </button>
          )}
        </div>
      </div>
      {showReplyForm && canComment && (
        <div className="mt-4 rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Responder como {currentUserName ?? "Usuario"}
          </p>
          <textarea
            value={replyDraft}
            onChange={(event) => onReplyDraftChange(comment.id, event.target.value)}
            rows={3}
            placeholder="Escribe tu respuesta..."
            className="mt-2 w-full rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-400)] focus:outline-none"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                onReplyDraftChange(comment.id, "");
                setShowReplyForm(false);
              }}
              className="rounded-full border border-[var(--hairline)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                onReply(comment.id);
                setShowReplyForm(false);
              }}
              className="rounded-full bg-[var(--accent-600)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={Boolean(submittingId)}
            >
              {isReplying ? "Publicando..." : "Publicar"}
            </button>
          </div>
        </div>
      )}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-6 space-y-4 border-l-2 border-[var(--accent-200)] pl-6">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              canComment={canComment}
              currentUserName={currentUserName}
              replyDrafts={replyDrafts}
              onReplyDraftChange={onReplyDraftChange}
              onReply={onReply}
              submittingId={submittingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type PhotosSectionProps = {
  photos: string[];
  onPreview: (image: { src: string; alt?: string }) => void;
};

function PhotosSection({ photos, onPreview }: PhotosSectionProps) {
  if (photos.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-[var(--hairline)] bg-[var(--card-muted)] p-6 text-center text-sm text-[var(--muted)]">
        La noticia no tiene fotos adicionales por ahora.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo) => (
        <figure
          key={photo}
          className="cursor-zoom-in overflow-hidden rounded-3xl border border-transparent bg-[var(--card-muted)]"
          onClick={() => onPreview({ src: photo, alt: "Foto relacionada con la noticia" })}
        >
          <img src={photo} alt="Foto relacionada con la noticia" className="h-full w-full object-cover" />
        </figure>
      ))}
    </div>
  );
}

type ArticleBodyProps = {
  blocks: ArticleBlock[];
  onPreview: (image: { src: string; alt?: string }) => void;
};

function ArticleBody({ blocks, onPreview }: ArticleBodyProps) {
  const content: ReactNode[] = [];
  let pendingParagraph: Extract<ArticleBlock, { type: "paragraph" }> | null = null;

  const flushParagraph = () => {
    if (!pendingParagraph) return;
    content.push(
      <div
        key={`paragraph-${content.length}`}
        className={RICH_TEXT_CLASS}
        dangerouslySetInnerHTML={{ __html: normalizeParagraphHtml(pendingParagraph.text) }}
      />
    );
    pendingParagraph = null;
  };

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];

    if (block.type === "paragraph") {
      flushParagraph();
      pendingParagraph = block;
      continue;
    }

    if (block.type === "image" && (block.layout === "float-left" || block.layout === "float-right")) {
      let pairedParagraph: Extract<ArticleBlock, { type: "paragraph" }> | null = null;
      if (pendingParagraph) {
        pairedParagraph = pendingParagraph;
        pendingParagraph = null;
      } else if (blocks[index + 1]?.type === "paragraph") {
        pairedParagraph = blocks[index + 1] as Extract<ArticleBlock, { type: "paragraph" }>;
        index += 1;
      }

      if (pairedParagraph) {
        content.push(
          <FloatImageParagraph
            key={`float-${content.length}`}
            block={block}
            paragraph={pairedParagraph}
            direction={block.layout === "float-left" ? "left" : "right"}
            onPreview={onPreview}
          />
        );
        continue;
      }
    }

    flushParagraph();

    switch (block.type) {
      case "heading":
        if (block.level === 2) {
          content.push(
            <h2 key={`heading-${content.length}`} className="text-2xl font-semibold text-[var(--text)]">
              {block.text}
            </h2>
          );
        } else {
          content.push(
            <h3 key={`heading-${content.length}`} className="text-xl font-semibold text-[var(--text)]">
              {block.text}
            </h3>
          );
        }
        break;
      case "image":
        content.push(
          <figure
            key={`image-${content.length}`}
            className={`${getImageClass(block.layout)} cursor-zoom-in`}
            onClick={() => onPreview({ src: block.src, alt: block.alt })}
          >
            <img src={block.src} alt={block.alt} className="w-full h-auto object-cover" />
            {block.caption && (
              <figcaption className="px-4 py-3 text-center text-xs text-[var(--muted)]">{block.caption}</figcaption>
            )}
          </figure>
        );
        break;
      case "quote":
        content.push(
          <blockquote
            key={`quote-${content.length}`}
            className="rounded-3xl border border-[var(--accent-200)] bg-[var(--accent-50)] px-6 py-5 text-base italic text-[var(--accent-700)]"
          >
            <p>&ldquo;{block.text}&rdquo;</p>
            {block.attribution && (
              <footer className="mt-2 text-right text-xs uppercase tracking-[0.2em] text-[var(--accent-600)]">
                &mdash; {block.attribution}
              </footer>
            )}
          </blockquote>
        );
        break;
      default:
        break;
    }
  }

  flushParagraph();

  return <div className="space-y-6 text-base leading-relaxed text-[var(--text)]">{content}</div>;
}

type FloatImageParagraphProps = {
  block: ArticleImageBlock;
  paragraph: Extract<ArticleBlock, { type: "paragraph" }>;
  direction: "left" | "right";
  onPreview: (image: { src: string; alt?: string }) => void;
};

function FloatImageParagraph({ block, paragraph, direction, onPreview }: FloatImageParagraphProps) {
  const paragraphRef = useRef<HTMLDivElement | null>(null);
  const [maxFloatHeight, setMaxFloatHeight] = useState<number | null>(null);

  useEffect(() => {
    const element = paragraphRef.current;
    if (!element) return;

    const update = () => {
      const height = element.clientHeight;
      if (height > 0) {
        setMaxFloatHeight(Math.max(220, height * 1.5));
      }
    };

    update();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => update());
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [paragraph.text]);

  const figureStyle = maxFloatHeight ? { maxHeight: maxFloatHeight } : undefined;

  return (
    <div className={`space-y-4 md:flex md:items-start md:gap-8 ${direction === "right" ? "md:flex-row-reverse" : ""}`}>
      <figure
        className="cursor-zoom-in overflow-hidden rounded-3xl border border-transparent bg-[var(--card-muted)] md:flex-none md:min-w-[220px] md:max-w-[360px]"
        onClick={() => onPreview({ src: block.src, alt: block.alt })}
        style={figureStyle}
      >
        <img src={block.src} alt={block.alt} className="h-auto w-full object-contain" style={figureStyle} />
        {block.caption && (
          <figcaption className="px-4 py-3 text-center text-xs text-[var(--muted)]">{block.caption}</figcaption>
        )}
      </figure>
      <div
        ref={paragraphRef}
        className={`${RICH_TEXT_CLASS} md:flex-1`}
        dangerouslySetInnerHTML={{ __html: normalizeParagraphHtml(paragraph.text) }}
      />
    </div>
  );
}

function getImageClass(layout: ArticleImageBlock["layout"]): string {
  const baseClass = "overflow-hidden rounded-3xl border border-transparent bg-[var(--card-muted)]";
  const floatLimits =
    "md:min-h-[220px] md:max-h-[360px] md:[&>img]:h-full md:[&>img]:object-cover md:[&>img]:max-h-[360px]";
  switch (layout) {
    case "float-left":
      return `${baseClass} md:float-left md:mr-6 md:mb-4 md:clear-both md:w-[45%] md:min-w-[260px] md:max-w-[400px] ${floatLimits}`;
    case "float-right":
      return `${baseClass} md:float-right md:ml-6 md:mb-4 md:clear-both md:w-[45%] md:min-w-[260px] md:max-w-[400px] ${floatLimits}`;
    case "full":
    default:
      return `${baseClass} w-full`;
  }
}

function normalizeParagraphHtml(value: string): string {
  if (!value) return "";
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(value);
  if (hasHtml) return value;
  return value.replace(/\n/g, "<br />");
}

function cloneComments(comments: ArticleComment[]): ArticleComment[] {
  return comments.map((comment) => ({
    ...comment,
    replies: comment.replies ? cloneComments(comment.replies) : [],
  }));
}

function countComments(comments: ArticleComment[]): number {
  return comments.reduce((acc, comment) => acc + 1 + countComments(comment.replies ?? []), 0);
}

function toInitials(value: string) {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "US";
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function formatReadableDate(value: string, includeTime = false) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return formatClubDateTime(parsed, {
    dateStyle: "long",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
  });
}


