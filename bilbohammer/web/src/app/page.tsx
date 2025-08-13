// web/src/app/page.tsx
import HeroCarousel from "@/components/home/HeroCarousel";
import FeedTabs from "@/components/home/FeedTabs";
import InstagramEmbed from "@/components/home/InstagramEmbed";
import EventsCalendar from "@/components/home/EventsCalendar";
import NoticesForMembers from "@/components/home/NoticesForMembers";
import { auth } from "@/auth";
// import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import InstagramFeed from "@/components/home/InstagramFeed"; 

export default async function HomePage() {
  const session = await auth();
  const isMember = !!session; // afinaremos por rol más adelante

  // ✅ SSR: primera tanda para evitar parpadeo
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

  const initialByType = {
    ANUNCIO: anuncios,
    EVENTO: eventos,
    // NOTICIA_PRIVADA: si quieres, puedes precargar aquí cuando gestiones roles
  } as const;

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
