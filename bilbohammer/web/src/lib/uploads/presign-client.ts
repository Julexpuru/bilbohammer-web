export type PresignResponse = {
  key: string;
  uploadUrl: string;
  publicUrl: string;
};

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function requestPresignedUpload(file: File): Promise<PresignResponse> {
  const contentType = file.type;
  if (!contentType || !ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new Error("Formato no permitido. Usa JPG, PNG, WEBP o GIF.");
  }

  const response = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name || "upload",
      contentType,
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "No se pudo preparar la subida.");
  }

  if (!payload?.uploadUrl || !payload?.publicUrl || !payload?.key) {
    throw new Error("Respuesta de presign invalida.");
  }

  return payload as PresignResponse;
}

export async function uploadToPresignedUrl(file: File, uploadUrl: string, contentType: string) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Error subiendo el archivo (HTTP ${response.status}).`);
  }
}

export async function uploadImageToR2(file: File): Promise<PresignResponse> {
  const presign = await requestPresignedUpload(file);
  await uploadToPresignedUrl(file, presign.uploadUrl, file.type);
  return presign;
}
