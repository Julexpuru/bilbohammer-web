import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { extractRoles } from "@/lib/roles";
import { findArticleByCategoryAndSlug } from "@/lib/novedades-repository";

import { ArticleEditor } from "../../../ArticleEditor";
import { type ArticleCategory } from "../../../data";

const MANAGER_ROLES = new Set(["ADMIN", "JUNTA", "REDACTOR"]);

type PageParams = {
  category: string;
  slug: string;
};

type SearchParams = {
  linkEvent?: string;
  returnTo?: string;
};

function isArticleCategory(value: string): value is ArticleCategory {
  return value === "news" || value === "chronicles" || value === "members";
}

export const metadata = {
  title: "Editar noticia | Novedades | Bilbohammer",
};

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams?: SearchParams;
}) {
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

  if (!canManage) {
    redirect(`/novedades/${article.category}/${article.slug}`);
  }

  const { comments, ...editableArticle } = article;

  const linkEventId = searchParams?.linkEvent ?? null;
  const returnTo = searchParams?.returnTo ?? null;

  return (
    <ArticleEditor
      mode="edit"
      initialValue={editableArticle}
      initialComments={comments}
      defaultCategory={editableArticle.category}
      linkEventId={linkEventId}
      returnTo={returnTo}
    />
  );
}

