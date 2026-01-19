import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  const body = (await req.json()) as { imageUrl?: string | null };
  const imageUrl = typeof body?.imageUrl === "string" ? body.imageUrl.trim() : "";
  if (!imageUrl || imageUrl.startsWith("data:")) {
    return NextResponse.json({ error: "Invalid imageUrl" }, { status: 400 });
  }

  // IMPORTANTE: no escribimos en BD aquí. Se persiste en PATCH /api/me/profile
  return NextResponse.json({ url: imageUrl });
}
