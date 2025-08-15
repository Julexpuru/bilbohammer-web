// src/lib/auth.ts — NextAuth v5 (FULL, Node). PrismaAdapter + Google + Credentials. Sesión JWT.
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { actualizaPerfilGoogleSiNecesario } from "@/servicios/usuario/actualiza-perfil-google";

export const authConfig = {
  // Usamos JWT para que el middleware (Edge) valide sin tocar BD
  session: { strategy: "jwt" },
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Credentials({
      name: "Email y contraseña",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(creds) {
        const correo = creds?.email as string | undefined;
        const contrasena = creds?.password as string | undefined;
        if (!correo || !contrasena) return null;
        const usuario = await prisma.user.findUnique({ where: { email: correo } });
        if (!usuario?.passwordHash) return null;
        const ok = await bcrypt.compare(contrasena, usuario.passwordHash);
        return ok ? (usuario as any) : null;
      },
    }),
  ],
  pages: {
    // signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).rol = (user as any).rol ?? null;
        (token as any).nick = (user as any).nick ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).id = token?.sub ?? null;
        (session.user as any).rol = (token as any)?.rol ?? null;
        (session.user as any).nick = (token as any)?.nick ?? null;
      }
      return session;
    },
  },
  events: {
    async linkAccount({ user, account, profile }) {
      if (account?.provider === "google") {
        await actualizaPerfilGoogleSiNecesario({
          userId: Number((user as any).id),
          perfil: {
            nombre: (profile as any)?.name ?? null,
            imagen: (profile as any)?.picture ?? (profile as any)?.image ?? null,
          },
        });
      }
    },
  },
} satisfies Parameters<typeof NextAuth>[0];

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
