export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// src/app/api/events/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { userCanManageEvents } from "@/lib/roles";
import {
  parseEventPayload,
  computeInternalFlag,
  OrganizationInput,
} from "@/lib/events/payload";

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function resolveOrganizations(inputs: OrganizationInput[]) {
  const created: { organizationId: string; role: string | null }[] = [];
  for (const entry of inputs) {
    if (entry.id) {
      created.push({ organizationId: entry.id, role: entry.role ?? null });
      continue;
    }
    const baseSlug = entry.slug ?? (entry.name ? slugify(entry.name) : null);
    if (!baseSlug) continue;
    const safeSlug = baseSlug.length ? baseSlug : `org-${Date.now()}`;
    const name = entry.name ?? entry.slug ?? safeSlug;
    const organization = await prisma.organization.upsert({
      where: { slug: safeSlug },
      update: { name, isClub: entry.isClub ?? false },
      create: { slug: safeSlug, name, isClub: entry.isClub ?? false },
    });
    created.push({ organizationId: organization.id, role: entry.role ?? null });
  }
  return created;
}

function buildNestedCreate<T>(items: T[], mapper: (item: T) => any) {
  if (!items.length) return undefined;
  return { create: items.map(mapper) };
}

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: { startsAt: "asc" },
      take: 100,
      include: {
        tags: true,
        organizations: { include: { organization: true } },
        organizers: { include: { user: true } },
      },
    });
    return NextResponse.json(events);
  } catch {
    return NextResponse.json([], { headers: { "x-bh-warning": "db-unavailable-during-build" } });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!userCanManageEvents(session)) {
    return NextResponse.json({ error: "No tienes permisos para crear eventos." }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido." }, { status: 400 });
  }

  try {
    const parsed = await parseEventPayload(raw as Record<string, unknown>);
    const organizations = await resolveOrganizations(parsed.organizations);
    const isInternal = await computeInternalFlag(prisma, parsed.organizers, parsed.organizations, parsed.eventData.isInternal);

    const { gameId, albumId, chronicleArticleId, ...eventData } = parsed.eventData;
    const event = await prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          ...eventData,
          ...(chronicleArticleId === undefined ? {} : { chronicleArticleId }),
          ...(gameId ? { game: { connect: { id: gameId } } } : {}),
          ...(albumId ? { album: { connect: { id: albumId } } } : {}),
          isInternal,
          tags: buildNestedCreate(parsed.tags, (label) => ({ label })),
          organizers: buildNestedCreate(parsed.organizers, (org) => org),
          organizations: buildNestedCreate(organizations, (org) => org),
          attachments: buildNestedCreate(parsed.attachments, (attachment) => attachment),
          links: buildNestedCreate(parsed.links, (link) => link),
          highlights: buildNestedCreate(parsed.highlights, (highlight) => highlight),
          rankings: buildNestedCreate(parsed.rankings, (ranking) => ranking),
        },
        include: {
          tags: true,
          organizers: { include: { user: { select: { id: true, nick: true, name: true, email: true } } } },
          organizations: { include: { organization: true } },
          attachments: true,
          links: true,
          highlights: true,
          rankings: true,
        },
      });
      return created;
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudo crear el evento." }, { status: 500 });
  }
}
