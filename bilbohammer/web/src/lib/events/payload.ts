"use server";

import { EventHighlightType, EventStatus, EventType, Prisma, PrismaClient } from "@prisma/client";
import { loadActiveGames, resolveGameFromInput, type GameCatalogItem } from "@/lib/game-catalog";

export type OrganizerInput = {
  userId: number;
  role: string | null;
};

export type OrganizationInput = {
  id: string | null;
  slug: string | null;
  name: string | null;
  isClub: boolean | undefined;
  role: string | null;
};

export type AttachmentInput = {
  title: string;
  description: string | null;
  fileUrl: string;
  visible: boolean;
};

export type LinkInput = {
  label: string;
  url: string;
  visible: boolean;
};

export type HighlightInput = {
  type: EventHighlightType;
  title: string;
  playerName: string;
  playerId: number | null;
  visible: boolean;
};

export type RankingInput = {
  position: number;
  playerName: string;
  playerId: number | null;
  score: string | null;
  visible: boolean;
};

export type ParsedEventPayload = {
  eventData: {
    title: string;
    bannerUrl?: string | null;
    startsAt: Date;
    endsAt: Date;
    location?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    mapsUrl?: string | null;
    details?: string | null;
    recap?: string | null;
    status: EventStatus;
    type: EventType;
    gameId?: string | null;
    priceGeneral?: Prisma.Decimal | null;
    priceSocios?: Prisma.Decimal | null;
    capacityMax?: number | null;
    capacityCurrent?: number;
    isInternal: boolean;
    isMembersOnly: boolean;
    showDescription: boolean;
    showAttachments: boolean;
    showLinks: boolean;
    showStandings: boolean;
    showRecap: boolean;
    showGallery: boolean;
    showLocation: boolean;
    showTabDescription: boolean;
    showTabResources: boolean;
    showTabClassification: boolean;
    showTabChronicle: boolean;
    showTabGallery: boolean;
    showTabLocation: boolean;
    chronicleArticleId?: string | null;
    albumId?: string | null;
  };
  tags: string[];
  organizers: OrganizerInput[];
  organizations: OrganizationInput[];
  attachments: AttachmentInput[];
  links: LinkInput[];
  highlights: HighlightInput[];
  rankings: RankingInput[];
};

type RawPayload = Record<string, any>;

const EVENT_STATUS_VALUES = new Set(Object.values(EventStatus));
const EVENT_TYPE_VALUES = new Set(Object.values(EventType));
const EVENT_HIGHLIGHT_TYPE_VALUES = new Set(Object.values(EventHighlightType));

const EVENT_TYPE_TAG_LABELS: Record<EventType, string> = {
  SOCIAL: "Social",
  TOURNAMENT: "Torneo",
  LEAGUE: "Liga",
  WORKSHOP: "Workshop",
  OTHER: "Otro",
};

function parseDate(value: unknown, field: string): Date {
  if (typeof value !== "string") {
    throw new Error(`El campo ${field} es obligatorio.`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`El campo ${field} debe ser una fecha válida.`);
  }
  return date;
}

function parseString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

function parseDecimal(value: unknown, field: string): Prisma.Decimal | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" || typeof value === "string") {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
      throw new Error(`El campo ${field} debe ser un número positivo.`);
    }
    return new Prisma.Decimal(num.toFixed(2));
  }
  throw new Error(`El campo ${field} debe ser un número.`);
}

function sanitizeTag(label: string): string | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 50);
}

