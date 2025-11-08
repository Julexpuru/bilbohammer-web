// src/lib/auth.ts -> NextAuth v5 (Node). PrismaAdapter (Int IDs) + Google + Credentials. Sesion JWT.
// Corrige doble `return token` y unifica avatar (manual > Google > inicial).
import NextAuth from "next-auth";
import type { User } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { actualizaPerfilGoogleSiNecesario } from "@/servicios/usuario/actualiza-perfil-google";
import { PrismaIntAdapter } from "@/lib/prisma-int-adapter";

type AnyObject = Record<string, any>;

const normalizeRoles = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((role) => String(role));
  }
  if (value == null) return [];
  return [String(value)];
};

export const authConfig = {
  session: { strategy: "jwt" as const },
  adapter: PrismaIntAdapter(prisma),
  providers: [
    Google({}),
    Credentials({
      name: "Email y contrasena",
      credentials: {
        email: { label: "Email", type: "email" },
        contrasena: { label: "Contrasena", type: "password" },
      },
      async authorize(creds): Promise<User | null> {
        const email = (creds as AnyObject)?.email as string | undefined;
        const contrasena = (creds as AnyObject)?.contrasena as string | undefined;
        if (!email || !contrasena) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(contrasena, user.passwordHash);
        if (!ok) return null;
        const roles = normalizeRoles((user as AnyObject).roles);
        const oauthAvatar = user.oauthAvatarUrl ?? user.image ?? null;
        const resolvedImage = user.avatarUrl ?? oauthAvatar ?? null;
        const authUser: User = {
          id: user.id,
          email: user.email,
          name: user.name ?? user.nick ?? null,
          image: resolvedImage,
          roles,
          rol: roles[0] ?? null,
          nick: user.nick ?? null,
          avatarUrl: user.avatarUrl ?? null,
          oauthAvatarUrl: oauthAvatar,
        };
        return authUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      const providerAvatar =
        account?.provider === "google"
          ? (profile as AnyObject)?.picture ?? (profile as AnyObject)?.image ?? null
          : null;
      if (user) {
        const email = (user as AnyObject)?.email ?? (token as AnyObject)?.email ?? null;
        if (email) (token as AnyObject).email = email;
        const roles = normalizeRoles((user as AnyObject).roles ?? (user as AnyObject).rol);
        (token as AnyObject).roles = roles;
        (token as AnyObject).rol = roles[0] ?? null;
        (token as AnyObject).nick = (user as AnyObject).nick ?? null;
        (token as AnyObject).avatarUrl = (user as AnyObject).avatarUrl ?? null;
        const userOauthAvatar = (user as AnyObject).oauthAvatarUrl ?? (user as AnyObject).image ?? null;
        (token as AnyObject).oauthAvatarUrl =
          providerAvatar ?? userOauthAvatar ?? (token as AnyObject).oauthAvatarUrl ?? null;
      } else if ((token as AnyObject).roles == null) {
        (token as AnyObject).roles = [];
      }
      if (providerAvatar) (token as AnyObject).oauthAvatarUrl = providerAvatar;
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        const tokenRoles = normalizeRoles((token as AnyObject).roles ?? (token as AnyObject).rol);
        (session.user as AnyObject).id = token?.sub ?? null;
        (session.user as AnyObject).roles = tokenRoles;
        (session.user as AnyObject).rol = tokenRoles[0] ?? null;
        (session.user as AnyObject).nick = (token as AnyObject)?.nick ?? (session.user as AnyObject).nick ?? null;

        const fallbackAssignFromToken = () => {
          const avatarFromToken = (token as AnyObject)?.avatarUrl ?? null;
          const oauthAvatarFromToken = (token as AnyObject)?.oauthAvatarUrl ?? null;
          const chosen = avatarFromToken ?? oauthAvatarFromToken ?? null;
          (session.user as AnyObject).avatarUrl = avatarFromToken;
          (session.user as AnyObject).image = chosen;
          (session.user as AnyObject).oauthAvatarUrl = oauthAvatarFromToken;
        };

        try {
          const emailFromToken = (token as AnyObject).email ?? (session.user as AnyObject).email ?? null;
          const userId = token?.sub ? Number(token.sub) : null;
          const numericUserId = Number.isFinite(userId) ? userId : null;
          const where = emailFromToken ? { email: emailFromToken } : numericUserId != null ? { id: numericUserId } : null;

          if (where) {
            let u = await prisma.user.findUnique({
              where,
              select: {
                avatarUrl: true,
                oauthAvatarUrl: true,
                image: true,
                name: true,
                nick: true,
                roles: true,
              },
            });

            const oauthAvatarFromToken = (token as AnyObject)?.oauthAvatarUrl ?? null;

            if (oauthAvatarFromToken) {
              const needsUpdate =
                u?.oauthAvatarUrl !== oauthAvatarFromToken || u?.image !== oauthAvatarFromToken;
              try {
                if (needsUpdate) {
                  await prisma.user.update({
                    where,
                    data: {
                      oauthAvatarUrl: oauthAvatarFromToken,
                      image: oauthAvatarFromToken,
                    },
                  });
                  if (u) {
                    u = {
                      ...u,
                      oauthAvatarUrl: oauthAvatarFromToken,
                      image: oauthAvatarFromToken,
                    };
                  } else {
                    u = {
                      avatarUrl: null,
                      oauthAvatarUrl: oauthAvatarFromToken,
                      image: oauthAvatarFromToken,
                      name: null,
                      nick: null,
                      roles: [],
                    };
                  }
                }
              } catch {
                // si falla la actualizacion no bloqueamos la sesion; se reintentara en el siguiente login
              }
            }

            if (u) {
              const oauthAvatar = u.oauthAvatarUrl ?? oauthAvatarFromToken ?? null;
              const chosen = u.avatarUrl ?? oauthAvatar ?? null;
              (session.user as AnyObject).avatarUrl = u.avatarUrl ?? null;
              (session.user as AnyObject).oauthAvatarUrl = oauthAvatar;
              (session.user as AnyObject).image = chosen;
              (token as AnyObject).avatarUrl = u.avatarUrl ?? null;
              (token as AnyObject).oauthAvatarUrl = oauthAvatar;
              if (u.nick) (session.user as AnyObject).nick ??= u.nick;
              if (u.name) (session.user as AnyObject).name ??= u.name;
              if (u.roles) {
                const dbRoles = normalizeRoles(u.roles);
                if (dbRoles.length) {
                  (session.user as AnyObject).roles = dbRoles;
                  (session.user as AnyObject).rol = dbRoles[0] ?? null;
                  (token as AnyObject).roles = dbRoles;
                  (token as AnyObject).rol = dbRoles[0] ?? null;
                }
              }
            } else {
              fallbackAssignFromToken();
            }
          } else {
            fallbackAssignFromToken();
          }
        } catch {
          fallbackAssignFromToken();
        }
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          await actualizaPerfilGoogleSiNecesario({
            userId: Number((user as AnyObject).id),
            perfil: {
              nombre: (profile as AnyObject)?.name ?? null,
              imagen: (profile as AnyObject)?.picture ?? (profile as AnyObject)?.image ?? null,
            },
          });
        } catch {}
      }
    },
  },
} satisfies Parameters<typeof NextAuth>[0];

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

