import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { userCanManageEvents } from "@/lib/roles";
import { slugify } from "@/lib/slugify";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB
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

function resolveExtension(file: File, fallbackName: string): string {
  if (file.type && MIME_EXTENSION[file.type]) {
    return MIME_EXTENSION[file.type];
  }
  const ext = path.extname(fallbackName);
  if (ext) {
    return ext.toLowerCase();
  }
  return ".dat";
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

  if (file.size > MAX_ATTACHMENT_SIZE) {
    return NextResponse.json({ error: "El adjunto supera el limite de 10MB." }, { status: 413 });
  }

  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Formato no permitido para adjuntos." },
      { status: 415 }
    );
  }

  const providedName = form.get("filename");
  const fallbackName =
    (typeof providedName === "string" && providedName.trim()) || file.name || "adjunto";

  const baseName = slugify(fallbackName.replace(/\.[^.]+$/, ""), "adjunto");
  const extension = resolveExtension(file, fallbackName);
  const fileName = `${baseName}-${randomUUID()}${extension}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadDir = path.join(process.cwd(), "public", "uploads", "event-attachments");
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, fileName), buffer);

  const url = `/uploads/event-attachments/${fileName}`;

  return NextResponse.json({ url }, { status: 201 });
}