export async function parseEventPayload(raw: RawPayload): Promise<ParsedEventPayload> {
  const title = parseString(raw.title);
  if (!title) {
    throw new Error("El título es obligatorio.");
  }

  const startsAt = parseDate(raw.startsAt, "startsAt");
  const endsAt = parseDate(raw.endsAt, "endsAt");
  if (startsAt >= endsAt) {
    throw new Error("La fecha de inicio debe ser anterior a la fecha de fin.");
  }

  const bannerUrl = parseString(raw.bannerUrl);
  const location = parseString(raw.location);
  const latitude =
    typeof raw.latitude === "number" ? raw.latitude : typeof raw.latitude === "string" ? Number(raw.latitude) : null;
  const longitude =
    typeof raw.longitude === "number" ? raw.longitude : typeof raw.longitude === "string" ? Number(raw.longitude) : null;

  if ((latitude != null && Number.isNaN(latitude)) || (longitude != null && Number.isNaN(longitude))) {
    throw new Error("Las coordenadas deben ser numéricas.");
  }

  const mapsUrl = parseString(raw.mapsUrl);
  const details = parseString(raw.details);
  const recap = parseString(raw.recap);

  const statusRaw = typeof raw.status === "string" ? raw.status.toUpperCase() : undefined;
  let status: EventStatus;
  if (statusRaw && EVENT_STATUS_VALUES.has(statusRaw as EventStatus)) {
    status = statusRaw as EventStatus;
  } else {
    status = endsAt.getTime() < Date.now() ? EventStatus.FINALIZED : EventStatus.PUBLISHED;
  }

  const typeRaw = typeof raw.type === "string" ? raw.type.toUpperCase() : undefined;
  const type = typeRaw && EVENT_TYPE_VALUES.has(typeRaw as EventType) ? (typeRaw as EventType) : EventType.OTHER;

  const gameRaw = typeof raw.game === "string" ? raw.game : undefined;
  let selectedGame: GameCatalogItem | null = null;
  if (gameRaw) {
    const games = await loadActiveGames();
    selectedGame = resolveGameFromInput(gameRaw, games);
  }
  const gameId = selectedGame?.id ?? null;

  const priceGeneral = parseDecimal(raw.priceGeneral, "priceGeneral");
  const priceSocios = parseDecimal(raw.priceSocios, "priceSocios");
  if (priceSocios && !priceGeneral) {
    throw new Error("No se puede definir un precio para socios sin un precio general.");
  }

  const capacityMax =
    typeof raw.capacityMax === "number" ? Math.max(0, Math.floor(raw.capacityMax)) :
    typeof raw.capacityMax === "string" ? Math.max(0, Math.floor(Number(raw.capacityMax))) :
    null;

  let capacityCurrent =
    typeof raw.capacityCurrent === "number" ? Math.max(0, Math.floor(raw.capacityCurrent)) :
    typeof raw.capacityCurrent === "string" ? Math.max(0, Math.floor(Number(raw.capacityCurrent))) :
    0;

  if (capacityMax != null && capacityCurrent > capacityMax) {
    capacityCurrent = capacityMax;
  }

  const visibility = typeof raw.visibility === "object" && raw.visibility
    ? raw.visibility
    : {};
  const tabVisibility = typeof visibility.tabs === "object" && visibility.tabs
    ? visibility.tabs
    : {};

  const hasChronicleId = Object.prototype.hasOwnProperty.call(raw, "chronicleArticleId");
  const chronicleArticleId = hasChronicleId ? parseString(raw.chronicleArticleId) : undefined;
  const hasAlbumId = Object.prototype.hasOwnProperty.call(raw, "albumId");
  const albumId = hasAlbumId ? parseString(raw.albumId) : undefined;

  const descriptionVisibility = parseBoolean(visibility.description ?? raw.showDescription, true);
  const showAttachments = parseBoolean(visibility.attachments ?? raw.showAttachments, true);
  const showLinks = parseBoolean(visibility.links ?? raw.showLinks, true);
  const classificationVisibility = parseBoolean(visibility.standings ?? raw.showStandings, true);
  const chronicleVisibility = parseBoolean(visibility.recap ?? raw.showRecap, true);
  const galleryVisibility = parseBoolean(visibility.gallery ?? raw.showGallery, true);
  const locationVisibility = parseBoolean(visibility.location ?? raw.showLocation, true);

  const showTabDescription = parseBoolean(
    tabVisibility.description ?? raw.showTabDescription,
    descriptionVisibility
  );
  const showDescription = showTabDescription;
  const showTabResources = parseBoolean(
    tabVisibility.resources ?? raw.showTabResources,
    showAttachments || showLinks
  );
  const showTabClassification = parseBoolean(
    tabVisibility.classification ?? raw.showTabClassification,
    classificationVisibility
  );
  const showStandings = showTabClassification;
  const showTabChronicle = parseBoolean(
    tabVisibility.chronicle ?? raw.showTabChronicle,
    chronicleVisibility
  );
  const showRecap = showTabChronicle;
  const showTabGallery = parseBoolean(
    tabVisibility.gallery ?? raw.showTabGallery,
    galleryVisibility
  );
  const showGallery = showTabGallery;
  const showTabLocation = parseBoolean(
    tabVisibility.location ?? raw.showTabLocation,
    locationVisibility
  );
  const showLocation = showTabLocation;

  const baseTags = Array.isArray(raw.tags)
    ? raw.tags
        .map((tag) => (typeof tag === "string" ? sanitizeTag(tag) : null))
        .filter((tag): tag is string => Boolean(tag))
    : [];

  const systemTags = new Set<string>();
  systemTags.add(EVENT_TYPE_TAG_LABELS[type] ?? type);
  if (selectedGame && !selectedGame.isDefault) {
    systemTags.add(selectedGame.name ?? selectedGame.slug);
  }
  const tags = Array.from(new Set([...baseTags, ...systemTags]));

  const organizers = Array.isArray(raw.organizers)
    ? raw.organizers
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const userId = Number((entry as Record<string, unknown>).userId);
          if (!Number.isFinite(userId) || userId <= 0) return null;
          const role = parseString((entry as Record<string, unknown>).role ?? null);
          return { userId, role };
        })
        .filter((entry): entry is OrganizerInput => Boolean(entry))
    : [];

  const organizations = Array.isArray(raw.organizations)
    ? raw.organizations
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const payload = entry as Record<string, unknown>;
          const id = parseString(payload.id ?? null);
          const slug = parseString(payload.slug ?? null);
          const name = parseString(payload.name ?? null);
          if (!id && !slug && !name) return null;
          const isClub = typeof payload.isClub === "boolean" ? payload.isClub : undefined;
          const role = parseString(payload.role ?? null);
          return { id, slug, name, isClub, role: role ?? null };
        })
        .filter((entry): entry is OrganizationInput => Boolean(entry))
    : [];

  const attachments = Array.isArray(raw.attachments)
    ? raw.attachments
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const payload = entry as Record<string, unknown>;
          const title = parseString(payload.title);
          const fileUrl = parseString(payload.fileUrl);
          if (!title || !fileUrl) return null;
          const description = parseString(payload.description ?? null);
          const visible = parseBoolean(payload.visible, true);
          return { title, description, fileUrl, visible };
        })
        .filter((entry): entry is AttachmentInput => Boolean(entry))
    : [];

  const links = Array.isArray(raw.links)
    ? raw.links
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const payload = entry as Record<string, unknown>;
          const label = parseString(payload.label);
          const url = parseString(payload.url);
          if (!label || !url) return null;
          const visible = parseBoolean(payload.visible, true);
          return { label, url, visible };
        })
        .filter((entry): entry is LinkInput => Boolean(entry))
    : [];

  const highlights = Array.isArray(raw.highlights)
    ? raw.highlights
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const payload = entry as Record<string, unknown>;
          const typeRaw = parseString(payload.type ?? null);
          const type = typeRaw && EVENT_HIGHLIGHT_TYPE_VALUES.has(typeRaw.toUpperCase() as EventHighlightType)
            ? (typeRaw.toUpperCase() as EventHighlightType)
            : null;
          const title = parseString(payload.title);
          const playerName = parseString(payload.playerName);
          const playerId = payload.playerId == null ? null : Number(payload.playerId);
          if (!type || !title || !playerName) return null;
          if (playerId != null && (!Number.isInteger(playerId) || playerId <= 0)) {
            return null;
          }
          const visible = parseBoolean(payload.visible, true);
          return { type, title, playerName, playerId, visible };
        })
        .filter((entry): entry is HighlightInput => Boolean(entry))
    : [];

  const rankingMap = new Map<number, RankingInput>();
  if (Array.isArray(raw.rankings)) {
    for (const entry of raw.rankings) {
      if (!entry || typeof entry !== "object") continue;
      const payload = entry as Record<string, unknown>;
      const positionRaw = payload.position;
      const position = typeof positionRaw === "number"
        ? Math.floor(positionRaw)
        : typeof positionRaw === "string"
          ? Math.floor(Number(positionRaw))
          : NaN;
      if (!Number.isFinite(position) || position <= 0) continue;
      const playerName = parseString(payload.playerName);
      if (!playerName) continue;
      const playerId = payload.playerId == null ? null : Number(payload.playerId);
      if (playerId != null && (!Number.isInteger(playerId) || playerId <= 0)) continue;
      const score = parseString(payload.score ?? null);
      const visible = parseBoolean(payload.visible, true);
      rankingMap.set(position, {
        position,
        playerName,
        playerId,
        score,
        visible,
      });
    }
  }
  const rankings = Array.from(rankingMap.values()).sort((a, b) => a.position - b.position);

  const isInternal = parseBoolean(raw.isInternal, false);
  const isMembersOnly = parseBoolean(raw.isMembersOnly, false);

  return {
    eventData: {
      title,
      bannerUrl,
      startsAt,
      endsAt,
      location,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      mapsUrl,
      details,
      recap,
      status,
      type,
      gameId,
      priceGeneral,
      priceSocios,
      capacityMax,
      capacityCurrent,
      isInternal,
      isMembersOnly,
      showDescription,
      showAttachments,
      showLinks,
      showStandings,
      showRecap,
      showGallery,
      showLocation,
      showTabDescription,
      showTabResources,
      showTabClassification,
      showTabChronicle,
      showTabGallery,
      showTabLocation,
      chronicleArticleId: hasChronicleId ? chronicleArticleId ?? null : undefined,
      albumId: hasAlbumId ? albumId ?? null : undefined,
    },
    tags,
    organizers,
    organizations,
    attachments,
    links,
    highlights,
    rankings,
  };
}

export async function computeInternalFlag(
  prisma: PrismaClient,
  organizers: OrganizerInput[],
  organizations: OrganizationInput[],
  preset: boolean
): Promise<boolean> {
  if (preset) return true;
  const hasClubOrganization = organizations.some(
    (org) => (org.slug && org.slug.toLowerCase() === "bilbohammer") || org.isClub
  );
  if (hasClubOrganization) return true;
  if (organizers.length === 0) return false;
  const organizerUsers = await prisma.user.findMany({
    where: { id: { in: organizers.map((item) => item.userId) } },
    select: { id: true, roles: true },
  });
  return organizerUsers.some((user) =>
    (user.roles ?? []).some((role) => role === "SOCIO" || role === "JUNTA" || role === "ADMIN")
  );
}
