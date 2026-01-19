import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import path from "path";

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const CONTENT_TYPE_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

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

function resolveExtension(filename: string, contentType: string) {
  const extFromName = path.extname(filename).toLowerCase().replace(/^\./, "");
  const sanitized = extFromName.replace(/[^a-z0-9]/g, "");
  if (sanitized) return sanitized;
  const mapped = CONTENT_TYPE_EXTENSION[contentType.toLowerCase()];
  return mapped ?? "bin";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const filename = typeof body?.filename === "string" ? body.filename : "";
    const contentType = typeof body?.contentType === "string" ? body.contentType : "";

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "filename and contentType are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return NextResponse.json({ error: "contentType not allowed" }, { status: 415 });
    }

    const bucket = mustEnv("STORAGE_BUCKET");
    const region = mustEnv("STORAGE_REGION");
    const endpoint = mustEnv("STORAGE_ENDPOINT");
    const accessKeyId = mustEnv("STORAGE_ACCESS_KEY");
    const secretAccessKey = mustEnv("STORAGE_SECRET_KEY");
    const publicBase = mustEnv("STORAGE_PUBLIC_BASE"); // https://cdn.../uploads

    const s3 = new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true, // importante para R2
    });

    // Generate a unique name while preserving the extension when possible.
    const id = crypto.randomUUID();
    const ext = resolveExtension(filename, contentType);
    const safeExt = ext ? `.${ext}` : "";
    const key = `uploads/${id}${safeExt}`;

    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      // (opcional) Cache-Control para imágenes:
      CacheControl: "public, max-age=31536000, immutable",
    });

    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 });

    const publicUrl = buildPublicUrl(publicBase, key);

    return NextResponse.json({ key, uploadUrl, publicUrl });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}
