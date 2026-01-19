import { NextResponse } from "next/server";
import path from "path";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@/auth";
import { userCanEditEvent } from "@/lib/roles";
import { slugify } from "@/lib/slugify";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "text/plain",
  "application/octet-stream",
]);

const MIME_EXTENSION: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "application/vnd.ms-powerpoint": ".ppt",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "text/plain": ".txt",
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
  const ext = path.extname(filename);
  if (ext) {
    return ext.toLowerCase();
  }
  return ".dat";
}

export async function POST(request: Request) {
  const session = await auth();
  const contentTypeHeader = request.headers.get("content-type") ?? "";
  if (!contentTypeHeader.includes("application/json")) {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
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
      { error: "Formato no permitido para adjuntos." },
      { status: 415 }
    );
  }

  const baseName = slugify(filename.replace(/\.[^.]+$/, ""), "adjunto");
  const extension = resolveExtension(filename, contentType);
  const fileName = `${baseName}-${randomUUID()}${extension}`;
  const key = `uploads/event-attachments/${fileName}`;

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
