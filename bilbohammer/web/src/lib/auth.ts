// src/lib/auth.ts — NextAuth v5 (Node). PrismaAdapter (Int IDs) + Google + Credentials. Sesión JWT.
// Corrige doble `return token` y unifica avatar (manual > Google > inicial).
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { actualizaPerfilGoogleSiNecesario } from "@/servicios/usuario/actualiza-perfil-google";
import { PrismaIntAdapter } from "@/lib/prisma-int-adapter";

export const authConfig = {
  session: { strategy: "jwt" as const },
  adapter: PrismaIntAdapter(prisma),
  providers: [
    Google({}),
    Credentials({
      name: "Email y contraseña",
      credentials: {
        email: { label: "Email", type: "email" },
        contrasena: { label: "Contraseña", type: "password" },
      },
      async authorize(creds) {
        const email = (creds as any)?.email as string | undefined;
        const contrasena = (creds as any)?.contrasena as string | undefined;
        if (!email || !contrasena) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(contrasena, user.passwordHash);
        if (!ok) return null;
        return {
          id: String(user.id),
          email: user.email,
          name: user.name ?? user.nick ?? null,
          image: user.avatarUrl ?? user.image ?? null,
          rol: (user as any).rol ?? null,
          nick: user.nick ?? null,
          avatarUrl: user.avatarUrl ?? null,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).rol = (user as any).rol ?? null;
        (token as any).nick = (user as any).nick ?? null;
        (token as any).avatarUrl = (user as any).avatarUrl ?? null;
        (token as any).oauthImage = (user as any).image ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).id = token?.sub ?? null;
        (session.user as any).rol = (token as any)?.rol ?? null;
        (session.user as any).nick = (token as any)?.nick ?? null;
        try {
          const suEmail = (session.user as any).email as string | undefined;
          if (suEmail) {
            const u = await prisma.user.findUnique({
              where: { email: suEmail },
              select: { avatarUrl: true, image: true, name: true, nick: true },
            });
            const chosen = u?.avatarUrl ?? u?.image ?? null;
            (session.user as any).avatarUrl = u?.avatarUrl ?? null;
            (session.user as any).image = chosen;
            if (u?.nick && !(session.user as any).nick) (session.user as any).nick = u.nick;
            if (u?.name && !(session.user as any).name) (session.user as any).name = u.name;
          } else {
            const chosen = (token as any)?.avatarUrl ?? (token as any)?.oauthImage ?? null;
            (session.user as any).avatarUrl = (token as any)?.avatarUrl ?? null;
            (session.user as any).image = chosen;
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
            userId: Number((user as any).id),
            perfil: {
              nombre: (profile as any)?.name ?? null,
              imagen: (profile as any)?.picture ?? (profile as any)?.image ?? null,
            },
          });
        } catch {}
      }
    },
  },
} satisfies Parameters<typeof NextAuth>[0];

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
