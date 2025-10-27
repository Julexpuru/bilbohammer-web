'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import type {
  EventHighlightType,
  EventStatus,
  EventType,
  Juego,
} from "@prisma/client";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

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
  albumId: string | null;
  tags: string[];
  organizers: {
    userId: number;
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
  displayName?: string;
};

 type OrganizationState = {
  key: string;
  id: string;
  slug: string;
  name: string;
  isClub: boolean;
  role: string;
};

 type AttachmentState = {
  key: string;
  title: string;
  description: string;
  fileUrl: string;
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
  isInternal: boolean;
  isMembersOnly: boolean;
  showDescription: boolean;
  showAttachments: boolean;
  showLinks: boolean;
  showStandings: boolean;
  showRecap: boolean;
  showGallery: boolean;
  showLocation: boolean;
  albumId: string;
  tags: string[];
  organizers: OrganizerState[];
  organizations: OrganizationState[];
  attachments: AttachmentState[];
  links: LinkState[];
  highlights: HighlightState[];
  rankings: RankingState[];
};

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

const HIGHLIGHT_TYPE_OPTIONS: { value: EventHighlightType; label: string }[] = [
  { value: "FIRST", label: "Primer puesto" },
  { value: "SECOND", label: "Segundo puesto" },
  { value: "THIRD", label: "Tercer puesto" },
  { value: "AWARD", label: "Mencion especial" },
];

