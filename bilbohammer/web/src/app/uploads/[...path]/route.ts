import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { joinUploadRelativePath, statUploadFile } from "@/lib/uploads/storage";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".pdf": "application/pdf",
};

function resolveMimeType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] ?? "application/octet-stream";
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { path: string[] } }) {
  const segments = Array.isArray(params.path) ? params.path : [];
  if (!segments.length) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const relativePath = joinUploadRelativePath(...segments);
  try {
    const { absolute, stats } = await statUploadFile(relativePath);
    const file = await fs.readFile(absolute);
    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": resolveMimeType(absolute),
        "Content-Length": stats.size.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Last-Modified": stats.mtime.toUTCString(),
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    console.error("[uploads] error serving file", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
