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
};

export async function uploadBannerFile(file: File, options?: UploadBannerOptions): Promise<string> {
  if (!(file instanceof File)) {
    throw new Error("Selecciona un archivo valido.");
  }

  if (file.size === 0) {
    throw new Error("El archivo esta vacio.");
  }

  if (file.size > MAX_BANNER_SIZE) {
    throw new Error("El archivo supera el tamano maximo permitido (6MB).");
  }

  if (file.type && !ALLOWED_BANNER_TYPES.has(file.type)) {
    throw new Error("Tipo de archivo no permitido. Usa PNG, JPG, WEBP, GIF o SVG.");
  }

  const formData = new FormData();
  formData.append("file", file);
  if (file.name) {
    formData.append("filename", file.name);
  }

  const response = await fetch("/api/uploads/event-banner", {
    method: "POST",
    body: formData,
    signal: options?.signal,
  });

  const data = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;

  if (!response.ok) {
    throw new Error(data?.error ?? "No se pudo subir el banner.");
  }

  if (!data?.url) {
    throw new Error("Respuesta inesperada del servidor al subir el banner.");
  }

  return data.url;
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
]);

export type UploadAttachmentOptions = {
  signal?: AbortSignal;
};

export async function uploadAttachmentFile(
  file: File,
  options?: UploadAttachmentOptions
): Promise<string> {
  if (!(file instanceof File)) {
    throw new Error("Selecciona un archivo valido.");
  }

  if (file.size === 0) {
    throw new Error("El archivo esta vacio.");
  }

  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error("El archivo supera el tamano maximo permitido (10MB).");
  }

  if (file.type && !ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
    throw new Error("Tipo de archivo no permitido para adjuntos.");
  }

  const formData = new FormData();
  formData.append("file", file);
  if (file.name) {
    formData.append("filename", file.name);
  }

  const response = await fetch("/api/uploads/event-attachment", {
    method: "POST",
    body: formData,
    signal: options?.signal,
  });

  const data = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;

  if (!response.ok) {
    throw new Error(data?.error ?? "No se pudo subir el adjunto.");
  }

  if (!data?.url) {
    throw new Error("Respuesta inesperada del servidor al subir el adjunto.");
  }

  return data.url;
}
