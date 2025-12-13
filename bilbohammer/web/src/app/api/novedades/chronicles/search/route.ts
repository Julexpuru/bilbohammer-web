import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { userCanEditEvent } from "@/lib/roles";
import { findArticleById, searchChronicles } from "@/lib/novedades-repository";

const mapArticle = (article: Awaited<ReturnType<typeof findArticleById>>) => {
  if (!article) return null;
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    category: article.category,
    summary: article.summary,
    date: article.date,
  };
};

export async function GET(request: Request) {
  const session = await auth();
  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId");
  if (!(await userCanEditEvent(session, eventId))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const id = url.searchParams.get("id")?.trim() ?? "";
  if (id) {
    const article = await findArticleById(id);
    const mapped = mapArticle(article);
    return NextResponse.json({ results: mapped ? [mapped] : [] });
  }

  const query = url.searchParams.get("q") ?? "";
  const matches = await searchChronicles(query, 25, true);
  return NextResponse.json({
    results: matches.map((article) => ({
      id: article.id,
      slug: article.slug,
      title: article.title,
      category: article.category,
      summary: article.summary,
      date: article.date,
    })),
  });
}
