import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { joinUploadRelativePath, saveUploadFile, toPublicPath } from "@/lib/uploads/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File too large" }, { status: 413 });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9_.-]/g, "")}`;
  const relativePath = joinUploadRelativePath("avatars", filename);
  await saveUploadFile(relativePath, buffer);
  const url = toPublicPath(relativePath);

  // IMPORTANTE: no escribimos en BD aquí. Se persiste en PATCH /api/me/profile
  return NextResponse.json({ url });
}
