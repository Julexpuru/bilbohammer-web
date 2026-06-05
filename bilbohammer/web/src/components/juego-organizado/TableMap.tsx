"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { assetUrl } from "@/lib/assets";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { useGamesCatalog } from "@/lib/use-games-catalog";
import { uploadImageToR2 } from "@/lib/uploads/presign-client";
import {
  isOrientationTag,
  isZoneTableName,
  TABLE_STATE_LABELS,
  type TableUiState,
} from "@/lib/organized-tables";

type TableStatus = "AVAILABLE" | "RESERVED" | "IN_PLAY" | "BLOCKED";
type ReservationStatus = "PENDING" | "CONFIRMED" | "IN_PLAY" | "ENDED" | "CANCELLED";

type TableGame = {
  id: string;
  slug: string;
  name: string;
  iconImagePath?: string | null;
  heroImagePath?: string | null;
};

type TableLayout = {
  id: string;
  title: string;
  description?: string | null;
  gameId?: string | null;
  sceneryNotes?: string | null;
  isDefault: boolean;
  weekday?: number | null;
};

type ResolvedGameInfo = {
  key: string;
  label: string;
  icon: string | null;
  slug: string | null;
};

type Table = {
  id: string;
  name: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation: number;
  sizeTag?: string | null;
  notes?: string | null;
  status: TableStatus;
  gameId?: string | null;
  gameLabel?: string | null;
  layoutImagePath?: string | null;
  sceneryImagePath?: string | null;
  game?: TableGame | null;
  layouts?: TableLayout[];
};

type Reservation = {
  id: string;
  tableId: string;
  start: string;
  end: string;
  status: ReservationStatus;
  matchId?: string | null;
  notes?: string | null;
  match?: {
    id: string;
    format?: string | null;
    roundNumber?: number | null;
    notes?: string | null;
    participants?: {
      user: {
        id: number;
        name?: string | null;
        nick?: string | null;
        email: string;
      };
    }[];
  } | null;
};

type Block = {
  id: string;
  tableId: string;
  start: string;
  end: string;
  reason?: string | null;
  eventId?: string | null;
};

type Props = {
  canManage: boolean;
};

type UiState = TableUiState;
type CardTextureMode = "cover" | "tile" | "paint_mirror";
type CardTextureSurface = {
  mode: CardTextureMode;
  textureUrl: string;
  tone: "light" | "dark";
  opacity: number;
  overlayOpacity: number;
  rotateWithOrientation?: boolean;
  tileWidth?: number;
};
type SpecialGameOption = {
  value: string;
  label: string;
  aliases: string[];
};
type W40kLayoutOption = {
  id: string;
  label: string;
  shareUrl: string;
};
type W40kDeploymentOption = {
  id: string;
  label: string;
  layouts: W40kLayoutOption[];
};
type W40kMapPackOption = {
  id: string;
  label: string;
  deployments: W40kDeploymentOption[];
};
type W40kLayoutCatalogResponse = {
  mapPacks: W40kMapPackOption[];
};

const SPECIAL_GAME_OPTIONS: SpecialGameOption[] = [
  { value: "custom:comodin", label: "Comodin", aliases: ["comodin", "wildcard"] },
];
const MULTI_GAME_PREFIX = "__multi_game__:";
const NONE_GAME_VALUE = "none";

const MAP_BASE_WIDTH = 1100;
const MAP_BASE_HEIGHT = 950;
const MAP_PADDING = 28;
const LOCAL_SPLIT_X = MAP_BASE_WIDTH / 2;
const GRID_SIZE = 4;
const MIN_TABLE_WIDTH = 64;
const MIN_TABLE_HEIGHT = 64;
type LocalKey = "LOCAL1" | "LOCAL2";

type Draft = {
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation: number;
  sizeTag: string;
  notes: string;
  status: TableStatus;
  gameId: string;
  gameLabel: string;
  layoutImagePath: string;
  sceneryImagePath: string;
};

const normalizeLabel = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");

function parseLabradorSelection(urlValue: string) {
  const value = urlValue.trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (!parsed.hostname.includes("labrador.dev")) return null;
    return {
      mapPackId: parsed.searchParams.get("mapPack") ?? "",
      deploymentId: parsed.searchParams.get("deployment") ?? "",
      layoutId: parsed.searchParams.get("layout") ?? "",
    };
  } catch {
    return null;
  }
}

