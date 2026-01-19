"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { assetUrl } from "@/lib/assets";
import { useGamesCatalog } from "@/lib/use-games-catalog";

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
  notes?: string | null;
};

type Block = {
  id: string;
  tableId: string;
  start: string;
  end: string;
  reason?: string | null;
};

type Props = {
  canManage: boolean;
};

type UiState = "available" | "reserved" | "in_play" | "blocked";

function computeUiState(table: Table, reservations: Reservation[], blocks: Block[], now: Date): UiState {
  const hasActiveBlock = blocks.some(
    (b) => b.tableId === table.id && new Date(b.start) <= now && now <= new Date(b.end)
  );
  if (hasActiveBlock || table.status === "BLOCKED") return "blocked";

  const overlapping = reservations.filter((r) => {
    if (r.status === "CANCELLED") return false;
    const start = new Date(r.start);
    const end = new Date(r.end);
    return start <= now && now <= end;
  });

  if (overlapping.some((r) => r.status === "IN_PLAY")) return "in_play";
  if (overlapping.length > 0) return "reserved";

  if (table.status === "IN_PLAY") return "in_play";
  if (table.status === "RESERVED") return "reserved";

  return "available";
}

const palette: Record<UiState, string> = {
  available: "#2dd4bf",
  reserved: "#f97316",
  in_play: "#ef4444",
  blocked: "#94a3b8",
};

const stateLabel: Record<UiState, string> = {
  available: "Libre",
  reserved: "Reservada",
  in_play: "En juego",
  blocked: "Bloqueada",
};

const SPECIAL_GAME_OPTIONS = [
  { value: "custom:comodin", label: "Comodin", icon: assetUrl("/assets/icons/games/otros.png") },
  { value: "custom:especialista", label: "Juegos especialista", icon: assetUrl("/assets/icons/games/boardgames.png") },
];

const DEFAULT_GAME_ICON = assetUrl("/assets/icons/games/otros.png");

const MAP_BASE_WIDTH = 1100;
const MAP_BASE_HEIGHT = 950;
const MAP_MIN_HEIGHT = 900;
const MAP_PADDING = 28;
const LOCAL_SPLIT_X = MAP_BASE_WIDTH / 2;
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

const isZoneName = (name: string) => name.toLowerCase().includes("zona");
const isOrientationTag = (tag?: string | null) => {
  if (!tag) return false;
  const normalized = tag.trim().toLowerCase();
  return normalized === "vertical" || normalized === "horizontal";
};

const normalizeLabel = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");

