// src/lib/auth-edge.ts — config mínima para Edge/Middleware, SIN Prisma
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const edgeAuthConfig = {
  session: { strategy: "jwt" },
  providers: [Google],
} satisfies Parameters<typeof NextAuth>[0];

export const { auth } = NextAuth(edgeAuthConfig);
