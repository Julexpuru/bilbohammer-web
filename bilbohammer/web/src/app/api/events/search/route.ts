import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, EventStatus, EventType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { loadActiveGames, resolveGameIdsFromInput } from "@/lib/game-catalog";
import { buildEventSlug } from "@/lib/events/slug";
import { htmlToPlainText } from "@/lib/text";

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

const EVENT_TYPE_VALUES = new Set(Object.values(EventType));

export async function GET(request: Request) {
  const session = await auth();
  const normalizedRoles = Array.isArray(session?.user?.roles)
    ? session.user.roles.map((role) => String(role).toUpperCase())
    : [];
  const canViewDrafts = normalizedRoles.includes("ADMIN") || normalizedRoles.includes("JUNTA");
  let viewerUserId: number | null = null;
  const rawUserId = session?.user?.id as unknown;
  if (typeof rawUserId === "number") {
    viewerUserId = Number.isFinite(rawUserId) ? rawUserId : null;
  } else if (typeof rawUserId === "string" && rawUserId.trim().length > 0) {
    const parsed = Number(rawUserId);
    viewerUserId = Number.isFinite(parsed) ? parsed : null;
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || null;
  const orgs = parseList(url.searchParams.get("orgs")).map((value) => value.toLowerCase());
  const types = parseList(url.searchParams.get("types")).map((value) => value.toUpperCase());
  const games = parseList(url.searchParams.get("games"));
  const free = parseBoolean(url.searchParams.get("free"));
  const includePast = parseBoolean(url.searchParams.get("past"));
  const sort = url.searchParams.get("sort") === "desc" ? "desc" : "asc";
  const takeParam = Number(url.searchParams.get("take") ?? TAKE_DEFAULT);
  const take = Math.min(Math.max(Number.isFinite(takeParam) ? takeParam : TAKE_DEFAULT, 1), TAKE_MAX);
  const cursor = parseCursor(url.searchParams.get("cursor"));

  const where: Prisma.EventWhereInput = {
    isMembersOnly: false,
  };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { details: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { tags: { some: { label: { contains: q, mode: "insensitive" } } } },
    ];
  }

  if (!includePast) {
    where.endsAt = { gte: new Date() };
  }

  const andFilters: Prisma.EventWhereInput[] = [];

  if (!canViewDrafts) {
    if (viewerUserId != null) {
      andFilters.push({
        OR: [
          { status: { not: EventStatus.DRAFT } },
          { organizers: { some: { userId: viewerUserId } } },
        ],
      });
    } else {
      andFilters.push({ status: { not: EventStatus.DRAFT } });
    }
  }

  if (orgs.includes("bilbohammer")) {
    andFilters.push({
      organizations: {
        some: { organization: { slug: { equals: "bilbohammer", mode: "insensitive" } } },
      },
    });
  } else if (orgs.includes("otros")) {
    andFilters.push({
      organizations: {
        none: { organization: { slug: { equals: "bilbohammer", mode: "insensitive" } } },
      },
    });
  }

  const validTypes = types.filter((type) => EVENT_TYPE_VALUES.has(type as EventType)) as EventType[];
  if (validTypes.length) {
    andFilters.push({ type: { in: validTypes } });
  }

  if (games.length) {
    const catalog = await loadActiveGames();
    const validGameIds = resolveGameIdsFromInput(games, catalog);
    if (validGameIds.length) {
      andFilters.push({ gameId: { in: validGameIds } });
    }
  }

  if (free) {
    andFilters.push({
      OR: [
        { priceGeneral: null },
        { priceGeneral: { lte: new Prisma.Decimal("0") } },
      ],
    });
  }

  if (andFilters.length) {
    where.AND = andFilters;
  }

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
        tags: true,
        organizers: { include: { user: { select: { id: true, nick: true, name: true, email: true } } } },
        organizations: { include: { organization: true } },
        game: { select: { slug: true } },
      },
    });

    const hasMore = events.length > take;
    const slice = events.slice(0, take);

    const items = slice.map((event) => {
      const plainDetails = htmlToPlainText(event.details);
      const { venueName, city } = normalizeLocation(event.location);

      const now = Date.now();
      const autoStatus =
        event.status === EventStatus.CANCELLED || event.status === EventStatus.POSTPONED
          ? event.status
          : event.endsAt.getTime() < now
            ? EventStatus.FINALIZED
            : event.status;

      return {
        id: event.id,
        slug: buildEventSlug(event.id, event.title),
        title: event.title,
        subtitle: plainDetails ? plainDetails.split(/\r?\n/, 1)[0] ?? null : null,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt.toISOString(),
        timezone: "Europe/Madrid",
        venueName,
        city,
        bannerUrl: event.bannerUrl ?? null,
        status: autoStatus,
        type: event.type,
        game: event.game?.slug ?? null,
        priceGeneral: event.priceGeneral?.toString() ?? null,
        priceSocios: event.priceSocios?.toString() ?? null,
        isInternal: event.isInternal,
        organizations: event.organizations.map((entry) => entry.organization.name),
        roles: event.organizers.map((entry) => ({
          id: `${event.id}-${entry.userId}`,
          role: entry.role ?? null,
          user: entry.user
            ? {
                id: String(entry.user.id),
                nick: entry.user.nick,
                name: entry.user.name,
                email: entry.user.email,
              }
            : null,
        })),
        tags: event.tags.map((tag) => tag.label),
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
