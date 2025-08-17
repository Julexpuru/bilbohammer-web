import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ providers: [] });

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ providers: [] });

  const accounts = await prisma.account.findMany({ where: { userId: user.id }, select: { provider: true } });
  return NextResponse.json({ providers: accounts.map(a => a.provider) });
}
