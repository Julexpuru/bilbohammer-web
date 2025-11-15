export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// src/app/api/posts/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getArticlesByCategory } from "@/lib/novedades-repository";
import { HOME_FEED_PAGE_SIZE } from "@/constants/feed";
import { auth } from "@/auth";
import type { ArticleCategory } from "@/app/novedades/data";
import type { PostType } from "@prisma/client";
import { buildEventSlug } from "@/lib/events/slug";

type FeedItem = {
  id: string;
  type: PostType;
  title: string;
  content: string;
  createdAt: string;
  imageUrl?: string | null;
  href?: string;
};

const ARTICLE_CATEGORY_BY_TYPE: Record<Exclude<PostType, "EVENTO">, ArticleCategory> = {
  ANUNCIO: "news",
  NOTICIA_PRIVADA: "members",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") as PostType) ?? "ANUNCIO";
  const cursor = searchParams.get("cursor") || undefined;
  const limitParam = Number(searchParams.get("limit"));
  const take =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(Math.trunc(limitParam), HOME_FEED_PAGE_SIZE)
      : HOME_FEED_PAGE_SIZE;

  if (type === "EVENTO") {
    return fetchEventFeed(cursor, take);
  }

  if (type === "NOTICIA_PRIVADA") {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Privado" }, { status: 401 });
    }
  }

  return fetchArticleFeed(type, cursor, take);
}

async function fetchArticleFeed(type: Exclude<PostType, "EVENTO">, cursor: string | undefined, take: number) {
  const category = ARTICLE_CATEGORY_BY_TYPE[type];
  const articles = await getArticlesByCategory(category);
  const startIndex = cursor ? Math.max(Number(cursor), 0) : 0;
  const slice = articles.slice(startIndex, startIndex + take);
  const nextCursor = startIndex + slice.length < articles.length ? String(startIndex + slice.length) : null;
  const items: FeedItem[] = slice.map((article) => ({
    id: `article-${article.id}`,
    type,
    title: article.title,
    content:
      article.summary ||
      article.body?.find((block) => block.type === "paragraph")?.text ||
      "Consulta la ficha completa en la sección de novedades.",
    createdAt: article.date ?? new Date().toISOString(),
    imageUrl: article.banner ?? null,
    href: `/novedades/${article.category || category}/${article.slug}`,
  }));

  return NextResponse.json({ items, nextCursor });
}

async function fetchEventFeed(cursor: string | undefined, take: number) {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      endsAt: { gte: now },
    },
    orderBy: { startsAt: "asc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasExtra = events.length > take;
  const nextCursor = hasExtra ? events[events.length - 1].id : null;
  const slice = hasExtra ? events.slice(0, -1) : events;
  const items: FeedItem[] = slice.map((event) => ({
    id: `event-${event.id}`,
    type: "EVENTO",
    title: event.title,
    content: event.details ?? event.location ?? "Consulta la ficha del evento para más información.",
    createdAt: event.startsAt.toISOString(),
    imageUrl: event.bannerUrl ?? null,
    href: `/eventos/${buildEventSlug(event.id, event.title)}`,
  }));
  return NextResponse.json({ items, nextCursor });
}
