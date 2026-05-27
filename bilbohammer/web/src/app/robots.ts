import type { MetadataRoute } from "next";

import { absoluteSiteUrl, resolveSiteOrigin } from "@/lib/site-url";

const PRIVATE_PATHS = [
  "/api/",
  "/admin/",
  "/login",
  "/register",
  "/mi-perfil/",
  "/juego-organizado/mis-partidas/",
  "/en-construccion",
];

const DEFAULT_BLOCKED_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "CCBot",
  "Bytespider",
  "Diffbot",
  "Meta-ExternalAgent",
  "PerplexityBot",
  "Perplexity-User",
];

function parseCsv(raw: string | undefined, fallback: string[] = []) {
  if (!raw) return fallback;
  const values = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return values.length ? values : fallback;
}

function parseInteger(raw: string | undefined): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.floor(value);
}

export default function robots(): MetadataRoute.Robots {
  const blockedBots = parseCsv(process.env.SEO_ROBOTS_BLOCKED_BOTS, DEFAULT_BLOCKED_BOTS);
  const throttledBots = parseCsv(process.env.SEO_ROBOTS_THROTTLED_BOTS);
  const crawlDelay = parseInteger(process.env.SEO_ROBOTS_CRAWL_DELAY_SECONDS);
  const host = new URL(resolveSiteOrigin()).host;

  const rules: MetadataRoute.Robots["rules"] = [
    {
      userAgent: "*",
      allow: "/",
      disallow: PRIVATE_PATHS,
    },
    ...blockedBots.map((userAgent) => ({
      userAgent,
      disallow: "/",
    })),
    ...(crawlDelay && throttledBots.length > 0
      ? throttledBots.map((userAgent) => ({
          userAgent,
          allow: "/",
          disallow: PRIVATE_PATHS,
          crawlDelay,
        }))
      : []),
  ];

  return {
    rules,
    host,
    sitemap: absoluteSiteUrl("/sitemap.xml"),
  };
}

