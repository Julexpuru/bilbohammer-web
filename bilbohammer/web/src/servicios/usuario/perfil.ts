import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UserProfile } from "@/types/profile";
import { GAMES, FACTIONS, enumFactionToUi, factionIconPath } from "@/lib/games";

type AnyObject = Record<string, any>;

const normalizeRoles = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((role) => String(role));
  if (value == null) return [];
  return [String(value)];
};

export async function getCurrentUserProfile(): Promise<UserProfile> {
  const session = await auth();
  const su = (session?.user ?? {}) as AnyObject;
  if (!su?.email) throw new Error("No session");

  const user = await prisma.user.findUnique({
    where: { email: su.email },
    select: {
      id: true,
      email: true,
      name: true,
      nombre: true,
      nick: true,
      descripcion: true,
      avatarUrl: true,
      image: true,
      emailVerified: true,
      roles: true,
      etiquetas: true,
      juegos: true,
      isActive: true,
      lastLoginAt: true,
      membershipSince: true,
      membershipUntil: true,
      createdAt: true,
      updatedAt: true,
      faccionesW40K: true,
      faccionesAoS: true,
      faccionesTOW: true,
    },
  });

  const fallbackRoles = normalizeRoles(su?.roles ?? su?.rol);

  if (!user) {
    return {
      id: `${su?.id ?? "unknown"}`,
      email: su?.email ?? "",
      nick: su?.nick ?? null,
      avatarUrl: su?.avatarUrl ?? null,
      oauthAvatarUrl: su?.image ?? null,
      roles: fallbackRoles,
      juntaPositions: [],
      memberSince: null,
      description: su?.description ?? null,
      games: [],
      eventsOrganized: [],
      eventsParticipated: [],
    };
  }

  const gameIds = (user.juegos || []).map((j: any) => String(j).toLowerCase());
  const games = GAMES.filter((g) => gameIds.includes(g.id)).map((g) => {
    let selectedFactionIds: string[] = [];
    if (g.id === "w40k") selectedFactionIds = (user.faccionesW40K || []).map((ev: any) => enumFactionToUi("w40k", String(ev)));
    if (g.id === "aos") selectedFactionIds = (user.faccionesAoS || []).map((ev: any) => enumFactionToUi("aos", String(ev)));
    if (g.id === "tow") selectedFactionIds = (user.faccionesTOW || []).map((ev: any) => enumFactionToUi("tow", String(ev)));

    const list = (FACTIONS as AnyObject)[g.id] || [];
    return {
      id: g.id,
      name: g.name,
      iconUrl: g.iconUrl ?? null,
      factions: list
        .filter((f: AnyObject) => selectedFactionIds.includes(f.id))
        .map((f: AnyObject) => ({ ...f, iconUrl: f.iconUrl ?? factionIconPath(g.id as any, f.id) })),
    };
  });

  const roles = normalizeRoles(user.roles ?? fallbackRoles);

  const profile: UserProfile = {
    id: String(user.id),
    email: user.email,
    nick: user.nick ?? user.nombre ?? user.name ?? null,
    avatarUrl: user.avatarUrl ?? null,
    oauthAvatarUrl: user.image ?? null,
    roles,
    juntaPositions: [],
    memberSince: user.membershipSince ? user.membershipSince.toISOString() : null,
    description: user.descripcion ?? null,
    games,
    eventsOrganized: [],
    eventsParticipated: [],
  };

  return profile;
}

