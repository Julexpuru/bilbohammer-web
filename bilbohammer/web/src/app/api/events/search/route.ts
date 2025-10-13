import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TAKE_DEFAULT = 12;
const TAKE_MAX = 48;

function parseBoolean(raw: string | null): boolean {
  if (!raw) return false;
  return raw === "1" || raw.toLowerCase() === "true";
}

function parseList(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseCursor(raw: string | null): { id: string } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === "string") {
      return { id: parsed.id };
    }
  } catch (error) {
    console.warn("[events/search] cursor parse failed", error);
  }
  return null;
}

function normalizeLocation(location: string | null | undefined) {
  if (!location) return { venueName: null, city: null };
  const parts = location.split("-").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { venueName: parts[0], city: parts.slice(1).join(" - ") };
  }
  return { venueName: location.trim(), city: null };
}

function detectOrganizations(location: string | null | undefined): string[] {
  if (!location) return [];
  return location.toLowerCase().includes("bilbohammer") ? ["Bilbohammer"] : ["Otros"];
}

function extractSubtitle(details: string | null | undefined): string | null {
  if (!details) return null;
  const firstLine = details.trim().split(/\r?\n/)[0];
  return firstLine.length > 0 ? firstLine : null;
}

function extractStatus(startsAt: Date, endsAt: Date): string {
  const now = Date.now();
  if (endsAt.getTime() < now) return "FINALIZED";
  if (startsAt.getTime() > now) return "PUBLISHED";
  return "ONGOING";
}

function extractTags(text: string | null | undefined): string[] {
  if (!text) return [];
  const matches = text.match(/#[\p{L}\d_]+/gu);
  if (!matches) return [];
  return Array.from(new Set(matches.map((tag) => tag.slice(1))));
}

function extractBannerUrl(post?: { content?: string | null } | null): string | null {
  if (!post?.content) return null;
  const markdownMatch = post.content.match(/!\[[^\]]*]\((?<url>[^)\s]+)(?:\s+"[^"]*")?\)/);
  if (markdownMatch?.groups?.url) {
    return markdownMatch.groups.url;
  }
  const urlMatch = post.content.match(/https?:\/\/\S+\.(?:png|jpe?g|gif|webp)/i);
  return urlMatch ? urlMatch[0] : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || null;
  const orgs = parseList(url.searchParams.get("orgs"));
  const types = parseList(url.searchParams.get("types"));
  const games = parseList(url.searchParams.get("games"));
  const free = parseBoolean(url.searchParams.get("free"));
  const includePast = parseBoolean(url.searchParams.get("past"));
  const sort = url.searchParams.get("sort") === "desc" ? "desc" : "asc";
  const takeParam = Number(url.searchParams.get("take") ?? TAKE_DEFAULT);
  const take = Math.min(Math.max(Number.isFinite(takeParam) ? takeParam : TAKE_DEFAULT, 1), TAKE_MAX);
  const cursor = parseCursor(url.searchParams.get("cursor"));

  const where: any = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { details: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
    ];
  }

  if (!includePast) {
    where.endsAt = { gte: new Date() };
  }

  if (orgs.length === 1) {
    const [org] = orgs;
    if (org === "bilbohammer") {
      where.location = { contains: "bilbohammer", mode: "insensitive" };
    } else if (org === "otros") {
      where.NOT = { location: { contains: "bilbohammer", mode: "insensitive" } };
    }
  }

  if (free) {
    where.details = { contains: "gratis", mode: "insensitive" };
  }

  // tipos y juegos quedan reservados para cuando el modelo tenga esos datos
  void types;
  void games;

  try {
    const events = await prisma.event.findMany({
      where,
      take: take + 1,
      orderBy: [
        { startsAt: sort },
        { id: sort },
      ],
      cursor: cursor ?? undefined,
      skip: cursor ? 1 : 0,
      include: {
        posts: {
          where: { type: "EVENTO" },
          include: { author: true },
        },
      },
    });

    const hasMore = events.length > take;
    const slice = events.slice(0, take);

    const items = slice.map((event) => {
      const { venueName, city } = normalizeLocation(event.location);
      const firstPost = event.posts[0];
      const tags = extractTags(firstPost?.content ?? null);
      const roles = firstPost?.author
        ? [
            {
              id: `${event.id}-organizer`,
              role: "ORGANIZER",
              user: {
                id: String(firstPost.author.id),
                nick: firstPost.author.nick,
                name: firstPost.author.name,
                email: firstPost.author.email,
              },
            },
          ]
        : [];

      return {
        id: event.id,
        slug: event.id,
        title: event.title,
        subtitle: extractSubtitle(event.details),
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt.toISOString(),
        timezone: "Europe/Madrid",
        venueName,
        city,
        bannerUrl: extractBannerUrl(firstPost),
        status: extractStatus(event.startsAt, event.endsAt),
        organizations: detectOrganizations(event.location),
        roles,
        tags,
      };
    });

    const nextCursor = hasMore
      ? { id: events[take].id, startsAt: events[take].startsAt.toISOString() }
      : null;

    return NextResponse.json({ items, nextCursor });
  } catch (error) {
    console.error("[events/search] query failed", error);
    return NextResponse.json({ error: "No se pudieron cargar los eventos" }, { status: 500 });
  }
}