const NUMBER_FIELDS_HELPER = {
  latitude: "Latitud debe estar entre -90 y 90.",
  longitude: "Longitud debe estar entre -180 y 180.",
  capacityMax: "Aforo maximo debe ser un entero positivo.",
  capacityCurrent: "Aforo actual debe ser un entero mayor o igual a 0.",
} as const;

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
    return {
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
      isInternal: false,
      isMembersOnly: false,
      showDescription: true,
      showAttachments: true,
      showLinks: true,
      showStandings: true,
      showRecap: true,
      showGallery: true,
      showLocation: true,
      albumId: "",
      tags: [],
      organizers: [],
      organizations: [],
      attachments: [],
      links: [],
      highlights: [],
      rankings: [],
    };
  }

  return {
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
    isInternal: initialData.isInternal,
    isMembersOnly: initialData.isMembersOnly,
    showDescription: initialData.showDescription,
    showAttachments: initialData.showAttachments,
    showLinks: initialData.showLinks,
    showStandings: initialData.showStandings,
    showRecap: initialData.showRecap,
    showGallery: initialData.showGallery,
    showLocation: initialData.showLocation,
    albumId: initialData.albumId ?? "",
    tags: initialData.tags,
    organizers: initialData.organizers.map((item) => ({
      key: generateKey(),
      userId: String(item.userId),
      role: item.role ?? "",
    })),
    organizations: initialData.organizations.map((item) => ({
      key: generateKey(),
      id: item.organization.id,
      slug: item.organization.slug ?? "",
      name: item.organization.name ?? "",
      isClub: item.organization.isClub,
      role: item.role ?? "",
    })),
    attachments: initialData.attachments.map((item) => ({
      key: generateKey(),
      title: item.title,
      description: item.description ?? "",
      fileUrl: item.fileUrl,
      visible: item.visible,
    })),
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
  const [state, setState] = useState<EventFormState>(() => buildInitialState(initialData));
  const [tagInput, setTagInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { results: memberResults, loading: memberLoading, error: memberError } = useMemberSearch(searchTerm);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const bannerPreviewUrl = useRef<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState(state.bannerUrl ?? ");
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [albumQuery, setAlbumQuery] = useState(");
  const [albumResults, setAlbumResults] = useState<AlbumSearchResult[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumSearchResult | null>(null);
  const [albumBusy, setAlbumBusy] = useState(false);
  const [albumError, setAlbumError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'description' | 'resources' | 'stories' | 'gallery' | 'location'>('description');

  useEffect(() => {
    if (initialData) {
      setState(buildInitialState(initialData));
    }
  }, [initialData]);
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

  const duplicateTag = useMemo(() => {
    const normalized = tagInput.trim().toLowerCase();
    if (!normalized) return false;
    return state.tags.some((tag) => tag.toLowerCase() === normalized);
  }, [state.tags, tagInput]);

  const canSubmit = useMemo(() => {
    if (!state.title.trim()) return false;
    if (!state.startsAt || !state.endsAt) return false;
    if (submitBusy || deleteBusy) return false;
    return true;
  }, [state.title, state.startsAt, state.endsAt, submitBusy, deleteBusy]);

  function updateField<K extends keyof EventFormState>(field: K, value: EventFormState[K]) {
    setState((prev) => ({ ...prev, [field]: value }));
  }

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

  function removeItem<T extends { key: string }>(list: T[], key: string) {
    return list.filter((item) => item.key !== key);
  }

  function handleAddTag() {
    const trimmed = tagInput.trim();
    if (!trimmed || duplicateTag) return;
    setState((prev) => ({ ...prev, tags: [...prev.tags, trimmed] }));
    setTagInput("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

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

    if (state.priceSocios.trim() && !state.priceGeneral.trim()) {
      errors.priceGeneral = "El precio para socios requiere precio general.";
    }

    const latitude = state.latitude.trim() ? parseFloatish(state.latitude) : null;
    if (latitude != null && (latitude < -90 || latitude > 90)) {
      errors.latitude = NUMBER_FIELDS_HELPER.latitude;
    }

    const longitude = state.longitude.trim() ? parseFloatish(state.longitude) : null;
    if (longitude != null && (longitude < -180 || longitude > 180)) {
      errors.longitude = NUMBER_FIELDS_HELPER.longitude;
    }

    const capacityMax = state.capacityMax.trim() ? parseInteger(state.capacityMax) : null;
    if (state.capacityMax.trim() && capacityMax == null) {
      errors.capacityMax = NUMBER_FIELDS_HELPER.capacityMax;
    }
    const capacityCurrent =
      state.capacityCurrent.trim() || capacityMax != null
        ? parseInteger(state.capacityCurrent, true)
        : null;
    if (state.capacityCurrent.trim() && capacityCurrent == null) {
      errors.capacityCurrent = NUMBER_FIELDS_HELPER.capacityCurrent;
    }
    if (
      capacityMax != null &&
      capacityCurrent != null &&
      capacityCurrent > capacityMax
    ) {
      errors.capacityCurrent = "El aforo actual no puede superar el aforo maximo.";
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
      errors.organizers = "Verifica los identificadores de socio en organizadores.";
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
        return {
          id: cleanedId.length ? cleanedId : undefined,
          slug: cleanedSlug.length ? cleanedSlug : undefined,
          name: cleanedName.length ? cleanedName : undefined,
          isClub: item.isClub,
          role,
        };
      })
      .filter(
        (item): item is {
          id?: string;
          slug?: string;
          name?: string;
          isClub?: boolean;
          role: string | null;
        } => Boolean(item)
      );

    if (state.organizations.length && preparedOrganizations.length !== state.organizations.length) {
      errors.organizations = "Completa los datos de cada organizacion o elimina las vacias.";
    }

    const preparedAttachments = state.attachments
      .map((item) => {
        const title = item.title.trim();
        const fileUrl = item.fileUrl.trim();
        const description = item.description.trim();
        if (!title || !fileUrl) {
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
      priceGeneral: state.priceGeneral.trim() || null,
      priceSocios: state.priceSocios.trim() || null,
      capacityMax,
      capacityCurrent,
      isInternal: state.isInternal,
      isMembersOnly: state.isMembersOnly,
      showDescription: state.showDescription,
      showAttachments: state.showAttachments,
      showLinks: state.showLinks,
      showStandings: state.showStandings,
      showRecap: state.showRecap,
      showGallery: state.showGallery,
      showLocation: state.showLocation,
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
        router.push(`/eventos/${eventId}`);
        router.refresh();
      } else if (mode === "create") {
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

      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <header>
          <h2 className="text-lg font-semibold">Informacion general</h2>
          <p className="text-sm text-[var(--muted)]">
            Titula el evento y define su visibilidad y fechas clave.
          </p>
        </header>
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
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Banner (URL)</span>
            <input
              className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
              value={state.bannerUrl}
              onChange={(event) => updateField("bannerUrl", event.target.value)}
              placeholder="https://..."
            />
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
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Album vinculado</span>
            <input
              className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
              value={state.albumId}
              onChange={(event) => updateField("albumId", event.target.value)}
              placeholder="ID de album opcional"
            />
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
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Latitud</span>
            <input
              type="number"
              step="0.000001"
              className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
              value={state.latitude}
              onChange={(event) => updateField("latitude", event.target.value)}
            />
            {validationErrors.latitude && (
              <span className="text-xs text-red-300">{validationErrors.latitude}</span>
            )}
          </label>
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Longitud</span>
            <input
              type="number"
              step="0.000001"
              className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
              value={state.longitude}
              onChange={(event) => updateField("longitude", event.target.value)}
            />
            {validationErrors.longitude && (
              <span className="text-xs text-red-300">{validationErrors.longitude}</span>
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
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Precio general (EUR)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={state.priceGeneral}
              onChange={(event) => updateField("priceGeneral", event.target.value)}
              className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
            />
            {validationErrors.priceGeneral && (
              <span className="text-xs text-red-300">{validationErrors.priceGeneral}</span>
            )}
          </label>
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Precio socios (EUR)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={state.priceSocios}
              onChange={(event) => updateField("priceSocios", event.target.value)}
              className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Aforo maximo</span>
            <input
              type="number"
              min="1"
              step="1"
              value={state.capacityMax}
              onChange={(event) => updateField("capacityMax", event.target.value)}
              className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
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
              className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
            />
            {validationErrors.capacityCurrent && (
              <span className="text-xs text-red-300">{validationErrors.capacityCurrent}</span>
            )}
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/30 bg-black/30"
              checked={state.isInternal}
              onChange={(event) => updateField("isInternal", event.target.checked)}
            />
            <span className="text-sm text-[var(--muted)]">
              Evento interno (solo aparece en listados internos)
            </span>
          </label>
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
      </section>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <header>
          <h2 className="text-lg font-semibold">Contenido</h2>
          <p className="text-sm text-[var(--muted)]">
            Anade una descripcion y la cronica para mostrar en la ficha.
          </p>
        </header>
        <label className="grid gap-1">
          <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Descripcion</span>
          <textarea
            rows={6}
            className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
            value={state.details}
            onChange={(event) => updateField("details", event.target.value)}
            placeholder="Detalles generales del evento..."
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Cronica</span>
          <textarea
            rows={6}
            className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
            value={state.recap}
            onChange={(event) => updateField("recap", event.target.value)}
            placeholder="Resumen tras el evento..."
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/30 bg-black/30"
              checked={state.showDescription}
              onChange={(event) => updateField("showDescription", event.target.checked)}
            />
            <span className="text-sm text-[var(--muted)]">Mostrar descripcion en la ficha</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/30 bg-black/30"
              checked={state.showRecap}
              onChange={(event) => updateField("showRecap", event.target.checked)}
            />
            <span className="text-sm text-[var(--muted)]">Mostrar cronica</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/30 bg-black/30"
              checked={state.showAttachments}
              onChange={(event) => updateField("showAttachments", event.target.checked)}
            />
            <span className="text-sm text-[var(--muted)]">Mostrar adjuntos</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/30 bg-black/30"
              checked={state.showLinks}
              onChange={(event) => updateField("showLinks", event.target.checked)}
            />
            <span className="text-sm text-[var(--muted)]">Mostrar enlaces</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/30 bg-black/30"
              checked={state.showGallery}
              onChange={(event) => updateField("showGallery", event.target.checked)}
            />
            <span className="text-sm text-[var(--muted)]">Mostrar galeria</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/30 bg-black/30"
              checked={state.showStandings}
              onChange={(event) => updateField("showStandings", event.target.checked)}
            />
            <span className="text-sm text-[var(--muted)]">Mostrar clasificacion</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/30 bg-black/30"
              checked={state.showLocation}
              onChange={(event) => updateField("showLocation", event.target.checked)}
            />
            <span className="text-sm text-[var(--muted)]">Mostrar ubicacion en ficha</span>
          </label>
        </div>
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
            {state.tags.map((tag) => (
              <li key={tag}>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.3em]"
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      tags: prev.tags.filter((item) => item !== tag),
                    }))
                  }
                >
                  {tag}
                  <span className="text-white/60">x</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--muted)]">Aun no se han anadido etiquetas.</p>
        )}
      </section>
      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <header className="space-y-2">
          <h2 className="text-lg font-semibold">Organizadores</h2>
          <p className="text-sm text-[var(--muted)]">
            Selecciona socios responsables y define su rol en el evento.
          </p>
        </header>
        <div className="grid gap-2">
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Buscar socio</span>
            <input
              className="rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Nombre, nick o email (minimo 2 caracteres)"
            />
          </label>
          {memberError && <span className="text-xs text-red-300">{memberError}</span>}
          {memberResults.length > 0 && (
            <div className="grid gap-2 rounded-2xl border border-white/10 bg-black/30 p-3">
              <p className="text-xs text-[var(--muted)]">
                {memberLoading ? "Buscando..." : "Resultados"}
              </p>
              <ul className="flex flex-wrap gap-2">
                {memberResults.map((member) => (
                  <li key={member.id}>
                    <button
                      type="button"
                      className="rounded-full border border-white/20 bg-black/10 px-3 py-1 text-xs text-white hover:border-white/40"
                      onClick={() => {
                        if (
                          state.organizers.some((item) => Number(item.userId) === Number(member.id))
                        ) {
                          return;
                        }
                        setState((prev) => ({
                          ...prev,
                          organizers: [
                            ...prev.organizers,
                            {
                              key: generateKey(),
                              userId: member.id,
                              role: "",
                              displayName: member.name,
                            },
                          ],
                        }));
                        setSearchTerm("");
                      }}
                    >
                      {member.name}
                      {member.nick ? ` (@${member.nick})` : ""}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {memberLoading && <span className="text-xs text-[var(--muted)]">Cargando...</span>}
        </div>
        <button
          type="button"
          className="rounded-2xl border border-white/20 px-3 py-2 text-sm text-white hover:border-white/40"
          onClick={() =>
            setState((prev) => ({
              ...prev,
              organizers: [
                ...prev.organizers,
                { key: generateKey(), userId: "", role: "" },
              ],
            }))
          }
        >
          Anadir organizador manualmente
        </button>
        {state.organizers.length > 0 ? (
          <ul className="space-y-3">
            {state.organizers.map((organizer) => (
              <li
                key={organizer.key}
                className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
              >
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                    ID de socio
                  </span>
                  <input
                    type="number"
                    min="1"
                    className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                    value={organizer.userId}
                    onChange={(event) => updateOrganizer(organizer.key, { userId: event.target.value })}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Rol</span>
                  <input
                    className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                    value={organizer.role}
                    onChange={(event) => updateOrganizer(organizer.key, { role: event.target.value })}
                    placeholder="Ej. Coordinacion"
                  />
                  {organizer.displayName && (
                    <span className="text-xs text-[var(--muted)]">{organizer.displayName}</span>
                  )}
                </label>
                <button
                  type="button"
                  className="self-end rounded-full border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20"
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      organizers: removeItem(prev.organizers, organizer.key),
                    }))
                  }
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
      </section>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <header className="space-y-2">
          <h2 className="text-lg font-semibold">Organizaciones asociadas</h2>
          <p className="text-sm text-[var(--muted)]">
            Vincula clubs u organizaciones colaboradoras y, si procede, su rol.
          </p>
        </header>
        <button
          type="button"
          className="rounded-2xl border border-white/20 px-3 py-2 text-sm text-white hover:border-white/40"
          onClick={() =>
            setState((prev) => ({
              ...prev,
              organizations: [
                ...prev.organizations,
                { key: generateKey(), id: "", slug: "", name: "", isClub: false, role: "" },
              ],
            }))
          }
        >
          Anadir organizacion
        </button>
        {state.organizations.length > 0 ? (
          <ul className="space-y-3">
            {state.organizations.map((organization) => (
              <li
                key={organization.key}
                className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-2"
              >
                <div className="grid gap-2">
                  <label className="grid gap-1">
                    <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                      ID existente
                    </span>
                    <input
                      className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                      value={organization.id}
                      onChange={(event) => updateOrganization(organization.key, { id: event.target.value })}
                      placeholder="Si ya existe en la base de datos"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                      Slug
                    </span>
                    <input
                      className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                      value={organization.slug}
                      onChange={(event) => updateOrganization(organization.key, { slug: event.target.value })}
                      placeholder="bilbohammer"
                    />
                  </label>
                </div>
                <div className="grid gap-2">
                  <label className="grid gap-1">
                    <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                      Nombre visible
                    </span>
                    <input
                      className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                      value={organization.name}
                      onChange={(event) => updateOrganization(organization.key, { name: event.target.value })}
                      placeholder="Bilbohammer"
                    />
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
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-white/30 bg-black/40"
                      checked={organization.isClub}
                      onChange={(event) =>
                        updateOrganization(organization.key, { isClub: event.target.checked })
                      }
                    />
                    <span className="text-xs text-[var(--muted)]">Es club asociado</span>
                  </label>
                </div>
                <button
                  type="button"
                  className="md:col-span-2 md:justify-self-start rounded-full border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20"
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      organizations: removeItem(prev.organizations, organization.key),
                    }))
                  }
                >
                  Quitar organizacion
                </button>
              </li>
            ))}
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
          <h2 className="text-lg font-semibold">Adjuntos</h2>
          <p className="text-sm text-[var(--muted)]">
            Comparte reglamentos, bases o documentacion adicional descargable.
          </p>
        </header>
        <button
          type="button"
          className="rounded-2xl border border-white/20 px-3 py-2 text-sm text-white hover:border-white/40"
          onClick={() =>
            setState((prev) => ({
              ...prev,
              attachments: [
                ...prev.attachments,
                { key: generateKey(), title: "", description: "", fileUrl: "", visible: true },
              ],
            }))
          }
        >
          Anadir adjunto
        </button>
        {state.attachments.length > 0 ? (
          <ul className="space-y-3">
            {state.attachments.map((attachment) => (
              <li
                key={attachment.key}
                className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-2"
              >
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
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">URL</span>
                  <input
                    className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                    value={attachment.fileUrl}
                    onChange={(event) =>
                      updateAttachment(attachment.key, { fileUrl: event.target.value })
                    }
                    placeholder="https://..."
                  />
                </label>
                <label className="md:col-span-2 grid gap-1">
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
                  />
                </label>
                <div className="flex items-center justify-between md:col-span-2">
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
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        attachments: removeItem(prev.attachments, attachment.key),
                      }))
                    }
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
      </section>

      <section className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-5">
        <header>
          <h2 className="text-lg font-semibold">Enlaces</h2>
          <p className="text-sm text-[var(--muted)]">
            Incluye enlaces relevantes (inscripciones, reglamento, etc.).
          </p>
        </header>
        <button
          type="button"
          className="rounded-2xl border border-white/20 px-3 py-2 text-sm text-white hover:border-white/40"
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
                    className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                    value={link.label}
                    onChange={(event) => updateLink(link.key, { label: event.target.value })}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">URL</span>
                  <input
                    className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
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
                      onChange={(event) => updateLink(link.key, { visible: event.target.checked })}
                    />
                    Visible
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
          <p className="text-sm text-[var(--muted)]">No hay enlaces anadidos.</p>
        )}
      </section>
      <section className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-5">
        <header>
          <h2 className="text-lg font-semibold">Destacados</h2>
          <p className="text-sm text-[var(--muted)]">
            Resalta logros o premiados del evento.
          </p>
        </header>
        <button
          type="button"
          className="rounded-2xl border border-white/20 px-3 py-2 text-sm text-white hover:border-white/40"
          onClick={() =>
            setState((prev) => ({
              ...prev,
              highlights: [
                ...prev.highlights,
                { key: generateKey(), type: "", title: "", playerName: "", playerId: "", visible: true },
              ],
            }))
          }
        >
          Anadir destacado
        </button>
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
                      updateHighlight(highlight.key, { type: event.target.value as EventHighlightType | "" })
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
                  <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                    Titulo o premio
                  </span>
                  <input
                    className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                    value={highlight.title}
                    onChange={(event) => updateHighlight(highlight.key, { title: event.target.value })}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                    Nombre del jugador
                  </span>
                  <input
                    className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                    value={highlight.playerName}
                    onChange={(event) => updateHighlight(highlight.key, { playerName: event.target.value })}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                    ID de socio (opcional)
                  </span>
                  <input
                    type="number"
                    min="1"
                    className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                    value={highlight.playerId}
                    onChange={(event) => updateHighlight(highlight.key, { playerId: event.target.value })}
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
                    Visible
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
          <p className="text-sm text-[var(--muted)]">No hay destacados configurados.</p>
        )}
      </section>

      <section className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-5">
        <header>
          <h2 className="text-lg font-semibold">Clasificacion</h2>
          <p className="text-sm text-[var(--muted)]">
            Publica la tabla de resultados final del evento.
          </p>
        </header>
        <button
          type="button"
          className="rounded-2xl border border-white/20 px-3 py-2 text-sm text-white hover:border-white/40"
          onClick={() =>
            setState((prev) => ({
              ...prev,
              rankings: [
                ...prev.rankings,
                { key: generateKey(), position: "", playerName: "", playerId: "", score: "", visible: true },
              ],
            }))
          }
        >
          Anadir entrada de clasificacion
        </button>
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
                    className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                    value={ranking.position}
                    onChange={(event) => updateRanking(ranking.key, { position: event.target.value })}
                  />
                </label>
                <label className="grid gap-1 md:col-span-2">
                  <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                    Jugador
                  </span>
                  <input
                    className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                    value={ranking.playerName}
                    onChange={(event) => updateRanking(ranking.key, { playerName: event.target.value })}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                    ID socio (opcional)
                  </span>
                  <input
                    type="number"
                    min="1"
                    className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                    value={ranking.playerId}
                    onChange={(event) => updateRanking(ranking.key, { playerId: event.target.value })}
                  />
                </label>
                <label className="grid gap-1 md:col-span-3">
                  <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                    Resultado / puntos (opcional)
                  </span>
                  <input
                    className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
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
                      onChange={(event) => updateRanking(ranking.key, { visible: event.target.checked })}
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






