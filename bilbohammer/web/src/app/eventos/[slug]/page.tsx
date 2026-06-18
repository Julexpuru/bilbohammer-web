import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import EventStatusBadge from "@/components/events/EventStatusBadge";
import EventRegistrationsPanel from "@/components/events/EventRegistrationsPanel";
import EventShareButtons from "@/components/events/EventShareButtons";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { extractRoles, userCanEditEvent } from "@/lib/roles";
import { canAcceptRegistrations, resolveSessionUserId } from "@/lib/event-registrations";
import { findArticleById } from "@/lib/novedades-repository";
import { buildEventSlug, extractEventIdFromSlug } from "@/lib/events/slug";
import { getComputedEventStatus } from "@/lib/events/status";

type Params = {
  slug: string;
};

type SearchParams = {
  tab?: string;
};

type TabId = "descripcion" | "archivos" | "clasificacion" | "cronica" | "galeria" | "ubicacion";
type HeroInfoItem = {
  key: string;
  label: string;
  lines: string[];
};

const euroFormatter = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

const typeLabels: Record<string, string> = {
  SOCIAL: "Social",
  TOURNAMENT: "Torneo",
  LEAGUE: "Liga",
  WORKSHOP: "Workshop",
  OTHER: "Otro",
};

const highlightLabels: Record<string, string> = {
  FIRST: "Primer puesto",
  SECOND: "Segundo puesto",
  THIRD: "Tercer puesto",
  AWARD: "Mención especial",
};

const BILBO_ORGANIZATION_NAME = "Bilbohammer";
const RAW_PUBLIC_UPLOAD_BASE =
  process.env.NEXT_PUBLIC_UPLOAD_BASE ?? process.env.STORAGE_PUBLIC_BASE ?? process.env.UPLOADS_PUBLIC_PREFIX ?? "/uploads";
const PUBLIC_UPLOAD_PREFIX = RAW_PUBLIC_UPLOAD_BASE.trim().replace(/\/+$/, "") || "/uploads";

export const dynamic = "force-dynamic";

function formatDateRange(start: Date, end: Date, timeZone = "Europe/Madrid") {
  try {
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone,
    }).formatRange(start, end);
  } catch {
    const basic = new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    });
    return `${basic.format(start)} - ${basic.format(end)}`;
  }
}

function joinBaseAndPath(base: string, value: string) {
  const trimmedBase = base.replace(/\/+$/, "");
  const trimmedValue = value.replace(/^\/+/, "");
  return `${trimmedBase}/${trimmedValue}`;
}

