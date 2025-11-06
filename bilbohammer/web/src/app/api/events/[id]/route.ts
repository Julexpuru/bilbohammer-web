import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { userCanManageEvents } from "@/lib/roles";
import {
  parseEventPayload,
  computeInternalFlag,
  OrganizationInput,
} from "@/lib/events/payload";

type RouteParams = {
  params: { id: string };
};

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

function buildCreateMany<TInput, TOutput>(items: TInput[], mapper: (item: TInput) => TOutput): TOutput[] | null {
  if (!items.length) return null;
  return items.map(mapper);
}

export async function GET(_: Request, { params }: RouteParams) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: {
        tags: true,
        organizers: { include: { user: { select: { id: true, nick: true, name: true, email: true, roles: true } } } },
        organizations: { include: { organization: true } },
        attachments: true,
        links: true,
        highlights: true,
        rankings: { orderBy: { position: "asc" } },
        album: true,
      },
    });
    if (!event) {
      return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ event });
  } catch (error) {
    console.error("[events] GET failed", error);
    return NextResponse.json({ error: "No se pudo cargar el evento." }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!userCanManageEvents(session)) {
    return NextResponse.json({ error: "No tienes permisos para editar eventos." }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido." }, { status: 400 });
  }

  try {
    await prisma.event.findUniqueOrThrow({ where: { id: params.id } });
  } catch {
    return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
  }

  try {
    const parsed = await parseEventPayload(raw as Record<string, unknown>);
    const organizations = await resolveOrganizations(parsed.organizations);
    const isInternal = await computeInternalFlag(prisma, parsed.organizers, parsed.organizations, parsed.eventData.isInternal);

    const { gameId, albumId, chronicleArticleId, ...eventData } = parsed.eventData;
    const event = await prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id: params.id },
        data: {
          ...eventData,
          ...(chronicleArticleId === undefined ? {} : { chronicleArticleId }),
          ...(gameId === undefined
            ? {}
            : gameId
              ? { game: { connect: { id: gameId } } }
              : { game: { disconnect: true } }),
          ...(albumId === undefined
            ? {}
            : albumId
              ? { album: { connect: { id: albumId } } }
              : { album: { disconnect: true } }),
          isInternal,
        },
      });

      await Promise.all([
        tx.eventTag.deleteMany({ where: { eventId: params.id } }),
        tx.eventOrganizer.deleteMany({ where: { eventId: params.id } }),
        tx.eventOrganization.deleteMany({ where: { eventId: params.id } }),
        tx.eventAttachment.deleteMany({ where: { eventId: params.id } }),
        tx.eventLink.deleteMany({ where: { eventId: params.id } }),
        tx.eventHighlight.deleteMany({ where: { eventId: params.id } }),
        tx.eventRankingEntry.deleteMany({ where: { eventId: params.id } }),
      ]);

      if (parsed.tags.length) {
        await tx.eventTag.createMany({
          data: parsed.tags.map((label) => ({ eventId: params.id, label })),
        });
      }

      if (parsed.organizers.length) {
        await tx.eventOrganizer.createMany({
          data: parsed.organizers.map((org) => ({
            eventId: params.id,
            userId: org.userId,
            role: org.role,
          })),
        });
      }

      if (organizations.length) {
        await tx.eventOrganization.createMany({
          data: organizations.map((org) => ({
            eventId: params.id,
            organizationId: org.organizationId,
            role: org.role,
          })),
        });
      }

      const attachmentsData = buildCreateMany(parsed.attachments, (attachment) => ({
        eventId: params.id,
        title: attachment.title,
        description: attachment.description,
        fileUrl: attachment.fileUrl,
        visible: attachment.visible,
      }));
      if (attachmentsData) {
        await tx.eventAttachment.createMany({ data: attachmentsData });
      }

      const linksData = buildCreateMany(parsed.links, (link) => ({
        eventId: params.id,
        label: link.label,
        url: link.url,
        visible: link.visible,
      }));
      if (linksData) {
        await tx.eventLink.createMany({ data: linksData });
      }

      const highlightsData = buildCreateMany(parsed.highlights, (highlight) => ({
        eventId: params.id,
        type: highlight.type,
        title: highlight.title,
        playerName: highlight.playerName,
        playerId: highlight.playerId,
        visible: highlight.visible,
      }));
      if (highlightsData) {
        await tx.eventHighlight.createMany({ data: highlightsData });
      }

      const rankingsData = buildCreateMany(parsed.rankings, (ranking) => ({
        eventId: params.id,
        position: ranking.position,
        playerName: ranking.playerName,
        playerId: ranking.playerId,
        score: ranking.score,
        visible: ranking.visible,
      }));
      if (rankingsData) {
        await tx.eventRankingEntry.createMany({ data: rankingsData });
      }

      return tx.event.findUnique({
        where: { id: params.id },
        include: {
          tags: true,
          organizers: { include: { user: { select: { id: true, nick: true, name: true, email: true, roles: true } } } },
          organizations: { include: { organization: true } },
          attachments: true,
          links: true,
          highlights: true,
          rankings: { orderBy: { position: "asc" } },
          album: true,
        },
      });
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error("[events] PUT failed", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudo actualizar el evento." }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: RouteParams) {
  const session = await auth();
  if (!userCanManageEvents(session)) {
    return NextResponse.json({ error: "No tienes permisos para eliminar eventos." }, { status: 403 });
  }

  try {
    await prisma.event.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[events] DELETE failed", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudo eliminar el evento." }, { status: 500 });
  }
}
