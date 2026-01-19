import { NextResponse } from "next/server";
import {
  buildPublicUrl,
  ensureUploadsKey,
  getPublicBase,
} from "@/lib/uploads/public-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { path: string[] } }) {
  const segments = Array.isArray(params.path) ? params.path : [];
  if (!segments.length) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const publicBase = getPublicBase();
  if (!/^https?:\/\//i.test(publicBase)) {
    return NextResponse.json(
      { error: "Uploads are served from the CDN. Set STORAGE_PUBLIC_BASE." },
      { status: 500 }
    );
  }

  const relativePath = segments
    .map((segment) => segment.replace(/\\/g, "/"))
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .join("/");
  const key = ensureUploadsKey(relativePath);
  const publicUrl = buildPublicUrl(publicBase, key);
  const redirectUrl = new URL(publicUrl, request.url);

  return NextResponse.redirect(redirectUrl, 307);
}
