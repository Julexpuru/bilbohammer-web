import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { extractRoles } from "@/lib/roles";
import { findArticleByCategoryAndSlug } from "@/lib/novedades-repository";

import { ArticleDetailView } from "../../ArticleDetailView";
import { collectArticleImages, type ArticleCategory, CATEGORY_LABELS, listStaticArticles } from "../../data";

export const dynamic = "force-dynamic";

const MANAGER_ROLES = new Set(["ADMIN", "JUNTA", "REDACTOR"]);

type PageParams = {
  category: string;
  slug: string;
};

function isArticleCategory(value: string): value is ArticleCategory {
  return value === "news" || value === "chronicles" || value === "members";
}

export function generateStaticParams() {
  return listStaticArticles().map((article) => ({
    category: article.category,
    slug: article.slug,
  }));
}

export async function generateMetadata({ params }: { params: PageParams }) {
  if (!isArticleCategory(params.category)) {
    return {};
  }
  const article = await findArticleByCategoryAndSlug(params.category, params.slug);
  if (!article) {
    return {};
  }
  const section = CATEGORY_LABELS[article.category];
  return {
    title: `${article.title} | ${section} | Bilbohammer`,
    description: article.summary,
  };
}

export default async function ArticlePage({ params }: { params: PageParams }) {
  if (!isArticleCategory(params.category)) {
    notFound();
  }

  const article = await findArticleByCategoryAndSlug(params.category, params.slug);
  if (!article) {
    notFound();
  }

  const session = await auth();
  const roles = extractRoles(session);
  const canManage = roles.some((role) => MANAGER_ROLES.has(role));
  const isSocio = roles.includes("SOCIO");

  if (article.categories.includes("members") && !(isSocio || canManage)) {
    notFound();
  }

  const canComment = Boolean(session?.user);
  const currentUserName = session?.user?.name ?? null;
  const relatedPhotos = collectArticleImages(article);

  return (
    <ArticleDetailView
      article={article}
      relatedPhotos={relatedPhotos}
      canManage={canManage}
      canComment={canComment}
      currentUserName={currentUserName}
    />
  );
}

