import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth-edge";
type AuthedRequest = NextRequest & { auth?: unknown };

type RateLimitBucket = { count: number; resetAt: number };
type BotRateLimitStore = Map<string, RateLimitBucket>;
type GlobalWithBotRateLimit = typeof globalThis & { __bhBotRateLimit?: BotRateLimitStore };

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
const CORS_HEADERS = "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Telegram-Bot-Api-Secret-Token";

const allowedOrigins = buildAllowedOrigins();
const canonicalOrigin = normalizeOrigin(process.env.APP_BASE_URL ?? inferVercelUrl());
const canonicalHost = canonicalOrigin ? new URL(canonicalOrigin).host.toLowerCase() : null;
const ENFORCE_CANONICAL_HOST = IS_PRODUCTION;
const DEV_ONLY_COOKIE_NAME = "beta_access";
const DEV_ONLY_QUERY_PARAM = "beta";
const DEV_ONLY_BYPASS_TOKEN = (process.env.DEV_ONLY_BYPASS_TOKEN ?? "").trim();
const devOnlyPaths = buildDevOnlyPaths();
const DEV_ONLY_DISABLE = (process.env.DEV_ONLY_DISABLE ?? "").trim() === "1";
const AUTH_PROTECTED_PREFIXES = ["/mi-perfil", "/profile", "/api/members", "/juego-organizado/mis-partidas"];
const NOINDEX_PATH_PREFIXES = ["/api", "/admin", "/login", "/register", "/mi-perfil", "/juego-organizado/mis-partidas"];
const BOT_BLOCKED_USER_AGENTS = parseStringList(
  process.env.BOT_BLOCKED_USER_AGENTS,
  ["GPTBot", "ClaudeBot", "anthropic-ai", "CCBot", "Bytespider", "Diffbot", "PerplexityBot", "Perplexity-User"]
);
const TRUSTED_INDEXER_USER_AGENTS = parseStringList(
  process.env.BOT_TRUSTED_INDEXER_USER_AGENTS,
  ["Googlebot", "Bingbot", "DuckDuckBot", "Applebot"]
);
const BOT_RATE_LIMIT_ENABLED = parseBoolean(process.env.BOT_RATE_LIMIT_ENABLED, IS_PRODUCTION);
const BOT_RATE_LIMIT_WINDOW_SECONDS = parsePositiveInteger(process.env.BOT_RATE_LIMIT_WINDOW_SECONDS, 60);
const BOT_RATE_LIMIT_MAX_REQUESTS = parsePositiveInteger(process.env.BOT_RATE_LIMIT_MAX_REQUESTS, 180);
const BOT_RATE_LIMIT_PATH_PREFIXES = parsePathPrefixes(process.env.BOT_RATE_LIMIT_PATH_PREFIXES, ["/"]);
const BOT_RATE_LIMIT_EXEMPT_PATHS = parsePathPrefixes(process.env.BOT_RATE_LIMIT_EXEMPT_PATHS, [
  "/robots.txt",
  "/sitemap.xml",
  "/api/integrations/telegram/webhook",
]);
const BOT_RATE_LIMIT_STORE = getBotRateLimitStore();
const BOT_HINT_TOKENS = [
  "bot",
  "crawl",
  "crawler",
  "spider",
  "scrape",
  "fetch",
  "headless",
  "python-requests",
  "axios",
  "curl",
  "wget",
  "go-http-client",
  "libwww-perl",
];

