export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { dispatchDueMatchReminders } from "@/lib/notifications";

function isAuthorized(request: Request) {
  const secret = process.env.NOTIFICATIONS_CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await dispatchDueMatchReminders();
  return NextResponse.json({ ok: true, ...result });
}
