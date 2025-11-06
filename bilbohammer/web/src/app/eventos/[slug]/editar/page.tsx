import { redirect, notFound } from "next/navigation";
import EventForm, { EventFormInitialData } from "@/components/events/EventForm";
import { auth } from "@/auth";
import { userCanManageEvents } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { findArticleById } from "@/lib/novedades-repository";

type Params = {
  slug: string;
};

export const dynamic = "force-dynamic";

type LoadedEvent = Prisma.EventGetPayload<{
  include: {
    tags: true;
    game: true;
    organizers: {
      include: {
        user: { select: { id: true; name: true; nombre: true; nick: true; email: true } };
      };
    };
    organizations: { include: { organization: true } };
    attachments: true;
    links: true;
    highlights: true;
    rankings: { orderBy: { position: "asc" } };
    album: true;
  };
}>;

async function mapEventToInitialData(event: LoadedEvent): Promise<EventFormInitialData> {
  const linkedChronicle = event.chronicleArticleId
    ? await findArticleById(event.chronicleArticleId)
    : null;

  return {
    id: event.id,
    title: event.title,
    bannerUrl: event.bannerUrl ?? null,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    location: event.location ?? null,
    latitude: event.latitude,
    longitude: event.longitude,
    mapsUrl: event.mapsUrl ?? null,
    details: event.details ?? null,
    recap: event.recap ?? null,
    status: event.status as EventFormInitialData["status"],
    type: event.type as EventFormInitialData["type"],
    game: event.game?.legacyEnumKey ?? event.game?.slug ?? null,
    priceGeneral: event.priceGeneral ? event.priceGeneral.toString() : null,
    priceSocios: event.priceSocios ? event.priceSocios.toString() : null,
    capacityMax: event.capacityMax,
    capacityCurrent: event.capacityCurrent ?? null,
    isInternal: event.isInternal,
    isMembersOnly: event.isMembersOnly,
    showDescription: event.showDescription,
    showAttachments: event.showAttachments,
    showLinks: event.showLinks,
    showStandings: event.showStandings,
    showRecap: event.showRecap,
    showGallery: event.showGallery,
    showLocation: event.showLocation,
    showTabDescription: event.showTabDescription ?? true,
    showTabResources: event.showTabResources ?? true,
    showTabClassification: event.showTabClassification ?? true,
    showTabChronicle: event.showTabChronicle ?? true,
    showTabGallery: event.showTabGallery ?? true,
    showTabLocation: event.showTabLocation ?? true,
    chronicleArticleId: event.chronicleArticleId ?? null,
    chronicleArticleTitle: linkedChronicle?.title ?? null,
    chronicleArticleSlug: linkedChronicle?.slug ?? null,
    chronicleArticleCategory: linkedChronicle?.category ?? null,
    chronicleArticleSummary: linkedChronicle?.summary ?? null,
    chronicleArticleDate: linkedChronicle?.date ?? null,
    albumId: event.albumId ?? null,
    tags: event.tags.map((tag) => tag.label),
    organizers: event.organizers.map((entry) => ({
      userId: entry.userId,
      name:
        entry.user?.name ??
        entry.user?.nombre ??
        entry.user?.nick ??
        entry.user?.email ??
        `Socio ${entry.userId}`,
      role: entry.role,
    })),
    organizations: event.organizations.map((entry) => ({
      organization: {
        id: entry.organization.id,
        slug: entry.organization.slug,
        name: entry.organization.name,
        isClub: entry.organization.isClub,
      },
      role: entry.role,
    })),
    attachments: event.attachments.map((attachment) => ({
      title: attachment.title,
      description: attachment.description ?? null,
      fileUrl: attachment.fileUrl,
      visible: attachment.visible,
    })),
    links: event.links.map((link) => ({
      label: link.label,
      url: link.url,
      visible: link.visible,
    })),
    highlights: event.highlights.map((highlight) => ({
      type: highlight.type,
      title: highlight.title,
      playerName: highlight.playerName,
      playerId: highlight.playerId,
      visible: highlight.visible,
    })),
    rankings: event.rankings.map((ranking) => ({
      position: ranking.position,
      playerName: ranking.playerName,
      playerId: ranking.playerId,
      score: ranking.score ?? null,
      visible: ranking.visible,
    })),
  };
}

export default async function EditEventPage({ params }: { params: Params }) {
  const session = await auth();
  if (!userCanManageEvents(session)) {
    redirect(`/eventos/${params.slug}`);
  }

  const event = await prisma.event.findUnique({
    where: { id: params.slug },
    include: {
      tags: true,
      game: true,
      organizers: {
        include: {
          user: { select: { id: true, name: true, nombre: true, nick: true, email: true } },
        },
      },
      organizations: { include: { organization: true } },
      attachments: true,
      links: true,
      highlights: true,
      rankings: { orderBy: { position: "asc" } },
      album: true,
    },
  });

  if (!event) {
    notFound();
  }

  const initialData = await mapEventToInitialData(event);

  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Eventos</p>
        <h1 className="text-3xl font-semibold">Editar evento</h1>
        <p className="text-sm text-[var(--muted)]">
          Ajusta cualquier detalle y guarda para actualizar la ficha publica.
        </p>
      </header>
      <EventForm mode="edit" initialData={initialData} />
    </div>
  );
}
