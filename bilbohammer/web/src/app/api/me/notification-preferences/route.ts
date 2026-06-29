export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getOrCreateNotificationPreferences,
  serializeNotificationPreferences,
  updateUserNotificationPreferences,
} from "@/lib/notifications";

function parseUserId(session: { user?: { id?: number | string | null } } | null) {
  const raw = session?.user?.id;
  const userId = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  return Number.isFinite(userId) ? userId : null;
}

export async function GET() {
  const session = await auth();
  const userId = parseUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const preferences = await getOrCreateNotificationPreferences(userId);
  return NextResponse.json({ preferences: serializeNotificationPreferences(preferences) });
}

export async function PATCH(request: Request) {
  const session = await auth();
  const userId = parseUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const preferences = await updateUserNotificationPreferences(userId, body ?? {});
  return NextResponse.json({ ok: true, preferences: serializeNotificationPreferences(preferences) });
}
