import { NextResponse } from "next/server";
import path from "path";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@/auth";
import { userCanEditEvent } from "@/lib/roles";
import { slugify } from "@/lib/slugify";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function normalizePublicBase(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function buildPublicUrl(base: string, key: string) {
  const normalizedBase = normalizePublicBase(base);
  const normalizedKey = key.replace(/^\/+/, "");
  if (normalizedBase.endsWith("/uploads") && normalizedKey.startsWith("uploads/")) {
    return `${normalizedBase}/${normalizedKey.slice("uploads/".length)}`;
  }
  return `${normalizedBase}/${normalizedKey}`;
}

function resolveExtension(filename: string, contentType: string): string {
  if (contentType && MIME_EXTENSION[contentType]) {
    return MIME_EXTENSION[contentType];
  }
  const originalExt = path.extname(filename);
  if (originalExt) {
    return originalExt.toLowerCase();
  }
  return ".png";
}

export async function POST(request: Request) {
  const session = await auth();
  const contentTypeHeader = request.headers.get("content-type") ?? "";
  if (!contentTypeHeader.includes("application/json")) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const body = (await request.json()) as {
    filename?: string;
    contentType?: string;
    eventId?: string | null;
  };
  const eventId = typeof body?.eventId === "string" ? body.eventId.trim() : null;
  const canEdit = await userCanEditEvent(session, eventId);
  if (!canEdit) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const filename = body?.filename?.trim() ?? "";
  const contentType = body?.contentType?.trim() ?? "";
  if (!filename || !contentType) {
    return NextResponse.json({ error: "filename y contentType son obligatorios." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: "Formato no permitido. Usa PNG, JPG, WEBP, GIF o SVG." },
      { status: 415 }
    );
  }

  const baseName = slugify(filename.replace(/\.[^.]+$/, ""), "banner");
  const extension = resolveExtension(filename, contentType);
  const uniqueName = `${baseName}-${randomUUID()}${extension}`;
  const key = `uploads/event-banners/${uniqueName}`;

  const bucket = mustEnv("STORAGE_BUCKET");
  const region = mustEnv("STORAGE_REGION");
  const endpoint = mustEnv("STORAGE_ENDPOINT");
  const accessKeyId = mustEnv("STORAGE_ACCESS_KEY");
  const secretAccessKey = mustEnv("STORAGE_SECRET_KEY");
  const publicBase = mustEnv("STORAGE_PUBLIC_BASE");

  const s3 = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });

  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 });
  const publicUrl = buildPublicUrl(publicBase, key);

  return NextResponse.json({ key, uploadUrl, publicUrl });
}
