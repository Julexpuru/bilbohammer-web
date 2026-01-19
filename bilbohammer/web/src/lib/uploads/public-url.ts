const DEFAULT_PUBLIC_BASE = "/uploads";
const UPLOADS_PREFIX = "uploads/";

function normalizeSlashes(value: string) {
  return value.replace(/\\/g, "/");
}

export function normalizePublicBase(raw: string | null | undefined) {
  const value = raw?.trim();
  if (!value) return DEFAULT_PUBLIC_BASE;
  const trimmed = value.replace(/\/+$/, "");
  return trimmed || DEFAULT_PUBLIC_BASE;
}

export function getPublicBase() {
  return normalizePublicBase(
    process.env.STORAGE_PUBLIC_BASE ??
      process.env.NEXT_PUBLIC_UPLOAD_BASE ??
      process.env.UPLOADS_PUBLIC_PREFIX ??
      DEFAULT_PUBLIC_BASE
  );
}

export function getPublicHost(base: string) {
  if (!/^https?:\/\//i.test(base)) return null;
  try {
    return new URL(base).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function buildPublicUrl(base: string, key: string) {
  const normalizedBase = normalizePublicBase(base);
  const normalizedKey = normalizeSlashes(key).replace(/^\/+/, "");
  if (normalizedBase.endsWith("/uploads") && normalizedKey.startsWith(UPLOADS_PREFIX)) {
    return `${normalizedBase}/${normalizedKey.slice(UPLOADS_PREFIX.length)}`;
  }
  return `${normalizedBase}/${normalizedKey}`;
}

export function ensureUploadsKey(value: string) {
  const normalized = normalizeSlashes(value).replace(/^\/+/, "");
  if (!normalized) {
    return UPLOADS_PREFIX;
  }
  return normalized.startsWith(UPLOADS_PREFIX) ? normalized : `${UPLOADS_PREFIX}${normalized}`;
}

export function stripUploadsPrefix(value: string) {
  const normalized = normalizeSlashes(value).replace(/^\/+/, "");
  return normalized.startsWith(UPLOADS_PREFIX) ? normalized.slice(UPLOADS_PREFIX.length) : normalized;
}

function extractUploadsKeyFromPath(pathname: string) {
  const normalized = normalizeSlashes(pathname).replace(/^\/+/, "");
  const lower = normalized.toLowerCase();
  const idx = lower.indexOf(UPLOADS_PREFIX);
  if (idx >= 0) {
    return normalized.slice(idx);
  }
  return null;
}

export function resolveUploadsKey(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return extractUploadsKeyFromPath(parsed.pathname);
    } catch {
      return null;
    }
  }
  return ensureUploadsKey(trimmed);
}
