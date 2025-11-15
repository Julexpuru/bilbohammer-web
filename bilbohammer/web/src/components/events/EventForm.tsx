'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type {
  EventHighlightType,
  EventStatus,
  EventType,
} from "@prisma/client";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { uploadAttachmentFile, uploadBannerFile } from "@/lib/events/uploads";
import { slugify } from "@/lib/slugify";
import type { ArticleCategory } from "@/app/novedades/data";

type Juego = string;

export type EventFormInitialData = {
  id: string;
  title: string;
  bannerUrl: string | null;
  startsAt: string;
  endsAt: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  mapsUrl: string | null;
  details: string | null;
  recap: string | null;
  status: EventStatus;
  type: EventType;
  game: Juego | null;
  priceGeneral: string | null;
  priceSocios: string | null;
  capacityMax: number | null;
  capacityCurrent: number | null;
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
  chronicleArticleId: string | null;
  chronicleArticleTitle: string | null;
  chronicleArticleSlug: string | null;
  chronicleArticleCategory: ArticleCategory | null;
  chronicleArticleSummary: string | null;
  chronicleArticleDate: string | null;
  albumId: string | null;
  tags: string[];
  organizers: {
    userId: number;
    name: string | null;
    role: string | null;
  }[];
  organizations: {
    organization: {
      id: string;
      slug: string | null;
      name: string | null;
      isClub: boolean;
    };
    role: string | null;
  }[];
  attachments: {
    title: string;
    description: string | null;
    fileUrl: string;
    visible: boolean;
  }[];
  links: {
    label: string;
    url: string;
    visible: boolean;
  }[];
  highlights: {
    type: EventHighlightType;
    title: string;
    playerName: string;
    playerId: number | null;
    visible: boolean;
  }[];
  rankings: {
    position: number;
    playerName: string;
    playerId: number | null;
    score: string | null;
    visible: boolean;
  }[];
};

 type EventFormProps = {
  mode: "create" | "edit";
  initialData?: EventFormInitialData;
};

type OrganizerState = {
  key: string;
  userId: string;
  role: string;
  displayName: string;
};

type OrganizationState = {
  key: string;
  id: string;
  slug: string;
  name: string;
  isClub: boolean;
  role: string;
  locked: boolean;
};

type AttachmentState = {
  key: string;
  title: string;
  description: string;
  fileUrl: string;
  fileName: string;
  uploading: boolean;
  error: string | null;
  visible: boolean;
};

 type LinkState = {
  key: string;
  label: string;
  url: string;
  visible: boolean;
};

 type HighlightState = {
  key: string;
  type: EventHighlightType | "";
  title: string;
  playerName: string;
  playerId: string;
  visible: boolean;
};

 type RankingState = {
  key: string;
  position: string;
  playerName: string;
  playerId: string;
  score: string;
  visible: boolean;
};

type AlbumFormatValue = "TORNEO" | "LIGA" | "SOCIAL" | "TALLER" | "EXPO" | "OTROS";

 type AlbumDraftState = {
  title: string;
  year: string;
  date: string;
  location: string;
  description: string;
  game: string;
  format: AlbumFormatValue;
 };

type EventFormState = {
  title: string;
  bannerUrl: string;
  startsAt: string;
  endsAt: string;
  location: string;
  latitude: string;
  longitude: string;
  mapsUrl: string;
  details: string;
  recap: string;
  status: EventStatus;
  type: EventType;
  game: Juego | "";
  priceGeneral: string;
  priceSocios: string;
  capacityMax: string;
  capacityCurrent: string;
  hasPrice: boolean;
  hasCapacity: boolean;
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
  chronicleArticleId: string;
  albumId: string;
  tags: string[];
  lockedTags: string[];
  organizers: OrganizerState[];
  organizations: OrganizationState[];
  attachments: AttachmentState[];
  links: LinkState[];
  highlights: HighlightState[];
  rankings: RankingState[];
};

type BooleanField = {
  [K in keyof EventFormState]: EventFormState[K] extends boolean ? K : never;
}[keyof EventFormState];

 type MemberSearchResult = {
  id: string;
  name: string;
  nick?: string | null;
  email?: string | null;
};

type AlbumSearchResult = {
  id: string;
  slug: string;
  title: string;
};

type ChronicleSearchResult = {
  id: string;
  slug: string;
  title: string;
  category: ArticleCategory;
  summary: string | null;
  date: string | null;
};
const EVENT_STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: "DRAFT", label: "Borrador" },
  { value: "PUBLISHED", label: "Publicado" },
  { value: "FINALIZED", label: "Finalizado" },
  { value: "POSTPONED", label: "Pospuesto" },
  { value: "CANCELLED", label: "Cancelado" },
];

const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: "SOCIAL", label: "Social" },
  { value: "TOURNAMENT", label: "Torneo" },
  { value: "LEAGUE", label: "Liga" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "OTHER", label: "Otro" },
];

const GAME_OPTIONS: { value: Juego; label: string }[] = [
  { value: "W40K", label: "Warhammer 40K" },
  { value: "AOS", label: "Age of Sigmar" },
  { value: "TOW", label: "The Old World" },
  { value: "ESDLA", label: "El Senor de los Anillos" },
  { value: "BB", label: "Blood Bowl" },
  { value: "MARVEL", label: "Marvel Crisis Protocol" },
  { value: "ROL", label: "Rol" },
  { value: "MAGIC", label: "Magic" },
  { value: "JUEGOS_DE_MESA", label: "Juegos de mesa" },
  { value: "OTROS", label: "Otros" },
];

const BILBO_ORGANIZATION_SLUG = "bilbohammer";
const BILBO_ORGANIZATION_NAME = "Bilbohammer";

const EVENT_TYPE_LABEL_MAP = EVENT_TYPE_OPTIONS.reduce(
  (map, option) => {
    map[option.value] = option.label;
    return map;
  },
  {} as Record<EventType, string>
);

const GAME_LABEL_MAP = GAME_OPTIONS.reduce(
  (map, option) => {
    map[option.value] = option.label;
    return map;
  },
  {} as Record<Juego, string>
);

function computeSystemTags(type: EventType, game: Juego | ""): string[] {
  const tags: string[] = [];
  tags.push(EVENT_TYPE_LABEL_MAP[type] ?? type);
  if (game && game !== "OTROS") {
    tags.push(GAME_LABEL_MAP[game] ?? game);
  }
  return tags;
}

function syncSystemTags(existing: string[], systemTags: string[]): { tags: string[]; lockedTags: string[] } {
  const merged = Array.from(new Set([...existing, ...systemTags]));
  return { tags: merged, lockedTags: systemTags };
}

function isBilboOrganizationMatch(candidate: { slug?: string | null; name?: string | null }) {
  const slug = (candidate.slug ?? "").trim().toLowerCase();
  const name = (candidate.name ?? "").trim().toLowerCase();
  return slug === BILBO_ORGANIZATION_SLUG || name === BILBO_ORGANIZATION_NAME.toLowerCase();
}

function createBilboOrganization(): OrganizationState {
  return {
    key: generateKey(),
    id: "",
    slug: BILBO_ORGANIZATION_SLUG,
    name: BILBO_ORGANIZATION_NAME,
    isClub: true,
    role: "",
    locked: true,
  };
}

function ensureBilboOrganization(list: OrganizationState[]): OrganizationState[] {
  const normalized = list.map((item) => ({
    ...item,
    locked: item.locked ?? false,
  }));
  const existingIndex = normalized.findIndex((item) =>
    isBilboOrganizationMatch({ slug: item.slug, name: item.name })
  );
  if (existingIndex >= 0) {
    const existing = normalized[existingIndex];
    const updated: OrganizationState = {
      ...existing,
      slug: existing.slug || BILBO_ORGANIZATION_SLUG,
      name: existing.name || BILBO_ORGANIZATION_NAME,
      isClub: true,
      locked: true,
    };
    const others = normalized.filter((_, index) => index !== existingIndex);
    return [updated, ...others];
  }
  return [createBilboOrganization(), ...normalized];
}

const HIGHLIGHT_TYPE_OPTIONS: { value: EventHighlightType; label: string }[] = [
  { value: "FIRST", label: "Primer puesto" },
  { value: "SECOND", label: "Segundo puesto" },
  { value: "THIRD", label: "Tercer puesto" },
  { value: "AWARD", label: "Mencion especial" },
];

const EVENT_CONTENT_TABS = [
  { id: "description", label: "Descripcion" },
  { id: "resources", label: "Archivos y enlaces" },
  { id: "stories", label: "Clasificacion, destacados y cronica" },
  { id: "gallery", label: "Galeria" },
  { id: "location", label: "Ubicacion" },
] as const;
const ALBUM_FORMAT_OPTIONS: { value: AlbumFormatValue; label: string }[] = [
  { value: "TORNEO", label: "Torneo" },
  { value: "LIGA", label: "Liga" },
  { value: "SOCIAL", label: "Social" },
  { value: "TALLER", label: "Taller" },
  { value: "EXPO", label: "Exposicion" },
  { value: "OTROS", label: "Otros" },
];

function mapEventTypeToAlbumFormat(type: EventType): AlbumFormatValue {
  switch (type) {
    case "TOURNAMENT":
      return "TORNEO";
    case "LEAGUE":
      return "LIGA";
    case "WORKSHOP":
      return "TALLER";
    case "SOCIAL":
      return "SOCIAL";
    default:
      return "OTROS";
  }
}

function mapGameToAlbumFacet(game: string | null | undefined): string {
  if (!game) return "general";
  return game.toLowerCase();
}

function buildAlbumDraftFromEvent(state: Pick<EventFormState, "title" | "startsAt" | "location" | "type" | "game">): AlbumDraftState {
  const start = state.startsAt ? new Date(state.startsAt) : null;
  const validStart = start instanceof Date && !Number.isNaN(start.valueOf());
  const year = validStart ? String(start.getFullYear()) : String(new Date().getFullYear());
  const normalizedDate = validStart ? state.startsAt.slice(0, 10) : "";
  return {
    title: state.title,
    year,
    date: normalizedDate,
    location: state.location,
    description: "",
    game: state.game && state.game.length ? state.game : "OTROS",
    format: mapEventTypeToAlbumFormat(state.type),
  };
}


const NUMBER_FIELDS_HELPER = {
  latitude: "Latitud debe estar entre -90 y 90.",
  longitude: "Longitud debe estar entre -180 y 180.",
  capacityMax: "Aforo maximo debe ser un entero positivo.",
  capacityCurrent: "Aforo actual debe ser un entero mayor o igual a 0.",
} as const;

const LINKED_VISIBILITY_FIELDS: Array<{ tab: BooleanField; linked: BooleanField[] }> = [
  { tab: "showTabDescription", linked: ["showDescription"] },
  { tab: "showTabChronicle", linked: ["showRecap"] },
  { tab: "showTabGallery", linked: ["showGallery"] },
  { tab: "showTabLocation", linked: ["showLocation"] },
];