function resolveLabradorPreviewUrl(urlValue: string) {
  const value = urlValue.trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (!parsed.hostname.includes("labrador.dev")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function resolveSpecialGameOption(label: string): SpecialGameOption | null {
  const normalized = normalizeLabel(label);
  return (
    SPECIAL_GAME_OPTIONS.find((option) => {
      const optionKey = option.value.replace("custom:", "");
      if (normalizeLabel(option.label) === normalized) return true;
      if (normalizeLabel(optionKey) === normalized) return true;
      return option.aliases.some((alias) => normalizeLabel(alias) === normalized);
    }) ?? null
  );
}

function parseMultiGameLabel(label: string): string[] | null {
  if (!label.startsWith(MULTI_GAME_PREFIX)) return null;
  try {
    const parsed = JSON.parse(label.slice(MULTI_GAME_PREFIX.length));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

const TABLE_TEXTURE_POOL = [
  assetUrl("/assets/textures/desert_table.png"),
  assetUrl("/assets/textures/jungle_table.png"),
  assetUrl("/assets/textures/urban_table1.png"),
  assetUrl("/assets/textures/urban_table2.png"),
].filter(Boolean);
const ZONE_TEXTURES = {
  comida: assetUrl("/assets/textures/eating_zone.png"),
  pintura: assetUrl("/assets/textures/painting_table.png"),
  streaming: assetUrl("/assets/textures/streaming_zone.png"),
  sofas: assetUrl("/assets/textures/chilling_zone.png"),
} as const;
const DEFAULT_MAP_TEXTURE_ASSET = assetUrl("/assets/textures/wood-white-grey.jpg");

function resolveMapTextureAsset(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return DEFAULT_MAP_TEXTURE_ASSET;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return assetUrl(trimmed);
}

const MAP_TEXTURE_ASSET = resolveMapTextureAsset(process.env.NEXT_PUBLIC_TABLE_MAP_TEXTURE);
const MAP_TEXTURE_CROP_BOTTOM_PX = 34;
const MAP_SURFACE_STYLE = MAP_TEXTURE_ASSET
  ? {
      backgroundColor: "#d8d9d6",
      backgroundImage: [
        "linear-gradient(180deg, rgba(255,255,255,0.42), rgba(219,223,222,0.55))",
        `url("${MAP_TEXTURE_ASSET}")`,
        "linear-gradient(90deg, rgba(255,255,255,0.14), rgba(0,0,0,0.1), rgba(255,255,255,0.1))",
      ].join(", "),
      // Horizontal tiling for smaller planks while keeping full canvas coverage.
      // Y is stretched + cropped from bottom to hide the ruler present in source image.
      backgroundSize: `100% 100%, 260px calc(100% + ${MAP_TEXTURE_CROP_BOTTOM_PX}px), 100% 100%`,
      backgroundPosition: "center, top left, center",
      backgroundRepeat: "no-repeat, repeat-x, no-repeat",
      backgroundBlendMode: "normal, normal, soft-light",
    }
  : {
      backgroundColor: "#d7d9d6",
      backgroundImage: [
        "linear-gradient(180deg, rgba(255,255,255,0.62), rgba(219,223,222,0.72))",
        "repeating-linear-gradient(90deg, rgba(255,255,255,0.2) 0 2px, rgba(210,214,212,0.2) 2px 112px, rgba(152,160,157,0.45) 112px 116px, rgba(244,245,242,0.18) 116px 228px)",
        "repeating-linear-gradient(90deg, rgba(255,255,255,0.09) 0 1px, rgba(0,0,0,0.08) 1px 2px, transparent 2px 18px)",
        "radial-gradient(circle at 20% 14%, rgba(255,255,255,0.24), transparent 45%)",
      ].join(", "),
      backgroundSize: "100% 100%, 228px 100%, 100% 100%, 100% 100%",
      backgroundPosition: "center, top left, top left, center",
    };

const TABLE_CARD_BACKGROUNDS: Record<UiState, string> = {
  available: "#dff7e8",
  reserved: "#fff4cc",
  in_play: "#d9f1ff",
  blocked: "#fde0e0",
};
const MAP_STATE_COLORS: Record<UiState, string> = {
  available: "#22c55e",
  reserved: "#eab308",
  in_play: "#38bdf8",
  blocked: "#ef4444",
};

const ZONE_BACKGROUND = "#d7dee7";
const ZONE_BORDER = "#b8c4d2";

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const expanded = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const value = Number.parseInt(expanded, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function extractMesaNumber(name: string) {
  const match = name.trim().match(/^mesa\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function isSameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDateLabel(date: Date) {
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

function formatTimeLabel(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeRange(start: Date | string, end: Date | string) {
  return `${formatTimeLabel(start)} - ${formatTimeLabel(end)}`;
}

function resolveParticipantName(participant: NonNullable<NonNullable<Reservation["match"]>["participants"]>[number]) {
  return participant.user.nick?.trim() || participant.user.name?.trim() || participant.user.email;
}

function formatCompactDayLabel(date: Date) {
  return date
    .toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    .replace(".", "")
    .toUpperCase();
}

function getTableScheduleState(
  table: Pick<Table, "id" | "status">,
  reservations: Reservation[],
  blocks: Block[],
  dayStart: Date,
  dayEnd: Date,
  referenceNow: Date
): TableUiState {
  const hasBlock = blocks.some((block) => {
    if (block.tableId !== table.id) return false;
    const start = toDateValue(block.start);
    const end = toDateValue(block.end);
    return !!start && !!end && start < dayEnd && end > dayStart;
  });

  if (hasBlock || table.status === "BLOCKED") return "blocked";

  const overlappingReservations = reservations.filter((reservation) => {
    if (reservation.tableId !== table.id || reservation.status === "CANCELLED") return false;
    const start = toDateValue(reservation.start);
    const end = toDateValue(reservation.end);
    return !!start && !!end && start < dayEnd && end > dayStart;
  });

  if (
    isSameCalendarDay(dayStart, referenceNow) &&
    overlappingReservations.some((reservation) => {
      const start = toDateValue(reservation.start);
      const end = toDateValue(reservation.end);
      return !!start && !!end && start <= referenceNow && referenceNow <= end && reservation.status === "IN_PLAY";
    })
  ) {
    return "in_play";
  }

  if (overlappingReservations.some((reservation) => reservation.status === "IN_PLAY")) return "in_play";
  if (overlappingReservations.length > 0) return "reserved";

  if (table.status === "IN_PLAY") return "in_play";
  if (table.status === "RESERVED") return "reserved";

  return "available";
}

function toDateValue(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveCardTextureSurface(table: Table, isZone: boolean): CardTextureSurface | null {
  const normalized = normalizeLabel(table.name);
  if (isZone) {
    if (normalized.includes("pintura") && ZONE_TEXTURES.pintura) {
      return {
        mode: "cover",
        textureUrl: ZONE_TEXTURES.pintura,
        tone: "dark",
        opacity: 1,
        overlayOpacity: 0,
        rotateWithOrientation: false,
      };
    }
    if (normalized.includes("comida") && ZONE_TEXTURES.comida) {
      return { mode: "tile", textureUrl: ZONE_TEXTURES.comida, tone: "dark", opacity: 0.56, overlayOpacity: 0.22, tileWidth: 190 };
    }
    if (normalized.includes("streaming") && ZONE_TEXTURES.streaming) {
      return { mode: "tile", textureUrl: ZONE_TEXTURES.streaming, tone: "light", opacity: 1, overlayOpacity: 0, tileWidth: 210 };
    }
    if (normalized.includes("sofas") && ZONE_TEXTURES.sofas) {
      return { mode: "tile", textureUrl: ZONE_TEXTURES.sofas, tone: "dark", opacity: 1, overlayOpacity: 0, tileWidth: 180 };
    }
    return null;
  }

  const mesaNumber = extractMesaNumber(table.name);
  if (!mesaNumber || TABLE_TEXTURE_POOL.length === 0) return null;
  const seed = `${table.id}:${table.name}:${mesaNumber}`;
  const textureUrl = TABLE_TEXTURE_POOL[hashString(seed) % TABLE_TEXTURE_POOL.length];
  return {
    mode: "cover",
    textureUrl,
    tone: "light",
    opacity: 0.58,
    overlayOpacity: 0.2,
    rotateWithOrientation: true,
  };
}

function resolveCardFillAlpha(table: Table, isZone: boolean) {
  if (isZone) return 0.5;
  const normalized = normalizeLabel(table.name);
  if (normalized.includes("streaming") || normalized.includes("sofas")) return 0.3;
  return 0.84;
}

export function TableMap({ canManage }: Props) {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [originalTables, setOriginalTables] = useState<Table[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [syncingLayout, setSyncingLayout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [w40kCatalog, setW40kCatalog] = useState<W40kMapPackOption[]>([]);
  const [w40kCatalogLoading, setW40kCatalogLoading] = useState(false);
  const [w40kCatalogError, setW40kCatalogError] = useState<string | null>(null);
  const [selectedW40kMapPackId, setSelectedW40kMapPackId] = useState("");
  const [selectedW40kDeploymentId, setSelectedW40kDeploymentId] = useState("");
  const [selectedW40kLayoutId, setSelectedW40kLayoutId] = useState("");
  const [layoutPreviewUrl, setLayoutPreviewUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{ title: string; url: string } | null>(null);
  const [uploadingLayout, setUploadingLayout] = useState(false);
  const [uploadingScenery, setUploadingScenery] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(() => new Date());
  const [scheduleReservations, setScheduleReservations] = useState<Reservation[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<Block[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [now, setNow] = useState(() => new Date());
  const selectedIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const miniMapContainerRef = useRef<HTMLDivElement | null>(null);
  const selectedPanelRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const resizeOriginRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const layoutFileInputRef = useRef<HTMLInputElement | null>(null);
  const sceneryFileInputRef = useRef<HTMLInputElement | null>(null);
  const [scale, setScale] = useState(1);
  const [miniContainerWidth, setMiniContainerWidth] = useState(0);
  const [activeLocal, setActiveLocal] = useState<LocalKey>("LOCAL1");
  const { games: gameCatalog } = useGamesCatalog();
  const gameById = useMemo(() => new Map(gameCatalog.map((game) => [game.id, game])), [gameCatalog]);
  const gameByNormalizedName = useMemo(
    () => new Map(gameCatalog.map((game) => [normalizeLabel(game.name), game])),
    [gameCatalog]
  );

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    if (!layoutPreviewUrl && !imagePreview) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [layoutPreviewUrl, imagePreview]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadW40kCatalog() {
      setW40kCatalogLoading(true);
      setW40kCatalogError(null);
      try {
        const res = await fetch("/api/juego-organizado/w40k-layout-catalog", { cache: "no-store" });
        const body = (await res.json().catch(() => null)) as W40kLayoutCatalogResponse | { error?: string } | null;
        if (!res.ok || !body || !("mapPacks" in body) || !Array.isArray(body.mapPacks)) {
          throw new Error((body as { error?: string } | null)?.error || "No se pudo cargar catálogo de layouts.");
        }
        if (cancelled) return;
        setW40kCatalog(body.mapPacks);
      } catch (e: any) {
        if (cancelled) return;
        setW40kCatalog([]);
        setW40kCatalogError(e?.message || "No se pudo cargar catálogo de layouts.");
      } finally {
        if (!cancelled) setW40kCatalogLoading(false);
      }
    }
    loadW40kCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const resize = () => {
      const { width } = node.getBoundingClientRect();
      if (width > 0) {
        const nextScale = Math.min(width / MAP_BASE_WIDTH, 1);
        setScale(nextScale);
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = miniMapContainerRef.current;
    if (!node) return;
    const resize = () => {
      const { width } = node.getBoundingClientRect();
      if (width > 0) {
        setMiniContainerWidth(width);
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const tablesRes = await fetch("/api/juego-organizado/tables", { cache: "no-store" });
        const parsePayload = async (res: Response) => {
          const text = await res.text();
          try {
            return text ? JSON.parse(text) : null;
          } catch (err) {
            console.error("parse error", err, text);
            throw new Error("Respuesta inesperada del servidor");
          }
        };

        const t = await parsePayload(tablesRes);
        if (!tablesRes.ok) {
          const message = t && (t.error as string);
          throw new Error(message || "Fallo al obtener datos");
        }

        if (cancelled) return;
        if (!Array.isArray(t)) {
          throw new Error("Formato de mesas invalido");
        }
        const rawTables: Table[] = t || [];
        const tablesData: Table[] = rawTables.map((table) => ({
          ...table,
          layouts: table.layouts ?? [],
          game: table.game ?? null,
        }));
        setTables(tablesData);
        setOriginalTables(tablesData);

        const currentSelection = selectedIdRef.current;
        const nextSelected =
          currentSelection && tablesData.some((table) => table.id === currentSelection)
            ? currentSelection
            : tablesData[0]?.id ?? null;

        setSelectedId(nextSelected);
        setDraft(nextSelected ? fromTable(tablesData.find((table) => table.id === nextSelected) as Table) : null);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : "No se pudieron cargar las mesas.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  useEffect(() => {
    let cancelled = false;
    async function loadSchedule() {
      setScheduleLoading(true);
      setScheduleError(null);
      try {
        const from = startOfDay(scheduleDate);
        const to = endOfDay(scheduleDate);
        const [reservationsRes, blocksRes] = await Promise.all([
          fetch(`/api/juego-organizado/reservations?from=${from.toISOString()}&to=${to.toISOString()}`, {
            cache: "no-store",
          }),
          fetch(`/api/juego-organizado/blocks?from=${from.toISOString()}&to=${to.toISOString()}`, {
            cache: "no-store",
          }),
        ]);

        const parsePayload = async (res: Response) => {
          const text = await res.text();
          try {
            return text ? JSON.parse(text) : null;
          } catch (err) {
            console.error("parse error", err, text);
            throw new Error("Respuesta inesperada del servidor");
          }
        };

        const [reservationsPayload, blocksPayload] = await Promise.all([
          parsePayload(reservationsRes),
          parsePayload(blocksRes),
        ]);

        if (!reservationsRes.ok || !blocksRes.ok) {
          const message =
            (reservationsPayload && (reservationsPayload.error as string)) ||
            (blocksPayload && (blocksPayload.error as string));
          throw new Error(message || "Fallo al obtener la planificacion del dia");
        }

        if (cancelled) return;
        setScheduleReservations(Array.isArray(reservationsPayload) ? reservationsPayload : []);
        setScheduleBlocks(Array.isArray(blocksPayload) ? blocksPayload : []);
      } catch (e) {
        console.error(e);
        if (cancelled) return;
        setScheduleReservations([]);
        setScheduleBlocks([]);
        setScheduleError(e instanceof Error ? e.message : "No se pudo cargar la planificacion del dia.");
      } finally {
        if (!cancelled) {
          setScheduleLoading(false);
        }
      }
    }

    loadSchedule();
    return () => {
      cancelled = true;
    };
  }, [refreshTick, scheduleDate]);

  function extractStoredGameValues(table: Table | null): string[] {
    if (!table) return [];
    const encoded = table.gameLabel ? parseMultiGameLabel(table.gameLabel) : null;
    if (encoded) return encoded;
    if (table.gameId) return [`game:${table.gameId}`];
    if (table.gameLabel) {
      const specialMatch = resolveSpecialGameOption(table.gameLabel);
      if (specialMatch) return [specialMatch.value];
      const gameMatch = gameByNormalizedName.get(normalizeLabel(table.gameLabel));
      if (gameMatch) return [`game:${gameMatch.id}`];
    }
    return [];
  }

  function resolveGameInfos(table: Table | null): ResolvedGameInfo[] {
    if (!table) return [];
    const values = extractStoredGameValues(table);
    if (values.length === 0) {
      const gameFromCatalog = table.gameId ? gameById.get(table.gameId) : null;
      const fallbackLabel = table.gameLabel || table.game?.name || gameFromCatalog?.name;
      if (!fallbackLabel) return [];
      const fallbackIcon = assetUrl(table.game?.iconImagePath ?? gameFromCatalog?.iconImagePath ?? "") || null;
      const fallbackSlug = table.game?.slug ?? gameFromCatalog?.slug ?? null;
      return [{ key: fallbackLabel, label: fallbackLabel, icon: fallbackIcon, slug: fallbackSlug }];
    }

    const seen = new Set<string>();
    const resolved: ResolvedGameInfo[] = [];
    for (const value of values) {
      if (seen.has(value)) continue;
      seen.add(value);
      if (value.startsWith("game:")) {
        const gameId = value.slice("game:".length);
        const game = gameById.get(gameId) ?? (table.game?.id === gameId ? table.game : null);
        if (!game) continue;
        resolved.push({
          key: value,
          label: game.name,
          icon: assetUrl(game.iconImagePath ?? "") || null,
          slug: game.slug ?? null,
        });
        continue;
      }
      if (value.startsWith("custom:")) {
        const option = SPECIAL_GAME_OPTIONS.find((item) => item.value === value);
        if (!option) continue;
        resolved.push({
          key: value,
          label: option.label,
          icon: null,
          slug: normalizeLabel(option.label),
        });
      }
    }
    return resolved;
  }

  const selectedTable = tables.find((t) => t.id === selectedId) || null;
  const selectedOriginalTable = originalTables.find((t) => t.id === selectedId) || null;
  const selectedIsZone = selectedTable ? isZoneTableName(selectedTable.name) : false;
  const selectedTablePreview =
    selectedTable && draft
      ? {
          ...selectedTable,
          gameId: draft.gameId || null,
          gameLabel: draft.gameLabel || "",
          layoutImagePath: draft.layoutImagePath || "",
          sceneryImagePath: draft.sceneryImagePath || "",
          notes: draft.notes || "",
          status: draft.status,
        }
      : selectedTable;
  const selectedGameInfos = resolveGameInfos(selectedTablePreview);
  const selectedIsW40k = selectedGameInfos.some((item) => item.slug === "w40k");
  const selectedLayout =
    selectedTablePreview?.layouts?.find((layout) => layout.isDefault) ??
    selectedTablePreview?.layouts?.[0] ??
    null;
  const scheduleDayStart = useMemo(() => startOfDay(scheduleDate), [scheduleDate]);
  const scheduleDayEnd = useMemo(() => endOfDay(scheduleDate), [scheduleDate]);
  const selectedState =
    selectedTablePreview && !isZoneTableName(selectedTablePreview.name)
      ? getTableScheduleState(selectedTablePreview, scheduleReservations, scheduleBlocks, scheduleDayStart, scheduleDayEnd, now)
      : null;
  const selectedDayReservations = useMemo(() => {
    if (!selectedId) return [];
    return scheduleReservations
      .filter((reservation) => reservation.tableId === selectedId && reservation.status !== "CANCELLED")
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [scheduleReservations, selectedId]);
  const selectedDayBlocks = useMemo(() => {
    if (!selectedId) return [];
    return scheduleBlocks
      .filter((block) => block.tableId === selectedId)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [scheduleBlocks, selectedId]);
  const selectedDayAgenda = useMemo(() => {
    const reservationItems = selectedDayReservations.map((reservation) => ({
      id: reservation.id,
      type: "reservation" as const,
      start: new Date(reservation.start),
      end: new Date(reservation.end),
      label:
        reservation.match?.format?.trim() ||
        reservation.notes?.trim() ||
        reservation.match?.notes?.trim() ||
        "Reserva de mesa",
      status: reservation.status,
      participants: reservation.match?.participants?.map(resolveParticipantName).filter(Boolean) ?? [],
    }));
    const blockItems = selectedDayBlocks.map((block) => ({
      id: block.id,
      type: "block" as const,
      start: new Date(block.start),
      end: new Date(block.end),
      label: block.reason?.trim() || "Mesa bloqueada",
      status: "BLOCKED" as const,
      participants: [] as string[],
    }));
    return [...reservationItems, ...blockItems].sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [selectedDayBlocks, selectedDayReservations]);
  const selectedDayFreeRanges = useMemo(() => {
    const occupied = selectedDayAgenda
      .map((entry) => ({
        start: Math.max(entry.start.getTime(), scheduleDayStart.getTime()),
        end: Math.min(entry.end.getTime(), scheduleDayEnd.getTime()),
      }))
      .filter((entry) => entry.start < entry.end)
      .sort((a, b) => a.start - b.start);

    const merged: { start: number; end: number }[] = [];
    for (const entry of occupied) {
      const last = merged[merged.length - 1];
      if (!last || entry.start > last.end) {
        merged.push({ ...entry });
      } else {
        last.end = Math.max(last.end, entry.end);
      }
    }

    const freeRanges: { start: Date; end: Date }[] = [];
    let cursor = scheduleDayStart.getTime();
    for (const entry of merged) {
      if (cursor < entry.start) {
        freeRanges.push({ start: new Date(cursor), end: new Date(entry.start) });
      }
      cursor = Math.max(cursor, entry.end);
    }
    if (cursor < scheduleDayEnd.getTime()) {
      freeRanges.push({ start: new Date(cursor), end: new Date(scheduleDayEnd) });
    }
    return freeRanges;
  }, [scheduleDayEnd, scheduleDayStart, selectedDayAgenda]);
  const nonZoneTables = useMemo(() => tables.filter((t) => !isZoneTableName(t.name)), [tables]);
  const tableCount = nonZoneTables.length;
  const scaledWidth = MAP_BASE_WIDTH * scale;
  const scaledHeight = MAP_BASE_HEIGHT * scale;
  const miniScale =
    miniContainerWidth > 0
      ? Math.min(1, Math.max(0.01, miniContainerWidth / LOCAL_SPLIT_X))
      : Math.min(1, scaledWidth / LOCAL_SPLIT_X);
  const miniViewportHeight = Math.max(280, Math.ceil(MAP_BASE_HEIGHT * miniScale));
  const selectedW40kMapPack = useMemo(
    () => w40kCatalog.find((pack) => pack.id === selectedW40kMapPackId) ?? null,
    [w40kCatalog, selectedW40kMapPackId]
  );
  const selectedW40kDeployments = useMemo(
    () => selectedW40kMapPack?.deployments ?? [],
    [selectedW40kMapPack]
  );
  const selectedW40kDeployment = useMemo(
    () => selectedW40kDeployments.find((deployment) => deployment.id === selectedW40kDeploymentId) ?? null,
    [selectedW40kDeployments, selectedW40kDeploymentId]
  );
  const selectedW40kLayouts = useMemo(
    () => selectedW40kDeployment?.layouts ?? [],
    [selectedW40kDeployment]
  );
  const selectedW40kLayout = useMemo(
    () => selectedW40kLayouts.find((layout) => layout.id === selectedW40kLayoutId) ?? null,
    [selectedW40kLayouts, selectedW40kLayoutId]
  );

  const snapPosition = useCallback((value: number) => {
    const rounded = snapToGrid ? Math.round(value / GRID_SIZE) * GRID_SIZE : Math.round(value);
    return Math.max(0, rounded);
  }, [snapToGrid]);

  const snapDimension = useCallback((value: number, min: number) => {
    const rounded = snapToGrid ? Math.round(value / GRID_SIZE) * GRID_SIZE : Math.round(value);
    return Math.max(min, rounded);
  }, [snapToGrid]);

  function tablesDiffers(a: Table, b: Table | undefined) {
    if (!b) return true;
    return a.posX !== b.posX || a.posY !== b.posY || a.width !== b.width || a.height !== b.height || a.rotation !== b.rotation;
  }

  function fromTable(table: Table): Draft {
    return {
      posX: table.posX,
      posY: table.posY,
      width: table.width,
      height: table.height,
      rotation: table.rotation,
      sizeTag: table.sizeTag || "",
      notes: table.notes || "",
      status: table.status,
      gameId: table.gameId || "",
      gameLabel: table.gameLabel || "",
      layoutImagePath: table.layoutImagePath || "",
      sceneryImagePath: table.sceneryImagePath || "",
    };
  }

  function updateSelectedDraft(partial: Partial<Draft>) {
    setDraft((prev) => (prev ? { ...prev, ...partial } : prev));
    if (!selectedId) return;
    setTables((prev) =>
      prev.map((table) => (table.id === selectedId ? { ...table, ...(partial as Partial<Table>) } : table))
    );
  }

  useEffect(() => {
    if (!selectedIsW40k || w40kCatalog.length === 0) return;

    const fromDraft = parseLabradorSelection(draft?.layoutImagePath ?? "");
    const fallbackMap = w40kCatalog[0];
    const nextMapPackId =
      (fromDraft?.mapPackId && w40kCatalog.some((pack) => pack.id === fromDraft.mapPackId) ? fromDraft.mapPackId : "") ||
      fallbackMap?.id ||
      "";
    const mapPack = w40kCatalog.find((pack) => pack.id === nextMapPackId) ?? fallbackMap;
    const deploymentPool = mapPack?.deployments ?? [];
    const nextDeploymentId =
      (fromDraft?.deploymentId && deploymentPool.some((dep) => dep.id === fromDraft.deploymentId) ? fromDraft.deploymentId : "") ||
      deploymentPool[0]?.id ||
      "";
    const deployment = deploymentPool.find((dep) => dep.id === nextDeploymentId) ?? deploymentPool[0];
    const layoutPool = deployment?.layouts ?? [];
    const nextLayoutId =
      (fromDraft?.layoutId && layoutPool.some((layout) => layout.id === fromDraft.layoutId) ? fromDraft.layoutId : "") ||
      layoutPool[0]?.id ||
      "";

    setSelectedW40kMapPackId(nextMapPackId);
    setSelectedW40kDeploymentId(nextDeploymentId);
    setSelectedW40kLayoutId(nextLayoutId);
  }, [selectedId, selectedIsW40k, w40kCatalog, draft?.layoutImagePath]);

  useEffect(() => {
    if (!selectedIsW40k || w40kCatalog.length === 0) return;

    const mapPack = w40kCatalog.find((pack) => pack.id === selectedW40kMapPackId) ?? w40kCatalog[0];
    if (mapPack && mapPack.id !== selectedW40kMapPackId) {
      setSelectedW40kMapPackId(mapPack.id);
      return;
    }

    const deployment =
      mapPack?.deployments.find((item) => item.id === selectedW40kDeploymentId) ?? mapPack?.deployments[0];
    if (deployment && deployment.id !== selectedW40kDeploymentId) {
      setSelectedW40kDeploymentId(deployment.id);
      return;
    }

    const layout = deployment?.layouts.find((item) => item.id === selectedW40kLayoutId) ?? deployment?.layouts[0];
    if (layout && layout.id !== selectedW40kLayoutId) {
      setSelectedW40kLayoutId(layout.id);
    }
  }, [selectedIsW40k, w40kCatalog, selectedW40kMapPackId, selectedW40kDeploymentId, selectedW40kLayoutId]);

  function handleSelect(table: Table, scrollToDetails = false) {
    setSelectedId(table.id);
    setDraft(fromTable(table));
    if (scrollToDetails && typeof window !== "undefined") {
      window.setTimeout(() => {
        selectedPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
    }
  }

  function resetSelectedToSaved() {
    if (!selectedId || !selectedOriginalTable) return;
    setTables((prev) =>
      prev.map((table) => (table.id === selectedId ? { ...selectedOriginalTable } : table))
    );
    setDraft(fromTable(selectedOriginalTable));
  }

  async function persistLayout() {
    const changed = tables.filter((table) => tablesDiffers(table, originalTables.find((o) => o.id === table.id)));
    if (changed.length === 0) return true;
    try {
      await Promise.all(
        changed.map((table) =>
          fetch(`/api/juego-organizado/tables/${table.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              posX: table.posX,
              posY: table.posY,
              width: table.width,
              height: table.height,
              rotation: table.rotation,
            }),
          }).then((res) => {
            if (!res.ok) throw new Error("No se pudo guardar la distribucion.");
            return res;
          })
        )
      );
      setOriginalTables(tables);
      return true;
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar la distribucion.");
      return false;
    }
  }

  function handleStartDrag(table: Table, clientX: number, clientY: number) {
    if (!editing || !canManage || !mapRef.current || isZoneTableName(table.name)) return;
    const rect = mapRef.current.getBoundingClientRect();
    dragOffsetRef.current = {
      x: clientX - rect.left - table.posX * scale,
      y: clientY - rect.top - table.posY * scale,
    };
    setDraggingId(table.id);
  }

  function handleStartResize(table: Table, clientX: number, clientY: number) {
    if (!editing || !canManage || isZoneTableName(table.name)) return;
    resizeOriginRef.current = {
      x: clientX,
      y: clientY,
      width: table.width,
      height: table.height,
    };
    setSelectedId(table.id);
    setDraft(fromTable(table));
    setResizingId(table.id);
  }

  useEffect(() => {
    if (!draggingId) return;
    function updatePosition(clientX: number, clientY: number) {
      if (!mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      const nextX = snapPosition((clientX - rect.left - dragOffsetRef.current.x) / scale);
      const nextY = snapPosition((clientY - rect.top - dragOffsetRef.current.y) / scale);
      setTables((prev) =>
        prev.map((t) => (t.id === draggingId ? { ...t, posX: nextX, posY: nextY } : t))
      );
      setDraft((prev) => (prev && selectedId === draggingId ? { ...prev, posX: nextX, posY: nextY } : prev));
    }
    function onMove(e: MouseEvent) {
      updatePosition(e.clientX, e.clientY);
    }
    function onTouchMove(e: TouchEvent) {
      const touch = e.touches[0];
      if (touch) updatePosition(touch.clientX, touch.clientY);
    }
    function onUp() {
      setDraggingId(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [draggingId, scale, selectedId, snapPosition]);

  useEffect(() => {
    if (!resizingId) return;
    function updateSize(clientX: number, clientY: number) {
      const deltaX = (clientX - resizeOriginRef.current.x) / scale;
      const deltaY = (clientY - resizeOriginRef.current.y) / scale;
      const nextWidth = snapDimension(resizeOriginRef.current.width + deltaX, MIN_TABLE_WIDTH);
      const nextHeight = snapDimension(resizeOriginRef.current.height + deltaY, MIN_TABLE_HEIGHT);

      setTables((prev) =>
        prev.map((table) =>
          table.id === resizingId ? { ...table, width: nextWidth, height: nextHeight } : table
        )
      );
      setDraft((prev) =>
        prev && selectedId === resizingId ? { ...prev, width: nextWidth, height: nextHeight } : prev
      );
    }

    function onMove(e: MouseEvent) {
      updateSize(e.clientX, e.clientY);
    }

    function onTouchMove(e: TouchEvent) {
      const touch = e.touches[0];
      if (touch) updateSize(touch.clientX, touch.clientY);
    }

    function onUp() {
      setResizingId(null);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [resizingId, scale, selectedId, snapDimension]);

  useEffect(() => {
    if (!editing) {
      setDraggingId(null);
      setResizingId(null);
    }
  }, [editing]);

  async function handleAddTable(base?: Partial<Table>) {
    if (!canManage) return;
    setCreating(true);
    setError(null);

    const offset = tables.length * 12;
    const shouldAutoName = !base?.name;
    const payload = {
      name: base?.name || "",
      autoName: shouldAutoName,
      posX: (base?.posX ?? 48) + offset,
      posY: (base?.posY ?? 48) + offset,
      width: base?.width ?? 140,
      height: base?.height ?? 90,
      rotation: base?.rotation ?? 0,
      sizeTag: base?.sizeTag ?? "4p",
      notes: base?.notes ?? "",
      status: (base?.status as TableStatus) ?? "AVAILABLE",
      gameId: base?.gameId ?? null,
      gameLabel: base?.gameLabel ?? "",
      layoutImagePath: base?.layoutImagePath ?? "",
      sceneryImagePath: base?.sceneryImagePath ?? "",
    };

    try {
      const res = await fetch("/api/juego-organizado/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo crear la mesa.");
      }
      const created: Table = await res.json();
      setTables((prev) => [...prev, created]);
      setOriginalTables((prev) => [...prev, created]);
      setSelectedId(created.id);
      setDraft(fromTable(created));
    } catch (e: any) {
      setError(e?.message || "Error al crear la mesa.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDuplicateSelected() {
    if (!selectedTable) return;
    return handleAddTable({
      ...selectedTable,
      posX: selectedTable.posX + 32,
      posY: selectedTable.posY + 24,
      name: `${selectedTable.name} (copia)`,
    });
  }

  async function handleDeleteSelected() {
    if (!selectedTable || !canManage) return;
    const confirmed =
      typeof window !== "undefined" ? window.confirm(`Eliminar ${selectedTable.name}?`) : true;
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/juego-organizado/tables/${selectedTable.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo eliminar la mesa.");
      }
      const remaining = tables.filter((t) => t.id !== selectedTable.id);
      setTables(remaining);
      setOriginalTables(remaining);
      const fallback = remaining[0] ?? null;
      setSelectedId(fallback ? fallback.id : null);
      setDraft(fallback ? fromTable(fallback) : null);
    } catch (e: any) {
      setError(e?.message || "Error al eliminar la mesa.");
    } finally {
      setDeleting(false);
    }
  }

  function handleReload() {
    setNow(new Date());
    setRefreshTick((tick) => tick + 1);
  }

  async function handleSave() {
    if (!selectedTable || !draft) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Draft =
        selectedIsW40k && selectedW40kLayout
          ? { ...draft, layoutImagePath: selectedW40kLayout.shareUrl }
          : draft;
      const res = await fetch(`/api/juego-organizado/tables/${selectedTable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo guardar la mesa.");
      }
      const updated = await res.json();
      setTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setOriginalTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setDraft(fromTable(updated));
    } catch (e: any) {
      setError(e?.message || "Error al guardar la mesa.");
    } finally {
      setSaving(false);
    }
  }

  function handleChange<K extends keyof Draft>(key: K, value: Draft[K]) {
    updateSelectedDraft({ [key]: value } as Partial<Draft>);
  }

  const gameOptions = useMemo(
    () => [
      { value: NONE_GAME_VALUE, label: "Sin asignar" },
      ...SPECIAL_GAME_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
      ...gameCatalog.map((game) => ({ value: `game:${game.id}`, label: game.name })),
    ],
    [gameCatalog]
  );
  const selectableGameValues = useMemo(() => new Set(gameOptions.map((option) => option.value)), [gameOptions]);

  const selectedGameValues = (() => {
    if (!draft) return [NONE_GAME_VALUE];
    const values = extractStoredGameValues({
      id: selectedTable?.id ?? "draft",
      name: selectedTable?.name ?? "",
      posX: draft.posX,
      posY: draft.posY,
      width: draft.width,
      height: draft.height,
      rotation: draft.rotation,
      status: draft.status,
      gameId: draft.gameId || null,
      gameLabel: draft.gameLabel || "",
    });
    const filtered = values.filter((value) => selectableGameValues.has(value));
    return filtered.length > 0 ? filtered : [NONE_GAME_VALUE];
  })();

  function applyGameSelections(nextValues: string[]) {
    const filtered = nextValues.filter((value) => selectableGameValues.has(value) && value !== NONE_GAME_VALUE);
    if (filtered.length === 0) {
      updateSelectedDraft({ gameId: "", gameLabel: "" });
      return;
    }
    if (filtered.length === 1 && filtered[0].startsWith("game:")) {
      updateSelectedDraft({ gameId: filtered[0].slice("game:".length), gameLabel: "" });
      return;
    }
    if (filtered.length === 1 && filtered[0].startsWith("custom:")) {
      const customOption = SPECIAL_GAME_OPTIONS.find((option) => option.value === filtered[0]);
      updateSelectedDraft({ gameId: "", gameLabel: customOption?.label ?? filtered[0].slice("custom:".length) });
      return;
    }
    updateSelectedDraft({
      gameId: "",
      gameLabel: `${MULTI_GAME_PREFIX}${JSON.stringify(filtered)}`,
    });
  }

  function handleGameSelectionToggle(value: string) {
    if (!draft) return;
    if (value === NONE_GAME_VALUE) {
      applyGameSelections([]);
      return;
    }
    const base = selectedGameValues.filter((item) => item !== NONE_GAME_VALUE);
    const hasValue = base.includes(value);
    const nextValues = hasValue ? base.filter((item) => item !== value) : [...base, value];
    applyGameSelections(nextValues);
  }

  function handleApplyW40kLayoutLink() {
    if (!selectedW40kLayout) return;
    handleChange("layoutImagePath", selectedW40kLayout.shareUrl);
  }

  function handleOpenLayoutPreview(url: string) {
    const previewUrl = resolveLabradorPreviewUrl(url);
    if (!previewUrl) return;
    setLayoutPreviewUrl(previewUrl);
  }

  function handleOpenImagePreview(title: string, url: string) {
    const value = url.trim();
    if (!value) return;
    setImagePreview({ title, url: value });
  }

  async function handleUploadTableImage(kind: "layout" | "terrain", file: File) {
    if (!selectedTable) return;
    const mesaNumber = extractMesaNumber(selectedTable.name);
    const mesaFolder = mesaNumber != null ? `mesa-${mesaNumber}` : selectedTable.id;
    const folder = kind === "layout" ? `public/assets/layouts/${mesaFolder}` : `public/assets/terrain/${mesaFolder}`;
    const setUploading = kind === "layout" ? setUploadingLayout : setUploadingScenery;
    const targetField: "layoutImagePath" | "sceneryImagePath" =
      kind === "layout" ? "layoutImagePath" : "sceneryImagePath";

    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadImageToR2(file, { folder });
      updateSelectedDraft({ [targetField]: uploaded.publicUrl } as Partial<Draft>);
    } catch (e: any) {
      setError(e?.message || "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  async function handleCopyW40kLayoutLink() {
    if (!selectedW40kLayout || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(selectedW40kLayout.shareUrl);
    } catch {
      // noop
    }
  }

  function handleApplySizePreset(width: number, height: number, sizeTag: string) {
    updateSelectedDraft({
      width,
      height,
      sizeTag,
      rotation: 0,
    });
  }

  function handleRotateSelected() {
    if (!draft) return;
    updateSelectedDraft({
      width: draft.height,
      height: draft.width,
      rotation: ((draft.rotation + 90) % 360) as Draft["rotation"],
    });
  }

  async function handleToggleEditing() {
    if (!editing) {
      setEditing(true);
      return;
    }
    setSyncingLayout(true);
    const ok = await persistLayout();
    setSyncingLayout(false);
    if (ok) setEditing(false);
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 overflow-x-hidden">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 text-sm sm:w-auto sm:gap-3">
          <Legend color={MAP_STATE_COLORS.available} label="Libre" />
          <Legend color={MAP_STATE_COLORS.reserved} label="Reservada" />
          <Legend color={MAP_STATE_COLORS.in_play} label="En juego" />
          <Legend color={MAP_STATE_COLORS.blocked} label="Bloqueada" />
        </div>
        <div className="flex w-full min-w-0 flex-wrap items-center justify-start gap-2 text-sm text-[var(--muted)] sm:w-auto sm:justify-end">
          <CompactDayNavigator
            date={scheduleDate}
            onPrevious={() => setScheduleDate((prev) => addDays(prev, -1))}
            onNext={() => setScheduleDate((prev) => addDays(prev, 1))}
          />
          <button
            type="button"
            className="rounded-xl border border-[var(--hairline)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--accent-50)] disabled:opacity-60"
            onClick={() => setScheduleDate(new Date())}
            disabled={scheduleLoading}
          >
            Hoy
          </button>
          <span>{loading ? "Cargando..." : `${tableCount} mesas`}</span>
          <button
            type="button"
            className="rounded-xl border border-[var(--hairline)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--accent-50)] disabled:opacity-60"
            onClick={handleReload}
            disabled={loading || saving || creating || deleting || syncingLayout}
          >
            Recargar
          </button>
          {canManage && (
            <>
              <button
                type="button"
                className={clsx(
                  "rounded-xl px-3 py-2 text-xs font-semibold shadow-sm",
                  editing
                    ? "bg-slate-800 text-white hover:bg-slate-700"
                    : "border border-[var(--hairline)] text-[var(--text)] hover:bg-[var(--accent-50)]"
                )}
                onClick={handleToggleEditing}
                disabled={saving || creating || deleting || syncingLayout}
              >
                {editing ? "Salir de edicion" : "Editar mesas"}
              </button>
              {editing && (
                <>
                  <button
                    type="button"
                    className="rounded-xl bg-[var(--accent-600)] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-500)] disabled:opacity-60"
                    onClick={() => handleAddTable()}
                    disabled={creating || saving || deleting || syncingLayout}
                  >
                    {creating ? "Creando..." : "Anadir mesa"}
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-[var(--hairline)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--accent-50)] disabled:opacity-60"
                    onClick={handleDuplicateSelected}
                    disabled={!selectedTable || selectedIsZone || creating || saving || deleting || syncingLayout}
                  >
                    Duplicar seleccion
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-red-200/70 bg-red-50/80 px-3 py-2 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-100 disabled:opacity-60"
                    onClick={handleDeleteSelected}
                    disabled={!selectedTable || selectedIsZone || deleting || saving || creating || syncingLayout}
                  >
                    {deleting ? "Eliminando..." : "Eliminar"}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {canManage && editing && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted)]">
          <label className="inline-flex items-center gap-2 text-[var(--text)]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border border-[var(--hairline)] accent-[var(--accent-600)]"
              checked={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.checked)}
            />
            Ajuste a cuadricula de {GRID_SIZE}px
          </label>
          <span>Las zonas quedan fijas y no se exportan en el bloque seed.</span>
        </div>
      )}

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div ref={containerRef} className="relative w-full max-w-full min-w-0 space-y-4 overflow-hidden">
        <div
          className="relative hidden overflow-hidden rounded-3xl border border-[var(--hairline)] shadow-2xl lg:block"
          style={{ width: scaledWidth, height: scaledHeight, ...MAP_SURFACE_STYLE }}
        >
          <div
            ref={mapRef}
            className="relative"
            style={{
              width: MAP_BASE_WIDTH,
              height: MAP_BASE_HEIGHT,
              boxSizing: "border-box",
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              padding: MAP_PADDING,
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 z-0"
              style={MAP_SURFACE_STYLE}
            />
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <div
                className="absolute left-1/2 z-10 w-[3px] -translate-x-1/2 bg-slate-500/60 shadow-[0_0_10px_rgba(0,0,0,0.08)]"
                style={{ top: 0, height: 256, borderRadius: 9999 }}
              />
              <div
                className="absolute left-1/2 z-10 w-[3px] -translate-x-1/2 bg-slate-500/60 shadow-[0_0_10px_rgba(0,0,0,0.08)]"
                style={{ top: 325, height: `${MAP_BASE_HEIGHT - 325}px`, borderRadius: 9999 }}
              />
            </div>
            {tables.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="pointer-events-auto rounded-2xl border border-dashed border-slate-400/70 bg-white/80 px-6 py-5 text-center shadow-lg">
                  <p className="text-sm font-semibold text-slate-700">Aun no hay mesas en el plano.</p>
                  {canManage && editing && (
                    <button
                      type="button"
                      className="mt-3 rounded-xl bg-[var(--accent-600)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-500)] disabled:opacity-60"
                      onClick={() => handleAddTable()}
                      disabled={creating || saving || deleting}
                    >
                      {creating ? "Creando..." : "Anadir la primera mesa"}
                    </button>
                  )}
                </div>
              </div>
            )}
            {tables.map((table) => {
              const isZone = isZoneTableName(table.name);
              const state: UiState | null = isZone
                ? null
                : getTableScheduleState(table, scheduleReservations, scheduleBlocks, scheduleDayStart, scheduleDayEnd, now);
              const gameInfo = isZone ? null : resolveGameInfos(table)[0] ?? null;
              const textureSurface = resolveCardTextureSurface(table, isZone);
              const fillAlpha = resolveCardFillAlpha(table, isZone);
              return (
                <div
                  key={table.id}
                  className={clsx(
                    "absolute flex flex-col overflow-hidden rounded-xl border bg-white/80 px-2.5 py-2 text-xs font-semibold text-slate-900 shadow-lg backdrop-blur-sm transition ring-offset-2 ring-offset-[#f5f0e6]",
                    isZone ? (editing ? "z-0 cursor-pointer" : "z-0 pointer-events-none") : "z-10 cursor-pointer",
                    selectedId === table.id && "ring-2 ring-[var(--accent-600)]"
                  )}
                  style={{
                    left: table.posX,
                    top: table.posY,
                    width: table.width,
                    height: table.height,
                    transform: `rotate(${table.rotation}deg)`,
                    backgroundColor: isZone
                      ? hexToRgba(ZONE_BACKGROUND, fillAlpha)
                      : hexToRgba(TABLE_CARD_BACKGROUNDS[state!], fillAlpha),
                    borderColor: isZone ? ZONE_BORDER : MAP_STATE_COLORS[state!],
                    borderWidth: isZone ? 1 : 2,
                    zIndex: isZone ? 1 : 10,
                    boxShadow: isZone
                      ? "0 14px 28px rgba(103, 120, 145, 0.15), inset 0 1px 0 rgba(255,255,255,0.5)"
                      : "0 10px 24px rgba(77, 99, 118, 0.16), inset 0 1px 0 rgba(255,255,255,0.55)",
                  }}
                  onClick={() => handleSelect(table, true)}
                  onMouseDown={(e) => handleStartDrag(table, e.clientX, e.clientY)}
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    if (touch) handleStartDrag(table, touch.clientX, touch.clientY);
                  }}
                >
                  {textureSurface && <CardTextureLayer table={table} surface={textureSurface} />}
                  <div className="relative z-10 h-full">
                    <TableCardContent table={table} isZone={isZone} state={state} gameInfo={gameInfo} textured={Boolean(textureSurface)} tone={textureSurface?.tone ?? "dark"} />
                  </div>
                  {editing && canManage && !isZone && selectedId === table.id && (
                    <button
                      type="button"
                      aria-label={`Redimensionar ${table.name}`}
                      className="absolute bottom-1.5 right-1.5 z-20 h-4 w-4 rounded-sm border border-slate-400/80 bg-white shadow-sm"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleStartResize(table, e.clientX, e.clientY);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        const touch = e.touches[0];
                        if (touch) handleStartResize(table, touch.clientX, touch.clientY);
                      }}
                    >
                      <span className="block h-full w-full bg-[linear-gradient(135deg,transparent_0,transparent_35%,rgba(15,23,42,0.28)_35%,rgba(15,23,42,0.28)_48%,transparent_48%,transparent_60%,rgba(15,23,42,0.28)_60%,rgba(15,23,42,0.28)_72%,transparent_72%)]" />
                    </button>
                  )}
                </div>
              );
            })}
            {editing && canManage && (
              <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-full bg-slate-900/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-lg">
                Modo edicion: arrastra para recolocar y usa la esquina para redimensionar
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <div className="order-3 min-w-0 overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4 lg:order-none lg:col-span-2">
          <div className="flex flex-col gap-2">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text)]">Planificacion diaria</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Consulta la ocupacion prevista de la mesa seleccionada y muévete dia a dia.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--hairline)] bg-slate-950/30 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Fecha consultada</span>
            <span className="text-sm font-semibold text-[var(--text)]">{formatDateLabel(scheduleDate)}</span>
            {isSameCalendarDay(scheduleDate, now) && (
              <span className="rounded-full border border-[var(--hairline)] bg-[var(--card)] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text)]">
                Hoy
              </span>
            )}
          </div>

          {scheduleError ? (
            <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {scheduleError}
            </div>
          ) : selectedTablePreview && !selectedIsZone ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[var(--hairline)] bg-slate-950/30 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Mesa</div>
                  <select
                    className="mt-2 w-full min-w-0 rounded-lg border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
                    value={selectedId ?? ""}
                    onChange={(event) => {
                      const nextTable = tables.find((table) => table.id === event.target.value);
                      if (nextTable) handleSelect(nextTable);
                    }}
                  >
                    {tables.map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-xl border border-[var(--hairline)] bg-slate-950/30 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Reservas</div>
                  <div className="mt-2 text-2xl font-bold text-[var(--text)]">{selectedDayReservations.length}</div>
                </div>
                <div className="rounded-xl border border-[var(--hairline)] bg-slate-950/30 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Bloqueos</div>
                  <div className="mt-2 text-2xl font-bold text-[var(--text)]">{selectedDayBlocks.length}</div>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--hairline)] bg-slate-950/30 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Disponibilidad</div>
                {scheduleLoading ? (
                  <div className="mt-2 text-sm text-[var(--muted)]">Cargando planificacion...</div>
                ) : selectedDayAgenda.length === 0 ? (
                  <div className="mt-2 text-sm font-medium text-emerald-300">Libre todo el dia.</div>
                ) : selectedDayFreeRanges.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedDayFreeRanges.map((range, index) => (
                      <span
                        key={`${range.start.toISOString()}-${index}`}
                        className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200"
                      >
                        {formatTimeRange(range.start, range.end)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-sm font-medium text-amber-200">Sin huecos libres en el dia consultado.</div>
                )}
              </div>

              <div className="rounded-xl border border-[var(--hairline)] bg-slate-950/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Agenda de la mesa</div>
                    <div className="text-xs text-[var(--muted)]">{formatShortDateLabel(scheduleDate)}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CompactDayNavigator
                      date={scheduleDate}
                      onPrevious={() => setScheduleDate((prev) => addDays(prev, -1))}
                      onNext={() => setScheduleDate((prev) => addDays(prev, 1))}
                    />
                    <button
                      type="button"
                      className="rounded-xl border border-[var(--hairline)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--accent-50)] disabled:opacity-60"
                      onClick={() => setScheduleDate(new Date())}
                      disabled={scheduleLoading}
                    >
                      Hoy
                    </button>
                  </div>
                </div>
                {scheduleLoading ? (
                  <div className="mt-3 text-sm text-[var(--muted)]">Cargando agenda...</div>
                ) : selectedDayAgenda.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {selectedDayAgenda.map((entry) => (
                      <div
                        key={`${entry.type}-${entry.id}`}
                        className="flex flex-col gap-2 rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-3 text-sm sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={clsx(
                                "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
                                entry.type === "block"
                                  ? "bg-rose-500/20 text-rose-100"
                                  : entry.status === "IN_PLAY"
                                    ? "bg-sky-500/20 text-sky-100"
                                    : "bg-yellow-500/20 text-yellow-100"
                              )}
                            >
                              {entry.type === "block" ? "Bloqueo" : entry.status === "IN_PLAY" ? "En juego" : "Reserva"}
                            </span>
                            <span className="font-semibold text-[var(--text)]">{formatTimeRange(entry.start, entry.end)}</span>
                          </div>
                          <div className="mt-2 min-w-0 text-sm text-[var(--text)]">{entry.label}</div>
                          {entry.participants.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {entry.participants.map((participant) => (
                                <span
                                  key={`${entry.id}-${participant}`}
                                  className="rounded-full border border-[var(--hairline)] bg-slate-900/40 px-2.5 py-1 text-[11px] font-medium text-[var(--text)]"
                                >
                                  {participant}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-[var(--muted)]">
                    No hay reservas ni bloqueos para esta mesa en la fecha seleccionada.
                  </div>
                )}
              </div>
            </div>
          ) : selectedIsZone ? (
            <div className="mt-4 rounded-xl border border-[var(--hairline)] bg-slate-950/30 px-4 py-3 text-sm text-[var(--muted)]">
              Las zonas del local no tienen planificacion de partidas asociada.
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-[var(--hairline)] bg-slate-950/30 px-4 py-3 text-sm text-[var(--muted)]">
              Selecciona una mesa para consultar su disponibilidad por dia.
            </div>
          )}
        </div>

        <div ref={selectedPanelRef} className="order-2 min-w-0 overflow-x-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4 lg:order-none">
          <h3 className="text-lg font-semibold text-[var(--text)]">Mesa seleccionada</h3>
          {selectedTable && draft ? (
            <div className="mt-3 min-w-0 space-y-4 text-sm text-[var(--muted)]">
              <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Mesa
                <select
                  className="w-full min-w-0 rounded-lg border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
                  value={selectedId ?? ""}
                  onChange={(event) => {
                    const nextTable = tables.find((table) => table.id === event.target.value);
                    if (nextTable) handleSelect(nextTable);
                  }}
                >
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base font-semibold text-[var(--text)]">{selectedTablePreview?.name}</div>
                  {selectedGameInfos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedGameInfos.map((gameInfo) => (
                        <div
                          key={gameInfo.key}
                          className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--card)] px-3 py-1 text-[12px] font-semibold text-[var(--text)]"
                        >
                          {gameInfo.icon && (
                            <img
                              src={gameInfo.icon}
                              alt={gameInfo.label}
                              className="h-5 w-5 shrink-0 rounded object-contain"
                            />
                          )}
                          <span className="truncate">{gameInfo.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedState && (
                  <span className="shrink-0 rounded-full bg-white/85 px-3 py-[6px] text-[11px] font-semibold uppercase tracking-wide text-slate-900 shadow-sm">
                    {TABLE_STATE_LABELS[selectedState]}
                  </span>
                )}
              </div>

              <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <DetailRow label="Layout">
                  {selectedIsW40k ? (
                    selectedTablePreview?.layoutImagePath ? (
                      resolveLabradorPreviewUrl(selectedTablePreview.layoutImagePath) ? (
                        <button
                          type="button"
                          className="inline-flex max-w-full whitespace-normal rounded-md border border-[var(--hairline)] bg-white px-2 py-1 text-xs font-semibold text-[var(--text)] hover:bg-[var(--accent-50)]"
                          onClick={() => handleOpenLayoutPreview(selectedTablePreview.layoutImagePath!)}
                        >
                          Ver layout en flotante
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="block w-full overflow-hidden rounded-lg border border-[var(--hairline)] bg-white text-left"
                          onClick={() =>
                            handleOpenImagePreview(`Layout de ${selectedTablePreview?.name}`, selectedTablePreview.layoutImagePath!)
                          }
                        >
                          <img
                            src={selectedTablePreview?.layoutImagePath}
                            alt={`Layout de ${selectedTablePreview?.name}`}
                            className="h-28 w-full object-cover"
                          />
                          {selectedLayout && (
                            <div className="px-2 py-1 text-[11px] text-[var(--muted)]">{selectedLayout.title}</div>
                          )}
                        </button>
                      )
                    ) : (
                      <span>Sin layout asignado.</span>
                    )
                  ) : (
                    selectedTablePreview?.layoutImagePath ? (
                      <button
                        type="button"
                        className="block w-full overflow-hidden rounded-lg border border-[var(--hairline)] bg-white text-left"
                        onClick={() =>
                          handleOpenImagePreview(`Layout de ${selectedTablePreview?.name}`, selectedTablePreview.layoutImagePath!)
                        }
                      >
                        <img
                          src={selectedTablePreview.layoutImagePath}
                          alt={`Layout de ${selectedTablePreview?.name}`}
                          className="h-28 w-full object-cover"
                        />
                      </button>
                    ) : (
                      <span>Sin layout asignado.</span>
                    )
                  )}
                </DetailRow>

                <DetailRow label="Escenografia">
                  {selectedTablePreview?.sceneryImagePath ? (
                    <button
                      type="button"
                      className="block w-full overflow-hidden rounded-lg border border-[var(--hairline)] bg-white text-left"
                      onClick={() =>
                        handleOpenImagePreview(
                          `Escenografia de ${selectedTablePreview?.name}`,
                          selectedTablePreview.sceneryImagePath!
                        )
                      }
                    >
                      <img
                        src={selectedTablePreview.sceneryImagePath}
                        alt={`Escenografia de ${selectedTablePreview?.name}`}
                        className="h-28 w-full rounded-lg object-cover"
                      />
                    </button>
                  ) : (
                    <span>Sin foto asociada.</span>
                  )}
                </DetailRow>

                <DetailRow label="Notas">
                  {selectedTablePreview?.notes ? (
                    <div
                      className="prose prose-sm max-w-none text-[var(--text)] prose-p:my-1 prose-ul:my-1 prose-ol:my-1"
                      dangerouslySetInnerHTML={{ __html: selectedTablePreview.notes }}
                    />
                  ) : (
                    <span>Sin notas.</span>
                  )}
                </DetailRow>
              </div>

              {canManage ? (
                editing ? (
                  selectedIsZone ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Esta zona queda bloqueada en la edicion rapida. Se mantiene como referencia fija del plano.
                    </div>
                  ) : (
                    <div className="min-w-0 space-y-3">
                      <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                        <MiniActionButton label="Horizontal" onClick={() => handleApplySizePreset(140, 80, "Horizontal")} />
                        <MiniActionButton label="Vertical" onClick={() => handleApplySizePreset(80, 140, "Vertical")} />
                        <MiniActionButton label="Vertical XL" onClick={() => handleApplySizePreset(80, 170, "Vertical")} />
                        <MiniActionButton label="Girar 90" onClick={handleRotateSelected} />
                      </div>

                      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                        <LabelInput
                          label="Pos X"
                          value={draft.posX}
                          onChange={(v) => handleChange("posX", snapPosition(Number(v) || 0))}
                          disabled={!editing}
                        />
                        <LabelInput
                          label="Pos Y"
                          value={draft.posY}
                          onChange={(v) => handleChange("posY", snapPosition(Number(v) || 0))}
                          disabled={!editing}
                        />
                        <LabelInput
                          label="Ancho"
                          value={draft.width}
                          onChange={(v) => handleChange("width", snapDimension(Number(v) || 0, MIN_TABLE_WIDTH))}
                          disabled={!editing}
                        />
                        <LabelInput
                          label="Alto"
                          value={draft.height}
                          onChange={(v) => handleChange("height", snapDimension(Number(v) || 0, MIN_TABLE_HEIGHT))}
                          disabled={!editing}
                        />
                        <LabelInput
                          label="Rotacion"
                          value={draft.rotation}
                          onChange={(v) => handleChange("rotation", Number(v) || 0)}
                          disabled={!editing}
                        />
                        <LabelSelect
                          label="Estado"
                          value={draft.status}
                          onChange={(v) => handleChange("status", v as TableStatus)}
                          disabled={!editing}
                          options={[
                            { value: "AVAILABLE", label: "Libre" },
                            { value: "RESERVED", label: "Reservada" },
                            { value: "IN_PLAY", label: "En juego" },
                            { value: "BLOCKED", label: "Bloqueada" },
                          ]}
                        />
                        <LabelInput
                          label="Etiqueta"
                          value={draft.sizeTag}
                          onChange={(v) => handleChange("sizeTag", v)}
                          disabled={!editing}
                        />
                      </div>

                      <div className="grid min-w-0 gap-3">
                        <LabelMultiSelect
                          label="Juego en mesa"
                          options={gameOptions}
                          selectedValues={selectedGameValues}
                          onToggle={handleGameSelectionToggle}
                          disabled={!editing}
                        />
                        <div className="min-w-0 space-y-2 rounded-lg border border-[var(--hairline)] bg-[var(--card)] p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Notas</div>
                          <RichTextEditor
                            value={draft.notes}
                            onChange={(value) => handleChange("notes", value)}
                            disabled={!editing}
                            placeholder="Anota recomendaciones, pairing o setup de esta mesa..."
                            className="!rounded-lg !border-[var(--hairline)] !bg-slate-950/40"
                          />
                        </div>
                        {!selectedIsW40k && (
                          <div className="min-w-0 space-y-2 rounded-lg border border-[var(--hairline)] bg-[var(--card)] p-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Layout (imagen)</div>
                            <div className="flex min-w-0 flex-wrap gap-2">
                              <button
                                type="button"
                                className="rounded-lg border border-[var(--hairline)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--accent-50)] disabled:opacity-50"
                                onClick={() => layoutFileInputRef.current?.click()}
                                disabled={uploadingLayout || saving}
                              >
                                {uploadingLayout ? "Subiendo..." : "Subir imagen"}
                              </button>
                              {draft.layoutImagePath && (
                                <button
                                  type="button"
                                  className="rounded-lg border border-[var(--hairline)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--accent-50)]"
                                  onClick={() => handleOpenImagePreview(`Layout de ${selectedTablePreview?.name}`, draft.layoutImagePath)}
                                >
                                  Ver imagen
                                </button>
                              )}
                            </div>
                            <LabelInput
                              label="URL layout"
                              value={draft.layoutImagePath}
                              onChange={(v) => handleChange("layoutImagePath", v)}
                              disabled={!editing}
                            />
                            <input
                              ref={layoutFileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.currentTarget.value = "";
                                if (file) {
                                  void handleUploadTableImage("layout", file);
                                }
                              }}
                            />
                          </div>
                        )}
                        <div className="min-w-0 space-y-2 rounded-lg border border-[var(--hairline)] bg-[var(--card)] p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Escenografia</div>
                          <div className="flex min-w-0 flex-wrap gap-2">
                            <button
                              type="button"
                              className="rounded-lg border border-[var(--hairline)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--accent-50)] disabled:opacity-50"
                              onClick={() => sceneryFileInputRef.current?.click()}
                              disabled={uploadingScenery || saving}
                            >
                              {uploadingScenery ? "Subiendo..." : "Subir imagen"}
                            </button>
                            {draft.sceneryImagePath && (
                              <button
                                type="button"
                                className="rounded-lg border border-[var(--hairline)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--accent-50)]"
                                onClick={() =>
                                  handleOpenImagePreview(`Escenografia de ${selectedTablePreview?.name}`, draft.sceneryImagePath)
                                }
                              >
                                Ver imagen
                              </button>
                            )}
                          </div>
                          <LabelInput
                            label="URL escenografia"
                            value={draft.sceneryImagePath}
                            onChange={(v) => handleChange("sceneryImagePath", v)}
                            disabled={!editing}
                          />
                          <input
                            ref={sceneryFileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              event.currentTarget.value = "";
                              if (file) {
                                void handleUploadTableImage("terrain", file);
                              }
                            }}
                          />
                        </div>
                      </div>

                      {selectedIsW40k && (
                        <div className="min-w-0 space-y-2 rounded-lg border border-[var(--hairline)] bg-[var(--card)] p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Layout</div>
                          {w40kCatalogError && (
                            <div className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                              {w40kCatalogError}
                            </div>
                          )}
                          <div className="grid min-w-0 gap-2 sm:grid-cols-3">
                            <LabelSelect
                              label="Map Pack"
                              value={selectedW40kMapPackId}
                              onChange={setSelectedW40kMapPackId}
                              disabled={!editing || w40kCatalogLoading || w40kCatalog.length === 0}
                              options={[
                                { value: "", label: w40kCatalogLoading ? "Cargando..." : "Selecciona map pack" },
                                ...w40kCatalog.map((pack) => ({ value: pack.id, label: pack.label })),
                              ]}
                            />
                            <LabelSelect
                              label="Deployment"
                              value={selectedW40kDeploymentId}
                              onChange={setSelectedW40kDeploymentId}
                              disabled={!editing || w40kCatalogLoading || selectedW40kDeployments.length === 0}
                              options={[
                                { value: "", label: w40kCatalogLoading ? "Cargando..." : "Selecciona deployment" },
                                ...selectedW40kDeployments.map((deployment) => ({
                                  value: deployment.id,
                                  label: deployment.label,
                                })),
                              ]}
                            />
                            <LabelSelect
                              label="Layout"
                              value={selectedW40kLayoutId}
                              onChange={setSelectedW40kLayoutId}
                              disabled={!editing || w40kCatalogLoading || selectedW40kLayouts.length === 0}
                              options={[
                                { value: "", label: w40kCatalogLoading ? "Cargando..." : "Selecciona layout" },
                                ...selectedW40kLayouts.map((layout) => ({ value: layout.id, label: layout.label })),
                              ]}
                            />
                          </div>
                          <LabelInput
                            label="URL Labrador"
                            value={selectedW40kLayout?.shareUrl ?? ""}
                            onChange={() => {}}
                            disabled
                          />
                          <div className="flex min-w-0 flex-wrap gap-2">
                            <button
                              type="button"
                              className="rounded-lg border border-[var(--hairline)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--accent-50)] disabled:opacity-50"
                              onClick={handleApplyW40kLayoutLink}
                              disabled={!editing || !selectedW40kLayout}
                            >
                              Usar URL en Layout (imagen)
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-[var(--hairline)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--accent-50)] disabled:opacity-50"
                              onClick={() => selectedW40kLayout && handleOpenLayoutPreview(selectedW40kLayout.shareUrl)}
                              disabled={!selectedW40kLayout}
                            >
                              Ver layout
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-[var(--hairline)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--accent-50)] disabled:opacity-50"
                              onClick={handleCopyW40kLayoutLink}
                              disabled={!selectedW40kLayout}
                            >
                              Copiar URL
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex min-w-0 flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-accent px-3 py-2 text-sm disabled:opacity-50"
                          onClick={handleSave}
                          disabled={saving || uploadingLayout || uploadingScenery}
                        >
                          {saving ? "Guardando..." : "Guardar cambios"}
                        </button>
                        <button
                          type="button"
                          className="btn px-3 py-2 text-sm"
                          onClick={resetSelectedToSaved}
                          disabled={saving || uploadingLayout || uploadingScenery}
                        >
                          Revertir
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <p className="text-sm text-[var(--muted)]">
                    Activa Editar mesas para modificar posiciones y guardar cambios.
                  </p>
                )
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--muted)]">Selecciona una mesa en el plano.</p>
          )}
        </div>

        {/* Mini canvas selector for mobile */}
        <div className="order-1 block min-w-0 overflow-hidden lg:hidden">
          <div className="mb-2 grid w-full grid-cols-2 gap-2">
            <button
              type="button"
              className={clsx(
                "w-full min-w-0 rounded-lg px-3 py-2 text-sm font-semibold",
                activeLocal === "LOCAL1"
                  ? "bg-[var(--accent-600)] text-white shadow-sm"
                  : "border border-[var(--hairline)] bg-[var(--card)] text-[var(--text)]"
              )}
              onClick={() => setActiveLocal("LOCAL1")}
            >
              Local 1
            </button>
            <button
              type="button"
              className={clsx(
                "w-full min-w-0 rounded-lg px-3 py-2 text-sm font-semibold",
                activeLocal === "LOCAL2"
                  ? "bg-[var(--accent-600)] text-white shadow-sm"
                  : "border border-[var(--hairline)] bg-[var(--card)] text-[var(--text)]"
              )}
              onClick={() => setActiveLocal("LOCAL2")}
            >
              Local 2
            </button>
          </div>
          <div ref={miniMapContainerRef} className="w-full max-w-full min-w-0 overflow-hidden">
            <div
              className="relative overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--card)] shadow"
              style={{ width: "100%", maxWidth: "100%", height: miniViewportHeight, boxSizing: "border-box", ...MAP_SURFACE_STYLE }}
            >
              <div
                className="absolute left-0 top-0"
                style={{
                  width: MAP_BASE_WIDTH,
                  height: MAP_BASE_HEIGHT,
                  boxSizing: "border-box",
                  transform: `translateX(${activeLocal === "LOCAL1" ? -LOCAL_SPLIT_X * miniScale : 0}px) scale(${miniScale})`,
                  transformOrigin: "top left",
                  padding: MAP_PADDING,
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 z-0"
                  style={MAP_SURFACE_STYLE}
                />
                <div className="pointer-events-none absolute inset-0" aria-hidden>
                  <div
                    className="absolute left-1/2 z-10 w-[3px] -translate-x-1/2 bg-slate-500/60 shadow-[0_0_10px_rgba(0,0,0,0.08)]"
                    style={{ top: 0, height: 256, borderRadius: 9999 }}
                  />
                  <div
                    className="absolute left-1/2 z-10 w-[3px] -translate-x-1/2 bg-slate-500/60 shadow-[0_0_10px_rgba(0,0,0,0.08)]"
                    style={{ top: 325, height: `${MAP_BASE_HEIGHT - 325}px`, borderRadius: 9999 }}
                  />
                </div>
                {tables.map((table) => {
                  const isZone = isZoneTableName(table.name);
                  const state: UiState | null = isZone
                    ? null
                    : getTableScheduleState(table, scheduleReservations, scheduleBlocks, scheduleDayStart, scheduleDayEnd, now);
                  const gameInfo = isZone ? null : resolveGameInfos(table)[0] ?? null;
                  const textureSurface = resolveCardTextureSurface(table, isZone);
                  const fillAlpha = resolveCardFillAlpha(table, isZone);
                  return (
                    <div
                      key={table.id}
                      className={clsx(
                        "absolute flex flex-col overflow-hidden rounded-xl border bg-white/80 px-2 py-1.5 text-[10px] font-semibold text-slate-900 shadow-sm backdrop-blur-sm transition",
                        isZone ? "z-0" : "z-10",
                        selectedId === table.id && "ring-2 ring-[var(--accent-600)] ring-offset-1 ring-offset-[#f5f0e6]"
                      )}
                      style={{
                        left: table.posX,
                        top: table.posY,
                        width: table.width,
                        height: table.height,
                        transform: `rotate(${table.rotation}deg)`,
                        backgroundColor: isZone
                          ? hexToRgba(ZONE_BACKGROUND, fillAlpha)
                          : hexToRgba(TABLE_CARD_BACKGROUNDS[state!], fillAlpha),
                        borderColor: isZone ? ZONE_BORDER : MAP_STATE_COLORS[state!],
                        borderWidth: isZone ? 1 : 2,
                        boxShadow: isZone
                          ? "0 10px 20px rgba(103, 120, 145, 0.14), inset 0 1px 0 rgba(255,255,255,0.5)"
                          : "0 8px 18px rgba(77, 99, 118, 0.16), inset 0 1px 0 rgba(255,255,255,0.52)",
                      }}
                      onClick={() => handleSelect(table, true)}
                    >
                      {textureSurface && <CardTextureLayer table={table} surface={textureSurface} compact />}
                      <div className="relative z-10 h-full">
                        <TableCardContent
                          table={table}
                          isZone={isZone}
                          state={state}
                          gameInfo={gameInfo}
                          compact
                          textured={Boolean(textureSurface)}
                          tone={textureSurface?.tone ?? "dark"}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div
                className={clsx(
                  "pointer-events-none absolute inset-y-0 z-20 w-10",
                  activeLocal === "LOCAL1"
                    ? "left-0 bg-gradient-to-r from-[var(--card)]/95 via-[var(--card)]/55 to-transparent"
                    : "right-0 bg-gradient-to-l from-[var(--card)]/95 via-[var(--card)]/55 to-transparent"
                )}
              />
            </div>
          </div>
        </div>
        {layoutPreviewUrl && (
          <LayoutPreviewModal
            title={selectedTablePreview?.name ? `Layout de ${selectedTablePreview.name}` : "Layout W40K"}
            previewUrl={layoutPreviewUrl}
            onClose={() => setLayoutPreviewUrl(null)}
          />
        )}
        {imagePreview && (
          <ImagePreviewModal
            title={imagePreview.title}
            imageUrl={imagePreview.url}
            onClose={() => setImagePreview(null)}
          />
        )}
      </div>
    </div>
  );
}

function LayoutPreviewModal({
  title,
  previewUrl,
  onClose,
}: {
  title: string;
  previewUrl: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={onClose}>
      <div
        className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--card)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--hairline)] px-4 py-3">
          <h4 className="truncate text-sm font-semibold text-[var(--text)]">{title}</h4>
          <button
            type="button"
            className="rounded-md border border-[var(--hairline)] px-2.5 py-1 text-xs font-semibold text-[var(--text)] hover:bg-[var(--accent-50)]"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
        <div className="min-h-0 flex-1 bg-white">
          <div className="border-b border-[var(--hairline)] bg-slate-50 px-4 py-2">
            <div className="mx-auto w-full max-w-3xl rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-center text-xs text-amber-900 shadow-sm">
              All credits and rights of this tool belong to{" "}
              <a
                href="https://labrador.dev"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-amber-950 underline underline-offset-2 hover:text-amber-800"
              >
                labrador.dev
              </a>{" "}
              and his amazing community work.
            </div>
          </div>
          <iframe
            src={previewUrl}
            title={title}
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}

function ImagePreviewModal({
  title,
  imageUrl,
  onClose,
}: {
  title: string;
  imageUrl: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={onClose}>
      <div
        className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--card)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--hairline)] px-4 py-3">
          <h4 className="truncate text-sm font-semibold text-[var(--text)]">{title}</h4>
          <button
            type="button"
            className="rounded-md border border-[var(--hairline)] px-2.5 py-1 text-xs font-semibold text-[var(--text)] hover:bg-[var(--accent-50)]"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-950/75 p-4">
          <img
            src={imageUrl}
            alt={title}
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--text)]">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function CompactDayNavigator({
  date,
  onPrevious,
  onNext,
}: {
  date: Date;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="inline-flex min-w-0 items-center overflow-hidden rounded-2xl border border-[var(--hairline)] bg-slate-950/40 text-[var(--text)]">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center text-lg font-semibold transition hover:bg-white/10"
        onClick={onPrevious}
        aria-label="Dia anterior"
      >
        ‹
      </button>
      <div className="min-w-[190px] px-4 text-center text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text)] sm:min-w-[240px]">
        {formatCompactDayLabel(date)}
      </div>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center text-lg font-semibold transition hover:bg-white/10"
        onClick={onNext}
        aria-label="Dia siguiente"
      >
        ›
      </button>
    </div>
  );
}

function MiniActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="rounded-lg border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--accent-50)]"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function CardTextureLayer({
  table,
  surface,
  compact = false,
}: {
  table: Table;
  surface: CardTextureSurface;
  compact?: boolean;
}) {
  const normalizedRotation = ((table.rotation % 180) + 180) % 180;
  const portraitBySize = table.height >= table.width;
  const isPortraitVisual = normalizedRotation === 0 ? portraitBySize : !portraitBySize;

  if (surface.mode === "paint_mirror") {
    const panelBase = {
      backgroundImage: `url("${surface.textureUrl}")`,
      backgroundRepeat: "no-repeat",
      backgroundSize: "100% 100%",
      backgroundPosition: "center",
      opacity: surface.opacity,
      width: "100%",
      height: "100%",
      left: "0%",
      top: "0%",
      position: "absolute" as const,
    };
    return (
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
        <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
          <div style={{ ...panelBase, transform: "rotate(90deg) scale(2)", transformOrigin: "center" }} />
        </div>
        <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
          <div style={{ ...panelBase, transform: "rotate(-90deg) scale(2)", transformOrigin: "center" }} />
        </div>
        <div className="absolute inset-0 bg-black/20" style={{ opacity: surface.overlayOpacity }} />
      </div>
    );
  }

  if (surface.mode === "cover") {
    const rotateTexture = Boolean(surface.rotateWithOrientation && isPortraitVisual);
    const baseCover = {
      backgroundImage: `url("${surface.textureUrl}")`,
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover",
      backgroundPosition: "center",
      opacity: surface.opacity,
    };
    return (
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
        {rotateTexture ? (
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute"
              style={{
                ...baseCover,
                width: "260%",
                height: "260%",
                left: "-80%",
                top: "-80%",
                transform: "rotate(90deg)",
                transformOrigin: "center",
              }}
            />
          </div>
        ) : (
          <div className="absolute inset-0" style={baseCover} />
        )}
        <div className="absolute inset-0 bg-black/28" style={{ opacity: surface.overlayOpacity }} />
      </div>
    );
  }

  const tileWidth = surface.tileWidth ?? (compact ? 100 : 124);
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("${surface.textureUrl}")`,
          backgroundRepeat: "repeat",
          backgroundPosition: "center",
          backgroundSize: `${tileWidth}px auto`,
          opacity: surface.opacity,
        }}
      />
      <div
        className={clsx("absolute inset-0", surface.tone === "light" ? "bg-black/26" : "bg-white/30")}
        style={{ opacity: surface.overlayOpacity }}
      />
    </div>
  );
}

function TableCardContent({
  table,
  isZone,
  state,
  gameInfo,
  compact = false,
  textured = false,
  tone = "dark",
}: {
  table: Table;
  isZone: boolean;
  state: UiState | null;
  gameInfo: ResolvedGameInfo | null;
  compact?: boolean;
  textured?: boolean;
  tone?: "light" | "dark";
}) {
  const showSizeTag = !isZone && table.sizeTag && !isOrientationTag(table.sizeTag);
  const portrait = !isZone && table.height >= table.width * 1.22;
  const showGameIcon = Boolean(gameInfo?.icon);
  const showGameLabel = Boolean(gameInfo) && !showGameIcon;
  const gameLines = portrait ? (compact ? 3 : 4) : compact ? 2 : 3;
  const iconTargetWidth = compact ? 72 : 96;
  const iconTargetHeight = compact ? 24 : 44;
  const iconWidth = showGameIcon ? Math.max(compact ? 34 : 28, Math.min(iconTargetWidth, table.width - (compact ? 8 : 20))) : 0;
  const iconHeight = showGameIcon ? Math.max(compact ? 18 : 12, Math.min(iconTargetHeight, Math.floor(table.height * (compact ? 0.72 : 0.58)))) : 0;
  const iconScale = gameInfo?.slug === "w40k" ? 1.45 : 1;
  const titleChipClass = "rounded bg-[#0b3a63] px-1.5 py-[1px] text-white shadow-sm";
  const chipClass = textured
    ? tone === "light"
      ? "rounded bg-black/82 px-1.5 py-[1px] text-white shadow-sm"
      : "rounded bg-white/95 px-1.5 py-[1px] text-slate-900 shadow-sm"
    : "";
  const statusChipClass =
    state === "available"
      ? "bg-[#22c55e] text-white border border-[#16a34a]"
      : state === "reserved"
        ? "bg-[#eab308] text-slate-950 border border-[#ca8a04]"
        : state === "in_play"
          ? "bg-[#38bdf8] text-slate-950 border border-[#0ea5e9]"
          : state === "blocked"
            ? "bg-[#ef4444] text-white border border-[#dc2626]"
            : textured
              ? "bg-white text-slate-900 border border-slate-300/80"
              : "bg-white/90 text-slate-900";

  return (
    <div
      className={clsx(
        "flex h-full flex-col justify-between overflow-hidden",
        compact ? "gap-0.5" : "gap-1"
      )}
      title={buildTableCardTitle(table, isZone, gameInfo)}
    >
      <div className={clsx("flex gap-1.5", portrait ? "flex-col" : "items-start justify-between")}>
        <div className="min-w-0">
          <div
            className={clsx("font-semibold leading-tight", compact ? "text-[10px]" : "text-[12px]", titleChipClass)}
            style={clampStyle(portrait ? 2 : 2)}
          >
            {table.name}
          </div>
        </div>
        {!isZone && state && (
          <span
            className={clsx(
              "shrink-0 rounded-full font-semibold uppercase tracking-wide shadow-sm",
              statusChipClass,
              compact ? "self-start px-1.5 py-[1px] text-[8px]" : "self-start px-2 py-[2px] text-[10px]"
            )}
          >
            {TABLE_STATE_LABELS[state]}
          </span>
        )}
      </div>
      {!isZone && gameInfo && (
        <div
          className={clsx(
            "mt-0.5 min-h-0 overflow-hidden text-slate-800",
            showGameIcon
              ? "flex flex-1 items-center justify-center"
              : clsx("flex items-start gap-1.5", compact ? "text-[8px]" : "text-[11px]")
          )}
        >
          {showGameIcon && (
            <div
              className={clsx(
                "flex items-center justify-center overflow-hidden rounded py-[1px]",
                textured ? (tone === "light" ? "bg-black/64" : "bg-white/90") : ""
              )}
              style={{ width: iconWidth, height: iconHeight, paddingInline: compact ? 2 : 4 }}
            >
              <img
                src={gameInfo.icon!}
                alt={gameInfo.label}
                className="h-full w-full object-contain"
                style={{ transform: `scale(${iconScale})`, transformOrigin: "center" }}
                draggable={false}
              />
            </div>
          )}
          {showGameLabel && (
            <span className={clsx("min-w-0 font-medium leading-tight", chipClass)} style={clampStyle(gameLines)}>
              {gameInfo.label}
            </span>
          )}
        </div>
      )}
      {!isZone && showSizeTag && (
        <div className={clsx("font-normal text-slate-600", compact ? "text-[8px]" : "text-[10px]", chipClass)} style={clampStyle(1)}>
          {table.sizeTag}
        </div>
      )}
    </div>
  );
}

function clampStyle(lines: number) {
  return {
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
    wordBreak: "break-word" as const,
  };
}

function buildTableCardTitle(table: Table, isZone: boolean, gameInfo: ResolvedGameInfo | null) {
  const parts = [table.name];
  if (!isZone && table.sizeTag && !isOrientationTag(table.sizeTag)) parts.push(table.sizeTag);
  if (!isZone && gameInfo) parts.push(gameInfo.label);
  return parts.join(" | ");
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 overflow-hidden rounded-lg border border-[var(--hairline)] bg-[var(--card)] p-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</span>
      <div className="min-h-[20px] min-w-0 overflow-hidden break-words text-[var(--text)]">{children}</div>
    </div>
  );
}

function LabelInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string | number;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
      {label}
      <input
        className="w-full min-w-0 rounded-lg border border-[var(--hairline)] bg-[var(--card)] px-2 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </label>
  );
}

function LabelSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
      {label}
      <select
        className="w-full min-w-0 rounded-lg border border-[var(--hairline)] bg-[var(--card)] px-2 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LabelMultiSelect({
  label,
  selectedValues,
  onToggle,
  options,
  disabled,
}: {
  label: string;
  selectedValues: string[];
  onToggle: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-2 rounded-lg border border-[var(--hairline)] bg-[var(--card)] p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</legend>
      <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
        {options.map((option) => {
          const checked = selectedValues.includes(option.value);
          return (
            <label
              key={option.value}
              className={clsx(
                "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                checked ? "bg-[var(--accent-50)] text-[var(--text)]" : "text-[var(--muted)]"
              )}
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border border-[var(--hairline)] accent-[var(--accent-600)]"
                checked={checked}
                onChange={() => onToggle(option.value)}
                disabled={disabled}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
