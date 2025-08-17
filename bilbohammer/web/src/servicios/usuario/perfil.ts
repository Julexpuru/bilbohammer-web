import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UserProfile } from "@/types/profile";
import { GAMES, FACTIONS, enumFactionToUi, factionIconPath } from "@/lib/games";

export async function getCurrentUserProfile(): Promise<UserProfile> {
  const session = await auth();
  const su = (session?.user ?? {}) as any;
  if (!su?.email) throw new Error("No session");

  const user = await prisma.user.findUnique({
    where: { email: su.email },
    select: {
      id: true, email: true, name: true, nombre: true, nick: true, descripcion: true, avatarUrl: true,
      image: true, emailVerified: true, rol: true, etiquetas: true, juegos: true, isActive: true,
      lastLoginAt: true, membershipSince: true, membershipUntil: true, createdAt: true, updatedAt: true,
      faccionesW40K: true, faccionesAoS: true, faccionesTOW: true,
    }
  });

  if (!user) {
    const u = su;
    return {
      id: `${u?.id ?? "unknown"}`,
      email: u?.email ?? "",
      nick: u?.nick ?? null,
      avatarUrl: u?.avatarUrl ?? null,
      oauthAvatarUrl: u?.image ?? null,
      roles: u?.rol ? [String(u.rol)] : [],
      juntaPositions: [],
      memberSince: null,
      description: u?.description ?? null,
      games: [],
      eventsOrganized: [],
      eventsParticipated: [],
    };
  }

  const gameIds = (user.juegos || []).map((j: any) => String(j).toLowerCase());
  const games = GAMES.filter(g => gameIds.includes(g.id)).map(g => {
    let selectedFactionIds: string[] = [];
    if (g.id === "w40k") selectedFactionIds = (user.faccionesW40K || []).map((ev: any) => enumFactionToUi("w40k", String(ev)));
    if (g.id === "aos") selectedFactionIds = (user.faccionesAoS || []).map((ev: any) => enumFactionToUi("aos", String(ev)));
    if (g.id === "tow") selectedFactionIds = (user.faccionesTOW || []).map((ev: any) => enumFactionToUi("tow", String(ev)));

    const list = (FACTIONS as any)[g.id] || [];
    return {
      id: g.id,
      name: g.name,
      iconUrl: g.iconUrl ?? null,
      factions: list
        .filter((f: any) => selectedFactionIds.includes(f.id))
        .map((f: any) => ({ ...f, iconUrl: f.iconUrl ?? factionIconPath(g.id as any, f.id) })),
    };
  });

  const profile: UserProfile = {
    id: String(user.id),
    email: user.email,
    nick: user.nick ?? user.nombre ?? user.name ?? null,
    avatarUrl: user.avatarUrl ?? null,
    oauthAvatarUrl: user.image ?? null,
    roles: user.rol ? [String(user.rol)] : [],
    juntaPositions: [],
    memberSince: user.membershipSince ? user.membershipSince.toISOString() : null,
    description: user.descripcion ?? null,
    games,
    eventsOrganized: [],
    eventsParticipated: [],
  };

  return profile;
}