function normalizeLinkedVisibilityFlags(state: EventFormState): EventFormState {
  const next = { ...state };
  LINKED_VISIBILITY_FIELDS.forEach(({ tab, linked }) => {
    const normalizedValue = Boolean(next[tab] && linked.every((field) => next[field]));
    next[tab] = normalizedValue;
    linked.forEach((field) => {
      next[field] = normalizedValue;
    });
  });
  return next;
}

function generateKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

function toLocalDateTimeInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const tzOffset = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - tzOffset);
  return local.toISOString().slice(0, 16);
}

function buildInitialState(initialData?: EventFormInitialData): EventFormState {
  if (!initialData) {
    const baseState: EventFormState = {
      title: "",
      bannerUrl: "",
      startsAt: "",
      endsAt: "",
      location: "",
      latitude: "",
      longitude: "",
      mapsUrl: "",
      details: "",
      recap: "",
      status: "DRAFT",
      type: "OTHER",
      game: "",
      priceGeneral: "",
      priceSocios: "",
      capacityMax: "",
      capacityCurrent: "",
      hasPrice: false,
      hasCapacity: false,
      isInternal: false,
      isMembersOnly: false,
      showDescription: true,
      showAttachments: true,
      showLinks: true,
      showStandings: true,
      showRecap: true,
      showGallery: true,
      showLocation: true,
      showTabDescription: true,
      showTabResources: true,
      showTabClassification: true,
      showTabChronicle: true,
      showTabGallery: true,
      showTabLocation: true,
      chronicleArticleId: "",
      albumId: "",
      tags: [],
      lockedTags: [],
      organizers: [],
      organizations: [],
      attachments: [],
      links: [],
      highlights: [],
      rankings: [],
    };
    const systemTags = computeSystemTags(baseState.type, baseState.game);
    const { tags, lockedTags } = syncSystemTags(baseState.tags, systemTags);
    const organizations = ensureBilboOrganization(baseState.organizations);
    const stateWithDerived: EventFormState = {
      ...baseState,
      tags,
      lockedTags,
      organizations,
    };
    return normalizeLinkedVisibilityFlags(stateWithDerived);
  }

  const baseState: EventFormState = {
    title: initialData.title,
    bannerUrl: initialData.bannerUrl ?? "",
    startsAt: toLocalDateTimeInput(initialData.startsAt),
    endsAt: toLocalDateTimeInput(initialData.endsAt),
    location: initialData.location ?? "",
    latitude: initialData.latitude != null ? String(initialData.latitude) : "",
    longitude: initialData.longitude != null ? String(initialData.longitude) : "",
    mapsUrl: initialData.mapsUrl ?? "",
    details: initialData.details ?? "",
    recap: initialData.recap ?? "",
    status: initialData.status,
    type: initialData.type,
    game: initialData.game ?? "",
    priceGeneral: initialData.priceGeneral ?? "",
    priceSocios: initialData.priceSocios ?? "",
    capacityMax: initialData.capacityMax != null ? String(initialData.capacityMax) : "",
    capacityCurrent:
      initialData.capacityCurrent != null ? String(initialData.capacityCurrent) : "",
    hasPrice: initialData.priceGeneral != null,
    hasCapacity: initialData.capacityMax != null,
    isInternal: initialData.isInternal,
    isMembersOnly: initialData.isMembersOnly,
    showDescription: initialData.showDescription,
    showAttachments: initialData.showAttachments,
    showLinks: initialData.showLinks,
    showStandings: initialData.showStandings,
    showRecap: initialData.showRecap,
    showGallery: initialData.showGallery,
    showLocation: initialData.showLocation,
    showTabDescription: initialData.showTabDescription,
    showTabResources: initialData.showTabResources,
    showTabClassification: initialData.showTabClassification,
    showTabChronicle: initialData.showTabChronicle,
    showTabGallery: initialData.showTabGallery,
    showTabLocation: initialData.showTabLocation,
    chronicleArticleId: initialData.chronicleArticleId ?? "",
    albumId: initialData.albumId ?? "",
    tags: [...initialData.tags],
    lockedTags: [],
    organizers: initialData.organizers.map((item) => ({
      key: generateKey(),
      userId: String(item.userId),
      role: item.role ?? "",
      displayName: item.name ?? "",
    })),
    organizations: [],
    attachments: initialData.attachments.map((item) => {
      const fileName = extractFileNameFromUrl(item.fileUrl);
      return {
        key: generateKey(),
        title: item.title,
        description: item.description ?? "",
        fileUrl: item.fileUrl,
        fileName,
        uploading: false,
        error: null,
        visible: item.visible,
      };
    }),
    links: initialData.links.map((item) => ({
      key: generateKey(),
      label: item.label,
      url: item.url,
      visible: item.visible,
    })),
    highlights: initialData.highlights.map((item) => ({
      key: generateKey(),
      type: item.type,
      title: item.title,
      playerName: item.playerName,
      playerId: item.playerId != null ? String(item.playerId) : "",
      visible: item.visible,
    })),
    rankings: initialData.rankings.map((item) => ({
      key: generateKey(),
      position: String(item.position),
      playerName: item.playerName,
      playerId: item.playerId != null ? String(item.playerId) : "",
      score: item.score ?? "",
      visible: item.visible,
    })),
  };

  const systemTags = computeSystemTags(baseState.type, baseState.game);
  const { tags, lockedTags } = syncSystemTags(baseState.tags, systemTags);
  const mappedOrganizations = initialData.organizations.map((item) => ({
    key: generateKey(),
    id: item.organization.id,
    slug: item.organization.slug ?? "",
    name: item.organization.name ?? "",
    isClub: item.organization.isClub,
    role: item.role ?? "",
    locked: isBilboOrganizationMatch({
      slug: item.organization.slug,
      name: item.organization.name,
    }),
  }));
  const organizations = ensureBilboOrganization(mappedOrganizations);
  const stateWithDerived: EventFormState = {
    ...baseState,
    tags,
    lockedTags,
    organizations,
  };
  return normalizeLinkedVisibilityFlags(stateWithDerived);
}

function extractFileNameFromUrl(url: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url, url.startsWith("/") ? "https://dummy.local" : undefined);
    const last = parsed.pathname.split("/").filter(Boolean).pop();
    return last ?? "";
  } catch {
    const segments = url.split("/").filter(Boolean);
    return segments.pop() ?? "";
  }
}

function inferTitleFromFileName(fileName: string): string {
  if (!fileName) return "";
  const base = fileName.replace(/\.[^.]+$/, " ");
  return base.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

function parseInteger(value: string, allowZero = false) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const normalized = Math.trunc(parsed);
  if (allowZero ? normalized < 0 : normalized <= 0) {
    return null;
  }
  return normalized;
}

