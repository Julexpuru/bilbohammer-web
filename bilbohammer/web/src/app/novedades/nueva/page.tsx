import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { extractRoles } from "@/lib/roles";

import { ArticleEditor } from "../ArticleEditor";
import type { ArticleCategory } from "../data";

const MANAGER_ROLES = new Set(["ADMIN", "JUNTA", "REDACTOR"]);

export const metadata = {
  title: "Crear noticia | Novedades | Bilbohammer",
};

type SearchParams = {
  category?: string;
  linkEvent?: string;
  returnTo?: string;
};

function isArticleCategory(value: string | undefined): value is ArticleCategory {
  return value === "news" || value === "chronicles" || value === "members";
}

export default async function CreateArticlePage({ searchParams }: { searchParams?: SearchParams }) {
  const session = await auth();
  const roles = extractRoles(session);
  const canManage = roles.some((role) => MANAGER_ROLES.has(role));

  if (!canManage) {
    redirect("/novedades");
  }

  const requestedCategory = searchParams?.category;
  const defaultCategory = isArticleCategory(requestedCategory) ? requestedCategory : "news";
  const linkEventId = searchParams?.linkEvent ?? null;
  const returnTo = searchParams?.returnTo ?? null;

  return (
    <ArticleEditor
      mode="create"
      defaultCategory={defaultCategory}
      linkEventId={linkEventId}
      returnTo={returnTo}
    />
  );
}
