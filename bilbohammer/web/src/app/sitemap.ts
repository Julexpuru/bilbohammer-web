import type { MetadataRoute } from "next";
import { EventStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { buildEventSlug } from "@/lib/events/slug";
import { absoluteSiteUrl } from "@/lib/site-url";

type SitemapItem = MetadataRoute.Sitemap[number];
export const dynamic = "force-dynamic";
export const revalidate = 3600;

const STATIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: SitemapItem["changeFrequency"] }> = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/eventos", priority: 0.9, changeFrequency: "daily" },
  { path: "/novedades", priority: 0.9, changeFrequency: "daily" },
  { path: "/galeria", priority: 0.8, changeFrequency: "weekly" },
  { path: "/sobre-nosotros", priority: 0.7, changeFrequency: "monthly" },
  { path: "/sobre-nosotros/quienes-somos", priority: 0.6, changeFrequency: "monthly" },
  { path: "/sobre-nosotros/contacto", priority: 0.6, changeFrequency: "monthly" },
  { path: "/sobre-nosotros/juegos", priority: 0.6, changeFrequency: "weekly" },
  { path: "/politica-de-cookies", priority: 0.2, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: absoluteSiteUrl(route.path),
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  try {
    const [events, articles, albums] = await Promise.all([
      prisma.event.findMany({
        where: {
          status: { in: [EventStatus.PUBLISHED, EventStatus.FINALIZED] },
          isMembersOnly: false,
          isInternal: false,
        },
        select: { id: true, title: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.newsArticle.findMany({
        where: {
          status: "published",
          NOT: {
            categories: {
              has: "members",
            },
          },
        },
        select: { slug: true, categories: true, primaryCategory: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.galleryAlbum.findMany({
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const eventEntries: MetadataRoute.Sitemap = events.map((event) => ({
      url: absoluteSiteUrl(`/eventos/${buildEventSlug(event.id, event.title)}`),
      lastModified: event.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const articlePaths = new Map<string, Date>();
    for (const article of articles) {
      const uniqueCategories = new Set<string>(article.categories?.length ? article.categories : [article.primaryCategory]);
      for (const category of uniqueCategories) {
        if (category === "members") continue;
        if (category !== "news" && category !== "chronicles") continue;
        articlePaths.set(`/novedades/${category}/${article.slug}`, article.updatedAt);
      }
    }

    const articleEntries: MetadataRoute.Sitemap = Array.from(articlePaths.entries()).map(([path, updatedAt]) => ({
      url: absoluteSiteUrl(path),
      lastModified: updatedAt,
      changeFrequency: "monthly",
      priority: 0.7,
    }));

    const albumEntries: MetadataRoute.Sitemap = albums.map((album) => ({
      url: absoluteSiteUrl(`/galeria/${album.slug}`),
      lastModified: album.updatedAt,
      changeFrequency: "monthly",
      priority: 0.7,
    }));

    return [...staticEntries, ...eventEntries, ...articleEntries, ...albumEntries];
  } catch (error) {
    console.error("[sitemap] failed to load dynamic routes", error);
    return staticEntries;
  }
}