function parseFloatish(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function sanitizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed) || /^\/\//.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function useMemberSearch(query: string) {
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/members/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Fallo en la busqueda (${response.status})`);
        }
        const data = (await response.json()) as { results?: MemberSearchResult[] };
        if (!cancelled) {
          setResults(data.results ?? []);
        }
      } catch (err) {
        const aborted = err instanceof DOMException && err.name === "AbortError";
        if (!cancelled && !aborted) {
          setError("No se pudo buscar socios. Intenta de nuevo.");
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { results, loading, error };
}
export default function EventForm({ mode, initialData }: EventFormProps) {
  const router = useRouter();
  const initialChronicle: ChronicleSearchResult | null = initialData?.chronicleArticleId
    ? {
        id: initialData.chronicleArticleId,
        slug: initialData.chronicleArticleSlug ?? "",
        title: initialData.chronicleArticleTitle ?? "Crónica enlazada",
        category: initialData.chronicleArticleCategory ?? "chronicles",
        summary: initialData.chronicleArticleSummary ?? null,
        date: initialData.chronicleArticleDate ?? null,
      }
    : null;
  const [currentEventId, setCurrentEventId] = useState<string | null>(initialData?.id ?? null);
  const [state, setState] = useState<EventFormState>(() => buildInitialState(initialData));
  const [tagInput, setTagInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const skipRedirectRef = useRef(false);
  const [memberSelectionTarget, setMemberSelectionTarget] = useState<string | null>(null);
  const [memberNotice, setMemberNotice] = useState<string | null>(null);
  const { results: memberResults, loading: memberLoading, error: memberError } = useMemberSearch(searchTerm);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const bannerPreviewUrl = useRef<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState(state.bannerUrl ?? "");
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const attachmentFileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [albumQuery, setAlbumQuery] = useState("");
  const [albumResults, setAlbumResults] = useState<AlbumSearchResult[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumSearchResult | null>(null);
  const [albumBusy, setAlbumBusy] = useState(false);
  const [albumError, setAlbumError] = useState<string | null>(null);
  const [albumCreatorOpen, setAlbumCreatorOpen] = useState(false);
  const [albumCreateBusy, setAlbumCreateBusy] = useState(false);
  const [albumCreateError, setAlbumCreateError] = useState<string | null>(null);
  const [albumCreateSuccess, setAlbumCreateSuccess] = useState<string | null>(null);
  const [albumDraft, setAlbumDraft] = useState<AlbumDraftState>(() => buildAlbumDraftFromEvent(buildInitialState(initialData)));
  const [chronicleQuery, setChronicleQuery] = useState(initialChronicle?.title ?? "");
  const [chronicleResults, setChronicleResults] = useState<ChronicleSearchResult[]>([]);
  const [chronicleBusy, setChronicleBusy] = useState(false);
  const [chronicleActionBusy, setChronicleActionBusy] = useState(false);
  const [chronicleLoading, setChronicleLoading] = useState(false);
  const [chronicleError, setChronicleError] = useState<string | null>(null);
  const [selectedChronicle, setSelectedChronicle] = useState<ChronicleSearchResult | null>(initialChronicle);
  const [activeTab, setActiveTab] = useState<'description' | 'resources' | 'stories' | 'gallery' | 'location'>('description');

  useEffect(() => {
    if (initialData) {
      const nextState = buildInitialState(initialData);
      setState(nextState);
      setAlbumDraft(buildAlbumDraftFromEvent(nextState));
    }
  }, [initialData]);

  const { title, startsAt, location, type, game } = state;
  const chronicleQueryTrimmed = chronicleQuery.trim();

  useEffect(() => {
    if (albumCreatorOpen) {
      return;
    }
    setAlbumDraft((prev) => {
      const next = buildAlbumDraftFromEvent({ title, startsAt, location, type, game });
      return {
        ...prev,
        title: next.title,
        year: next.year,
        date: next.date,
        location: next.location,
        game: next.game,
        format: next.format,
      };
    });
  }, [albumCreatorOpen, title, startsAt, location, type, game]);

  useEffect(() => {
    return () => {
      if (bannerPreviewUrl.current) {
        URL.revokeObjectURL(bannerPreviewUrl.current);
        bannerPreviewUrl.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!bannerFile) {
      setBannerPreview(state.bannerUrl);
    }
  }, [state.bannerUrl, bannerFile]);

  useEffect(() => {
    const chronicleId = state.chronicleArticleId.trim();
    if (!chronicleId) {
      setSelectedChronicle(null);
      return;
    }
    if (selectedChronicle && selectedChronicle.id === chronicleId) {
      return;
    }

    let cancelled = false;
    setChronicleLoading(true);
    setChronicleError(null);

    const params = new URLSearchParams({ id: chronicleId });
    if (currentEventId) {
      params.set("eventId", currentEventId);
    }

    fetch(`/api/novedades/chronicles/search?${params.toString()}`)
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "No se pudo cargar la cronica enlazada.");
        }
        const data = (await response.json()) as { results: ChronicleSearchResult[] };
        if (!cancelled) {
          const chronicle = data.results[0] ?? null;
          setSelectedChronicle(chronicle);
          if (chronicle) {
            setChronicleQuery(chronicle.title);
          }
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setChronicleError(error instanceof Error ? error.message : "No se pudo cargar la cronica enlazada.");
          setSelectedChronicle(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setChronicleLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [state.chronicleArticleId, currentEventId]);

  useEffect(() => {
    if (chronicleActionBusy) {
      return;
    }
    const trimmed = chronicleQuery.trim();
    if (!trimmed) {
      setChronicleResults([]);
      setChronicleError(null);
      setChronicleBusy(false);
      return;
    }

    if (trimmed.length < 2) {
      setChronicleResults([]);
      setChronicleBusy(false);
      return;
    }

    if (selectedChronicle && selectedChronicle.title.trim().toLowerCase() === trimmed.toLowerCase()) {
      setChronicleResults([]);
      setChronicleBusy(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setChronicleBusy(true);
      setChronicleError(null);
      try {
        const params = new URLSearchParams({ q: trimmed });
        if (currentEventId) {
          params.set("eventId", currentEventId);
        }
        const response = await fetch(`/api/novedades/chronicles/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "No se pudo buscar cronicas.");
        }
        const data = (await response.json()) as { results: ChronicleSearchResult[] };
        setChronicleResults(data.results);
      } catch (error) {
        if (controller.signal.aborted) return;
        setChronicleError(error instanceof Error ? error.message : "No se pudo buscar cronicas.");
        setChronicleResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setChronicleBusy(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [chronicleQuery, selectedChronicle, chronicleActionBusy, currentEventId]);

  useEffect(() => {
    const trimmed = albumQuery.trim();
    if (!trimmed) {
      setAlbumBusy(false);
      setAlbumResults([]);
      setAlbumError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setAlbumBusy(true);
        setAlbumError(null);
        const response = await fetch(`/api/gallery/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => null)) as
          | { results?: AlbumSearchResult[]; error?: string }
          | null;
        if (!response.ok) {
          throw new Error(data?.error ?? "No se pudo buscar albumes.");
        }
        setAlbumResults(data?.results ?? []);
      } catch (error) {
        const aborted = error instanceof DOMException && error.name === "AbortError";
        if (!aborted) {
          setAlbumError(error instanceof Error ? error.message : "Error buscando albumes.");
          setAlbumResults([]);
        }
      } finally {
        setAlbumBusy(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [albumQuery]);

  useEffect(() => {
    if (!state.albumId) {
      if (!selectedAlbum) {
        return;
      }
      setSelectedAlbum(null);
      return;
    }
    if (selectedAlbum?.id === state.albumId) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setAlbumBusy(true);
    setAlbumError(null);
    (async () => {
      try {
        const response = await fetch(`/api/gallery/search?id=${encodeURIComponent(state.albumId)}`, {
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => null)) as
          | { results?: AlbumSearchResult[]; error?: string }
          | null;
        if (!response.ok) {
          throw new Error(data?.error ?? "No se pudo obtener el album seleccionado.");
        }
        const album = data?.results?.[0] ?? null;
        if (!cancelled) {
          setSelectedAlbum(album);
          if (album) {
            setAlbumQuery(album.title);
          }
        }
      } catch (error) {
        const aborted = error instanceof DOMException && error.name === "AbortError";
        if (!cancelled && !aborted) {
          setAlbumError(error instanceof Error ? error.message : "Error cargando el album.");
          setSelectedAlbum(null);
        }
      } finally {
        if (!cancelled) {
          setAlbumBusy(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [state.albumId, selectedAlbum]);

  const hasValidOrganizer = useMemo(
    () =>
      state.organizers.some((item) => {
        const parsed = Number(item.userId);
        return Number.isInteger(parsed) && parsed > 0;
      }),
    [state.organizers]
  );

  useEffect(() => {
    setState((prev) => {
      if (prev.isInternal === hasValidOrganizer) {
        return prev;
      }
      return { ...prev, isInternal: hasValidOrganizer };
    });
  }, [hasValidOrganizer]);

  useEffect(() => {
    if (!state.albumId) return;
    setValidationErrors((prev) => {
      if (!prev.albumQuery) return prev;
      const { albumQuery: _ignored, ...rest } = prev;
      return rest;
    });
  }, [state.albumId]);

  const duplicateTag = useMemo(() => {
    const normalized = tagInput.trim().toLowerCase();
    if (!normalized) return false;
    return state.tags.some((tag) => tag.toLowerCase() === normalized);
  }, [state.tags, tagInput]);

  const canSubmit = useMemo(() => {
    if (!state.title.trim()) return false;
    if (!state.startsAt || !state.endsAt) return false;
    if (submitBusy || deleteBusy || bannerUploading) return false;
    if (state.attachments.some((item) => item.uploading)) return false;
    return true;
  }, [state.title, state.startsAt, state.endsAt, submitBusy, deleteBusy, bannerUploading, state.attachments]);

  function updateField<K extends keyof EventFormState>(field: K, value: EventFormState[K]) {
    setState((prev) => {
      const next: EventFormState = { ...prev, [field]: value };
      if (field === "type" || field === "game") {
        const nextType = field === "type" ? (value as EventType) : next.type;
        const nextGame = field === "game" ? (value as Juego | "") : next.game;
        const systemTags = computeSystemTags(nextType, nextGame);
        const { tags, lockedTags } = syncSystemTags(prev.tags, systemTags);
        next.tags = tags;
        next.lockedTags = lockedTags;
      }
      return next;
    });
  }

  const syncTabVisibility = useCallback(
    (tabField: BooleanField, visible: boolean, linkedFields: BooleanField[] = []) => {
      setState((prev) => {
        const patch: Partial<EventFormState> = { [tabField]: visible } as Partial<EventFormState>;
        linkedFields.forEach((field) => {
          patch[field] = visible;
        });
        return { ...prev, ...patch };
      });
    },
    []
  );

  const togglePriceFlag = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, hasPrice: enabled }));
  }, []);

  const toggleCapacityFlag = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, hasCapacity: enabled }));
  }, []);

  function updateOrganizer(key: string, patch: Partial<OrganizerState>) {
    setState((prev) => ({
      ...prev,
      organizers: prev.organizers.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    }));
  }

  function updateOrganization(key: string, patch: Partial<OrganizationState>) {
    setState((prev) => ({
      ...prev,
      organizations: prev.organizations.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    }));
  }

  function updateAttachment(key: string, patch: Partial<AttachmentState>) {
    setState((prev) => ({
      ...prev,
      attachments: prev.attachments.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    }));
  }

  function updateLink(key: string, patch: Partial<LinkState>) {
    setState((prev) => ({
      ...prev,
      links: prev.links.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    }));
  }

  function updateHighlight(key: string, patch: Partial<HighlightState>) {
    setState((prev) => ({
      ...prev,
      highlights: prev.highlights.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    }));
  }

  function updateRanking(key: string, patch: Partial<RankingState>) {
    setState((prev) => ({
      ...prev,
      rankings: prev.rankings.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    }));
  }

  function updateAlbumDraft<K extends keyof AlbumDraftState>(field: K, value: AlbumDraftState[K]) {
    setAlbumDraft((prev) => ({ ...prev, [field]: value }));
  }

  function handleAlbumCreatorToggle() {
    setAlbumCreateError(null);
    setAlbumCreateSuccess(null);
    setAlbumCreateBusy(false);
    setAlbumCreatorOpen((open) => {
      if (!open) {
        setAlbumDraft(buildAlbumDraftFromEvent(state));
      }
      return !open;
    });
  }

  async function handleAlbumCreateSubmit(
    event?: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>
  ) {
    event?.preventDefault();
    setAlbumCreateError(null);
    setAlbumCreateSuccess(null);
    const title = albumDraft.title.trim();
    if (!title) {
      setAlbumCreateError('El titulo es obligatorio.');
      return;
    }
    setAlbumCreateBusy(true);
    try {
      const payloadGame = mapGameToAlbumFacet(albumDraft.game && albumDraft.game.trim() ? albumDraft.game.trim() : 'OTROS');
      const response = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: albumDraft.description.trim() || null,
          location: albumDraft.location.trim() || null,
          date: albumDraft.date.trim() || null,
          year: albumDraft.year.trim() || null,
          format: albumDraft.format,
          game: payloadGame,
        }),
      });
      const data = (await response.json().catch(() => null)) as { album?: AlbumSearchResult; error?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? 'No se pudo crear el album.');
      }
      if (!data?.album) {
        throw new Error('Respuesta inesperada al crear el album.');
      }
      setSelectedAlbum(data.album);
      setAlbumQuery(data.album.title);
      setAlbumResults([]);
      updateField('albumId', data.album.id);
      setAlbumCreatorOpen(false);
      setAlbumCreateSuccess('Album creado y vinculado correctamente.');
    } catch (error) {
      setAlbumCreateError(error instanceof Error ? error.message : 'No se pudo crear el album.');
    } finally {
      setAlbumCreateBusy(false);
    }
  }

  function removeItem<T extends { key: string }>(list: T[], key: string) {
    return list.filter((item) => item.key !== key);
  }

  async function handleBannerInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const previousBanner = state.bannerUrl ?? "";

    setBannerError(null);

    if (bannerPreviewUrl.current) {
      URL.revokeObjectURL(bannerPreviewUrl.current);
      bannerPreviewUrl.current = null;
    }

    const objectUrl = URL.createObjectURL(file);
    bannerPreviewUrl.current = objectUrl;
    setBannerPreview(objectUrl);
    setBannerFile(file);
    setBannerUploading(true);

    try {
      const uploadedUrl = await uploadBannerFile(file, { eventId: currentEventId });
      updateField("bannerUrl", uploadedUrl);
      setBannerError(null);
      if (bannerPreviewUrl.current) {
        URL.revokeObjectURL(bannerPreviewUrl.current);
        bannerPreviewUrl.current = null;
      }
      setBannerPreview(uploadedUrl);
    } catch (error) {
      if (bannerPreviewUrl.current) {
        URL.revokeObjectURL(bannerPreviewUrl.current);
        bannerPreviewUrl.current = null;
      }
      setBannerPreview(previousBanner);
      setBannerError(error instanceof Error ? error.message : "No se pudo subir el banner.");
    } finally {
      setBannerUploading(false);
      setBannerFile(null);
      event.target.value = "";
    }
  }

  function handleBannerRemove() {
    if (bannerUploading) return;
    if (bannerPreviewUrl.current) {
      URL.revokeObjectURL(bannerPreviewUrl.current);
      bannerPreviewUrl.current = null;
    }
    setBannerFile(null);
    setBannerPreview("");
    setBannerError(null);
    updateField("bannerUrl", "");
  }

  function handleAlbumQueryChange(value: string) {
    setAlbumQuery(value);
    setAlbumError(null);
    setAlbumCreateError(null);
    setAlbumCreateSuccess(null);
    const trimmed = value.trim();
    if (!trimmed) {
      setAlbumBusy(false);
      setAlbumResults([]);
      if (selectedAlbum && state.albumId !== selectedAlbum.id) {
        updateField("albumId", selectedAlbum.id);
      }
      setValidationErrors((prev) => {
        if (!prev.albumQuery) return prev;
        const { albumQuery: _ignored, ...rest } = prev;
        return rest;
      });
      return;
    }
  }

  function handleAlbumSelect(album: AlbumSearchResult) {
    setSelectedAlbum(album);
    setAlbumQuery(album.title);
    setAlbumError(null);
    setAlbumResults([]);
    updateField("albumId", album.id);
    setAlbumCreatorOpen(false);
    setAlbumCreateError(null);
    setAlbumCreateSuccess(null);
    setValidationErrors((prev) => {
      if (!prev.albumQuery) return prev;
      const { albumQuery: _ignored, ...rest } = prev;
      return rest;
    });
  }

  function handleAlbumClear() {
    setSelectedAlbum(null);
    setAlbumQuery("");
    setAlbumResults([]);
    updateField("albumId", "");
    setAlbumError(null);
    setAlbumCreateError(null);
    setAlbumCreateSuccess(null);
    setValidationErrors((prev) => {
      if (!prev.albumQuery) return prev;
      const { albumQuery: _ignored, ...rest } = prev;
      return rest;
    });
  }

  const handleChronicleSelect = useCallback(
    (chronicle: ChronicleSearchResult) => {
      setSelectedChronicle(chronicle);
      setChronicleQuery(chronicle.title);
      setChronicleResults([]);
      setChronicleError(null);
      updateField("chronicleArticleId", chronicle.id);
    },
    [updateField],
  );

  const handleChronicleClear = useCallback(() => {
    setSelectedChronicle(null);
    setChronicleQuery("");
    setChronicleResults([]);
    setChronicleError(null);
    updateField("chronicleArticleId", "");
  }, [updateField]);

  const handleChronicleCreate = useCallback(async () => {
    setChronicleError(null);
    setChronicleActionBusy(true);
    try {
      const eventId = await persistEventSilently();
      if (!eventId) {
        setChronicleError("No se pudieron guardar los cambios del evento. Revisa los campos marcados e intentalo de nuevo.");
        return;
      }
      const returnUrl = `/eventos/${eventId}/editar`;
      router.push(
        `/novedades/nueva?category=chronicles&linkEvent=${encodeURIComponent(
          eventId,
        )}&returnTo=${encodeURIComponent(returnUrl)}`,
      );
    } catch (error) {
      setChronicleError(
        error instanceof Error ? error.message : "No se pudo preparar la creacion de la cronica.",
      );
    } finally {
      setChronicleActionBusy(false);
    }
  }, [persistEventSilently, router]);

  const handleChronicleEdit = useCallback(async () => {
    if (!selectedChronicle || !selectedChronicle.slug) {
      return;
    }
    setChronicleError(null);
    setChronicleActionBusy(true);
    try {
      const eventId = await persistEventSilently();
      if (!eventId) {
        setChronicleError("No se pudieron guardar los cambios del evento. Revisa los campos marcados e intentalo de nuevo.");
        return;
      }
      const returnUrl = `/eventos/${eventId}/editar`;
      router.push(
        `/novedades/${selectedChronicle.category}/${selectedChronicle.slug}/editar?linkEvent=${encodeURIComponent(
          eventId,
        )}&returnTo=${encodeURIComponent(returnUrl)}`,
      );
    } catch (error) {
      setChronicleError(
        error instanceof Error ? error.message : "No se pudo preparar la edicion de la cronica.",
      );
    } finally {
      setChronicleActionBusy(false);
    }
  }, [persistEventSilently, router, selectedChronicle]);

  function handleAddTag() {
    const trimmed = tagInput.trim();
    if (!trimmed || duplicateTag) return;
    setState((prev) => ({ ...prev, tags: [...prev.tags, trimmed] }));
    setTagInput("");
  }

  function handleTagRemove(tag: string) {
    setState((prev) => {
      if (prev.lockedTags.includes(tag)) {
        return prev;
      }
      return {
        ...prev,
        tags: prev.tags.filter((item) => item !== tag),
      };
    });
  }

  function handleMemberResultSelect(member: MemberSearchResult) {
    const targetKey = memberSelectionTarget;
    let duplicate = false;
    let missingTarget = false;

    setState((prev) => {
      if (targetKey) {
        const targetExists = prev.organizers.some((item) => item.key === targetKey);
        if (!targetExists) {
          missingTarget = true;
          return prev;
        }
        if (
          prev.organizers.some(
            (item) => item.key !== targetKey && Number(item.userId) === Number(member.id)
          )
        ) {
          duplicate = true;
          return prev;
        }
        const nextOrganizers = prev.organizers.map((item) =>
          item.key === targetKey
            ? { ...item, userId: member.id, displayName: member.name }
            : item
        );
        return { ...prev, organizers: nextOrganizers };
      }

      if (prev.organizers.some((item) => Number(item.userId) === Number(member.id))) {
        duplicate = true;
        return prev;
      }

      return {
        ...prev,
        organizers: [
          ...prev.organizers,
          { key: generateKey(), userId: member.id, role: "", displayName: member.name },
        ],
      };
    });

    setSearchTerm("");
    if (duplicate) {
      setMemberNotice("Este socio ya está asignado.");
      return;
    }
    if (targetKey && !missingTarget) {
      setMemberSelectionTarget(null);
    }
    setMemberNotice(null);
  }

  async function handleAttachmentFileChange(key: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];

    setState((prev) => ({
      ...prev,
      attachments: prev.attachments.map((item) =>
        item.key === key ? { ...item, uploading: true, error: null } : item
      ),
    }));

    try {
      const uploadedUrl = await uploadAttachmentFile(file, { eventId: currentEventId });
      setState((prev) => ({
        ...prev,
        attachments: prev.attachments.map((item) => {
          if (item.key !== key) return item;
          const existingTitle = item.title.trim();
          const inferredTitle = inferTitleFromFileName(file.name);
          return {
            ...item,
            fileUrl: uploadedUrl,
            fileName: file.name,
            title: existingTitle.length ? item.title : inferredTitle || item.title,
            uploading: false,
            error: null,
          };
        }),
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo subir el adjunto.";
      setState((prev) => ({
        ...prev,
        attachments: prev.attachments.map((item) =>
          item.key === key ? { ...item, uploading: false, error: message } : item
        ),
      }));
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const skipRedirect = skipRedirectRef.current;
    skipRedirectRef.current = false;
    if (!canSubmit) return null;

    const errors: Record<string, string> = {};

    if (!state.title.trim()) {
      errors.title = "El titulo es obligatorio.";
    }
    if (!state.startsAt) {
      errors.startsAt = "La fecha de inicio es obligatoria.";
    }
    if (!state.endsAt) {
      errors.endsAt = "La fecha de fin es obligatoria.";
    }

    let startsAtISO: string | null = null;
    let endsAtISO: string | null = null;
    if (state.startsAt) {
      const startDate = new Date(state.startsAt);
      if (Number.isNaN(startDate.getTime())) {
        errors.startsAt = "Fecha de inicio invalida.";
      } else {
        startsAtISO = startDate.toISOString();
      }
    }

    if (state.endsAt) {
      const endDate = new Date(state.endsAt);
      if (Number.isNaN(endDate.getTime())) {
        errors.endsAt = "Fecha de fin invalida.";
      } else {
        endsAtISO = endDate.toISOString();
      }
    }

    if (startsAtISO && endsAtISO) {
      if (new Date(endsAtISO).getTime() <= new Date(startsAtISO).getTime()) {
        errors.endsAt = "La fecha de fin debe ser posterior a la de inicio.";
      }
    }

    if (state.hasPrice) {
      if (!state.priceGeneral.trim()) {
        errors.priceGeneral = "El precio general es obligatorio.";
      }
    } else if (state.priceSocios.trim()) {
      errors.priceGeneral = "Activa el coste para definir precio para socios.";
    }

    let capacityMax: number | null = null;
    let capacityCurrent: number | null = null;
    if (state.hasCapacity) {
      if (!state.capacityMax.trim()) {
        errors.capacityMax = "El aforo maximo es obligatorio.";
      } else {
        capacityMax = parseInteger(state.capacityMax);
        if (capacityMax == null) {
          errors.capacityMax = NUMBER_FIELDS_HELPER.capacityMax;
        }
      }

      if (state.capacityCurrent.trim()) {
        capacityCurrent = parseInteger(state.capacityCurrent, true);
        if (capacityCurrent == null) {
          errors.capacityCurrent = NUMBER_FIELDS_HELPER.capacityCurrent;
        }
      } else {
        capacityCurrent = 0;
      }

      if (
        capacityMax != null &&
        capacityCurrent != null &&
        capacityCurrent > capacityMax
      ) {
        errors.capacityCurrent = "El aforo actual no puede superar el aforo maximo.";
      }
    } else {
      capacityCurrent = 0;
    }

    let latitude: number | null = null;
    const rawLatitude = state.latitude.trim();
    if (rawLatitude) {
      const parsedLatitude = Number(rawLatitude.replace(",", "."));
      if (Number.isFinite(parsedLatitude) && parsedLatitude >= -90 && parsedLatitude <= 90) {
        latitude = parsedLatitude;
      } else {
        errors.latitude = NUMBER_FIELDS_HELPER.latitude;
      }
    }

    let longitude: number | null = null;
    const rawLongitude = state.longitude.trim();
    if (rawLongitude) {
      const parsedLongitude = Number(rawLongitude.replace(",", "."));
      if (
        Number.isFinite(parsedLongitude) &&
        parsedLongitude >= -180 &&
        parsedLongitude <= 180
      ) {
        longitude = parsedLongitude;
      } else {
        errors.longitude = NUMBER_FIELDS_HELPER.longitude;
      }
    }

    if (state.organizers.some((item) => !item.userId.trim())) {
      errors.organizers = "Todos los organizadores deben tener un socio asignado.";
    }

    const preparedOrganizers = state.organizers
      .map((item) => {
        const userId = Number(item.userId);
        if (!Number.isInteger(userId) || userId <= 0) {
          return null;
        }
        const role = item.role.trim();
        return {
          userId,
          role: role.length ? role : null,
        };
      })
      .filter((item): item is { userId: number; role: string | null } => Boolean(item));

    if (state.organizers.length && preparedOrganizers.length !== state.organizers.length) {
      errors.organizers = "Verifica que todos los organizadores tengan un socio valido.";
    }

    if (albumQuery.trim() && !state.albumId) {
      errors.albumQuery = "Selecciona un album de la lista.";
    }

    const preparedOrganizations = state.organizations
      .map((item) => {
        const cleanedRole = item.role.trim();
        const role = cleanedRole.length ? cleanedRole : null;
        const cleanedId = item.id.trim();
        const cleanedSlug = item.slug.trim();
        const cleanedName = item.name.trim();
        if (!cleanedId && !cleanedSlug && !cleanedName) {
          return null;
        }
        const computedSlug =
          cleanedSlug.length ||
          cleanedId.length
            ? cleanedSlug
            : cleanedName.length
            ? slugify(cleanedName, "org")
            : "";
        return {
          id: cleanedId.length ? cleanedId : undefined,
          slug: computedSlug.length ? computedSlug : undefined,
          name: cleanedName.length ? cleanedName : undefined,
          isClub: item.isClub,
          role,
        };
      })
      .filter(
        (item): item is {
          id: string | undefined;
          slug: string | undefined;
          name: string | undefined;
          isClub: boolean;
          role: string | null;
        } => item !== null
      );

    if (state.organizations.length && preparedOrganizations.length !== state.organizations.length) {
      errors.organizations = "Completa los datos de cada organizacion o elimina las vacias.";
    }

    if (state.attachments.some((item) => item.uploading)) {
      errors.attachments = "Espera a que terminen de subir los adjuntos.";
    }

    let attachmentIssues = false;
    const preparedAttachments = state.attachments
      .map((item) => {
        const title = item.title.trim();
        const fileUrl = item.fileUrl.trim();
        const description = item.description.trim();
        if (item.error) {
          attachmentIssues = true;
          return null;
        }
        if (!fileUrl) {
          attachmentIssues = true;
          return null;
        }
        if (!title) {
          attachmentIssues = true;
          return null;
        }
        return {
          title,
          fileUrl: sanitizeUrl(fileUrl),
          description: description.length ? description : null,
          visible: item.visible,
        };
      })
      .filter((item): item is {
        title: string;
        fileUrl: string;
        description: string | null;
        visible: boolean;
      } => Boolean(item));

    if (!errors.attachments && state.attachments.length && attachmentIssues) {
      errors.attachments = "Completa los adjuntos o elimínalos antes de guardar.";
    }

    const preparedLinks = state.links
      .map((item) => {
        const label = item.label.trim();
        const url = item.url.trim();
        if (!label || !url) {
          return null;
        }
        return {
          label,
          url: sanitizeUrl(url),
          visible: item.visible,
        };
      })
      .filter((item): item is { label: string; url: string; visible: boolean } => Boolean(item));

    const preparedHighlights = state.highlights
      .map((item) => {
        if (!item.type || !item.title.trim() || !item.playerName.trim()) {
          return null;
        }
        const title = item.title.trim();
        const playerName = item.playerName.trim();
        const playerId = item.playerId.trim();
        let parsedId: number | null = null;
        if (playerId.length) {
          const id = Number(playerId);
          if (!Number.isInteger(id) || id <= 0) {
            return null;
          }
          parsedId = id;
        }
        return {
          type: item.type,
          title,
          playerName,
          playerId: parsedId,
          visible: item.visible,
        };
      })
      .filter(
        (item): item is {
          type: EventHighlightType;
          title: string;
          playerName: string;
          playerId: number | null;
          visible: boolean;
        } => Boolean(item)
      );

    const preparedRankings = state.rankings
      .map((item) => {
        const position = parseInteger(item.position);
        if (!position) {
          return null;
        }
        const playerName = item.playerName.trim();
        if (!playerName) {
          return null;
        }
        const playerId = item.playerId.trim();
        let parsedId: number | null = null;
        if (playerId.length) {
          const asNumber = Number(playerId);
          if (!Number.isInteger(asNumber) || asNumber <= 0) {
            return null;
          }
          parsedId = asNumber;
        }
        const score = item.score.trim();
        return {
          position,
          playerName,
          playerId: parsedId,
          score: score.length ? score : null,
          visible: item.visible,
        };
      })
      .filter(
        (item): item is {
          position: number;
          playerName: string;
          playerId: number | null;
          score: string | null;
          visible: boolean;
        } => Boolean(item)
      )
      .sort((a, b) => a.position - b.position);

    if (Object.keys(errors).length) {
      setValidationErrors(errors);
      setSubmitError("Corrige los errores marcados antes de continuar.");
      return;
    }

    setValidationErrors({});
    setSubmitError(null);
    setSubmitBusy(true);

    let persistedEventId: string | null = null;

    const computedIsInternal = preparedOrganizers.length > 0;

    const showDescription = state.showTabDescription;
    const showStandings = state.showTabClassification;
    const showRecap = state.showTabChronicle;
    const showGallery = state.showTabGallery;
    const showLocation = state.showTabLocation;

    const normalizedPriceGeneral =
      state.hasPrice && state.priceGeneral.trim() ? state.priceGeneral.trim() : null;
    const normalizedPriceSocios =
      state.hasPrice && state.priceSocios.trim() ? state.priceSocios.trim() : null;
    const normalizedCapacityMax = state.hasCapacity ? capacityMax : null;
    const normalizedCapacityCurrent = state.hasCapacity ? capacityCurrent ?? 0 : 0;

    const payload = {
      title: state.title.trim(),
      bannerUrl: state.bannerUrl.trim() || null,
      startsAt: startsAtISO,
      endsAt: endsAtISO,
      location: state.location.trim() || null,
      latitude,
      longitude,
      mapsUrl: state.mapsUrl.trim() || null,
      details: state.details.trim() || null,
      recap: state.recap.trim() || null,
      status: state.status,
      type: state.type,
      game: state.game || null,
      priceGeneral: normalizedPriceGeneral,
      priceSocios: normalizedPriceSocios,
      capacityMax: normalizedCapacityMax,
      capacityCurrent: normalizedCapacityCurrent,
      isInternal: computedIsInternal,
      isMembersOnly: state.isMembersOnly,
      showDescription,
      showAttachments: state.showAttachments,
      showLinks: state.showLinks,
      showStandings,
      showRecap,
      showGallery,
      showLocation,
      showTabDescription: state.showTabDescription,
      showTabResources: state.showTabResources,
      showTabClassification: state.showTabClassification,
      showTabChronicle: state.showTabChronicle,
      showTabGallery: state.showTabGallery,
      showTabLocation: state.showTabLocation,
      chronicleArticleId: state.chronicleArticleId.trim()
        ? state.chronicleArticleId.trim()
        : null,
      albumId: state.albumId.trim() || null,
      tags: state.tags.map((tag) => tag.trim()).filter(Boolean),
      organizers: preparedOrganizers,
      organizations: preparedOrganizations,
      attachments: preparedAttachments,
      links: preparedLinks,
      highlights: preparedHighlights,
      rankings: preparedRankings,
    };

    try {
      const target =
        mode === "edit" && initialData
          ? `/api/events/${encodeURIComponent(initialData.id)}`
          : "/api/events";
      const method = mode === "edit" ? "PUT" : "POST";
      const response = await fetch(target, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo guardar el evento.");
      }

      const data = (await response.json()) as { event?: { id: string } };
      const eventId = data.event?.id ?? initialData?.id ?? "";
      if (eventId) {
        if (!currentEventId) {
          setCurrentEventId(eventId);
        }
        persistedEventId = eventId;
      }
      if (eventId && !skipRedirect) {
        router.push(`/eventos/${eventId}`);
        router.refresh();
      } else if (!skipRedirect && mode === "create") {
        router.push("/eventos");
      }
    } catch (error) {
      if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError("No se pudo guardar el evento.");
      }
    } finally {
      setSubmitBusy(false);
    }
    return persistedEventId;
  }

  async function persistEventSilently(overrides?: Partial<EventFormState>) {
    if (overrides) {
      await new Promise<void>((resolve) => {
        setState((prev) => {
          resolve();
          return { ...prev, ...overrides };
        });
      });
    }
    skipRedirectRef.current = true;
    const fakeEvent = {
      preventDefault() {},
      stopPropagation() {},
    } as unknown as React.FormEvent<HTMLFormElement>;
    const result = await handleSubmit(fakeEvent);
    return result;
  }

  async function handleDelete() {
    if (mode !== "edit" || !initialData) return;
    const confirmation = window.confirm(
      "Seguro que deseas eliminar este evento? Esta accion no se puede deshacer."
    );
    if (!confirmation) return;
    try {
      setDeleteBusy(true);
      const response = await fetch(`/api/events/${encodeURIComponent(initialData.id)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo eliminar el evento.");
      }
      router.push("/eventos");
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError("No se pudo eliminar el evento.");
      }
    } finally {
      setDeleteBusy(false);
    }
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {submitError && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {submitError}
        </div>
      )}

      <section className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-5">
        <header>
          <h2 className="text-lg font-semibold">Informacion general</h2>
          <p className="text-sm text-[var(--muted)]">
            Titula el evento, sube el banner y define sus datos principales.
          </p>
        </header>
        <div className="space-y-3">
          <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Banner principal</span>
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <div className="flex-1">
              <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/15 bg-black/30">
                {bannerPreview ? (
                  <img
                    src={bannerPreview}
                    alt="Previsualizacion del banner del evento"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-sm text-[var(--muted)]">
                    Sube una imagen en formato PNG, JPG, WEBP, GIF o SVG (max 6MB) para destacar el evento.
                  </div>
                )}
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 md:w-64">
              <label className="flex cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/30 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={handleBannerInputChange}
                  disabled={bannerUploading}
                />
                {bannerUploading ? "Subiendo..." : "Seleccionar archivo"}
              </label>
              {state.bannerUrl && (
                <button
                  type="button"
                  className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleBannerRemove}
                  disabled={bannerUploading}
                >
                  Quitar banner
                </button>
              )}
              {bannerError && <span className="text-xs text-red-300">{bannerError}</span>}
              {state.bannerUrl && !bannerError && (
                <span className="break-all text-xs text-[var(--muted)]">{state.bannerUrl}</span>
              )}
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Titulo</span>
            <input
              className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
              value={state.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Ej. Torneo Kill Team Octubre"
            />
            {validationErrors.title && (
              <span className="text-xs text-red-300">{validationErrors.title}</span>
            )}
          </label>
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Estado</span>
            <select
              className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
              value={state.status}
              onChange={(event) => updateField("status", event.target.value as EventStatus)}
            >
              {EVENT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
              Tipo de evento
            </span>
            <select
              className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
              value={state.type}
              onChange={(event) => updateField("type", event.target.value as EventType)}
            >
              {EVENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Juego</span>
            <select
              className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
              value={state.game ?? ""}
              onChange={(event) => updateField("game", event.target.value as Juego | "")}
            >
              <option value="">Sin especificar</option>
              {GAME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Inicio</span>
            <input
              type="datetime-local"
              className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
              value={state.startsAt}
              onChange={(event) => updateField("startsAt", event.target.value)}
            />
            {validationErrors.startsAt && (
              <span className="text-xs text-red-300">{validationErrors.startsAt}</span>
            )}
          </label>
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Fin</span>
            <input
              type="datetime-local"
              className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
              value={state.endsAt}
              onChange={(event) => updateField("endsAt", event.target.value)}
            />
            {validationErrors.endsAt && (
              <span className="text-xs text-red-300">{validationErrors.endsAt}</span>
            )}
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <header>
          <h2 className="text-lg font-semibold">Costes y aforo</h2>
          <p className="text-sm text-[var(--muted)]">
            Define precios y limites para gestionar inscripciones.
          </p>
        </header>
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/30 bg-black/30"
              checked={state.hasPrice}
              onChange={(event) => togglePriceFlag(event.target.checked)}
            />
            Registrar costes
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                Precio general (EUR)
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={state.priceGeneral}
                onChange={(event) => updateField("priceGeneral", event.target.value)}
                disabled={!state.hasPrice}
                className={`rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none ${
                  !state.hasPrice ? "opacity-50" : ""
                }`}
              />
              {validationErrors.priceGeneral && (
                <span className="text-xs text-red-300">{validationErrors.priceGeneral}</span>
              )}
            </label>
            <label className="grid gap-1">
              <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                Precio socios (EUR)
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={state.priceSocios}
                onChange={(event) => updateField("priceSocios", event.target.value)}
                disabled={!state.hasPrice}
                className={`rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none ${
                  !state.hasPrice ? "opacity-50" : ""
                }`}
              />
            </label>
          </div>
        </div>
        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/30 bg-black/30"
              checked={state.hasCapacity}
              onChange={(event) => toggleCapacityFlag(event.target.checked)}
            />
            Registrar aforo
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Aforo maximo</span>
              <input
                type="number"
                min="1"
                step="1"
                value={state.capacityMax}
                onChange={(event) => updateField("capacityMax", event.target.value)}
                disabled={!state.hasCapacity}
                className={`rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none ${
                  !state.hasCapacity ? "opacity-50" : ""
                }`}
              />
              {validationErrors.capacityMax && (
                <span className="text-xs text-red-300">{validationErrors.capacityMax}</span>
              )}
            </label>
            <label className="grid gap-1">
              <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Reservas actuales</span>
              <input
                type="number"
                min="0"
                step="1"
                value={state.capacityCurrent}
                onChange={(event) => updateField("capacityCurrent", event.target.value)}
                disabled={!state.hasCapacity}
                className={`rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none ${
                  !state.hasCapacity ? "opacity-50" : ""
                }`}
              />
              {validationErrors.capacityCurrent && (
                <span className="text-xs text-red-300">{validationErrors.capacityCurrent}</span>
              )}
            </label>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/30 bg-black/30"
              checked={state.isMembersOnly}
              onChange={(event) => updateField("isMembersOnly", event.target.checked)}
            />
            <span className="text-sm text-[var(--muted)]">Inscripcion solo para socios</span>
          </label>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Si asignas socios como organizadores, el evento se marcara automaticamente como interno.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <header>
          <h2 className="text-lg font-semibold">Etiquetas</h2>
          <p className="text-sm text-[var(--muted)]">
            Anade etiquetas para ayudar en la busqueda y filtrado.
          </p>
        </header>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <input
              className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              placeholder="Nueva etiqueta"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddTag();
                }
              }}
            />
            <button
              type="button"
              className="rounded-2xl border border-white/20 px-3 py-2 text-sm text-white hover:border-white/40"
              onClick={handleAddTag}
              disabled={!tagInput.trim() || duplicateTag}
            >
              Anadir
            </button>
          </div>
          {duplicateTag && (
            <span className="text-xs text-yellow-200">Esta etiqueta ya esta en la lista.</span>
          )}
        </div>
        {state.tags.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {state.tags.map((tag) => {
              const locked = state.lockedTags.includes(tag);
              return (
                <li key={tag}>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.3em] hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-white/20"
                    onClick={() => handleTagRemove(tag)}
                    disabled={locked}
                    aria-disabled={locked}
                  >
                    {tag}
                    <span className="text-white/60">{locked ? "Fijo" : "x"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-[var(--muted)]">Aun no se han anadido etiquetas.</p>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <header className="space-y-2">
          <h2 className="text-lg font-semibold">Organizadores y organizaciones</h2>
          <p className="text-sm text-[var(--muted)]">
            Selecciona socios responsables y vincula organizaciones colaboradoras.
          </p>
        </header>
        <div className="grid gap-2">
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Buscar socio</span>
            <input
              className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setMemberNotice(null);
              }}
              ref={searchInputRef}
              placeholder="Nombre, nick o email (minimo 2 caracteres)"
            />
          </label>
          {memberError && <span className="text-xs text-red-300">{memberError}</span>}
          {memberSelectionTarget && (
            <span className="text-xs text-[var(--muted)]">
              Selecciona un socio de la lista para asignarlo al organizador resaltado.
            </span>
          )}
          {memberResults.length > 0 && (
            <div className="grid gap-2 rounded-2xl border border-white/10 bg-black/30 p-3">
              <p className="text-xs text-[var(--muted)]">{memberLoading ? "Buscando..." : "Resultados"}</p>
              <ul className="flex flex-wrap gap-2">
                {memberResults.map((member) => (
                  <li key={member.id}>
                    <button
                      type="button"
                      className="rounded-full border border-white/20 bg-black/10 px-3 py-1 text-xs text-white hover:border-white/40"
                      onClick={() => handleMemberResultSelect(member)}
                    >
                      {member.name}
                      {member.nick ? " (@" + member.nick + ")" : ""}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {memberLoading && <span className="text-xs text-[var(--muted)]">Cargando...</span>}
          {memberNotice && <span className="text-xs text-yellow-200">{memberNotice}</span>}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-2xl border border-white/20 px-3 py-2 text-sm text-white hover:border-white/40"
            onClick={() => {
              const newKey = generateKey();
              setState((prev) => ({
                ...prev,
                organizers: [
                  ...prev.organizers,
                  { key: newKey, userId: "", role: "", displayName: "" },
                ],
              }));
              setMemberSelectionTarget(newKey);
              setMemberNotice("Escribe y selecciona un socio para asignarlo.");
              setSearchTerm("");
              searchInputRef.current?.focus();
            }}
          >
            Anadir organizador manualmente
          </button>
          <button
            type="button"
            className="rounded-2xl border border-white/20 px-3 py-2 text-sm text-white hover:border-white/40"
            onClick={() =>
              setState((prev) => {
                const nextOrganizations = [
                  ...prev.organizations,
                  {
                    key: generateKey(),
                    id: "",
                    slug: "",
                    name: "",
                    isClub: false,
                    role: "",
                    locked: false,
                  },
                ];
                return {
                  ...prev,
                  organizations: ensureBilboOrganization(nextOrganizations),
                };
              })
            }
          >
            Anadir organizacion
          </button>
        </div>
        {state.organizers.length > 0 ? (
          <ul className="space-y-3">
            {state.organizers.map((organizer) => (
              <li
                key={organizer.key}
                className={`grid gap-3 rounded-2xl border ${
                  memberSelectionTarget === organizer.key ? "border-white/30" : "border-white/10"
                } bg-black/20 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]`}
              >
                <div className="grid gap-1">
                  <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Socio</span>
                  <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm">
                    <span className="truncate">
                      {organizer.displayName.trim()
                        ? organizer.displayName
                        : "Pendiente de asignar"}
                    </span>
                    <button
                      type="button"
                      className="rounded-full border border-white/20 px-2 py-1 text-xs text-white transition hover:border-white/40"
                      onClick={() => {
                        setMemberSelectionTarget(organizer.key);
                        setMemberNotice("Busca y selecciona un socio para asignarlo.");
                        searchInputRef.current?.focus();
                      }}
                    >
                      {organizer.userId ? "Cambiar" : "Asignar"}
                    </button>
                  </div>
                  {memberSelectionTarget === organizer.key && (
                    <span className="text-xs text-[var(--muted)]">
                      Busca el socio en el campo superior y pulsa en el resultado.
                    </span>
                  )}
                </div>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Rol</span>
                  <input
                    className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                    value={organizer.role}
                    onChange={(event) => updateOrganizer(organizer.key, { role: event.target.value })}
                    placeholder="Ej. Coordinacion"
                  />
                </label>
                <button
                  type="button"
                  className="self-end rounded-full border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20"
                  onClick={() => {
                    setState((prev) => ({
                      ...prev,
                      organizers: removeItem(prev.organizers, organizer.key),
                    }));
                    if (memberSelectionTarget === organizer.key) {
                      setMemberSelectionTarget(null);
                    }
                    setMemberNotice(null);
                  }}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--muted)]">No hay organizadores asignados por ahora.</p>
        )}
        {validationErrors.organizers && (
          <span className="text-xs text-red-300">{validationErrors.organizers}</span>
        )}
        {state.organizations.length > 0 ? (
          <ul className="space-y-3">
            {state.organizations.map((organization) => {
              const locked = organization.locked;
              return (
                <li
                  key={organization.key}
                  className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                >
                  <label className="grid gap-1">
                    <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Nombre visible</span>
                    <input
                      className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      value={organization.name}
                      onChange={(event) => {
                        if (locked) return;
                        const value = event.target.value;
                        updateOrganization(organization.key, {
                          name: value,
                          ...(organization.id
                            ? {}
                            : { slug: value.trim() ? slugify(value, "org") : "" }),
                        });
                      }}
                      placeholder="Bilbohammer"
                      disabled={locked}
                      aria-disabled={locked}
                    />
                    {locked && (
                      <span className="text-xs text-[var(--muted)]">
                        Esta organizacion se mantiene siempre registrada como anfitriona.
                      </span>
                    )}
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Rol</span>
                    <input
                      className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                      value={organization.role}
                      onChange={(event) => updateOrganization(organization.key, { role: event.target.value })}
                      placeholder="Patrocinador"
                    />
                  </label>
                  <button
                    type="button"
                    className="self-end rounded-full border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      if (locked) return;
                      setState((prev) => ({
                        ...prev,
                        organizations: removeItem(prev.organizations, organization.key),
                      }));
                    }}
                    disabled={locked}
                    aria-disabled={locked}
                  >
                    Quitar organizacion
                  </button>
                </li>
              );
            })}
         </ul>
       ) : (
         <p className="text-sm text-[var(--muted)]">
           Anade las organizaciones colaboradoras que deban aparecer en la ficha.
         </p>
        )}
        {validationErrors.organizations && (
          <span className="text-xs text-red-300">{validationErrors.organizations}</span>
        )}
      </section>

      <section className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-5">
        <header>
          <h2 className="text-lg font-semibold">Bloques de contenido</h2>
          <p className="text-sm text-[var(--muted)]">
            Organiza la informacion del evento en pestanas y controla su visibilidad.
          </p>
        </header>
        <div className="flex flex-wrap gap-2">
          {EVENT_CONTENT_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-white text-black"
                    : "border border-white/20 text-white hover:border-white/40"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="space-y-5">
          {activeTab === "description" && (
            <div className="space-y-4">
              <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/30 bg-black/30"
                  checked={state.showTabDescription}
                  onChange={(event) =>
                    syncTabVisibility("showTabDescription", event.target.checked, ["showDescription"])
                  }
                />
                Mostrar pestaña Descripcion
              </label>
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                  Descripcion
                </span>
                <RichTextEditor
                  value={state.details}
                  onChange={(html) => updateField("details", html)}
                  placeholder="Detalles generales del evento..."
                />
              </div>
            </div>
          )}

        {activeTab === "resources" && (
          <div className="space-y-6">
            <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/30 bg-black/30"
                checked={state.showTabResources}
                onChange={(event) => updateField("showTabResources", event.target.checked)}
              />
              Mostrar pestaña Archivos y enlaces
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
                <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/30 bg-black/30"
                    checked={state.showAttachments}
                    onChange={(event) => updateField("showAttachments", event.target.checked)}
                  />
                  Mostrar adjuntos
                </label>
                <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/30 bg-black/30"
                    checked={state.showLinks}
                    onChange={(event) => updateField("showLinks", event.target.checked)}
                  />
                  Mostrar enlaces
                </label>
              </div>
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
                      Adjuntos
                    </h3>
                    <button
                      type="button"
                      className="rounded-2xl border border-white/20 px-3 py-2 text-sm text-white hover:border-white/40"
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                      attachments: [
                        ...prev.attachments,
                        {
                          key: generateKey(),
                          title: "",
                          description: "",
                          fileUrl: "",
                          fileName: "",
                          uploading: false,
                          error: null,
                          visible: true,
                        },
                      ],
                    }))
                  }
                >
                      Anadir adjunto
                    </button>
                  </div>
                  {state.attachments.length > 0 ? (
                    <ul className="space-y-3">
                      {state.attachments.map((attachment) => (
                        <li
                          key={attachment.key}
                          className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4"
                        >
                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="grid gap-1">
                              <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                                Titulo
                              </span>
                              <input
                                className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                                value={attachment.title}
                                onChange={(event) =>
                                  updateAttachment(attachment.key, { title: event.target.value })
                                }
                                placeholder="Ej. Bases del torneo"
                              />
                            </label>
                            <div className="grid gap-2">
                              <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                                Archivo
                              </span>
                              <input
                                type="file"
                                className="hidden"
                                ref={(element) => {
                                  attachmentFileInputs.current[attachment.key] = element;
                                }}
                                accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,image/*"
                                onChange={(event) => {
                                  handleAttachmentFileChange(attachment.key, event.target.files);
                                  if (event.target) {
                                    event.target.value = "";
                                  }
                                }}
                              />
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  className="rounded-2xl border border-white/20 px-3 py-2 text-xs text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                                  onClick={() => attachmentFileInputs.current[attachment.key]?.click()}
                                  disabled={attachment.uploading}
                                >
                                  {attachment.uploading
                                    ? "Subiendo..."
                                    : attachment.fileUrl
                                      ? "Reemplazar archivo"
                                      : "Subir archivo"}
                                </button>
                                {attachment.fileUrl && (
                                  <a
                                    href={attachment.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-2xl border border-white/20 px-3 py-2 text-xs text-white transition hover:border-white/40"
                                  >
                                    Ver archivo
                                  </a>
                                )}
                              </div>
                              {attachment.fileName && (
                                <span className="break-all text-xs text-[var(--muted)]">
                                  {attachment.fileName}
                                </span>
                              )}
                              {!attachment.fileUrl && !attachment.uploading && !attachment.error && (
                                <span className="text-xs text-yellow-200">
                                  Selecciona un archivo para este adjunto.
                                </span>
                              )}
                              {attachment.uploading && (
                                <span className="text-xs text-[var(--muted)]">Subiendo adjunto...</span>
                              )}
                              {attachment.error && (
                                <span className="text-xs text-red-300">{attachment.error}</span>
                              )}
                            </div>
                          </div>
                          <label className="grid gap-1">
                            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                              Descripcion
                            </span>
                            <textarea
                              rows={3}
                              className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                              value={attachment.description}
                              onChange={(event) =>
                                updateAttachment(attachment.key, { description: event.target.value })
                              }
                              placeholder="Notas adicionales sobre el archivo (opcional)"
                            />
                          </label>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <label className="flex items-center gap-3 text-xs text-[var(--muted)]">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-white/30 bg-black/30"
                                checked={attachment.visible}
                                onChange={(event) =>
                                  updateAttachment(attachment.key, { visible: event.target.checked })
                                }
                              />
                              Visible para el publico
                            </label>
                            <button
                              type="button"
                              className="rounded-full border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20"
                              onClick={() => {
                                delete attachmentFileInputs.current[attachment.key];
                                setState((prev) => ({
                                  ...prev,
                                  attachments: removeItem(prev.attachments, attachment.key),
                                }));
                              }}
                            >
                              Quitar adjunto
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--muted)]">Todavia no hay adjuntos.</p>
                  )}
                </div>
                {validationErrors.attachments && (
                  <span className="text-xs text-red-300">{validationErrors.attachments}</span>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
                      Enlaces
                    </h3>
                    <button
                      type="button"
                      className="rounded-2xl border border-white/20 px-3 py-2 text-sm text-white hover;border-white/40"
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          links: [
                            ...prev.links,
                            { key: generateKey(), label: "", url: "", visible: true },
                          ],
                        }))
                      }
                    >
                      Anadir enlace
                    </button>
                  </div>
                  {state.links.length > 0 ? (
                    <ul className="space-y-3">
                      {state.links.map((link) => (
                        <li
                          key={link.key}
                          className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-2"
                        >
                          <label className="grid gap-1">
                            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                              Etiqueta
                            </span>
                            <input
                              className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus;border-white/40 focus:outline-none"
                              value={link.label}
                              onChange={(event) =>
                                updateLink(link.key, { label: event.target.value })
                              }
                            />
                          </label>
                          <label className="grid gap-1">
                            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                              URL
                            </span>
                            <input
                              className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus;border-white/40 focus:outline-none"
                              value={link.url}
                              onChange={(event) => updateLink(link.key, { url: event.target.value })}
                              placeholder="https://..."
                            />
                          </label>
                          <div className="flex items-center justify-between md:col-span-2">
                            <label className="flex items-center gap-3 text-xs text-[var(--muted)]">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-white/30 bg-black/30"
                                checked={link.visible}
                                onChange={(event) =>
                                  updateLink(link.key, { visible: event.target.checked })
                                }
                              />
                              Visible para el publico
                            </label>
                            <button
                              type="button"
                              className="rounded-full border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20"
                              onClick={() =>
                                setState((prev) => ({
                                  ...prev,
                                  links: removeItem(prev.links, link.key),
                                }))
                              }
                            >
                              Quitar enlace
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--muted)]">Todavia no hay enlaces.</p>
                  )}
                </div>
              </div>
            </div>
          )}

        {activeTab === "stories" && (
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/30 bg-black/30"
                  checked={state.showTabClassification}
                  onChange={(event) =>
                    syncTabVisibility("showTabClassification", event.target.checked, ["showStandings"])
                  }
                />
                Mostrar pestaña Clasificacion
              </label>
              <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/30 bg-black/30"
                  checked={state.showTabChronicle}
                  onChange={(event) =>
                    syncTabVisibility("showTabChronicle", event.target.checked, ["showRecap"])
                  }
                />
                Mostrar pestaña Cronica
              </label>
            </div>
            <div className="space-y-6">
              <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
                      Cronica en Novedades
                    </h3>
                    <p className="text-xs text-[var(--muted)]">
                      Vincula la cronica del evento publicada en la seccion de novedades o crea una nueva sin salir del editor.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-2xl border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={handleChronicleCreate}
                      disabled={chronicleActionBusy || submitBusy || deleteBusy}
                    >
                      Nueva cronica
                    </button>
                    {selectedChronicle && selectedChronicle.slug && (
                      <button
                        type="button"
                        className="rounded-2xl border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={handleChronicleEdit}
                        disabled={chronicleActionBusy || submitBusy || deleteBusy}
                      >
                        Editar cronica
                      </button>
                    )}
                    {selectedChronicle && selectedChronicle.slug && (
                      <Link
                        href={`/novedades/${selectedChronicle.category}/${selectedChronicle.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:border-white/40"
                      >
                        Ver cronica
                      </Link>
                    )}
                    {selectedChronicle && (
                      <button
                        type="button"
                        className="rounded-2xl border border-red-400/40 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={handleChronicleClear}
                        disabled={chronicleActionBusy}
                      >
                        Desvincular
                      </button>
                    )}
                  </div>
                </div>
                {selectedChronicle ? (
                  <div className="space-y-1 rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p className="text-sm font-semibold text-white">{selectedChronicle.title}</p>
                    <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                      {selectedChronicle.category === "chronicles" ? "Cronicas" : selectedChronicle.category}
                    </p>
                    {selectedChronicle.summary && (
                      <p className="text-sm text-[var(--muted)]">{selectedChronicle.summary}</p>
                    )}
                    {selectedChronicle.date && (
                      <p className="text-xs text-[var(--muted)]">Fecha: {selectedChronicle.date}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted)]">
                    No hay ninguna cronica enlazada todavia. Puedes crear una nueva o buscarla entre las publicadas.
                  </p>
                )}
                <div className="space-y-2">
                  <label className="grid gap-1">
                    <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                      Buscar cronica existente
                    </span>
                    <input
                      className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                      value={chronicleQuery}
                      onChange={(event) => {
                        setChronicleQuery(event.target.value);
                        setChronicleError(null);
                      }}
                      placeholder="Escribe el titulo o resumen..."
                      disabled={chronicleActionBusy}
                    />
                  </label>
                  {chronicleLoading && (
                    <p className="text-xs text-[var(--muted)]">Cargando datos de la cronica vinculada...</p>
                  )}
                  {chronicleBusy && !chronicleLoading && (
                    <p className="text-xs text-[var(--muted)]">Buscando cronicas coincidentes...</p>
                  )}
                  {chronicleError && <p className="text-xs text-red-300">{chronicleError}</p>}
                  {chronicleResults.length > 0 && (
                    <ul className="space-y-2">
                      {chronicleResults.map((chronicle) => (
                        <li key={chronicle.id}>
                          <button
                            type="button"
                            className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-left text-sm text-white transition hover:border-white/40"
                            onClick={() => handleChronicleSelect(chronicle)}
                          >
                            <span className="font-medium">{chronicle.title}</span>
                            {chronicle.summary && (
                              <span className="mt-1 block text-xs text-[var(--muted)]">
                                {chronicle.summary}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!chronicleBusy && chronicleResults.length === 0 && chronicleQueryTrimmed.length >= 2 && (
                    <p className="text-xs text-[var(--muted)]">
                      No se encontraron cronicas que coincidan con la busqueda.
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
                    Destacados
                  </h3>
                    <button
                      type="button"
                      className="rounded-2xl border border-white/20 px-3 py-2 text-sm text-white hover:border-white/40"
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          highlights: [
                            ...prev.highlights,
                            {
                              key: generateKey(),
                              type: "",
                              title: "",
                              playerName: "",
                              playerId: "",
                              visible: true,
                            },
                          ],
                        }))
                      }
                    >
                      Anadir jugador destacado
                    </button>
                  </div>
                  {state.highlights.length > 0 ? (
                    <ul className="space-y-3">
                      {state.highlights.map((highlight) => (
                        <li
                          key={highlight.key}
                          className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-2"
                        >
                          <label className="grid gap-1">
                            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Tipo</span>
                            <select
                              className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                              value={highlight.type ?? ""}
                              onChange={(event) =>
                                updateHighlight(highlight.key, {
                                  type: event.target.value as EventHighlightType | "",
                                })
                              }
                            >
                              <option value="">Selecciona</option>
                              {HIGHLIGHT_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="grid gap-1">
                            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Titulo</span>
                            <input
                              className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                              value={highlight.title}
                              onChange={(event) =>
                                updateHighlight(highlight.key, { title: event.target.value })
                              }
                            />
                          </label>
                          <label className="grid gap-1">
                            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                              Nombre del jugador
                            </span>
                            <input
                              className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                              value={highlight.playerName}
                              onChange={(event) =>
                                updateHighlight(highlight.key, { playerName: event.target.value })
                              }
                            />
                          </label>
                          <div className="flex items-center justify-between md:col-span-2">
                            <label className="flex items-center gap-3 text-xs text-[var(--muted)]">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-white/30 bg-black/30"
                                checked={highlight.visible}
                                onChange={(event) =>
                                  updateHighlight(highlight.key, { visible: event.target.checked })
                                }
                              />
                              Visible para el publico
                            </label>
                            <button
                              type="button"
                              className="rounded-full border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20"
                              onClick={() =>
                                setState((prev) => ({
                                  ...prev,
                                  highlights: removeItem(prev.highlights, highlight.key),
                                }))
                              }
                            >
                              Quitar destacado
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--muted)]">
                      Agrega jugadores destacados para resaltar actuaciones clave.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
                      Clasificacion
                    </h3>
                    <button
                      type="button"
                      className="rounded-2xl border border-white/20 px-3 py-2 text-sm text-white hover:border-white/40"
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          rankings: [
                            ...prev.rankings,
                            {
                              key: generateKey(),
                              position: "",
                              playerName: "",
                              playerId: "",
                              score: "",
                              visible: true,
                            },
                          ],
                        }))
                      }
                    >
                      Anadir entrada de clasificacion
                    </button>
                  </div>
                  {state.rankings.length > 0 ? (
                    <ul className="space-y-3">
                      {state.rankings.map((ranking) => (
                        <li
                          key={ranking.key}
                          className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-4"
                        >
                          <label className="grid gap-1">
                            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                              Posicion
                            </span>
                            <input
                              type="number"
                              min="1"
                              className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus;border-white/40 focus:outline-none"
                              value={ranking.position}
                              onChange={(event) =>
                                updateRanking(ranking.key, { position: event.target.value })
                              }
                            />
                          </label>
                          <label className="grid gap-1 md:col-span-2">
                            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                              Jugador
                            </span>
                            <input
                              className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus;border-white/40 focus:outline-none"
                              value={ranking.playerName}
                              onChange={(event) =>
                                updateRanking(ranking.key, { playerName: event.target.value })
                              }
                            />
                          </label>
                          <label className="grid gap-1 md:col-span-3">
                            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                              Resultado / puntos (opcional)
                            </span>
                            <input
                              className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus;border-white/40 focus:outline-none"
                              value={ranking.score}
                              onChange={(event) => updateRanking(ranking.key, { score: event.target.value })}
                            />
                          </label>
                          <div className="flex items-center justify-between md:col-span-4">
                            <label className="flex items-center gap-3 text-xs text-[var(--muted)]">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-white/30 bg-black/30"
                                checked={ranking.visible}
                                onChange={(event) =>
                                  updateRanking(ranking.key, { visible: event.target.checked })
                                }
                              />
                              Visible
                            </label>
                            <button
                              type="button"
                              className="rounded-full border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20"
                              onClick={() =>
                                setState((prev) => ({
                                  ...prev,
                                  rankings: removeItem(prev.rankings, ranking.key),
                                }))
                              }
                            >
                              Quitar entrada
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--muted)]">
                      Agrega posiciones para mostrar una tabla de clasificacion.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

        {activeTab === "gallery" && (
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/30 bg-black/30"
                checked={state.showTabGallery}
                onChange={(event) =>
                  syncTabVisibility("showTabGallery", event.target.checked, ["showGallery"])
                }
              />
              Mostrar pestaña Galeria
            </label>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
                      Crear album rapido
                    </h3>
                    <p className="text-xs text-[var(--muted)]">
                      Genera un album basico si no existe uno que puedas enlazar.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-white/20 px-3 py-1 text-xs text-white hover:border-white/40"
                    onClick={handleAlbumCreatorToggle}
                  >
                    {albumCreatorOpen ? "Cancelar" : "Nuevo album"}
                  </button>
                </div>
                {albumCreateSuccess && (
                  <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    {albumCreateSuccess}
                  </div>
                )}
                {albumCreatorOpen && (
                  <div className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Titulo</span>
                        <input
                          className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                          value={albumDraft.title}
                          onChange={(event) => updateAlbumDraft("title", event.target.value)}
                          placeholder="Titulo del album"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Ano</span>
                        <input
                          className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                          value={albumDraft.year}
                          onChange={(event) => updateAlbumDraft("year", event.target.value)}
                          placeholder="2025"
                        />
                      </label>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Fecha</span>
                        <input
                          type="date"
                          className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                          value={albumDraft.date}
                          onChange={(event) => updateAlbumDraft("date", event.target.value)}
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Formato</span>
                        <select
                          className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                          value={albumDraft.format}
                          onChange={(event) => updateAlbumDraft("format", event.target.value as AlbumFormatValue)}
                        >
                          {ALBUM_FORMAT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Juego</span>
                        <select
                          className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                          value={albumDraft.game}
                          onChange={(event) => updateAlbumDraft("game", event.target.value)}
                        >
                          <option value="OTROS">Sin especificar</option>
                          {GAME_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Ubicacion</span>
                        <input
                          className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                          value={albumDraft.location}
                          onChange={(event) => updateAlbumDraft("location", event.target.value)}
                          placeholder="Bilbao"
                        />
                      </label>
                    </div>
                    <label className="grid gap-1">
                      <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Descripcion</span>
                      <textarea
                        rows={3}
                        className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                        value={albumDraft.description}
                        onChange={(event) => updateAlbumDraft("description", event.target.value)}
                        placeholder="Notas sobre el album"
                      />
                    </label>
                    {albumCreateError && (
                      <span className="text-xs text-red-300">{albumCreateError}</span>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={albumCreateBusy}
                        onClick={handleAlbumCreateSubmit}
                        className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-black shadow transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {albumCreateBusy ? "Creando..." : "Crear y vincular"}
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-white/20 px-3 py-2 text-xs text-white hover:border-white/40"
                        onClick={handleAlbumCreatorToggle}
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                    Buscar album
                  </span>
                  <input
                    className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                    value={albumQuery}
                    onChange={(event) => handleAlbumQueryChange(event.target.value)}
                    placeholder="Escribe el titulo del album..."
                  />
                </label>
                {validationErrors.albumQuery && (
                  <span className="text-xs text-red-300">{validationErrors.albumQuery}</span>
                )}
                {albumError && <span className="text-xs text-red-300">{albumError}</span>}
                {albumBusy && (
                  <p className="text-xs text-[var(--muted)]">Buscando albumes coincidientes...</p>
                )}
                {selectedAlbum ? (
                  <div className="rounded-2xl border border-white/15 bg-black/30 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{selectedAlbum.title}</p>
                        <p className="text-xs text-[var(--muted)]">Slug: {selectedAlbum.slug}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                        <Link
                          href={`/galeria/${selectedAlbum.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-full border border-white/20 px-3 py-1 text-xs text-white transition hover:border-white/40 hover:text-white"
                        >
                          Abrir album
                        </Link>
                        <button
                          type="button"
                          className="rounded-full border border-white/20 px-3 py-1 text-xs text-white hover:border-white/40"
                          onClick={handleAlbumClear}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--muted)]">
                    Selecciona un album existente para enlazar las fotos del evento.
                  </p>
                )}
                {albumResults.length > 0 && (
                  <ul className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                    {albumResults.map((album) => (
                      <li key={album.id}>
                        <button
                          type="button"
                          className="flex w-full flex-col items-start rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-left text-sm text-white hover:border-white/40"
                          onClick={() => handleAlbumSelect(album)}
                        >
                          <span className="font-medium">{album.title}</span>
                          <span className="text-xs text-[var(--muted)]">{album.slug}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {!albumResults.length && albumQuery.trim() && !albumBusy && !selectedAlbum && (
                  <p className="text-xs text-[var(--muted)]">
                    No se encontraron albumes con ese titulo.
                  </p>
                )}
              </div>
            </div>
          )}
        {activeTab === "location" && (
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/30 bg-black/30"
                checked={state.showTabLocation}
                onChange={(event) =>
                  syncTabVisibility("showTabLocation", event.target.checked, ["showLocation"])
                }
              />
              Mostrar pestaña Ubicacion
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Ubicacion</span>
                  <input
                    className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                    value={state.location}
                    onChange={(event) => updateField("location", event.target.value)}
                    placeholder="Ej. C/ General Concha 32, Bilbao"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                    Enlace a Google Maps
                  </span>
                  <input
                    className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                    value={state.mapsUrl}
                    onChange={(event) => updateField("mapsUrl", event.target.value)}
                    placeholder="https://maps..."
                  />
                </label>
              </div>
              {state.mapsUrl && (
                <a
                  href={state.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-white underline decoration-dotted underline-offset-4 hover:text-white/80"
                >
                  Abrir enlace en nueva pestana
                </a>
              )}
              <p className="text-xs text-[var(--muted)]">
                Las coordenadas se calcularan automaticamente al guardar si hay un enlace a Maps.
              </p>
            </div>
          )}
        </div>
      </section>



      <footer className="flex flex-col gap-3 border-t border-white/10 pt-4 md:flex-row md:items-center md:justify-between">
        <div className="text-xs text-[var(--muted)]">
          Revisa la informacion antes de guardar. Podras editarla mas adelante.
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {mode === "edit" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitBusy || deleteBusy}
              className="rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleteBusy ? "Eliminando..." : "Eliminar evento"}
            </button>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black shadow transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitBusy ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Crear evento"}
          </button>
        </div>
      </footer>
    </form>
  );
}














