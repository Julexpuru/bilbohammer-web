// Server Component
import { prisma } from "@/lib/prisma";
import ClientEditWrapper from "./ClientEditWrapper";
import { GamesSection } from "@/components/profile/GamesSection";
import { GAME_TITLES, toUiId } from "@/lib/games_helpers";

import { auth } from "@/lib/auth";

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
    include: { accounts: true },
  });

  if (!user) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-bold">Mi Perfil</h1>
        <p className="mt-4">No se ha encontrado tu usuario.</p>
      </div>
    );
  }

  const displayAvatar: string | undefined = user.avatarUrl ?? user.image ?? undefined;
  const hasAvatar = !!displayAvatar;
  const _memberSinceRaw = (user as any).memberSince ?? (user as any).membershipSince ?? null;
  const memberSinceText = _memberSinceRaw
    ? new Date(_memberSinceRaw).toLocaleDateString("es-ES", { month: "long", year: "numeric" })
    : "—";
  const displayNick = user.nick || user.nombre || user.name || user.email;
  const memberSinceISO = user.membershipSince ? new Date(user.membershipSince).toISOString() : null;
  const description = user.descripcion ?? null;

  const roleBadges = normalizeRoles((user as any).roles ?? (session.user as any)?.roles ?? (session.user as any)?.rol);

  const uiGames: string[] = Array.isArray(user.juegos) ? (user.juegos as any[]).map((e) => toUiId(String(e))) : [];

  const factions: Record<string, string[]> = {
    w40k: Array.isArray(user.faccionesW40K) ? (user.faccionesW40K as any[]).map((x) => toUiId(String(x))) : [],
    aos: Array.isArray(user.faccionesAoS) ? (user.faccionesAoS as any[]).map((x) => toUiId(String(x))) : [],
    tow: Array.isArray(user.faccionesTOW) ? (user.faccionesTOW as any[]).map((x) => toUiId(String(x))) : [],
  };

  const gamesForView = uiGames.map((gid) => ({
    id: gid,
    name: (GAME_TITLES as any)[gid] ?? gid,
    iconUrl: null as string | null,
    factions:
      gid === "w40k"
        ? factions.w40k.map((fid) => ({ id: fid, name: fid.replace(/_/g, " ").toUpperCase() }))
        : gid === "aos"
        ? factions.aos.map((fid) => ({ id: fid, name: fid.replace(/_/g, " ").toUpperCase() }))
        : gid === "tow"
        ? factions.tow.map((fid) => ({ id: fid, name: fid.replace(/_/g, " ").toUpperCase() }))
        : [],
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
        <div className="w-28 h-28 rounded-full overflow-hidden border border-white/10 bg-slate-800/40">
          {hasAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayAvatar as string} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center" style={{ background: "var(--card)", color: "var(--muted)" }}>
              <svg viewBox="0 0 24 24" width="88" height="88" aria-hidden="true">
                <circle cx="12" cy="8" r="4" fill="currentColor" opacity="0.35" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="currentColor" opacity="0.35"/>
                <circle cx="12" cy="8" r="3" fill="currentColor" />
                <path d="M6 20c.8-2.6 3.6-4 6-4s5.2 1.4 6 4" fill="currentColor"/>
              </svg>
            </div>
          )}
        </div>
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

      <section className="rounded-xl border border-white/10 p-4 bg-slate-900/40">
        <h2 className="text-lg font-semibold mb-2">Eventos</h2>
        <div className="text-sm opacity-70">Organizador y Participante — próximamente.</div>
      </section>
    </div>
  );
}

