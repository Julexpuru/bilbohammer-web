import { auth } from "@/auth";
import { extractRoles } from "@/lib/roles";
import { getArticlesGrouped } from "@/lib/novedades-repository";

import { NovedadesContent } from "./NovedadesContent";
import type { ArticleCategory } from "./data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Novedades | Bilbohammer",
  description: "Explora noticias, crónicas y contenidos exclusivos para socios del club Bilbohammer.",
};

type PageProps = {
  searchParams?: {
    tab?: string | string[];
    [key: string]: string | string[] | undefined;
  };
};

export default async function NovedadesPage({ searchParams }: PageProps) {
  const session = await auth();
  const roles = extractRoles(session);
  const isSocio = roles.includes("SOCIO");
  const canManage = roles.some((role) => role === "ADMIN" || role === "JUNTA" || role === "REDACTOR");
  const articlesByCategory = await getArticlesGrouped(canManage);

  const requestedTab = parseTabParam(searchParams?.tab);
  const initialTab: ArticleCategory | undefined =
    requestedTab && (requestedTab !== "members" || isSocio) ? requestedTab : undefined;

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-8 text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent-600)]">Lo último del club</p>
        <h1 className="mt-3 text-3xl font-bold text-[var(--text)] sm:text-4xl">Novedades</h1>
        <p className="mt-3 text-sm text-[var(--muted)] sm:text-base">
          Descubre las noticias más recientes, revive las crónicas de nuestras actividades y accede a contenido exclusivo
          si formas parte del club como socio.
        </p>
      </header>
      <NovedadesContent
        articlesByCategory={articlesByCategory}
        showMembersTab={isSocio}
        canManage={canManage}
        initialTab={initialTab}
      />
    </main>
  );
}

function parseTabParam(value?: string | string[]): ArticleCategory | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === "news" || candidate === "chronicles" || candidate === "members") {
    return candidate;
  }
  return null;
}