export function TableMap({ canManage }: Props) {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [originalTables, setOriginalTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [syncingLayout, setSyncingLayout] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const selectedIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [activeLocal, setActiveLocal] = useState<LocalKey>("LOCAL2");
  const { games: gameCatalog } = useGamesCatalog();
  const gameById = useMemo(() => new Map(gameCatalog.map((game) => [game.id, game])), [gameCatalog]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

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
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const today = new Date();
        const from = new Date(today);
        from.setHours(0, 0, 0, 0);
        const to = new Date(today);
        to.setHours(23, 59, 59, 999);

        const [tablesRes, reservationsRes, blocksRes] = await Promise.all([
          fetch("/api/juego-organizado/tables", { cache: "no-store" }),
          fetch(`/api/juego-organizado/reservations?from=${from.toISOString()}&to=${to.toISOString()}`, {
            cache: "no-store",
          }),
          fetch("/api/juego-organizado/blocks", { cache: "no-store" }),
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

        const [t, r, b] = await Promise.all([parsePayload(tablesRes), parsePayload(reservationsRes), parsePayload(blocksRes)]);
        if (!tablesRes.ok || !reservationsRes.ok || !blocksRes.ok) {
          const message = (t && (t.error as string)) || (r && (r.error as string)) || (b && (b.error as string));
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
        setReservations(Array.isArray(r) ? r : []);
        setBlocks(Array.isArray(b) ? b : []);

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

  const bounds = useMemo(() => {
    const maxX = Math.max(...tables.map((t) => t.posX + t.width), 400);
    const maxY = Math.max(...tables.map((t) => t.posY + t.height), 300);
    return { maxX, maxY };
  }, [tables]);

  const selectedTable = tables.find((t) => t.id === selectedId) || null;
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
  const selectedGameInfo = resolveGameInfo(selectedTablePreview);
  const selectedLayout =
    selectedTablePreview?.layouts?.find((layout) => layout.isDefault) ??
    selectedTablePreview?.layouts?.[0] ??
    null;
  const selectedState =
    selectedTablePreview && !isZoneName(selectedTablePreview.name)
      ? computeUiState(selectedTablePreview, reservations, blocks, now)
      : null;
  const nonZoneTables = useMemo(() => tables.filter((t) => !isZoneName(t.name)), [tables]);
  const tableCount = nonZoneTables.length;
  const scaledWidth = MAP_BASE_WIDTH * scale;
  const scaledHeight = MAP_BASE_HEIGHT * scale;
  const miniScale = Math.min(1, (scaledWidth / LOCAL_SPLIT_X) * 0.95);

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

  function resolveGameInfo(table: Table | null) {
    if (!table) return null;
    const normalizedLabel = table.gameLabel ? normalizeLabel(table.gameLabel) : null;
    const customMatch = normalizedLabel
      ? SPECIAL_GAME_OPTIONS.find((option) => option.value === `custom:${normalizedLabel}`)
      : null;
    const gameFromCatalog = table.gameId ? gameById.get(table.gameId) : null;
    const resolvedLabel =
      table.gameLabel ||
      table.game?.name ||
      gameFromCatalog?.name ||
      (customMatch ? customMatch.label : null);
    if (!resolvedLabel) return null;
    const icon =
      assetUrl(table.game?.iconImagePath ?? gameFromCatalog?.iconImagePath ?? "") ||
      customMatch?.icon ||
      DEFAULT_GAME_ICON;
    const slug = table.game?.slug ?? gameFromCatalog?.slug ?? (customMatch ? normalizeLabel(customMatch.label) : null);
    return { label: resolvedLabel, icon: icon || DEFAULT_GAME_ICON, slug: slug || null };
  }

  function handleSelect(table: Table) {
    setSelectedId(table.id);
    setDraft(fromTable(table));
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
    if (!editing || !canManage || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    dragOffsetRef.current = {
      x: clientX - rect.left - table.posX * scale,
      y: clientY - rect.top - table.posY * scale,
    };
    setDraggingId(table.id);
  }

  useEffect(() => {
    if (!draggingId) return;
    function updatePosition(clientX: number, clientY: number) {
      if (!mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      const nextX = Math.max(0, (clientX - rect.left - dragOffsetRef.current.x) / scale);
      const nextY = Math.max(0, (clientY - rect.top - dragOffsetRef.current.y) / scale);
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
  }, [draggingId, scale, selectedId]);

  useEffect(() => {
    if (!editing) setDraggingId(null);
  }, [editing]);

  async function handleAddTable(base?: Partial<Table>) {
    if (!canManage) return;
    setCreating(true);
    setError(null);

    const offset = tables.length * 12;
    const payload = {
      name: base?.name || `Mesa ${tables.length + 1}`,
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
    setRefreshTick((tick) => tick + 1);
  }

  async function handleSave() {
    if (!selectedTable || !draft) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/juego-organizado/tables/${selectedTable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
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
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  const gameOptions = useMemo(
    () => [
      { value: "none", label: "Sin asignar" },
      ...SPECIAL_GAME_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
      ...gameCatalog.map((game) => ({ value: `game:${game.id}`, label: game.name })),
    ],
    [gameCatalog]
  );

  const selectedGameValue = useMemo(() => {
    if (!draft) return "none";
    if (draft.gameId) return `game:${draft.gameId}`;
    if (draft.gameLabel) {
      const normalized = normalizeLabel(draft.gameLabel);
      const custom = SPECIAL_GAME_OPTIONS.find((opt) => opt.value === `custom:${normalized}`);
      return custom ? custom.value : `custom:${normalized}`;
    }
    return "none";
  }, [draft]);

  function handleGameSelection(value: string) {
    if (!draft) return;
    if (value === "none") {
      setDraft((prev) => (prev ? { ...prev, gameId: "", gameLabel: "" } : prev));
      return;
    }
    if (value.startsWith("game:")) {
      const gameId = value.replace("game:", "");
      setDraft((prev) => (prev ? { ...prev, gameId, gameLabel: "" } : prev));
      return;
    }
    if (value.startsWith("custom:")) {
      const customId = value.replace("custom:", "");
      const matched = SPECIAL_GAME_OPTIONS.find((opt) => opt.value === `custom:${customId}`);
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              gameId: "",
              gameLabel: matched?.label ?? customId,
            }
          : prev
      );
    }
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Legend color={palette.available} label="Libre" />
          <Legend color={palette.reserved} label="Reservada" />
          <Legend color={palette.in_play} label="En juego" />
          <Legend color={palette.blocked} label="Bloqueada" />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 text-sm text-[var(--muted)]">
          <span>{loading ? "Cargando..." : `${tableCount} mesas`}</span>
          <button
            type="button"
            className="rounded-xl border border-[var(--hairline)] px-3 py-1 text-xs font-semibold text-[var(--text)] hover:bg-[var(--accent-50)] disabled:opacity-60"
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
                  "rounded-xl px-3 py-1 text-xs font-semibold shadow-sm",
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
                    className="rounded-xl bg-[var(--accent-600)] px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-500)] disabled:opacity-60"
                    onClick={() => handleAddTable()}
                    disabled={creating || saving || deleting || syncingLayout}
                  >
                    {creating ? "Creando..." : "Anadir mesa"}
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-[var(--hairline)] px-3 py-1 text-xs font-semibold text-[var(--text)] hover:bg-[var(--accent-50)] disabled:opacity-60"
                    onClick={handleDuplicateSelected}
                    disabled={!selectedTable || creating || saving || deleting || syncingLayout}
                  >
                    Duplicar seleccion
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-red-200/70 bg-red-50/80 px-3 py-1 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-100 disabled:opacity-60"
                    onClick={handleDeleteSelected}
                    disabled={!selectedTable || deleting || saving || creating || syncingLayout}
                  >
                    {deleting ? "Eliminando..." : "Eliminar"}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div ref={containerRef} className="relative w-full space-y-4">
        <div
          className="relative hidden overflow-hidden rounded-3xl border border-[var(--hairline)] shadow-2xl lg:block"
          style={{ width: scaledWidth, height: scaledHeight, backgroundColor: "#f5f0e6" }}
        >
          <div
            ref={mapRef}
            className="relative"
            style={{
              width: MAP_BASE_WIDTH,
              height: MAP_BASE_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              padding: MAP_PADDING,
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                backgroundColor: "#f7f1e3",
                backgroundImage:
                  "linear-gradient(135deg, rgba(255,255,255,0.94), rgba(246,240,230,0.9)), radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)",
                backgroundSize: "100% 100%, 16px 16px",
              }}
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
              const isZone = isZoneName(table.name);
              const state = isZone ? null : computeUiState(table, reservations, blocks, now);
              const gameInfo = isZone ? null : resolveGameInfo(table);
              const showSizeTag = table.sizeTag && !isOrientationTag(table.sizeTag);
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
                    backgroundColor: isZone ? "rgba(226, 232, 240, 0.8)" : `${palette[state!]}1a`,
                    borderColor: isZone ? "#cbd5e1" : palette[state!],
                    zIndex: isZone ? 1 : 10,
                  }}
                  onClick={() => handleSelect(table)}
                  onMouseDown={(e) => handleStartDrag(table, e.clientX, e.clientY)}
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    if (touch) handleStartDrag(table, touch.clientX, touch.clientY);
                  }}
                >
                  <div className="flex h-full flex-col justify-between gap-1 overflow-hidden">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-semibold leading-tight text-slate-900">
                          {table.name}
                        </div>
                        {isZone && showSizeTag && (
                          <div className="mt-[2px] truncate text-[11px] font-medium text-slate-700">
                            {table.sizeTag}
                          </div>
                        )}
                        {!isZone && gameInfo && (
                          <div className="mt-[6px] flex items-center gap-1 overflow-hidden text-[11px] font-medium text-slate-800">
                            <img
                              src={gameInfo.icon}
                              alt={gameInfo.label}
                              className="h-5 w-5 shrink-0 rounded object-contain"
                              draggable={false}
                            />
                            <span className="truncate">{gameInfo.label}</span>
                          </div>
                        )}
                      </div>
                      {!isZone && (
                        <span className="max-w-[60%] shrink-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-full bg-white/85 px-2 py-[2px] text-[10px] uppercase tracking-wide text-slate-900 shadow-sm">
                          {stateLabel[state!]}
                        </span>
                      )}
                    </div>
                    {!isZone && showSizeTag && (
                      <div className="truncate text-[10px] font-normal text-slate-600">{table.sizeTag}</div>
                    )}
                  </div>
                </div>
              );
            })}
            {editing && canManage && (
              <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-full bg-slate-900/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-lg">
                Modo edicion: arrastra para recolocar
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4">
          <h3 className="text-lg font-semibold text-[var(--text)]">Estado actual</h3>
          <div className="mt-3 flex flex-col gap-2 text-sm text-[var(--muted)]">
            <div className="flex gap-4">
              <span className="font-semibold text-[var(--text)]">Fecha:</span>
              <span>{now.toLocaleString()}</span>
            </div>
            <div className="flex gap-4">
              <span className="font-semibold text-[var(--text)]">Reservas en curso:</span>
              <span>
                {
                  reservations.filter((r) => {
                    const s = new Date(r.start);
                    const e = new Date(r.end);
                    return s <= now && now <= e && r.status !== "CANCELLED";
                  }).length
                }
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4">
          <h3 className="text-lg font-semibold text-[var(--text)]">Mesa seleccionada</h3>
          {selectedTable && draft ? (
            <div className="mt-3 space-y-4 text-sm text-[var(--muted)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base font-semibold text-[var(--text)]">{selectedTablePreview?.name}</div>
                  {selectedGameInfo && (
                    <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--card)] px-3 py-1 text-[12px] font-semibold text-[var(--text)]">
                      <img
                        src={selectedGameInfo.icon}
                        alt={selectedGameInfo.label}
                        className="h-5 w-5 shrink-0 rounded object-contain"
                      />
                      <span className="truncate">{selectedGameInfo.label}</span>
                    </div>
                  )}
                </div>
                {selectedState && (
                  <span className="shrink-0 rounded-full bg-white/85 px-3 py-[6px] text-[11px] font-semibold uppercase tracking-wide text-slate-900 shadow-sm">
                    {stateLabel[selectedState]}
                  </span>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <DetailRow label="Juego asignado">
                  {selectedGameInfo ? (
                    <div className="flex items-center gap-2">
                      <img
                        src={selectedGameInfo.icon}
                        alt={selectedGameInfo.label}
                        className="h-6 w-6 shrink-0 rounded object-contain"
                      />
                      <span className="truncate text-[var(--text)]">{selectedGameInfo.label}</span>
                    </div>
                  ) : (
                    <span>Sin asignar</span>
                  )}
                </DetailRow>

                <DetailRow label="Layout W40K">
                  {selectedGameInfo?.slug === "w40k" ? (
                    selectedTablePreview?.layoutImagePath ? (
                      <div className="overflow-hidden rounded-lg border border-[var(--hairline)] bg-white">
                        <img
                          src={selectedTablePreview?.layoutImagePath}
                          alt={`Layout de ${selectedTablePreview?.name}`}
                          className="h-28 w-full object-cover"
                        />
                        {selectedLayout && (
                          <div className="px-2 py-1 text-[11px] text-[var(--muted)]">{selectedLayout.title}</div>
                        )}
                      </div>
                    ) : (
                      <span>Sin layout asignado.</span>
                    )
                  ) : (
                    <span>Solo aplica a mesas de 40K.</span>
                  )}
                </DetailRow>

                <DetailRow label="Escenografia">
                  {selectedTablePreview?.sceneryImagePath ? (
                    <img
                      src={selectedTablePreview.sceneryImagePath}
                      alt={`Escenografia de ${selectedTablePreview?.name}`}
                      className="h-28 w-full rounded-lg object-cover"
                    />
                  ) : (
                    <span>Sin foto asociada.</span>
                  )}
                </DetailRow>

                <DetailRow label="Notas">
                  {selectedTablePreview?.notes ? (
                    <span className="whitespace-pre-wrap text-[var(--text)]">{selectedTablePreview.notes}</span>
                  ) : (
                    <span>Sin notas.</span>
                  )}
                </DetailRow>
              </div>

              {canManage ? (
                editing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <LabelInput
                        label="Pos X"
                        value={draft.posX}
                        onChange={(v) => handleChange("posX", Number(v) || 0)}
                        disabled={!editing}
                      />
                      <LabelInput
                        label="Pos Y"
                        value={draft.posY}
                        onChange={(v) => handleChange("posY", Number(v) || 0)}
                        disabled={!editing}
                      />
                      <LabelInput
                        label="Ancho"
                        value={draft.width}
                        onChange={(v) => handleChange("width", Number(v) || 0)}
                        disabled={!editing}
                      />
                      <LabelInput
                        label="Alto"
                        value={draft.height}
                        onChange={(v) => handleChange("height", Number(v) || 0)}
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
                      <LabelInput
                        label="Notas"
                        value={draft.notes}
                        onChange={(v) => handleChange("notes", v)}
                        disabled={!editing}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <LabelSelect
                        label="Juego en mesa"
                        value={selectedGameValue}
                        onChange={handleGameSelection}
                        disabled={!editing}
                        options={gameOptions}
                      />
                      <LabelInput
                        label="Layout (imagen)"
                        value={draft.layoutImagePath}
                        onChange={(v) => handleChange("layoutImagePath", v)}
                        disabled={!editing}
                      />
                      <LabelInput
                        label="Foto escenografia"
                        value={draft.sceneryImagePath}
                        onChange={(v) => handleChange("sceneryImagePath", v)}
                        disabled={!editing}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-accent px-3 py-2 text-sm disabled:opacity-50"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? "Guardando..." : "Guardar cambios"}
                      </button>
                      <button
                        type="button"
                        className="btn px-3 py-2 text-sm"
                        onClick={() => setDraft(fromTable(selectedTable))}
                        disabled={saving}
                      >
                        Revertir
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted)]">
                    Activa Editar mesas para modificar posiciones y guardar cambios.
                  </p>
                )
              ) : (
                <p className="text-sm text-[var(--muted)]">
                  Solo lectura. Inicia sesion como admin/Junta para editar.
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--muted)]">Selecciona una mesa en el plano.</p>
          )}
        </div>

        {/* Mini canvas selector for mobile */}
        <div className="block lg:hidden">
          <div className="mb-2 flex w-full gap-2">
            <button
              type="button"
              className={clsx(
                "flex-1 rounded-lg px-3 py-2 text-sm font-semibold",
                activeLocal === "LOCAL2"
                  ? "bg-[var(--accent-600)] text-white shadow-sm"
                  : "border border-[var(--hairline)] text-[var(--text)]"
              )}
              onClick={() => setActiveLocal("LOCAL2")}
            >
              Local 2
            </button>
            <button
              type="button"
              className={clsx(
                "flex-1 rounded-lg px-3 py-2 text-sm font-semibold",
                activeLocal === "LOCAL1"
                  ? "bg-[var(--accent-600)] text-white shadow-sm"
                  : "border border-[var(--hairline)] text-[var(--text)]"
              )}
              onClick={() => setActiveLocal("LOCAL1")}
            >
              Local 1
            </button>
          </div>
          <div
            className="relative overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--card)] shadow"
            style={{ width: "100%", backgroundColor: "#f5f0e6" }}
          >
            <div
              className="relative"
              style={{
                width: MAP_BASE_WIDTH,
                height: MAP_BASE_HEIGHT,
                transform: `translateX(${activeLocal === "LOCAL1" ? -LOCAL_SPLIT_X : 0}px) scale(${miniScale})`,
                transformOrigin: "top left",
                padding: MAP_PADDING,
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 z-0"
                style={{
                  backgroundColor: "#f7f1e3",
                  backgroundImage:
                    "linear-gradient(135deg, rgba(255,255,255,0.94), rgba(246,240,230,0.9)), radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)",
                  backgroundSize: "100% 100%, 16px 16px",
                }}
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
                const isZone = isZoneName(table.name);
                const state = isZone ? null : computeUiState(table, reservations, blocks, now);
                const gameInfo = isZone ? null : resolveGameInfo(table);
                const showSizeTag = table.sizeTag && !isOrientationTag(table.sizeTag);
                const hidden = activeLocal === "LOCAL1" ? table.posX < LOCAL_SPLIT_X - 20 : table.posX > LOCAL_SPLIT_X + 20;
                return (
                  <div
                    key={table.id}
                    className={clsx(
                      "absolute flex flex-col overflow-hidden rounded-xl border bg-white/80 px-2 py-1.5 text-[10px] font-semibold text-slate-900 shadow-sm backdrop-blur-sm transition",
                      isZone ? "z-0" : "z-10",
                      hidden && "hidden"
                    )}
                    style={{
                      left: table.posX,
                      top: table.posY,
                      width: table.width,
                      height: table.height,
                      transform: `rotate(${table.rotation}deg)`,
                      backgroundColor: isZone ? "rgba(226, 232, 240, 0.8)" : `${palette[state!]}1a`,
                      borderColor: isZone ? "#cbd5e1" : palette[state!],
                    }}
                  >
                    <div className="flex h-full flex-col justify-between gap-1 overflow-hidden">
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[11px] font-semibold leading-tight text-slate-900">
                            {table.name}
                          </div>
                          {isZone && showSizeTag && (
                            <div className="mt-[1px] truncate text-[9px] font-medium text-slate-700">{table.sizeTag}</div>
                          )}
                          {!isZone && gameInfo && (
                            <div className="mt-[4px] flex items-center gap-1 overflow-hidden text-[9px] font-medium text-slate-800">
                              <img
                                src={gameInfo.icon}
                                alt={gameInfo.label}
                                className="h-4 w-4 shrink-0 rounded object-contain"
                                draggable={false}
                              />
                              <span className="truncate">{gameInfo.label}</span>
                            </div>
                          )}
                        </div>
                        {!isZone && (
                          <span className="max-w-[70%] shrink-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-full bg-white/85 px-2 py-[1px] text-[9px] uppercase tracking-wide text-slate-900 shadow-sm">
                            {stateLabel[state!]}
                          </span>
                        )}
                      </div>
                      {!isZone && showSizeTag && (
                        <div className="truncate text-[9px] font-normal text-slate-700">{table.sizeTag}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--text)]">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-[var(--hairline)] bg-[var(--card)] p-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</span>
      <div className="min-h-[20px] text-[var(--text)]">{children}</div>
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
    <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
      {label}
      <input
        className="rounded-lg border border-[var(--hairline)] bg-[var(--card)] px-2 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
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
    <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
      {label}
      <select
        className="rounded-lg border border-[var(--hairline)] bg-[var(--card)] px-2 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-600)] focus:outline-none"
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
