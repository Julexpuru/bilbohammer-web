import { NextResponse } from "next/server";

import type { Article } from "@/app/novedades/data";
import { saveArticle } from "@/lib/novedades-repository";

type CreateArticlePayload = {
  article: Article;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<CreateArticlePayload>;
    const article = payload?.article;
    if (!article) {
      return NextResponse.json({ error: "Faltan datos de la noticia." }, { status: 400 });
    }

    if (!article.title || !article.slug || !article.summary || !article.banner) {
      return NextResponse.json(
        { error: "La noticia debe tener título, slug, resumen y banner." },
        { status: 400 },
      );
    }

    if (!Array.isArray(article.categories)) {
      article.categories = [];
    }
    const categories = article.categories;
    if (!article.category || !categories.includes(article.category)) {
      const fallback = categories[0] ?? "news";
      article.category = fallback;
      article.categories = categories.includes(fallback) ? categories : [fallback, ...categories];
    }

    article.comments = article.comments ?? [];
    article.tags = article.tags ?? [];
    article.body = article.body ?? [];

    const stored = await saveArticle(article as Article);
    return NextResponse.json(
      { id: stored.id, slug: stored.slug, category: stored.category },
      { status: 201 },
    );
  } catch (error) {
    console.error("[novedades] Error creando noticia", error);
    return NextResponse.json(
      { error: "No se pudo guardar la noticia. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
