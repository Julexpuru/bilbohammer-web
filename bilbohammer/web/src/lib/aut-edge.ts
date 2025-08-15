// src/lib/auth-edge.ts — Config mínima para Edge (middleware) SIN Prisma
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const edgeAuthConfig = {
  session: { strategy: "jwt" },
  providers: [Google],
  callbacks: {
    async session({ session, token }) {
      if (session?.user && token?.sub) (session.user as any).id = token.sub;
      (session.user as any).rol = (token as any)?.rol ?? null;
      (session.user as any).nick = (token as any)?.nick ?? null;
      return session;
    },
  },
} satisfies Parameters<typeof NextAuth>[0];

export const { auth } = NextAuth(edgeAuthConfig);
