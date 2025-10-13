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
        const authUser: User = {
          id: user.id,
          email: user.email,
          name: user.name ?? user.nick ?? null,
          image: user.avatarUrl ?? user.image ?? null,
          roles,
          rol: roles[0] ?? null,
          nick: user.nick ?? null,
          avatarUrl: user.avatarUrl ?? null,
        };
        return authUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const roles = normalizeRoles((user as AnyObject).roles ?? (user as AnyObject).rol);
        (token as AnyObject).roles = roles;
        (token as AnyObject).rol = roles[0] ?? null;
        (token as AnyObject).nick = (user as AnyObject).nick ?? null;
        (token as AnyObject).avatarUrl = (user as AnyObject).avatarUrl ?? null;
        (token as AnyObject).oauthImage = (user as AnyObject).image ?? null;
      } else if ((token as AnyObject).roles == null) {
        (token as AnyObject).roles = [];
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        const tokenRoles = normalizeRoles((token as AnyObject).roles ?? (token as AnyObject).rol);
        (session.user as AnyObject).id = token?.sub ?? null;
        (session.user as AnyObject).roles = tokenRoles;
        (session.user as AnyObject).rol = tokenRoles[0] ?? null;
        (session.user as AnyObject).nick = (token as AnyObject)?.nick ?? null;
        try {
          const suEmail = (session.user as AnyObject).email as string | undefined;
          if (suEmail) {
            const u = await prisma.user.findUnique({
              where: { email: suEmail },
              select: {
                avatarUrl: true,
                image: true,
                name: true,
                nick: true,
                roles: true,
              },
            });
            const chosen = u?.avatarUrl ?? u?.image ?? null;
            (session.user as AnyObject).avatarUrl = u?.avatarUrl ?? null;
            (session.user as AnyObject).image = chosen;
            if (u?.nick && !(session.user as AnyObject).nick) (session.user as AnyObject).nick = u.nick;
            if (u?.name && !(session.user as AnyObject).name) (session.user as AnyObject).name = u.name;
            if (u?.roles) {
              const dbRoles = normalizeRoles(u.roles);
              (session.user as AnyObject).roles = dbRoles;
              (session.user as AnyObject).rol = dbRoles[0] ?? null;
              (token as AnyObject).roles = dbRoles;
              (token as AnyObject).rol = dbRoles[0] ?? null;
            }
          } else {
            const chosen = (token as AnyObject)?.avatarUrl ?? (token as AnyObject)?.oauthImage ?? null;
            (session.user as AnyObject).avatarUrl = (token as AnyObject)?.avatarUrl ?? null;
            (session.user as AnyObject).image = chosen;
          }
        } catch {}
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

