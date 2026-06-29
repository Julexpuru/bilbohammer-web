import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getUserDisplayName } from "@/lib/user-display";

type ArticleComment = {
  id: string;
  author: string;
  avatarInitials: string;
  postedAt: string;
  message: string;
  replies?: ArticleComment[];
};

function toInitials(value: string) {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "US";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function normalizeComments(value: unknown): ArticleComment[] {
  if (!Array.isArray(value)) return [];
  return value as ArticleComment[];
}

function appendReply(tree: ArticleComment[], parentId: string, reply: ArticleComment): ArticleComment[] {
  return tree.map((comment) => {
    if (comment.id === parentId) {
      const replies = Array.isArray(comment.replies) ? [...comment.replies, reply] : [reply];
      return { ...comment, replies };
    }
    if (comment.replies && comment.replies.length) {
      return { ...comment, replies: appendReply(comment.replies, parentId, reply) };
    }
    return comment;
  });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Necesitas iniciar sesión para comentar." }, { status: 401 });
    }

    const id = decodeURIComponent(params.id);
    const body = (await request.json().catch(() => ({}))) as { message?: string; parentId?: string | null };
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "El comentario no puede estar vacío." }, { status: 400 });
    }

    const article = await prisma.newsArticle.findUnique({
      where: { id },
      select: { id: true, comments: true },
    });
    if (!article) {
      return NextResponse.json({ error: "Noticia no encontrada." }, { status: 404 });
    }

    const author = getUserDisplayName(session.user, "Usuario de Bilbohammer") ?? "Usuario de Bilbohammer";
    const comment: ArticleComment = {
      id: randomUUID(),
      author,
      avatarInitials: toInitials(author),
      postedAt: new Date().toISOString(),
      message,
      replies: [],
    };

    const existing = normalizeComments(article.comments);
    const nextComments = body.parentId ? appendReply(existing, body.parentId, comment) : [...existing, comment];

    await prisma.newsArticle.update({
      where: { id: article.id },
      data: { comments: nextComments },
    });

    return NextResponse.json({ comment, comments: nextComments });
  } catch (error) {
    console.error("[novedades] error guardando comentario", error);
    return NextResponse.json({ error: "No se pudo guardar el comentario." }, { status: 500 });
  }
}
