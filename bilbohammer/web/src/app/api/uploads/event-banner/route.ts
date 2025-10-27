import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { userCanManageEvents } from "@/lib/roles";
import { slugify } from "@/lib/slugify";

const MAX_FILE_SIZE = 6 * 1024 * 1024; // 6MB
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

function resolveExtension(file: File, fallbackName: string): string {
  if (file.type && MIME_EXTENSION[file.type]) {
    return MIME_EXTENSION[file.type];
  }
  const originalExt = path.extname(fallbackName);
  if (originalExt) {
    return originalExt.toLowerCase();
  }
  return ".png";
}

export async function POST(request: Request) {
  const session = await auth();
  if (!userCanManageEvents(session)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "El archivo esta vacio." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "El archivo supera el limite de 6MB." }, { status: 413 });
  }

  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Formato no permitido. Usa PNG, JPG, WEBP, GIF o SVG." },
      { status: 415 }
    );
  }

  const providedName = form.get("filename");
  const fallbackName =
    (typeof providedName === "string" && providedName.trim()) || file.name || "banner";

  const baseName = slugify(fallbackName.replace(/\.[^.]+$/, ""), "banner");
  const extension = resolveExtension(file, fallbackName);
  const uniqueName = `${baseName}-${randomUUID()}${extension}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadDir = path.join(process.cwd(), "public", "uploads", "event-banners");
  await fs.mkdir(uploadDir, { recursive: true });

  const targetPath = path.join(uploadDir, uniqueName);
  await fs.writeFile(targetPath, buffer);

  const url = `/uploads/event-banners/${uniqueName}`;

  return NextResponse.json({ url }, { status: 201 });
}
