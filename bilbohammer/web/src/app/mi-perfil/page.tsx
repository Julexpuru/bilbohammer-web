// Server Component
import { prisma } from "@/lib/prisma";
import dynamic from "next/dynamic";
import { GamesSection } from "@/components/profile/GamesSection";
import { EventsTabs } from "@/components/profile/EventsTabs";
import { toUiId } from "@/lib/games_helpers";
import { gameIconPath } from "@/lib/games";
import { Avatar } from "@/components/profile/Avatar";
import { auth } from "@/lib/auth";

const ClientEditWrapper = dynamic(() => import("./ClientEditWrapper"), { ssr: false });

const normalizeRoles = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((role) => String(role));
  if (value == null) return [];
  return [String(value)];
};

export default async function Page() {
  const session = await auth();
  if (!session?.user?.email) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-bold">Mi Perfil</h1>
        <p className="mt-4">Necesitas iniciar sesión.</p>
      </div>
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      accounts: true,
      games: {
        include: { game: true },
        orderBy: { game: { sortOrder: "asc" } },
      },
    },
  });

  if (!user) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-bold">Mi Perfil</h1>
        <p className="mt-4">No se ha encontrado tu usuario.</p>
      </div>
    );
  }

  const _memberSinceRaw = (user as any).memberSince ?? (user as any).membershipSince ?? null;
  const memberSinceText = _memberSinceRaw
    ? new Date(_memberSinceRaw).toLocaleDateString("es-ES", { month: "long", year: "numeric" })
    : "—";
  const displayNick = user.nick || user.nombre || user.name || user.email;
  const memberSinceISO = user.membershipSince ? new Date(user.membershipSince).toISOString() : null;
  const description = user.descripcion ?? null;
  const oauthAvatarUrl = (user as any).oauthAvatarUrl ?? user.image ?? null;

  const roleBadges = normalizeRoles((user as any).roles ?? (session.user as any)?.roles ?? (session.user as any)?.rol);

  const userGames = Array.isArray((user as any).games) ? (user as any).games : [];
  const uiGames: string[] = userGames
    .map((entry: any) => entry.game?.slug ?? entry.gameId ?? null)
    .filter((slug: unknown): slug is string => typeof slug === "string" && slug.length > 0);

  const factions: Record<string, string[]> = {
    w40k: Array.isArray(user.faccionesW40K) ? (user.faccionesW40K as any[]).map((x) => toUiId(String(x))) : [],
    aos: Array.isArray(user.faccionesAoS) ? (user.faccionesAoS as any[]).map((x) => toUiId(String(x))) : [],
    tow: Array.isArray(user.faccionesTOW) ? (user.faccionesTOW as any[]).map((x) => toUiId(String(x))) : [],
  };

  const gamesForView = userGames
    .map((entry: any) => {
      const slug: string | null = entry.game?.slug ?? entry.gameId ?? null;
      if (!slug) return null;
      const name: string = entry.game?.name ?? slug;
      const iconUrl: string | null = entry.game?.iconImagePath ?? gameIconPath(slug);
      const factionsForGame =
        slug === "w40k"
          ? factions.w40k.map((fid) => ({ id: fid, name: fid.replace(/_/g, " ").toUpperCase() }))
          : slug === "aos"
          ? factions.aos.map((fid) => ({ id: fid, name: fid.replace(/_/g, " ").toUpperCase() }))
          : slug === "tow"
          ? factions.tow.map((fid) => ({ id: fid, name: fid.replace(/_/g, " ").toUpperCase() }))
          : [];
      return {
        id: slug,
        name,
        iconUrl,
        factions: factionsForGame,
      };
    })
    .filter((game: any): game is { id: string; name: string; iconUrl: string | null; factions: any[] } => Boolean(game));

  const [organizedEventsRaw, participantEventsRaw] = await Promise.all([
    prisma.event.findMany({
      where: {
        organizers: { some: { userId: user.id } },
      },
      select: { id: true, title: true, startsAt: true },
      orderBy: { startsAt: "desc" },
    }),
    prisma.event.findMany({
      where: {
        OR: [
          { rankings: { some: { playerId: user.id } } },
          { highlights: { some: { playerId: user.id } } },
        ],
      },
      select: { id: true, title: true, startsAt: true },
      orderBy: { startsAt: "desc" },
    }),
  ]);

  const eventsOrganized = organizedEventsRaw.map((event) => ({
    id: event.id,
    title: event.title,
    date: event.startsAt.toISOString(),
  }));

  const eventsParticipated = participantEventsRaw.map((event) => ({
    id: event.id,
    title: event.title,
    date: event.startsAt.toISOString(),
  }));

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mi Perfil</h1>
        <ClientEditWrapper
          profile={{
            email: user.email,
            name: user.nombre ?? user.name ?? null,
            nick: user.nick ?? null,
            memberSince: memberSinceISO,
            description,
            avatarUrl: user.avatarUrl ?? null,
            games: uiGames,
            factions,
          }}
        />
      </div>

      <section className="grid grid-cols-[auto_1fr] gap-6 items-start">
        <Avatar
          avatarUrl={user.avatarUrl ?? null}
          oauthAvatarUrl={oauthAvatarUrl}
          displayName={displayNick}
          size={112}
        />
        <div className="space-y-1">
          <div className="text-sm opacity-70">{user.email}</div>
          <div className="text-xl font-semibold">{displayNick}</div>
          <div className="flex flex-wrap gap-2">
            {roleBadges.length ? (
              roleBadges.map((role) => (
                <span
                  key={role}
                  className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-white/10"
                >
                  {role}
                </span>
              ))
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-white/10">SIN ROL</span>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 p-4 bg-slate-900/40">
        <h2 className="text-lg font-semibold mb-2">Descripción</h2>
        <p className="text-sm opacity-80">
          <strong>Socio desde:</strong>{" "}
          {memberSinceText}
        </p>
        <div className="mt-2 text-sm whitespace-pre-wrap opacity-90">{description || "Sin descripción."}</div>
      </section>

      <GamesSection games={gamesForView as any} />

      <EventsTabs organized={eventsOrganized} participated={eventsParticipated} />
    </div>
  );
}

