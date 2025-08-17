// web/src/app/page.tsx
import HeroCarousel from "@/components/home/HeroCarousel";
import FeedTabs from "@/components/home/FeedTabs";
import InstagramEmbed from "@/components/home/InstagramEmbed";
import EventsCalendar from "@/components/home/EventsCalendar";
import NoticesForMembers from "@/components/home/NoticesForMembers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import InstagramFeed from "@/components/home/InstagramFeed";

// Importamos tipos de Prisma solo para construir un tipo UI local
import type { Post as PrismaPost, PostType } from "@prisma/client";

// Adaptador de tipos para la UI: garantizamos content: string
type UiPost = Omit<PrismaPost, "content" | "createdAt"> & { content: string; createdAt: string };

export default async function HomePage() {
  const session = await auth();
  const isMember = !!session; // afinaremos por rol más adelante

  // SSR: primera tanda para evitar parpadeo
  const [anuncios, eventos] = await Promise.all([
    prisma.post.findMany({
      where: { published: true, type: "ANUNCIO" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.post.findMany({
      where: { published: true, type: "EVENTO" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  // Sanitizamos content para que siempre sea string y cuadre con FeedTabs
  const anunciosUI: UiPost[] = anuncios.map((p) => ({
    ...p,
    content: p.content ?? "",
    createdAt: (p.createdAt as Date).toISOString(),
  }));
  const eventosUI: UiPost[] = eventos.map((p) => ({
    ...p,
    content: p.content ?? "",
    createdAt: (p.createdAt as Date).toISOString(),
  }));

  const initialByType: Partial<Record<PostType, UiPost[]>> = {
    ANUNCIO: anunciosUI,
    EVENTO: eventosUI,
    // NOTICIA_PRIVADA: si quieres, puedes precargar aquí cuando gestiones roles
  };

  return (
    <>
      <HeroCarousel />
      {isMember && <NoticesForMembers />}
      <FeedTabs showPrivate={isMember} initialByType={initialByType} />
      <InstagramFeed />
      <EventsCalendar />
    </>
  );
}
