// src/lib/auth-edge.ts -> Config minima para Edge (middleware) sin Prisma
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const normalizeRoles = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((role) => String(role));
  }
  if (value == null) return [];
  return [String(value)];
};

export const edgeAuthConfig = {
  session: { strategy: "jwt" },
  providers: [Google],
  callbacks: {
    async session({ session, token }) {
      if (session?.user && token?.sub) (session.user as any).id = token.sub;
      const roles = normalizeRoles((token as any)?.roles ?? (token as any)?.rol);
      (session.user as any).roles = roles;
      (session.user as any).rol = roles[0] ?? null;
      (session.user as any).nick = (token as any)?.nick ?? null;
      return session;
    },
  },
} satisfies Parameters<typeof NextAuth>[0];

export const { auth } = NextAuth(edgeAuthConfig);

