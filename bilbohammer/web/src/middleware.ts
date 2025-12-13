import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth-edge";
type AuthedRequest = NextRequest & { auth?: unknown };

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ENFORCE_HTTPS = IS_PRODUCTION;
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
const canonicalOrigin = normalizeOrigin(process.env.APP_BASE_URL ?? inferVercelUrl());
const canonicalHost = canonicalOrigin ? new URL(canonicalOrigin).host.toLowerCase() : null;
const ENFORCE_CANONICAL_HOST = IS_PRODUCTION;
const DEV_ONLY_COOKIE_NAME = "beta_access";
const DEV_ONLY_QUERY_PARAM = "beta";
const DEV_ONLY_BYPASS_TOKEN = (process.env.DEV_ONLY_BYPASS_TOKEN ?? "").trim();
const devOnlyPaths = buildDevOnlyPaths();
const DEV_ONLY_DISABLE = (process.env.DEV_ONLY_DISABLE ?? "").trim() === "1";
const AUTH_PROTECTED_PREFIXES = ["/mi-perfil", "/profile", "/api/members"];

export const middleware = auth((request: AuthedRequest) => {
  const pathname = normalizePathname(request.nextUrl.pathname);
  const protocol = (request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "")).toLowerCase();
  const isHttps = protocol === "https";

  if (ENFORCE_HTTPS && !isHttps) {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = "https";
    return NextResponse.redirect(httpsUrl, 308);
  }

  if (ENFORCE_CANONICAL_HOST && canonicalHost) {
    const requestHost = request.headers.get("host");
    if (requestHost && !hostsMatch(requestHost, canonicalHost)) {
      const canonicalUrl = request.nextUrl.clone();
      canonicalUrl.host = canonicalHost;
      return NextResponse.redirect(canonicalUrl, 308);
    }
  }

  if (isAuthProtectedPath(pathname) && !request.auth) {
    const signInUrl = new URL("/api/auth/signin", request.nextUrl);
    signInUrl.searchParams.set("callbackUrl", request.nextUrl.href);
    const redirect = NextResponse.redirect(signInUrl, 307);
    applySecurityHeaders(redirect, isHttps);
    return redirect;
  }

  const isApiRoute = request.nextUrl.pathname.startsWith("/api");
  const devOnlyDecision = evaluateDevOnlyAccess(request, isApiRoute, pathname);

  if (devOnlyDecision?.action === "redirect") {
    const redirect = NextResponse.redirect(devOnlyDecision.destination, 307);
    redirect.headers.set(
      "x-dev-only",
      buildDevOnlyDebugHeader({
        pathname,
        decision: devOnlyDecision.action,
      })
    );
    applySecurityHeaders(redirect, isHttps);
    return redirect;
  }

  if (isApiRoute && request.method === "OPTIONS") {
    const preflight = new NextResponse(null, { status: 204 });
    preflight.headers.set(
      "x-dev-only",
      buildDevOnlyDebugHeader({
        pathname,
        decision: devOnlyDecision?.action,
      })
    );
    applySecurityHeaders(preflight, isHttps);
    applyCorsHeaders(request, preflight);
    return preflight;
  }

  const response = NextResponse.next();
  response.headers.set(
    "x-dev-only",
    buildDevOnlyDebugHeader({
      pathname,
      decision: devOnlyDecision?.action,
    })
  );

  if (devOnlyDecision?.action === "set-cookie") {
    response.cookies.set({
      name: DEV_ONLY_COOKIE_NAME,
      value: DEV_ONLY_BYPASS_TOKEN,
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: 60 * 60 * 12,
    });
  }

  applySecurityHeaders(response, isHttps);

  if (isApiRoute) {
    applyCorsHeaders(request, response);
  }

  return response;
});

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

function hostsMatch(requestHost: string, targetHost: string) {
  return requestHost.trim().toLowerCase() === targetHost;
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

  if (!IS_PRODUCTION) {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  return origins;
}

function buildDevOnlyPaths() {
  const raw = process.env.DEV_ONLY_PATHS ?? "";
  const prefixes = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => (value.startsWith("/") ? value : `/${value}`))
    .map((value) => (value.length > 1 && value.endsWith("/") ? value.slice(0, -1) : value));

  const unique = Array.from(new Set(prefixes));
  return unique.filter((value) => value !== "/en-construccion");
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

function evaluateDevOnlyAccess(request: NextRequest, isApiRoute: boolean, pathOverride?: string) {
  if (DEV_ONLY_DISABLE) return null;
  if (devOnlyPaths.length === 0) return null;
  if (isApiRoute) return null;

  const pathname = pathOverride ?? normalizePathname(request.nextUrl.pathname);
  if (pathname === "/en-construccion") return null;
  if (!isDevOnlyPath(pathname)) return null;

  if (DEV_ONLY_BYPASS_TOKEN) {
    const cookieValue = request.cookies.get(DEV_ONLY_COOKIE_NAME)?.value;
    if (tokensMatch(cookieValue, DEV_ONLY_BYPASS_TOKEN)) {
      return { action: "skip" } as const;
    }

    const queryToken = request.nextUrl.searchParams.get(DEV_ONLY_QUERY_PARAM);
    if (tokensMatch(queryToken, DEV_ONLY_BYPASS_TOKEN)) {
      return { action: "set-cookie" } as const;
    }
  }

  const destination = request.nextUrl.clone();
  destination.pathname = "/en-construccion";
  destination.search = "";
  destination.searchParams.set("from", pathname);

  return { action: "redirect", destination } as const;
}

function isDevOnlyPath(pathname: string) {
  return devOnlyPaths.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isAuthProtectedPath(pathname: string) {
  return AUTH_PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function normalizePathname(pathname: string) {
  if (!pathname.startsWith("/")) return `/${pathname}`;
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

function buildDevOnlyDebugHeader(opts: { pathname: string; decision?: string }) {
  const decision = opts.decision ?? "none";
  const token = DEV_ONLY_BYPASS_TOKEN ? "set" : "none";
  return `disable=${DEV_ONLY_DISABLE};paths=${devOnlyPaths.length};token=${token};decision=${decision};path=${opts.pathname}`;
}

function tokensMatch(value: string | undefined | null, target: string) {
  if (!value) return false;
  return value.trim() === target;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