export const middleware = auth((request: AuthedRequest) => {
  const pathname = normalizePathname(request.nextUrl.pathname);
  const isApiRoute = pathname === "/api" || pathname.startsWith("/api/");
  const protocol = (request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "")).toLowerCase();
  const isHttps = protocol === "https";

  if (ENFORCE_HTTPS && !isHttps) {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = "https";
    const redirect = NextResponse.redirect(httpsUrl, 308);
    applyCommonHeaders(redirect, {
      isHttpsRequest: false,
      pathname,
      request,
      isApiRoute,
    });
    return redirect;
  }

  if (ENFORCE_CANONICAL_HOST && canonicalHost) {
    const requestHost = request.headers.get("host");
    if (requestHost && !hostsMatch(requestHost, canonicalHost)) {
      const canonicalUrl = request.nextUrl.clone();
      canonicalUrl.host = canonicalHost;
      const redirect = NextResponse.redirect(canonicalUrl, 308);
      applyCommonHeaders(redirect, {
        isHttpsRequest: isHttps,
        pathname,
        request,
        isApiRoute,
      });
      return redirect;
    }
  }

  const botDecision = evaluateBotAccess(request, pathname);
  if (botDecision.action !== "allow") {
    const blockedResponse = new NextResponse("Too Many Requests", {
      status: botDecision.action === "deny" ? 403 : 429,
    });
    blockedResponse.headers.set("x-bot-protection", botDecision.action);
    if (botDecision.action === "throttle" && botDecision.retryAfterSeconds > 0) {
      blockedResponse.headers.set("Retry-After", String(botDecision.retryAfterSeconds));
    }
    applyCommonHeaders(blockedResponse, {
      isHttpsRequest: isHttps,
      pathname,
      request,
      isApiRoute,
    });
    return blockedResponse;
  }

  if (isAuthProtectedPath(pathname) && !request.auth) {
    const signInUrl = new URL("/api/auth/signin", request.nextUrl);
    signInUrl.searchParams.set("callbackUrl", request.nextUrl.href);
    const redirect = NextResponse.redirect(signInUrl, 307);
    applyCommonHeaders(redirect, {
      isHttpsRequest: isHttps,
      pathname,
      request,
      isApiRoute,
    });
    return redirect;
  }

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
    applyCommonHeaders(redirect, {
      isHttpsRequest: isHttps,
      pathname,
      request,
      isApiRoute,
    });
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
    applyCommonHeaders(preflight, {
      isHttpsRequest: isHttps,
      pathname,
      request,
      isApiRoute,
    });
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

  applyCommonHeaders(response, {
    isHttpsRequest: isHttps,
    pathname,
    request,
    isApiRoute,
  });

  return response;
});

function applyCommonHeaders(
  response: NextResponse,
  options: {
    isHttpsRequest: boolean;
    pathname: string;
    request: NextRequest;
    isApiRoute: boolean;
  }
) {
  applySecurityHeaders(response, options.isHttpsRequest);
  applyRobotsHeaders(response, options.pathname);
  if (options.isApiRoute) {
    applyCorsHeaders(options.request, response);
  }
}

function applySecurityHeaders(response: NextResponse, isHttpsRequest: boolean) {
  for (const [header, value] of SECURITY_HEADERS) {
    response.headers.set(header, value);
  }
  if (isHttpsRequest) {
    response.headers.set("Strict-Transport-Security", HSTS_VALUE);
  }
}

