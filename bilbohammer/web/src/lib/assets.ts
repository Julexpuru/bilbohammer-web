const DEFAULT_BASE = "";
const ASSETS_PREFIX = "/assets";

function normalizeBase(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return DEFAULT_BASE;
  return trimmed.replace(/\/+$/, "");
}

function normalizePath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function assetUrl(value: string | null | undefined) {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const base = normalizeBase(process.env.NEXT_PUBLIC_ASSETS_BASE);
  const normalized = normalizePath(trimmed);
  if (!base) {
    return normalized;
  }

  if (base.endsWith(ASSETS_PREFIX) && normalized.startsWith(ASSETS_PREFIX + "/")) {
    return `${base}${normalized.slice(ASSETS_PREFIX.length)}`;
  }

  return `${base}${normalized}`;
}
