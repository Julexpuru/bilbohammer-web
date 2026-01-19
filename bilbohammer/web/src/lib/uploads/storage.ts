import {
  buildPublicUrl,
  ensureUploadsKey,
  getPublicBase,
  getPublicHost,
  resolveUploadsKey,
  stripUploadsPrefix,
} from "@/lib/uploads/public-url";
import { deleteUploadObject, uploadBufferToR2 } from "@/lib/uploads/r2";

function normalizeRelativePath(value: string) {
  const sanitized = value.replace(/\\/g, "/");
  const trimmed = sanitized.replace(/^\/+/, "");
  const parts = trimmed.split("/").filter((segment) => segment && segment !== "." && segment !== "..");
  return parts.join("/");
}

export function joinUploadRelativePath(...segments: string[]): string {
  return normalizeRelativePath(segments.join("/"));
}

export function getUploadsPublicPrefix() {
  const base = getPublicBase();
  if (!/^https?:\/\//i.test(base)) {
    return base;
  }
  try {
    return new URL(base).pathname.replace(/\/+$/, "") || "/uploads";
  } catch {
    return "/uploads";
  }
}

export function toPublicPath(relativePath: string) {
  const normalized = normalizeRelativePath(relativePath);
  const key = ensureUploadsKey(normalized);
  return buildPublicUrl(getPublicBase(), key);
}

export function relativeFromPublicPath(publicPath: string | null | undefined) {
  if (!publicPath) return null;
  const key = resolveUploadsKey(publicPath);
  if (!key) return null;
  return normalizeRelativePath(stripUploadsPrefix(key));
}

export async function saveUploadFile(
  relativePath: string,
  buffer: Buffer,
  options?: { contentType?: string | null; cacheControl?: string }
) {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized) {
    throw new Error("Invalid relativePath.");
  }
  const key = ensureUploadsKey(normalized);
  await uploadBufferToR2({
    key,
    buffer,
    contentType: options?.contentType ?? null,
    cacheControl: options?.cacheControl,
  });
  return key;
}

export async function deleteUploadFile(publicOrRelative: string | null | undefined) {
  if (!publicOrRelative) return false;
  const trimmed = publicOrRelative.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) {
    const baseHost = getPublicHost(getPublicBase());
    if (baseHost) {
      try {
        const parsed = new URL(trimmed);
        if (parsed.hostname.toLowerCase() !== baseHost) {
          return false;
        }
      } catch {
        return false;
      }
    }
  }
  const key = resolveUploadsKey(trimmed);
  if (!key) return false;
  await deleteUploadObject(key);
  return true;
}
