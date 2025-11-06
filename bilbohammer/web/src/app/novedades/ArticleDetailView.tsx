"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

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

export function ArticleDetailView({ article, relatedPhotos, canManage, canComment, currentUserName }: Props) {
  const [activeTab, setActiveTab] = useState<"comments" | "photos">("comments");
  const [comments, setComments] = useState<ArticleComment[]>(() => cloneComments(article.comments));
  const [newComment, setNewComment] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<CommentDrafts>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const formattedDate = useMemo(() => formatReadableDate(article.date), [article.date]);
  const categoryLabel = CATEGORY_LABELS[article.category];
  const commentCount = useMemo(() => countComments(comments), [comments]);

  const handlePublishComment = () => {
    if (!canComment) return;
    const trimmed = newComment.trim();
    if (!trimmed) {
      setStatusMessage("El comentario no puede estar vacÃÂ­o.");
      return;
    }
    const comment = buildComment(trimmed, currentUserName);
    setComments((prev) => [...prev, comment]);
    setNewComment("");
    setStatusMessage("Comentario publicado localmente. Falta conectar con la API.");
  };

  const handleReply = (parentId: string) => {
    if (!canComment) return;
    const trimmed = replyDrafts[parentId]?.trim() ?? "";
    if (!trimmed) {
      setStatusMessage("La respuesta no puede estar vacÃÂ­a.");
      return;
    }
    const reply = buildComment(trimmed, currentUserName);
    setComments((prev) => addReplyToTree(prev, parentId, reply));
    setReplyDrafts((drafts) => ({ ...drafts, [parentId]: "" }));
    setStatusMessage("Respuesta publicada localmente. Falta conectar con la API.");
  };

  const handleDelete = () => {
    setStatusMessage("AcciÃÂ³n de eliminar pendiente de implementaciÃÂ³n.");
  };

  return (
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
            </div>
            <ArticleShareButtons
              category={article.category}
              slug={article.slug}
              title={article.title}
              summary={article.summary}
              appearance="light"
            />
          </div>
          <h1 className="text-3xl font-bold text-[var(--text)] sm:text-5xl">{article.title}</h1>
          <p className="text-base text-[var(--muted)] sm:text-lg">{article.summary}</p>
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
          <ArticleBody blocks={article.body} />
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
          <nav className="flex gap-2" role="tablist" aria-label="Detalles adicionales de la noticia">
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
          />
        ) : (
          <PhotosSection photos={relatedPhotos} />
        )}
      </section>
    </article>
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
}: CommentsSectionProps) {
  return (
    <div className="space-y-6">
      {canComment ? (
        <div className="rounded-3xl border border-[var(--hairline)] bg-[var(--card-muted)] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">AÃÂ±adir comentario</p>
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
              className="rounded-full bg-[var(--accent-600)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-[var(--accent-500)]"
            >
              Publicar
            </button>
          </div>
        </div>
      ) : (
        <p className="rounded-3xl border border-[var(--hairline)] bg-[var(--card-muted)] p-6 text-sm text-[var(--muted)]">
          Solo las personas registradas pueden participar en los comentarios. Inicia sesiÃÂ³n para sumarte a la conversaciÃÂ³n.
        </p>
      )}

      <div className="space-y-6">
        {comments.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-[var(--hairline)] bg-[var(--card-muted)] p-6 text-center text-sm text-[var(--muted)]">
            TodavÃÂ­a no hay comentarios. ÃÂ¡SÃÂ© la primera persona en opinar!
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
};

function CommentItem({ comment, canComment, currentUserName, replyDrafts, onReplyDraftChange, onReply }: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const formattedDate = useMemo(() => formatReadableDate(comment.postedAt, true), [comment.postedAt]);
  const replyDraft = replyDrafts[comment.id] ?? "";

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
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-600)]"
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
              className="rounded-full bg-[var(--accent-600)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white"
            >
              Publicar
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

type PhotosSectionProps = {
  photos: string[];
};

function PhotosSection({ photos }: PhotosSectionProps) {
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
        <figure key={photo} className="overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--card-muted)]">
          <img src={photo} alt="Foto relacionada con la noticia" className="h-full w-full object-cover" />
        </figure>
      ))}
    </div>
  );
}

type ArticleBodyProps = {
  blocks: ArticleBlock[];
};

function ArticleBody({ blocks }: ArticleBodyProps) {
  return (
    <div className="space-y-6 text-base leading-relaxed text-[var(--text)] after:clear-both after:block after:content-['']">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p key={index} className="whitespace-pre-line text-[var(--muted)]">
                {block.text}
              </p>
            );
          case "heading":
            if (block.level === 2) {
              return (
                <h2 key={index} className="text-2xl font-semibold text-[var(--text)]">
                  {block.text}
                </h2>
              );
            }
            return (
              <h3 key={index} className="text-xl font-semibold text-[var(--text)]">
                {block.text}
              </h3>
            );
          case "image":
            return (
              <figure key={index} className={getImageClass(block.layout)}>
                <img src={block.src} alt={block.alt} className="h-full w-full object-cover" />
                {block.caption && (
                  <figcaption className="px-4 py-3 text-center text-xs text-[var(--muted)]">{block.caption}</figcaption>
                )}
              </figure>
            );
          case "quote":
            return (
              <blockquote
                key={index}
                className="rounded-3xl border border-[var(--accent-200)] bg-[var(--accent-50)] px-6 py-5 text-base italic text-[var(--accent-700)]"
              >
                <p>Ã¢â¬Å{block.text}Ã¢â¬Â</p>
                {block.attribution && (
                  <footer className="mt-2 text-right text-xs uppercase tracking-[0.2em] text-[var(--accent-600)]">
                    Ã¢â¬â {block.attribution}
                  </footer>
                )}
              </blockquote>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

function getImageClass(layout: ArticleImageBlock["layout"]): string {
  const baseClass = "overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--card-muted)]";
  switch (layout) {
    case "float-left":
      return `${baseClass} md:float-left md:mr-6 md:mb-4 md:w-1/2`;
    case "float-right":
      return `${baseClass} md:float-right md:ml-6 md:mb-4 md:w-1/2`;
    case "full":
    default:
      return `${baseClass} w-full`;
  }
}

function buildComment(message: string, authorName: string | null): ArticleComment {
  const author = authorName?.trim() ? authorName.trim() : "Usuario de Bilbohammer";
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    author,
    avatarInitials: toInitials(author),
    postedAt: new Date().toISOString(),
    message,
    replies: [],
  };
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

function addReplyToTree(comments: ArticleComment[], parentId: string, reply: ArticleComment): ArticleComment[] {
  return comments.map((comment) => {
    if (comment.id === parentId) {
      const replies = comment.replies ? [...comment.replies, reply] : [reply];
      return { ...comment, replies };
    }
    if (comment.replies && comment.replies.length > 0) {
      return { ...comment, replies: addReplyToTree(comment.replies, parentId, reply) };
    }
    return comment;
  });
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
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "long",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
  }).format(parsed);
}
