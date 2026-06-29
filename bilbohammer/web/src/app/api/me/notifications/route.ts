export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteUserNotifications, listUserNotifications, markUserNotificationsRead } from "@/lib/notifications";

function parseUserId(session: { user?: { id?: number | string | null } } | null) {
  const raw = session?.user?.id;
  const userId = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  return Number.isFinite(userId) ? userId : null;
}

export async function GET(request: Request) {
  const session = await auth();
  const userId = parseUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw) ? limitRaw : undefined;

  return NextResponse.json(await listUserNotifications(userId, limit));
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

  const ids = Array.isArray(body?.ids)
    ? body.ids.map((value: unknown) => (typeof value === "string" ? value.trim() : "")).filter(Boolean)
    : [];
  const all = body?.all === true;

  if (!all && ids.length === 0) {
    return NextResponse.json({ error: "Debes indicar notificaciones o marcar all=true." }, { status: 400 });
  }

  const updated = await markUserNotificationsRead(userId, { ids, all });
  return NextResponse.json({ ok: true, updated });
}

export async function DELETE(request: Request) {
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

  const ids = Array.isArray(body?.ids)
    ? body.ids.map((value: unknown) => (typeof value === "string" ? value.trim() : "")).filter(Boolean)
    : [];
  const all = body?.all === true;

  if (!all && ids.length === 0) {
    return NextResponse.json({ error: "Debes indicar notificaciones o marcar all=true." }, { status: 400 });
  }

  const deleted = await deleteUserNotifications(userId, { ids, all });
  return NextResponse.json({ ok: true, deleted });
}