function toPublicPath(storagePath: string | null | undefined) {
  if (!storagePath) {
    return null;
  }
  if (/^https?:\/\//i.test(storagePath)) {
    return storagePath;
  }
  if (storagePath.startsWith("/")) {
    return storagePath;
  }
  const normalized = storagePath.replace(/^\/+/, "");
  if (PUBLIC_UPLOAD_PREFIX.endsWith("/uploads") && normalized.startsWith("uploads/")) {
    return joinBaseAndPath(PUBLIC_UPLOAD_PREFIX, normalized.slice("uploads/".length));
  }
  return joinBaseAndPath(PUBLIC_UPLOAD_PREFIX, normalized);
}

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const session = await auth();
  const eventId = extractEventIdFromSlug(params.slug);
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      tags: true,
      organizers: {
        include: {
          user: { select: { id: true, nick: true, name: true } },
        },
      },
      game: { select: { slug: true, name: true, isDefault: true } },
      organizations: { include: { organization: true } },
      attachments: true,
      links: true,
      highlights: true,
      rankings: { orderBy: { position: "asc" } },
      registrations: {
        include: {
          user: { select: { id: true, name: true, nick: true, email: true } },
        },
        orderBy: [{ status: "asc" }, { registeredAt: "asc" }, { playerName: "asc" }],
      },
      galleryImages: true,
      album: { include: { images: true } },
    },
  });

  if (!event) {
    notFound();
  }

  const canManage = await userCanEditEvent(session, event.id);
  const currentUserId = resolveSessionUserId(session);
  const currentRoles = extractRoles(session);
  const currentUserCanRegisterMembersOnly =
    !event.isMembersOnly || currentRoles.some((role) => role === "SOCIO" || role === "JUNTA" || role === "ADMIN");

  const chronicleArticle = event.chronicleArticleId
    ? await findArticleById(event.chronicleArticleId)
    : null;

  const computedStatus = getComputedEventStatus(event);

  const rangeLabel = formatDateRange(event.startsAt, event.endsAt);

  const organizers = event.organizers.map((entry) => {
    const display = entry.user?.nick?.trim() || entry.user?.name?.trim() || `Usuario ${entry.userId}`;
    return entry.role ? `${display} (${entry.role})` : display;
  });
  if (organizers.length > 0) {
    const hasBilbo = organizers.some(
      (entry) => entry.trim().toLowerCase() === BILBO_ORGANIZATION_NAME.toLowerCase()
    );
    if (!hasBilbo) {
      organizers.unshift(BILBO_ORGANIZATION_NAME);
    }
  }

  const organizations = event.organizations.map((entry) => ({
    name: entry.organization.name,
    role: entry.role,
  }));

  const visibleAttachments = event.attachments.filter((item) => item.visible);
  const visibleLinks = event.links.filter((item) => item.visible);
  const visibleHighlights = event.highlights.filter((item) => item.visible);
  const visibleRankings = event.rankings.filter((item) => item.visible);
  const activeRegistrations = event.registrations.filter((item) => item.status !== "CANCELLED");

  const directImages = event.galleryImages
    .map((record) => {
      const src = toPublicPath(record.storagePath);
      if (!src) return null;
      return {
        id: record.id,
        src,
        alt: record.altText ?? record.title ?? `Imagen de ${event.title}`,
        width: record.width ?? 1280,
        height: record.height ?? 720,
      };
    })
    .filter(Boolean) as { id: string; src: string; alt: string; width: number; height: number }[];

  const albumImages = (event.album?.images ?? [])
    .map((record) => {
      const src = toPublicPath(record.storagePath);
      if (!src) return null;
      return {
        id: record.id,
        src,
        alt: record.altText ?? record.title ?? `Álbum ${event.album?.title ?? ""}`,
        width: record.width ?? 1280,
        height: record.height ?? 720,
      };
    })
    .filter(Boolean) as { id: string; src: string; alt: string; width: number; height: number }[];

  const galleryMedia = [...directImages, ...albumImages];

  const locationAvailable =
    Boolean(event.location?.trim()) ||
    event.mapsUrl != null ||
    (event.latitude != null && event.longitude != null);

  const tabsConfig: { id: TabId; label: string; enabled: boolean }[] = [
    {
      id: "descripcion",
      label: "Descripcion",
      enabled:
        event.showTabDescription &&
        event.showDescription &&
        (Boolean(event.details?.trim()) || event.tags.length > 0),
    },
    {
      id: "archivos",
      label: "Archivos y enlaces",
      enabled:
        event.showTabResources &&
        ((event.showAttachments && visibleAttachments.length > 0) ||
          (event.showLinks && visibleLinks.length > 0)),
    },
    {
      id: "clasificacion",
      label: "Clasificacion",
      enabled:
        event.showTabClassification &&
        ((event.showStandings && visibleRankings.length > 0) || visibleHighlights.length > 0),
    },
    {
      id: "cronica",
      label: "Cronica",
      enabled: event.showTabChronicle && event.showRecap && Boolean(event.recap?.trim()),
    },
    {
      id: "galeria",
      label: "Galeria",
      enabled: event.showTabGallery && event.showGallery,
    },
    {
      id: "ubicacion",
      label: "Ubicacion",
      enabled: event.showTabLocation && event.showLocation && locationAvailable,
    },
  ];

  const availableTabs = tabsConfig.filter((tab) => tab.enabled);
  const defaultTab = availableTabs[0]?.id ?? null;
  const requestedTab =
    typeof searchParams?.tab === "string" ? (searchParams.tab.toLowerCase() as TabId) : null;
  const activeTab =
    requestedTab && availableTabs.some((tab) => tab.id === requestedTab)
      ? requestedTab
      : defaultTab ?? null;

  const generalPrice =
    event.priceGeneral != null ? euroFormatter.format(Number(event.priceGeneral)) : null;
  const memberPriceValue =
    event.priceSocios != null && Number(event.priceSocios) > 0
      ? euroFormatter.format(Number(event.priceSocios))
      : null;
  const showPriceInfo = generalPrice !== null;

  const hasCapacityInfo = event.capacityMax != null && event.capacityMax > 0;

  const locationLabel = event.location?.trim();
  const hasLocationInfo =
    Boolean(locationLabel) ||
    Boolean(event.mapsUrl) ||
    (event.latitude != null && event.longitude != null);

  const organizerLines: string[] = [];
  if (organizers.length > 0) {
    organizerLines.push(`Organiza: ${organizers.join(", ")}`);
  }
  if (organizations.length > 0) {
    organizerLines.push(
      `Colaboran: ${organizations
        .map((entry) => (entry.role ? `${entry.name} (${entry.role})` : entry.name))
        .join(", ")}`
    );
  }
  const hasOrganizerInfo = organizerLines.length > 0;

  const typeLabel = typeLabels[event.type] ?? event.type;
  const gameLabel = event.game?.name ?? event.game?.slug ?? "General";

  const heroInfoItems: HeroInfoItem[] = [{ key: "dates", label: "Fechas", lines: [rangeLabel] }];
  if (hasLocationInfo) {
    const locationLine =
      locationLabel ??
      (event.mapsUrl || (event.latitude != null && event.longitude != null)
        ? "Consulta el mapa"
        : "");
    heroInfoItems.push({ key: "location", label: "Ubicacion", lines: [locationLine] });
  }
  if (showPriceInfo && generalPrice) {
    const lines = [generalPrice];
    if (memberPriceValue) {
      lines.push(`Socios: ${memberPriceValue}`);
    }
    heroInfoItems.push({ key: "price", label: "Precios", lines });
  }
  if (hasCapacityInfo && event.capacityMax != null) {
    const lines = [`Aforo: ${event.capacityMax}`];
    if (activeRegistrations.length > 0) {
      lines.push(`Inscritos: ${activeRegistrations.length}`);
    } else if ((event.capacityCurrent ?? 0) > 0) {
      lines.push(`Reservas: ${event.capacityCurrent}`);
    }
    heroInfoItems.push({ key: "capacity", label: "Capacidad", lines });
  }
  if (hasOrganizerInfo) {
    heroInfoItems.push({ key: "organizers", label: "Organizadores", lines: organizerLines });
  }


  const toEmbedUrl = (query: string) =>
    `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;

  const deriveEmbedFromGoogleUrl = (rawUrl: string): string | null => {
    try {
      const parsed = new URL(rawUrl);
      const host = parsed.hostname.toLowerCase();
      if (host.includes("google.") || host.includes("goo.gl")) {
        const qParam = parsed.searchParams.get("q");
        if (qParam) {
          return toEmbedUrl(qParam);
        }
        const atIndex = parsed.pathname.indexOf("@");
        if (atIndex !== -1) {
          const coordsChunk = parsed.pathname.slice(atIndex + 1).split(/[,/]/);
          const lat = Number(coordsChunk[0]);
          const lng = Number(coordsChunk[1]);
          if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            return toEmbedUrl(`${lat},${lng}`);
          }
        }
        if (locationLabel) {
          return toEmbedUrl(locationLabel);
        }
        return null;
      }
      return rawUrl.includes("output=embed")
        ? rawUrl
        : `${rawUrl}${rawUrl.includes("?") ? "&" : "?"}output=embed`;
    } catch {
      return null;
    }
  };

  let mapEmbedSrc: string | null = null;
  if (event.latitude != null && event.longitude != null) {
    mapEmbedSrc = toEmbedUrl(`${event.latitude},${event.longitude}`);
  } else if (event.mapsUrl) {
    mapEmbedSrc = deriveEmbedFromGoogleUrl(event.mapsUrl);
  }

  if (!mapEmbedSrc && locationLabel) {
    mapEmbedSrc = toEmbedUrl(locationLabel);
  }

  const canonicalSlug = buildEventSlug(event.id, event.title);
  const baseHref = `/eventos/${canonicalSlug}`;
  const manageButtons = (
    <div className="flex flex-wrap justify-end gap-2">
      <Link
        href={`/eventos/${canonicalSlug}/competitivo`}
        className="rounded-full border border-sky-300/30 bg-sky-500/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-sky-100 transition hover:bg-sky-500/20"
      >
        Datos competitivos
      </Link>
      {canManage && (
        <>
        <Link
          href={`/eventos/${canonicalSlug}/reportes`}
          className="rounded-full border border-amber-300/30 bg-amber-500/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-amber-100 transition hover:bg-amber-500/20"
        >
          Revisar reportes
        </Link>
        <Link
          href={`/eventos/${canonicalSlug}/editar`}
          className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/10"
        >
          Editar evento
        </Link>
        </>
      )}
    </div>
  );

  const showShareButtons = event.status !== "DRAFT" && event.status !== "CANCELLED";
  const canRegisterForEvent = canAcceptRegistrations(event) && currentUserCanRegisterMembersOnly;
  const showRegistrationsPanel = canManage || event.registrations.length > 0 || canRegisterForEvent;

  return (
    <div className="container mx-auto max-w-5xl space-y-8 px-4 py-8">
      <header className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <EventStatusBadge status={computedStatus} />
                {event.isMembersOnly && (
                  <span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white">
                    Solo socios
                  </span>
                )}
                {showShareButtons && (
                  <div className="ml-2">
                    <EventShareButtons
                      eventSlug={canonicalSlug}
                      title={event.title}
                      startsAt={event.startsAt.toISOString()}
                      endsAt={event.endsAt.toISOString()}
                      location={locationLabel}
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                  {typeLabel}
                  <span className="mx-2 text-white/30">/</span>
                  {gameLabel}
                </p>
                <h1 className="text-3xl font-semibold md:text-4xl">{event.title}</h1>
              </div>
              {heroInfoItems.length > 0 && (
                <dl className="space-y-4 pt-2">
                  {heroInfoItems.map((item, index) => (
                    <div key={item.key} className={index > 0 ? "pt-4" : ""}>
                      <dt className="text-[0.8rem] uppercase tracking-[0.35em] text-[var(--muted)]">
                        {item.label}
                      </dt>
                      <dd className="text-base font-semibold text-white leading-tight">
                        {item.lines.map((line, idx) => (
                          <span
                            key={`${item.key}-${idx}`}
                            className={idx > 0 ? "mt-1 block text-sm font-normal text-white/80" : ""}
                          >
                            {line}
                          </span>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            <div className="space-y-4">
              {manageButtons}
              <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-2xl border border-white/10 bg-black/20 shadow-lg">
                {event.bannerUrl ? (
                  <Image
                    src={event.bannerUrl}
                    alt={`Banner de ${event.title}`}
                    fill
                    sizes="(min-width: 1024px) 320px, 80vw"
                    className="object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
                    Sin banner asignado
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {showRegistrationsPanel && (
        <EventRegistrationsPanel
          eventId={event.id}
          currentUserId={currentUserId}
          canManage={canManage}
          canRegister={canRegisterForEvent}
          capacityMax={event.capacityMax}
          registrations={event.registrations.map((registration) => ({
            id: registration.id,
            eventId: registration.eventId,
            userId: registration.userId,
            playerName: registration.playerName,
            factionLabel: registration.factionLabel,
            status: registration.status,
            notes: registration.notes,
            registeredAt: registration.registeredAt.toISOString(),
            user: registration.user
              ? {
                  id: registration.user.id,
                  name: registration.user.name,
                  nick: registration.user.nick,
                  email: registration.user.email,
                }
              : null,
          }))}
        />
      )}

      {availableTabs.length > 0 && (
        <nav className="flex flex-wrap gap-2">
          {availableTabs.map((tab) => {
            const isActive = tab.id === activeTab;
            const href = tab.id === defaultTab ? baseHref : `${baseHref}?tab=${tab.id}`;
            return (
              <Link
                key={tab.id}
                href={href}
                scroll={false}
                prefetch={false}
                className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.3em] transition ${
                  isActive
                    ? "border-white/80 bg-white/10 text-white"
                    : "border-white/10 text-[var(--muted)] hover:border-white/40 hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      )}

      <section className="space-y-6 rounded-3xl border border-white/10 bg-black/20 p-6 shadow-lg">
        {!activeTab && (
          <p className="text-sm text-[var(--muted)]">
            El organizador ha ocultado temporalmente los bloques de contenido de este evento.
          </p>
        )}
        {activeTab === "descripcion" && (
          <div className="space-y-6">
            <div className="space-y-3">
              {event.details ? (
                <div
                  className="text-sm leading-relaxed opacity-90 [&_p]:my-2 [&_div]:my-2 [&_ul]:my-3 [&_ol]:my-3 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_a]:text-[var(--accent)] [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: event.details }}
                />
              ) : (
                <p className="text-sm text-[var(--muted)]">La descripcion estara disponible en breve.</p>
              )}
            </div>
            {event.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white"
                  >
                    #{tag.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "archivos" && (
          <div className="space-y-6">
            {event.showAttachments && visibleAttachments.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                  Archivos
                </h2>
                <div className="space-y-2">
                  {visibleAttachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm hover:border-white/40"
                    >
                      <span className="font-medium text-white">{attachment.title}</span>
                      <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Descargar</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {event.showLinks && visibleLinks.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                  Enlaces
                </h2>
                <div className="space-y-2">
                  {visibleLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm hover:border-white/40"
                    >
                      <span className="font-medium text-white">{link.label}</span>
                      <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Abrir</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {(!event.showAttachments || visibleAttachments.length === 0) &&
              (!event.showLinks || visibleLinks.length === 0) && (
                <p className="text-sm text-[var(--muted)]">No hay recursos disponibles por ahora.</p>
              )}
          </div>
        )}

        {activeTab === "clasificacion" && (
          <div className="space-y-6">
            {visibleHighlights.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                  Destacados
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {visibleHighlights.map((highlight) => (
                    <div key={highlight.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                        {highlightLabels[highlight.type] ?? highlight.type}
                      </p>
                      <p className="mt-1 text-base font-semibold">{highlight.title}</p>
                      <p className="text-sm text-[var(--muted)]">{highlight.playerName}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {event.showStandings && visibleRankings.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="min-w-full divide-y divide-white/10 text-sm">
                  <thead className="bg-white/5 text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                    <tr>
                      <th className="px-4 py-2 text-left">Posicion</th>
                      <th className="px-4 py-2 text-left">Jugador</th>
                      <th className="px-4 py-2 text-left">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {visibleRankings.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-4 py-3 font-semibold">{entry.position}</td>
                        <td className="px-4 py-3">{entry.playerName}</td>
                        <td className="px-4 py-3 text-[var(--muted)]">
                          {entry.score ?? "Pendiente"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {event.showStandings && visibleRankings.length === 0 && (
              <p className="text-sm text-[var(--muted)]">
                La clasificacion se publicara cuando este disponible.
              </p>
            )}
          </div>
        )}

        {activeTab === "cronica" && (
          <div className="space-y-4">
            {chronicleArticle && (
              <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4">
                <h2 className="text-lg font-semibold text-white">{chronicleArticle.title}</h2>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                  Publicada en Novedades
                </p>
                {chronicleArticle.summary && (
                  <p className="text-sm text-[var(--muted)]">{chronicleArticle.summary}</p>
                )}
                <Link
                  href={`/novedades/${chronicleArticle.category}/${chronicleArticle.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white transition hover:border-white/40"
                >
                  Leer cronica completa
                </Link>
              </div>
            )}
            {!chronicleArticle && (
              <p className="text-sm text-[var(--muted)]">La cronica de este evento llegara pronto.</p>
            )}
          </div>
        )}

        {activeTab === "galeria" && (
          <div className="space-y-3">
            {event.album && (
              <Link
                href={`/galeria/${event.album.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white transition hover:bg-white/10"
              >
                Abrir álbum
              </Link>
            )}
            {galleryMedia.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {galleryMedia.map((image) => (
                  <div key={image.id} className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">Todavia no hay fotos asociadas al evento.</p>
            )}
          </div>
        )}

        {activeTab === "ubicacion" && (
          <div className="space-y-4">
            {event.location && (
              <p className="text-sm text-[var(--muted)]">Dirección: {event.location}</p>
            )}
            {mapEmbedSrc ? (
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <iframe
                  src={mapEmbedSrc}
                  className="h-64 w-full"
                  loading="lazy"
                  allowFullScreen
                  title={`Mapa de ${event.title}`}
                />
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                El mapa se publicará cuando tengamos la ubicación definitiva.
              </p>
            )}
            {event.mapsUrl && (
              <a
                href={event.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white hover:bg-white/10"
              >
                Abrir en Google Maps
              </a>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

