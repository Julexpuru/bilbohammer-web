// src/app/api/members/summary/route.ts — usando auth (Node) con sesión JWT
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string | undefined;
  const email = session.user.email as string | undefined;

  return NextResponse.json({ ok: true, userId, email });
}
