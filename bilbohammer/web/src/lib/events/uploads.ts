import { uploadToPresignedUrl } from "@/lib/uploads/presign-client";

const MAX_BANNER_SIZE = 6 * 1024 * 1024; // 6MB
const ALLOWED_BANNER_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

export type UploadBannerOptions = {
  signal?: AbortSignal;
  eventId?: string | null;
};

async function requestPresignedEventUpload(options: {
  endpoint: string;
  filename: string;
  contentType: string;
  eventId?: string | null;
  signal?: AbortSignal;
}) {
  const response = await fetch(options.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: options.filename,
      contentType: options.contentType,
      eventId: options.eventId ?? null,
    }),
    signal: options.signal,
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as
    | { uploadUrl?: string; publicUrl?: string; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(data?.error ?? "No se pudo preparar la subida.");
  }

  if (!data?.uploadUrl || !data?.publicUrl) {
    throw new Error("Respuesta inesperada del servidor al subir el archivo.");
  }

  return { uploadUrl: data.uploadUrl, publicUrl: data.publicUrl };
}

export async function uploadBannerFile(file: File, options?: UploadBannerOptions): Promise<string> {
  if (!(file instanceof File)) {
    throw new Error("Selecciona un archivo valido.");
  }

  if (file.size === 0) {
    throw new Error("El archivo está vacío.");
  }

  if (file.size > MAX_BANNER_SIZE) {
    throw new Error("El archivo supera el tamano maximo permitido (6MB).");
  }

  if (file.type && !ALLOWED_BANNER_TYPES.has(file.type)) {
    throw new Error("Tipo de archivo no permitido. Usa PNG, JPG, WEBP, GIF o SVG.");
  }

  const contentType = file.type;
  if (!contentType) {
    throw new Error("No se pudo determinar el tipo de archivo.");
  }

  const { uploadUrl, publicUrl } = await requestPresignedEventUpload({
    endpoint: "/api/uploads/event-banner",
    filename: file.name || "banner",
    contentType,
    eventId: options?.eventId?.trim(),
    signal: options?.signal,
  });

  await uploadToPresignedUrl(file, uploadUrl, contentType);
  return publicUrl;
}

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_ATTACHMENT_TYPES = new Set([
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

export type UploadAttachmentOptions = {
  signal?: AbortSignal;
  eventId?: string | null;
};

export async function uploadAttachmentFile(
  file: File,
  options?: UploadAttachmentOptions
): Promise<string> {
  if (!(file instanceof File)) {
    throw new Error("Selecciona un archivo valido.");
  }

  if (file.size === 0) {
    throw new Error("El archivo está vacío.");
  }

  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error("El archivo supera el tamano maximo permitido (10MB).");
  }

  if (file.type && !ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
    throw new Error("Tipo de archivo no permitido para adjuntos.");
  }

  const contentType = file.type || "application/octet-stream";

  const { uploadUrl, publicUrl } = await requestPresignedEventUpload({
    endpoint: "/api/uploads/event-attachment",
    filename: file.name || "adjunto",
    contentType,
    eventId: options?.eventId?.trim(),
    signal: options?.signal,
  });

  await uploadToPresignedUrl(file, uploadUrl, contentType);
  return publicUrl;
}