function applyRobotsHeaders(response: NextResponse, pathname: string) {
  if (shouldNoIndex(pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
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

function shouldNoIndex(pathname: string) {
  return NOINDEX_PATH_PREFIXES.some((prefix) => pathMatchesPrefix(pathname, prefix));
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

function parseStringList(raw: string | undefined, fallback: string[] = []) {
  if (!raw) return [...fallback];
  const list = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return list.length > 0 ? list : [...fallback];
}

function parseBoolean(raw: string | undefined, fallback: boolean) {
  if (!raw) return fallback;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return fallback;
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") return true;
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") return false;
  return fallback;
}

function parsePositiveInteger(raw: string | undefined, fallback: number) {
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function parsePathPrefixes(raw: string | undefined, fallback: string[]) {
  const values = parseStringList(raw, fallback)
    .map((value) => (value.startsWith("/") ? value : `/${value}`))
    .map((value) => (value.length > 1 && value.endsWith("/") ? value.slice(0, -1) : value));
  return Array.from(new Set(values));
}

function getBotRateLimitStore() {
  const globalValue = globalThis as GlobalWithBotRateLimit;
  if (!globalValue.__bhBotRateLimit) {
    globalValue.__bhBotRateLimit = new Map<string, RateLimitBucket>();
  }
  return globalValue.__bhBotRateLimit;
}

function evaluateBotAccess(
  request: NextRequest,
  pathname: string
): { action: "allow" } | { action: "deny" } | { action: "throttle"; retryAfterSeconds: number } {
  const userAgent = (request.headers.get("user-agent") ?? "").trim();
  if (!userAgent) return { action: "allow" };

  const normalizedUA = userAgent.toLowerCase();
  if (matchesUserAgent(normalizedUA, BOT_BLOCKED_USER_AGENTS)) {
    return { action: "deny" };
  }

  if (!BOT_RATE_LIMIT_ENABLED) {
    return { action: "allow" };
  }

  if (!isRateLimitEligiblePath(pathname)) {
    return { action: "allow" };
  }

  if (!isLikelyAutomatedClient(normalizedUA)) {
    return { action: "allow" };
  }

  if (matchesUserAgent(normalizedUA, TRUSTED_INDEXER_USER_AGENTS)) {
    return { action: "allow" };
  }

  const clientIp = getClientIp(request);
  const throttleResult = consumeBotRateLimit(clientIp);
  if (throttleResult.blocked) {
    return {
      action: "throttle",
      retryAfterSeconds: throttleResult.retryAfterSeconds,
    };
  }

  return { action: "allow" };
}

function isRateLimitEligiblePath(pathname: string) {
  const isExempt = BOT_RATE_LIMIT_EXEMPT_PATHS.some((prefix) => pathMatchesPrefix(pathname, prefix));
  if (isExempt) return false;
  return BOT_RATE_LIMIT_PATH_PREFIXES.some((prefix) => pathMatchesPrefix(pathname, prefix));
}

function matchesUserAgent(userAgentLower: string, patterns: string[]) {
  return patterns.some((pattern) => {
    const normalized = pattern.trim().toLowerCase();
    if (!normalized) return false;
    return userAgentLower.includes(normalized);
  });
}

function isLikelyAutomatedClient(userAgentLower: string) {
  return BOT_HINT_TOKENS.some((token) => userAgentLower.includes(token));
}

function getClientIp(request: NextRequest) {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  return "unknown";
}

function consumeBotRateLimit(clientIp: string) {
  const now = Date.now();
  const windowMs = BOT_RATE_LIMIT_WINDOW_SECONDS * 1000;
  const key = clientIp;
  const current = BOT_RATE_LIMIT_STORE.get(key);

  if (!current || current.resetAt <= now) {
    BOT_RATE_LIMIT_STORE.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    pruneRateLimitStore(now);
    return { blocked: false, retryAfterSeconds: 0 };
  }

  current.count += 1;
  BOT_RATE_LIMIT_STORE.set(key, current);
  const remainingMs = Math.max(0, current.resetAt - now);

  if (current.count > BOT_RATE_LIMIT_MAX_REQUESTS) {
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil(remainingMs / 1000),
    };
  }

  return { blocked: false, retryAfterSeconds: 0 };
}

function pruneRateLimitStore(now = Date.now()) {
  if (BOT_RATE_LIMIT_STORE.size <= 5000) return;
  for (const [key, value] of BOT_RATE_LIMIT_STORE.entries()) {
    if (value.resetAt <= now) {
      BOT_RATE_LIMIT_STORE.delete(key);
    }
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
  return devOnlyPaths.some((prefix) => pathMatchesPrefix(pathname, prefix));
}

function isAuthProtectedPath(pathname: string) {
  return AUTH_PROTECTED_PREFIXES.some((prefix) => pathMatchesPrefix(pathname, prefix));
}

function normalizePathname(pathname: string) {
  if (!pathname.startsWith("/")) return `/${pathname}`;
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

function pathMatchesPrefix(pathname: string, prefix: string) {
  if (prefix === "/") return pathname.startsWith("/");
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
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
