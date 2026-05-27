export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseUserId(session: { user?: { id?: number | string | null } } | null) {
  const raw = session?.user?.id;
  const userId = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  return Number.isFinite(userId) ? userId : null;
}

function getPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || null;
}

function parseSubscription(raw: any) {
  const endpoint = typeof raw?.endpoint === "string" ? raw.endpoint.trim() : "";
  const p256dh = typeof raw?.keys?.p256dh === "string" ? raw.keys.p256dh.trim() : "";
  const authKey = typeof raw?.keys?.auth === "string" ? raw.keys.auth.trim() : "";
  if (!endpoint || !p256dh || !authKey) return null;
  return { endpoint, p256dh, auth: authKey };
}

export async function GET() {
  const session = await auth();
  const userId = parseUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const count = await prisma.userPushSubscription.count({
    where: {
      userId,
      revokedAt: null,
    },
  });

  return NextResponse.json({
    publicKey: getPublicKey(),
    configured: Boolean(getPublicKey() && process.env.VAPID_PRIVATE_KEY),
    subscribed: count > 0,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = parseUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo invalido" }, { status: 400 });
  }

  const subscription = parseSubscription(body?.subscription ?? body);
  if (!subscription) {
    return NextResponse.json({ error: "Suscripcion push invalida." }, { status: 400 });
  }

  await prisma.userPushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      userId,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      userAgent: request.headers.get("user-agent"),
      lastSeenAt: new Date(),
      revokedAt: null,
    },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      userAgent: request.headers.get("user-agent"),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  const userId = parseUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : "";
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint obligatorio." }, { status: 400 });
  }

  await prisma.userPushSubscription.updateMany({
    where: { userId, endpoint },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
