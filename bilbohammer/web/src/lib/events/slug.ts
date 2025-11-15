import { slugify } from "@/lib/slugify";

const CUID_PATTERN = /^[a-z0-9]{16,}$/i;

function normalizeId(value: string): string {
  return value?.trim() ?? "";
}

export function buildEventSlug(id: string, title?: string | null): string {
  const cleanId = normalizeId(id);
  if (!cleanId) {
    return "";
  }
  const normalizedTitle = title?.trim() ?? "";
  if (!normalizedTitle) {
    return cleanId;
  }
  const base = slugify(normalizedTitle, "evento");
  if (!base) {
    return cleanId;
  }
  const trimmed = base.replace(/-+$/g, "").slice(0, 80);
  return `${trimmed}-${cleanId}`;
}

export function extractEventIdFromSlug(slugOrId: string): string {
  const input = slugOrId?.trim() ?? "";
  if (!input) return "";
  const lastDash = input.lastIndexOf("-");
  if (lastDash === -1) {
    return input;
  }
  const candidate = input.slice(lastDash + 1);
  if (candidate && CUID_PATTERN.test(candidate)) {
    return candidate;
  }
  return input;
}
