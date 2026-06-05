import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTelegramLinkToken } from "@/lib/telegram-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseSessionUserId(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

export async function POST() {
  const session = await auth();
  const sessionUserId = parseSessionUserId((session?.user as { id?: unknown } | undefined)?.id);
  const user =
    sessionUserId != null
      ? await prisma.user.findUnique({ where: { id: sessionUserId }, select: { id: true } })
      : session?.user?.email
        ? await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
        : null;

  if (!user) {
    return NextResponse.json({ error: "Necesitas iniciar sesión para vincular Telegram." }, { status: 401 });
  }

  const link = await createTelegramLinkToken(user.id);
  return NextResponse.json({
    token: link.token,
    command: link.command,
    deepLink: link.deepLink,
    expiresAt: link.expiresAt.toISOString(),
  });
}
