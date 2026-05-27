const DEFAULT_ORIGIN = "http://localhost:3000";

function normalizeOrigin(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const prefixed =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  try {
    const parsed = new URL(prefixed);
    return parsed.origin;
  } catch {
    return null;
  }
}

export function resolveSiteOrigin(): string {
  const envOrigin =
    normalizeOrigin(process.env.APP_BASE_URL) ??
    normalizeOrigin(process.env.NEXTAUTH_URL) ??
    normalizeOrigin(process.env.AUTH_URL) ??
    normalizeOrigin(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  return envOrigin ?? DEFAULT_ORIGIN;
}

export function absoluteSiteUrl(pathname = "/"): string {
  const origin = resolveSiteOrigin();
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${origin}${path}`;
}

