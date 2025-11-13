import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ENFORCE_HTTPS = process.env.NODE_ENV === "production";
const HSTS_VALUE = "max-age=63072000; includeSubDomains; preload";
const SECURITY_HEADERS: Array<[string, string]> = [
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["X-Content-Type-Options", "nosniff"],
  ["X-DNS-Prefetch-Control", "off"],
  ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()"],
  ["Content-Security-Policy", "upgrade-insecure-requests"],
];

const CORS_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const CORS_HEADERS = "Origin, X-Requested-With, Content-Type, Accept, Authorization";

const allowedOrigins = buildAllowedOrigins();

export function middleware(request: NextRequest) {
  const protocol = (request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "")).toLowerCase();
  const isHttps = protocol === "https";

  if (ENFORCE_HTTPS && !isHttps) {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = "https";
    return NextResponse.redirect(httpsUrl, 308);
  }

  const isApiRoute = request.nextUrl.pathname.startsWith("/api");
  if (isApiRoute && request.method === "OPTIONS") {
    const preflight = new NextResponse(null, { status: 204 });
    applySecurityHeaders(preflight, isHttps);
    applyCorsHeaders(request, preflight);
    return preflight;
  }

  const response = NextResponse.next();
  applySecurityHeaders(response, isHttps);

  if (isApiRoute) {
    applyCorsHeaders(request, response);
  }

  return response;
}

function applySecurityHeaders(response: NextResponse, isHttpsRequest: boolean) {
  for (const [header, value] of SECURITY_HEADERS) {
    response.headers.set(header, value);
  }
  if (isHttpsRequest) {
    response.headers.set("Strict-Transport-Security", HSTS_VALUE);
  }
}

function applyCorsHeaders(request: NextRequest, response: NextResponse) {
  const requestOrigin = request.headers.get("origin");
  const allowedOrigin = resolveAllowedOrigin(requestOrigin, request.nextUrl.origin);

  response.headers.append("Vary", "Origin");
  response.headers.set("Access-Control-Allow-Methods", CORS_METHODS);
  response.headers.set("Access-Control-Allow-Headers", CORS_HEADERS);

  if (allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
}

function resolveAllowedOrigin(originHeader: string | null, serverOrigin: string) {
  if (!originHeader) return null;
  if (originHeader === serverOrigin) return originHeader;
  if (allowedOrigins.size === 0) return originHeader;
  return allowedOrigins.has(originHeader) ? originHeader : null;
}

function buildAllowedOrigins() {
  const origins = new Set<string>();
  const baseUrl = normalizeOrigin(process.env.APP_BASE_URL ?? inferVercelUrl());
  if (baseUrl) origins.add(baseUrl);

  const explicitOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter((origin): origin is string => Boolean(origin));

  for (const origin of explicitOrigins) {
    origins.add(origin);
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  return origins;
}

function normalizeOrigin(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const prefixed = trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(prefixed);
    return url.origin;
  } catch {
    return null;
  }
}

function inferVercelUrl() {
  const vercelUrl = process.env.VERCEL_URL;
  if (!vercelUrl) return null;
  return `https://${vercelUrl}`;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
