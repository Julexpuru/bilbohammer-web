// web/src/app/page.tsx
import HeroCarousel from "@/components/home/HeroCarousel";
import FeedTabs from "@/components/home/FeedTabs";
import EventsCalendar from "@/components/home/EventsCalendar";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import InstagramFeed from "@/components/home/InstagramFeed";
import { HOME_FEED_PAGE_SIZE } from "@/constants/feed";
import { getArticlesByCategory } from "@/lib/novedades-repository";
import type { Article } from "@/app/novedades/data";
import type { PostType } from "@prisma/client";

type UiPost = {
  id: string;
  type: PostType;
  title: string;
  content: string;
  createdAt: string;
  imageUrl?: string | null;
  reactionScore?: number;
  href?: string;
};

export default async function HomePage() {
  const session = await auth();
  const isMember = !!session; // afinaremos por rol más adelante
  const now = new Date();

  // SSR: primera tanda para evitar parpadeo
  const [newsArticles, memberArticles, upcomingEvents] = await Promise.all([
    getArticlesByCategory("news"),
    isMember ? getArticlesByCategory("members") : Promise.resolve([]),
    prisma.event.findMany({
      where: {
        status: "PUBLISHED",
        endsAt: { gte: now },
      },
      orderBy: { startsAt: "asc" },
      take: HOME_FEED_PAGE_SIZE,
    }),
  ]);

  const anunciosUI = newsArticles.slice(0, HOME_FEED_PAGE_SIZE).map((article) => mapArticleToPost(article, "ANUNCIO"));
  const eventosUI = upcomingEvents.map(mapEventToPost);
  const privadasUI = isMember
    ? memberArticles.slice(0, HOME_FEED_PAGE_SIZE).map((article) => mapArticleToPost(article, "NOTICIA_PRIVADA"))
    : [];

  const initialByType: Partial<Record<PostType, UiPost[]>> = {
    ANUNCIO: anunciosUI,
    EVENTO: eventosUI,
  };
  if (isMember) {
    initialByType.NOTICIA_PRIVADA = privadasUI;
  }

  return (
    <>
      <section className="mx-auto mb-14 w-full max-w-5xl px-4 sm:px-6 lg:px-0">
        <div className="rounded-3xl border border-[var(--accent-200)] bg-gradient-to-r from-[#ffe08a] via-[#ffc163] to-[#ff9f45] p-4 text-center text-sm font-medium text-[#2d1f00] shadow-lg dark:border-[var(--accent-400)] dark:text-[#1a1200]">
          Esta pagina actualmente esta ultimando su desarrollo y contenido y la información mostrada en ella puede no
          corresponderse totalmente con la realidad.
        </div>
      </section>
      <HeroCarousel />
      <FeedTabs showPrivate={isMember} initialByType={initialByType} />
      <EventsCalendar />
      <InstagramFeed />
    </>
  );
}

function mapArticleToPost(article: Article, type: PostType): UiPost {
  const fallback =
    article.summary ||
    article.body?.find((block) => block.type === "paragraph")?.text ||
    "Consulta la ficha completa en la sección de novedades.";
  const category = article.category || article.categories?.[0] || "news";
  return {
    id: `article-${article.id}`,
    type,
    title: article.title,
    content: fallback,
    createdAt: article.date ?? new Date().toISOString(),
    imageUrl: article.banner ?? null,
    reactionScore: article.tags.length,
    href: `/novedades/${category}/${article.slug}`,
  };
}

type MinimalEvent = {
  id: string;
  title: string;
  details: string | null;
  location: string | null;
  startsAt: Date;
  bannerUrl: string | null;
};

function mapEventToPost(event: MinimalEvent): UiPost {
  return {
    id: `event-${event.id}`,
    type: "EVENTO",
    title: event.title,
    content: event.details ?? event.location ?? "Consulta la ficha completa para ver todos los detalles.",
    createdAt: event.startsAt.toISOString(),
    imageUrl: event.bannerUrl ?? null,
    reactionScore: 0,
    href: `/eventos/${event.id}`,
  };
}


