// Adapter shim for Prisma with Int user IDs (NextAuth v5)
import type { Adapter, AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from "next-auth/adapters";
import { PrismaClient } from "@prisma/client";
import { PrismaAdapter } from "@auth/prisma-adapter";

const mapUser = (u: any | null): AdapterUser | null => {
  if (!u) return null;
  // NextAuth expects id as string; keep it string to avoid downstream issues.
  return { ...u, id: String(u.id) } as unknown as AdapterUser;
};

export function PrismaIntAdapter(prisma: PrismaClient): Adapter {
  const base = PrismaAdapter(prisma) as Adapter;

  return {
    ...base,

    async getUser(id: string) {
      const uid = Number(id);
      if (Number.isNaN(uid)) return null;
      const u = await (prisma as any).user.findUnique({ where: { id: uid } });
      return mapUser(u);
    },

    async updateUser(user) {
      const uid = Number((user as any).id);
      const { id, ...data } = user as any;
      const u = await (prisma as any).user.update({ where: { id: uid }, data });
      return mapUser(u)!;
    },

    async deleteUser(id: string) {
      const uid = Number(id);
      if (Number.isNaN(uid)) return null as any;
      const u = await (prisma as any).user.delete({ where: { id: uid } });
      return mapUser(u)!;
    },

    async linkAccount(account) {
      // Ensure userId is numeric for Prisma schema
      const acct = { ...(account as any), userId: Number((account as any).userId) };
      return (prisma as any).account.create({ data: acct }) as unknown as AdapterAccount;
    },

    // For JWT sessions these are rarely used, but keep them safe:
    async createSession(session) {
      const s = { ...(session as any), userId: Number((session as any).userId) };
      return (prisma as any).session.create({ data: s }) as unknown as AdapterSession;
    },
  };
}
