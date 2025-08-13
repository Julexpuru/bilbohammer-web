import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { actualizaPerfilGoogleSiNecesario } from "@/servicios/usuario/actualiza-perfil-google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
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
        return ok ? usuario : null;
      },
    }),
  ],
  pages: {
    // signIn: "/login",
  },
  callbacks: {
    async session({ session, user }) {
      if (user) {
        (session.user as any).id = (user as any).id;
        (session.user as any).rol = (user as any).rol ?? null;
        (session.user as any).nick = (user as any).nick ?? null;
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
});
