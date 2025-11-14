"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import clsx from "clsx";
import { Avatar } from "@/components/profile/Avatar";
import type { ColumnConfig, PreparedRow } from "./table-config";
import { COLUMN_LABELS } from "./table-config";
import { formatClubDateTime, getClubDateTimeFormatter } from "@/lib/date-format";

type RowData = PreparedRow;

type Props = {
  columns: ColumnConfig[];
  initialRows: RowData[];
};

type InviteResult = {
  status: "created" | "pending" | string;
  url: string;
  email: string;
  message?: string | null;
};

const ROLE_OPTIONS = ["ADMIN", "JUNTA", "SOCIO", "AMIGO"] as const;
const ID_CANDIDATES = ["id", "ID", "userId"];
const HIGHLIGHT_COLOR = "rgba(255, 220, 120, 0.35)";
const TOP_SCROLLBAR_HEIGHT = 14;

const NAV_HEIGHT_CSS_VAR = "var(--nav-h)";
const HEADER_OFFSET_PX = 12;
const MUTABLE_COLUMNS = new Set([
  "name",
  "nick",
  "email",
  "roles",
  "etiquetas",
  "isActive",
  "membershipSince",
  "membershipUntil",
  "descripcion",
]);

function getRowId(row: RowData): string | null {
  for (const key of ID_CANDIDATES) {
    const value = row[key];
    if (value != null && value !== "") return String(value);
  }
  return null;
}

function buildOriginalMap(rows: RowData[]): Map<string, RowData> {
  const map = new Map<string, RowData>();
  rows.forEach((row, index) => {
    const key = getRowId(row) ?? `row-${index}`;
    map.set(key, { ...row });
  });
  return map;
}

function parseRoles(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((role) => role.trim())
    .filter((role) => role.length > 0);
}

function normalizeRoles(value: string | undefined): string {
  return parseRoles(value)
    .map((role) => role.toUpperCase())
    .sort()
    .join("|");
}

function isActiveValue(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return normalized === "true" || normalized === "1" || normalized === "si";
}

function normalizeForCompare(columnKey: string, value: string | undefined): string {
  if (!value) return "";
  if (columnKey === "roles") return normalizeRoles(value);
  if (columnKey === "isActive") return isActiveValue(value) ? "true" : "false";
  return value.trim();
}

function parseSortableValue(value: string | undefined) {
  if (!value) return { kind: "empty" as const, value: "" };
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) return { kind: "number" as const, value: numeric };
  const dateMs = Date.parse(value);
  if (!Number.isNaN(dateMs)) return { kind: "date" as const, value: dateMs };
  return { kind: "string" as const, value: value.toLowerCase() };
}

const DATE_COLUMNS = new Set(["lastLoginAt", "membershipSince", "membershipUntil", "createdAt", "updatedAt"]);
const EDITABLE_DATE_COLUMNS = new Set(["membershipSince", "membershipUntil"]);

function isDateColumnKey(key: string): boolean {
  return DATE_COLUMNS.has(key);
}

function hasTimeComponent(raw: string): boolean {
  return raw.includes("T") || raw.includes(":");
}

function formatDateDisplay(value: string | undefined, hydrated: boolean): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!hydrated) {
    return trimmed;
  }

  let ms = Date.parse(trimmed);
  if (Number.isNaN(ms) && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    ms = Date.parse(`${trimmed}T00:00:00Z`);
  }
  if (Number.isNaN(ms)) {
    return trimmed;
  }
  const date = new Date(ms);
  const options: Intl.DateTimeFormatOptions = { dateStyle: "medium" };
  if (hasTimeComponent(trimmed)) {
    options.timeStyle = "short";
  }
  return formatClubDateTime(date, options);
}

function toDateInputValue(value: string | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  let date = new Date(trimmed);
  if (Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    date = new Date(trimmed.replace(" ", "T"));
  }
  if (Number.isNaN(date.getTime())) {
    const fallback = trimmed.split("T")[0]?.split(" ")[0] ?? "";
    return /^\d{4}-\d{2}-\d{2}$/.test(fallback) ? fallback : "";
  }
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function toIsoDateFromInput(value: string): string {
  if (!value) return "";
  const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) return value;
  const iso = new Date(Date.UTC(year, month - 1, day));
  return iso.toISOString();
}

function parseTags(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function getVitrinasCount(row: RowData): number {
  const sources = [row.etiquetas, row.descripcion].filter(Boolean) as string[];
  for (const source of sources) {
    const match = source.match(/(?:vitrinas?|locker)s?(?:\s*[:=]\s*|\s+)(\d+)/i);
    if (match) {
      const parsed = Number.parseInt(match[1], 10);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  const tags = parseTags(row.etiquetas);
  for (const tag of tags) {
    const match = tag.match(/(\d+)\s*(?:vitrinas?|locker)s?/i);
    if (match) {
      const parsed = Number.parseInt(match[1], 10);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function hasClubKey(row: RowData): boolean {
  const tags = parseTags(row.etiquetas).map((tag) => tag.toLowerCase());
  if (tags.some((tag) => tag.includes("llave"))) return true;
  const roles = row.roles?.toLowerCase() ?? "";
  return roles.includes("admin") || roles.includes("junta");
}

function getExenciones(row: RowData) {
  const tags = parseTags(row.etiquetas);
  const matches = tags.filter((tag) => {
    const lowered = tag.toLowerCase();
    return lowered.startsWith("exencion:") || lowered.includes("exencion") || lowered.includes("exento");
  });
  const normalized = matches
    .map((tag) => {
      const lowered = tag.toLowerCase();
      if (lowered.startsWith("exencion:")) {
        return tag.slice(tag.indexOf(":") + 1).trim();
      }
      return tag;
    })
    .filter((value) => value.length > 0);
  if (normalized.length === 0) {
    return { display: "Sin exenciones registradas.", raw: "" };
  }
  const text = normalized.join(", ");
  return { display: text, raw: text };
}

function buildExtraInfo(row: RowData) {
  const vitrinas = getVitrinasCount(row);
  const cuota = 20 + vitrinas * 5;
  const exenciones = getExenciones(row);
  return {
    hasKey: hasClubKey(row),
    vitrinas,
    cuota,
    exenciones: exenciones.display,
    rawExenciones: exenciones.raw,
    notes: row.descripcion && row.descripcion.trim().length > 0 ? row.descripcion : "Sin notas registradas.",
  };
}

function createEditForm(row: RowData): EditFormState {
  const info = buildExtraInfo(row);
  return {
    hasKey: info.hasKey,
    vitrinas: info.vitrinas,
    exenciones: info.rawExenciones,
    notes: row.descripcion ?? "",
  };
}

type HistoryEntryChange = { field: string; before: string | null; after: string | null };
type HistoryEntry = {
  id: number;
  createdAt: string;
  userId: number;
  userLabel: string;
  adminLabel: string;
  adminEmail: string | null;
  changes: HistoryEntryChange[];
};

type PendingUpdate = {
  userId: number;
  rowKey: string;
  changes: Record<string, string>;
};

type EditFormState = {
  hasKey: boolean;
  vitrinas: number;
  exenciones: string;
  notes: string;
};

const NEW_USER_TEMP_PASSWORD = "NuevoSocio";

type NewUserFormState = {
  name: string;
  nick: string;
  email: string;
  roles: string;
  etiquetas: string;
  isActive: boolean;
  membershipSince: string;
  membershipUntil: string;
  descripcion: string;
};

function createEmptyNewUserForm(): NewUserFormState {
  return {
    name: "",
    nick: "",
    email: "",
    roles: "SOCIO",
    etiquetas: "",
    isActive: true,
    membershipSince: "",
    membershipUntil: "",
    descripcion: "",
  };
}

function getRowKey(row: RowData, index: number): string {
  return getRowId(row) ?? `row-${index}`;
}

function resolveRowIndex(rows: RowData[], targetKey: string | null): number | null {
  if (!targetKey) return null;
  for (let index = 0; index < rows.length; index += 1) {
    if (getRowKey(rows[index], index) === targetKey) return index;
  }
  return null;
}

function RolesDropdown({ value, onChange }: { value: string | undefined; onChange: (next: string) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const roles = useMemo(() => parseRoles(value).sort(), [value]);
  const rolesSet = useMemo(() => new Set(roles), [roles]);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const toggleRole = (role: string) => {
    const next = new Set(rolesSet);
    if (next.has(role)) next.delete(role);
    else next.add(role);
    onChange(Array.from(next).sort().join(", "));
  };

  const count = roles.length;
  const label = count === 0 ? "Sin roles" : count === 1 ? roles[0] : `${count} roles`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--card)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
        onClick={() => setOpen((prev) => !prev)}
      >
        {label}
        <span className="text-xs">{open ? "^" : "v"}</span>
      </button>
      {open && (
        <div className="absolute left-0 z-10 mt-2 w-48 rounded-xl border border-[var(--hairline)] bg-[var(--card)] p-3 shadow-xl">
          <div className="space-y-2 text-sm text-[var(--text)]">
            {ROLE_OPTIONS.map((role) => (
              <label key={role} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rolesSet.has(role)}
                  onChange={() => toggleRole(role)}
                  className="h-4 w-4 rounded border-[var(--hairline)] bg-[var(--card-muted)]"
                />
                <span>{role}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function UserManagementView({ columns, initialRows }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [originalMap, setOriginalMap] = useState(() => buildOriginalMap(initialRows));
  const [pendingChanges, setPendingChanges] = useState<Map<string, Set<string>>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sortState, setSortState] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const isSyncingRef = useRef(false);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState<NewUserFormState>(createEmptyNewUserForm());
  const [newUserLoading, setNewUserLoading] = useState(false);
  const [newUserError, setNewUserError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [editedRow, setEditedRow] = useState<RowData | null>(null);
  const [editedRowIndex, setEditedRowIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const headerRowTop = `calc(${NAV_HEIGHT_CSS_VAR} + ${HEADER_OFFSET_PX}px)`;
  const overlayTop = `calc(-1 * (${NAV_HEIGHT_CSS_VAR} + ${HEADER_OFFSET_PX}px))`;

  const recomputeHeaderOverlay = useCallback(() => {
    if (typeof document === "undefined") return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const root = document.documentElement;
    const navValue = getComputedStyle(root).getPropertyValue("--nav-h").trim();
    const navHeight = Number.parseFloat(navValue.replace("px", "")) || 0;
    const threshold = navHeight + HEADER_OFFSET_PX;
    const rect = sentinel.getBoundingClientRect();
    setHasScrolled(rect.top < threshold);
  }, []);

  useEffect(() => {
    setRows(initialRows);
    setOriginalMap(buildOriginalMap(initialRows));
    setPendingChanges(new Map());
  }, [initialRows]);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!inviteResult) {
      setInviteCopied(false);
    }
  }, [inviteResult]);

  useEffect(() => {
    const table = tableScrollRef.current;
    const top = topScrollRef.current;
    if (!table || !top) return;

    const updateWidth = () => {
      const width = Math.max(table.scrollWidth, table.clientWidth);
      setScrollWidth(width);
      setScrollLeft(table.scrollLeft);
      top.scrollLeft = table.scrollLeft;
    };
    updateWidth();

    const syncFromTop = () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      const next = top.scrollLeft;
      table.scrollLeft = next;
      setScrollLeft(next);
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    };

    const syncFromTable = () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      const next = table.scrollLeft;
      top.scrollLeft = next;
      setScrollLeft(next);
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    };

    top.addEventListener("scroll", syncFromTop);
    table.addEventListener("scroll", syncFromTable);
    window.addEventListener("resize", updateWidth);

    return () => {
      top.removeEventListener("scroll", syncFromTop);
      table.removeEventListener("scroll", syncFromTable);
      window.removeEventListener("resize", updateWidth);
    };
  }, [rows, columns]);

  useEffect(() => {
    const update = () => {
      recomputeHeaderOverlay();
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [recomputeHeaderOverlay]);

  const handleResetSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  const handleOpenNewUser = useCallback(() => {
    setNewUserOpen(true);
    setNewUserForm(createEmptyNewUserForm());
    setNewUserError(null);
    setNewUserLoading(false);
  }, []);

  const handleCloseNewUser = useCallback(() => {
    setNewUserOpen(false);
    setNewUserLoading(false);
    setNewUserError(null);
  }, []);

  const handleNewUserFormChange = useCallback((patch: Partial<NewUserFormState>) => {
    setNewUserForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleCreateUser = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (newUserLoading) return;
      if (!newUserForm.email.trim()) {
        setNewUserError("El email es obligatorio.");
        return;
      }

      setNewUserError(null);
      setNewUserLoading(true);
      try {
        const response = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newUserForm.name,
            nick: newUserForm.nick,
            email: newUserForm.email,
            roles: newUserForm.roles,
            etiquetas: newUserForm.etiquetas,
            isActive: newUserForm.isActive,
            membershipSince: newUserForm.membershipSince,
            membershipUntil: newUserForm.membershipUntil,
            descripcion: newUserForm.descripcion,
          }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.row) {
          const message = typeof data?.error === "string" ? data.error : "No se pudo crear el usuario.";
          throw new Error(message);
        }
        const row = data.row as RowData;
        setRows((prev) => [row, ...prev]);
        setOriginalMap((prev) => {
          const map = new Map(prev);
          const key = getRowId(row) ?? `row-${Date.now()}`;
          map.set(key, { ...row });
          return map;
        });
        setPendingChanges((prev) => new Map(prev));
        setSaveInfo("Nuevo usuario creado correctamente.");
        setNewUserOpen(false);
        setNewUserForm(createEmptyNewUserForm());
      } catch (error) {
        console.error("[gestion-usuarios] create-user", error);
        setNewUserError(error instanceof Error ? error.message : "No se pudo crear el usuario.");
      } finally {
        setNewUserLoading(false);
      }
    },
    [newUserForm, newUserLoading],
  );

  const handleOpenInvite = useCallback(() => {
    setInviteOpen(true);
    setInviteEmail("");
    setInviteResult(null);
    setInviteError(null);
    setInviteCopied(false);
    setInviteLoading(false);
  }, []);

  const handleCloseInvite = useCallback(() => {
    setInviteOpen(false);
    setInviteLoading(false);
    setInviteCopied(false);
  }, []);

  const handleInviteSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const targetEmail = inviteEmail.trim();
      if (!targetEmail) {
        setInviteError("Introduce un correo valido.");
        return;
      }
      setInviteLoading(true);
      setInviteError(null);
      setInviteResult(null);

      try {
        const response = await fetch("/api/admin/user-invitations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: targetEmail }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data) {
          const message =
            typeof data?.error === "string" ? data.error : "No se pudo crear el enlace.";
          throw new Error(message);
        }

        const inviteInfo = (data.invite ?? {}) as Record<string, unknown>;
        const inviteUrlRaw =
          typeof inviteInfo.url === "string"
            ? inviteInfo.url
            : typeof data.inviteUrl === "string"
            ? data.inviteUrl
            : "";
        if (!inviteUrlRaw) {
          throw new Error("El servidor no devolvio la URL de invitacion.");
        }

        setInviteResult({
          status: String(data.status ?? "created"),
          url: inviteUrlRaw,
          email: typeof inviteInfo.email === "string" ? inviteInfo.email : targetEmail,
          message: typeof data.message === "string" ? data.message : null,
        });
      } catch (error) {
        setInviteError(error instanceof Error ? error.message : "No se pudo crear el enlace.");
      } finally {
        setInviteLoading(false);
      }
    },
    [inviteEmail],
  );

  const handleCopyInvite = useCallback(async () => {
    if (!inviteResult?.url) return;
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        throw new Error("Clipboard API no disponible");
      }
      await navigator.clipboard.writeText(inviteResult.url);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      setInviteError("No se pudo copiar el enlace. Copialo manualmente.");
    }
  }, [inviteResult]);

  const handleInviteReset = useCallback(() => {
    setInviteResult(null);
    setInviteEmail("");
    setInviteError(null);
    setInviteCopied(false);
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch("/api/admin/users/history");
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || !data.ok) {
        throw new Error(data?.error ?? "No se pudo cargar el historial.");
      }
      const entries = Array.isArray(data.entries)
        ? (data.entries as any[]).map((entry) => ({
            id: Number(entry.id),
            createdAt: String(entry.createdAt),
            userId: Number(entry.userId),
            userLabel: String(entry.userLabel ?? `Usuario ${entry.userId}`),
            adminLabel: String(entry.adminLabel ?? "Administrador"),
            adminEmail: entry.adminEmail ? String(entry.adminEmail) : null,
            changes: Array.isArray(entry.changes)
              ? (entry.changes as any[]).map((change) => ({
                  field: String(change.field ?? ""),
                  before: change?.before == null ? null : String(change.before),
                  after: change?.after == null ? null : String(change.after),
                }))
              : [],
          }))
        : [];
      setHistoryEntries(entries);
    } catch (error) {
      console.error("[gestion-usuarios] historial", error);
      setHistoryError(error instanceof Error ? error.message : "No se pudo cargar el historial.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleOpenHistory = useCallback(() => {
    setHistoryOpen(true);
    void fetchHistory();
  }, [fetchHistory]);

  const handleCloseHistory = useCallback(() => {
    setHistoryOpen(false);
  }, []);
  const closeEditModal = useCallback(() => {
    setEditedRow(null);
    setEditedRowIndex(null);
    setEditForm(null);
  }, []);

  const handleEditFormChange = useCallback((patch: Partial<EditFormState>) => {
    setEditForm((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const currentEditedRow = useMemo(() => {
    if (editedRowIndex != null && rows[editedRowIndex]) {
      return rows[editedRowIndex];
    }
    return editedRow;
  }, [editedRow, editedRowIndex, rows]);

  const editInfo = useMemo(() => {
    if (!currentEditedRow) return null;
    const info = buildExtraInfo(currentEditedRow);
    return {
      ...info,
      tags: parseTags(currentEditedRow.etiquetas),
      displayName: currentEditedRow.name || currentEditedRow.nick || currentEditedRow.email || "Usuario sin nombre",
      email: currentEditedRow.email || "Sin email",
      nick: currentEditedRow.nick || "Sin nick",
      idLabel: getRowId(currentEditedRow) ?? (editedRowIndex != null ? `row-${editedRowIndex}` : "Sin ID"),
    };
  }, [currentEditedRow, editedRowIndex]);

  const handleExport = useCallback(() => {
    if (rows.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }
    const exportableColumns = columns.filter((column) => column.type !== "button" && column.type !== "image");
    if (exportableColumns.length === 0) {
      alert("No hay columnas exportables.");
      return;
    }
    const header = exportableColumns
      .map((column) => `"${(column.label ?? column.key).replace(/"/g, '""')}"`)
      .join(";");
    const lines = rows.map((row) =>
      exportableColumns
        .map((column) => {
          const value = row[column.key] ?? "";
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(";")
    );
    const csv = [header, ...lines].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `usuarios-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [columns, rows]);

  const buildPendingUpdates = useCallback((): PendingUpdate[] => {
    const updates: PendingUpdate[] = [];
    pendingChanges.forEach((columnsSet, key) => {
      const index = rows.findIndex((row, rowIndex) => getRowKey(row, rowIndex) === key);
      if (index === -1) return;
      const row = rows[index];
      const rawId = row.id ?? row.ID ?? row.userId ?? row.userID;
      const userId = Number(rawId);
      if (!Number.isFinite(userId) || userId <= 0) return;
      const changes: Record<string, string> = {};
      columnsSet.forEach((columnKey) => {
        if (!MUTABLE_COLUMNS.has(columnKey)) return;
        changes[columnKey] = row[columnKey] ?? "";
      });
      if (Object.keys(changes).length > 0) {
        updates.push({ userId, rowKey: key, changes });
      }
    });
    return updates;
  }, [pendingChanges, rows]);

  const handleSave = useCallback(async () => {
    const updates = buildPendingUpdates();
    if (updates.length === 0) {
      setSaveInfo("No hay cambios para guardar.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch("/api/admin/users/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: updates.map(({ userId, changes }) => ({ userId, changes })),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || !data.ok) {
        throw new Error(data?.error ?? "No se pudieron guardar los cambios.");
      }

      const errorIds = new Set<number>(
        Array.isArray(data.errors)
          ? (data.errors as any[])
              .map((item) => Number(item.userId))
              .filter((value) => Number.isFinite(value))
          : []
      );

      const rowKeyById = new Map<number, string>();
      updates.forEach(({ userId, rowKey }) => {
        if (Number.isFinite(userId)) {
          rowKeyById.set(userId, rowKey);
        }
      });

      const updated: Array<{ userId: number; row: RowData }> = Array.isArray(data.updatedRows)
        ? data.updatedRows.map((item: any) => ({
            userId: Number(item.userId),
            row: item.row as RowData,
          }))
        : [];

      if (updated.length > 0) {
        setRows((prev) => {
          const next = [...prev];
          updated.forEach(({ userId, row }) => {
            if (errorIds.has(userId)) return;
            const key = String(userId);
            const index = next.findIndex((candidate, rowIndex) => getRowKey(candidate, rowIndex) === key);
            if (index !== -1) {
              next[index] = { ...next[index], ...row };
            }
          });
          return next;
        });

        setOriginalMap((prev) => {
          const map = new Map(prev);
          updated.forEach(({ userId, row }) => {
            if (errorIds.has(userId)) return;
            map.set(String(userId), { ...row });
          });
          return map;
        });

        setPendingChanges((prev) => {
          const map = new Map(prev);
          rowKeyById.forEach((rowKey, userId) => {
            if (errorIds.has(userId)) return;
            map.delete(rowKey);
            map.delete(String(userId));
          });
          return map;
        });
      }

      const timestamp = new Date();
      setSaveInfo(
        updated.length > 0
          ? `Ultimo guardado: ${formatClubDateTime(timestamp, {
              dateStyle: "short",
              timeStyle: "medium",
            })}`
          : "Sin cambios aplicados."
      );

      if (errorIds.size > 0) {
        const message =
          errorIds.size === 1
            ? "Un cambio no se pudo aplicar."
            : `${errorIds.size} cambios no se pudieron aplicar.`;
        setSaveError(message);
      } else {
        setSaveError(null);
      }

      if (historyOpen) {
        void fetchHistory();
      }
    } catch (error) {
      console.error("[gestion-usuarios] guardado", error);
      setSaveError(error instanceof Error ? error.message : "Error al guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }, [buildPendingUpdates, fetchHistory, historyOpen]);

  useEffect(() => {
    if (!historyOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setHistoryOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [historyOpen]);

  useEffect(() => {
    if (!currentEditedRow) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeEditModal();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentEditedRow, closeEditModal]);

  const columnMap = useMemo(() => new Map(columns.map((column) => [column.key, column])), [columns]);

  const updatePending = useCallback((rowKey: string, columnKey: string, nextValue: string) => {
    const originalRow = originalMap.get(rowKey) ?? {};
    const originalValue = normalizeForCompare(columnKey, originalRow[columnKey]);
    const nextNormalized = normalizeForCompare(columnKey, nextValue);

    setPendingChanges((prev) => {
      const map = new Map(prev);
      const set = new Set(map.get(rowKey) ?? []);
      if (originalValue === nextNormalized) {
        set.delete(columnKey);
        if (set.size === 0) map.delete(rowKey);
        else map.set(rowKey, set);
      } else {
        set.add(columnKey);
        map.set(rowKey, set);
      }
      return map;
    });
  }, [originalMap]);

  const handleCellChange = useCallback(
    (row: RowData, columnKey: string, value: string, rowIndex: number) => {
      const column = columnMap.get(columnKey);
      if (!column || (column.type && column.type !== "text" && column.key !== "roles" && column.key !== "etiquetas" && column.key !== "isActive")) return;
      const rowKey = getRowId(row) ?? `row-${rowIndex}`;
      setRows((prev) => {
        const next = [...prev];
        next[rowIndex] = { ...row, [columnKey]: value };
        return next;
      });
      updatePending(rowKey, columnKey, value);
    },
    [columnMap, updatePending]
  );

  const applyEditChanges = useCallback(
    (form: EditFormState, row: RowData, rowIndex: number) => {
      const tags = parseTags(row.etiquetas ?? "");
      const filtered = tags.filter((tag) => {
        const lowered = tag.toLowerCase();
        if (lowered === "llave") return false;
        if (/^vitrinas?:/.test(lowered)) return false;
        if (lowered.startsWith("exencion:") || lowered.includes("exencion") || lowered.includes("exento")) return false;
        return true;
      });
      if (form.hasKey) filtered.push("llave");
      const vitrinasValue = Number.isFinite(form.vitrinas) && form.vitrinas > 0 ? Math.round(form.vitrinas) : 0;
      if (vitrinasValue > 0) filtered.push(`vitrinas:${vitrinasValue}`);
      const exencionesText = form.exenciones.trim();
      if (exencionesText.length > 0) filtered.push(`exencion:${exencionesText}`);
      const tagsValue = filtered.join(", ");
      handleCellChange(row, "etiquetas", tagsValue, rowIndex);
      handleCellChange(row, "descripcion", form.notes, rowIndex);
    },
    [handleCellChange]
  );

  const handleEditModalSave = useCallback(() => {
    if (!editForm || !currentEditedRow) return;
    let index = editedRowIndex != null && rows[editedRowIndex] ? editedRowIndex : null;
    if (index == null) {
      const targetKey = getRowKey(currentEditedRow, editedRowIndex ?? 0);
      index = resolveRowIndex(rows, targetKey);
    }
    if (index == null || !rows[index]) {
      alert("No se pudo localizar la fila para guardar los cambios.");
      return;
    }
    applyEditChanges(editForm, rows[index], index);
    closeEditModal();
  }, [applyEditChanges, closeEditModal, currentEditedRow, editForm, editedRowIndex, rows]);

  const handleButtonAction = async (column: ColumnConfig, row: RowData, rowIndex: number) => {
    if (column.key === "__edit") {
      setEditedRow(row);
      setEditedRowIndex(rowIndex);
      setEditForm(createEditForm(row));
      return;
    }

    if (column.key === "__delete") {
      const rowId = getRowId(row);
      const fallbackKey = `row-${rowIndex}`;
      if (!rowId) {
        alert("No se pudo determinar el identificador del usuario.");
        return;
      }
      if (deleting === rowId) return;
      const numericId = Number.parseInt(rowId, 10);
      if (!Number.isFinite(numericId)) {
        alert("Identificador de usuario invalido.");
        return;
      }
      const label = row.name || row.nick || row.email || `Usuario ${rowId}`;
      const confirmed = window.confirm(`Eliminar ${label}? Esta accion no se puede deshacer.`);
      if (!confirmed) return;

      try {
        setDeleting(rowId);
        const response = await fetch(`/api/admin/users/${encodeURIComponent(rowId)}`, { method: "DELETE" });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error((data && data.error) || "No se pudo eliminar el usuario.");
        }
        setRows((prev) => prev.filter((candidate) => getRowId(candidate) !== rowId));
        setPendingChanges((prev) => {
          const map = new Map(prev);
          map.delete(rowId);
          map.delete(fallbackKey);
          return map;
        });
        setOriginalMap((prev) => {
          const map = new Map(prev);
          map.delete(rowId);
          map.delete(fallbackKey);
          return map;
        });
      } catch (error) {
        console.error("[gestion-usuarios] delete", error);
        alert(error instanceof Error ? error.message : "No se pudo eliminar el usuario.");
      } finally {
        setDeleting(null);
      }
    }
  };

  const toggleSort = (column: ColumnConfig) => {
    if (column.type === "button" && column.key !== "roles" && column.key !== "isActive") return;
    setSortState((prev) => {
      if (!prev || prev.key !== column.key) return { key: column.key, direction: "asc" };
      if (prev.direction === "asc") return { key: column.key, direction: "desc" };
      return null;
    });
  };

  const filteredEntries = useMemo(() => {
    const entries = rows.map((row, index) => ({ row, index }));
    const term = searchQuery.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter(({ row }) => {
      const haystack = [
        row.id,
        row.name,
        row.nick,
        row.email,
        row.roles,
        row.etiquetas,
        row.descripcion,
      ]
        .filter((value): value is string => typeof value === "string" && value.length > 0)
        .some((value) => value.toLowerCase().includes(term));
      return haystack;
    });
  }, [rows, searchQuery]);

  const sortedEntries = useMemo(() => {
    const entries = [...filteredEntries];
    if (!sortState) return entries;
    const { key, direction } = sortState;
    const multiplier = direction === "asc" ? 1 : -1;
    const order = ["empty", "number", "date", "string"];
    return entries.sort((a, b) => {
      const left = parseSortableValue(a.row[key]);
      const right = parseSortableValue(b.row[key]);
      if (left.kind !== right.kind) {
        return (order.indexOf(left.kind) - order.indexOf(right.kind)) * multiplier;
      }
      if (left.value < right.value) return -1 * multiplier;
      if (left.value > right.value) return 1 * multiplier;
      return 0;
    });
  }, [filteredEntries, sortState]);

  useEffect(() => {
    const table = tableScrollRef.current;
    const top = topScrollRef.current;
    if (table) {
      table.scrollTop = 0;
    }
    if (top) {
      top.scrollLeft = 0;
    }
    recomputeHeaderOverlay();
  }, [filteredEntries.length, searchQuery, recomputeHeaderOverlay]);

  useEffect(() => {
    recomputeHeaderOverlay();
  }, [rows.length, filteredEntries.length, sortedEntries.length, recomputeHeaderOverlay]);

  const pendingCount = useMemo(() => {
    let total = 0;
    pendingChanges.forEach((set) => (total += set.size));
    return total;
  }, [pendingChanges]);
  const historyDateFormatter = useMemo(
    () =>
      getClubDateTimeFormatter({
        dateStyle: "medium",
        timeStyle: "short",
      }),
    []
  );

  const renderChangeValue = useCallback(
    (field: string, value: string | null) => {
      if (value == null || value.trim() === "") return "-";
      const normalized = value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (field === "isActive") {
        if (["true", "1", "si"].includes(normalized)) return "Si";
        if (["false", "0", "no"].includes(normalized)) return "No";
      }
      if (
        field === "membershipSince" ||
        field === "membershipUntil" ||
        field === "createdAt" ||
        field === "updatedAt" ||
        field === "lastLoginAt"
      ) {
        return formatDateDisplay(value ?? undefined, hasHydrated) ?? value;
      }
      return value;
    },
    [hasHydrated]
  );

  const isDirty = (rowKey: string, columnKey: string) => pendingChanges.get(rowKey)?.has(columnKey) ?? false;

  const bannerText =
    pendingCount > 0
      ? `${pendingCount} cambios pendientes de guardar.`
      : saveInfo ?? "Edicion en vivo sin guardar por ahora.";
  const hasSearch = searchQuery.trim().length > 0;

  return (
    <>
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Gestion de Usuarios</h1>
        <p className="text-sm text-[var(--muted)]">
          Revisa y edita la informacion de las personas registradas en el club. Este panel se conectara con las
          operaciones de guardado en una fase posterior.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-accent" onClick={handleOpenNewUser}>
          Nuevo usuario
        </button>
        <button type="button" className="btn" onClick={handleOpenInvite}>
          Invitar con correo
        </button>
        <button type="button" className="btn" onClick={handleExport}>
          Exportar datos
        </button>
        <button type="button" className="btn" onClick={handleOpenHistory}>
          Historial de cambios
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-[var(--hairline)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted)]">
        <div className="flex flex-col">
          <span>{bannerText}</span>
          {saveError && <span className="text-xs text-red-400">{saveError}</span>}
        </div>
        <button
          type="button"
          className="btn btn-accent"
          onClick={handleSave}
          disabled={pendingCount === 0 || saving}
        >
          {saving ? "Guardando..." : pendingCount > 0 ? `Guardar cambios (${pendingCount})` : "Guardar cambios"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-4 py-3">
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Buscar por nombre, nick, email o rol"
          className="min-w-[220px] flex-1 rounded-lg border border-[var(--hairline)] bg-[var(--card-muted)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
          aria-label="Filtrar usuarios"
        />
        {hasSearch && (
          <button type="button" className="btn text-sm" onClick={handleResetSearch}>
            Limpiar
          </button>
        )}
        <p className="text-xs text-[var(--muted)]">
          Mostrando {sortedEntries.length} de {rows.length} usuarios
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4">
        {sortedEntries.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            {hasSearch ? "No hay usuarios que coincidan con la busqueda." : "Todavia no hay usuarios registrados."}
          </p>
        ) : (
          <div className="relative">
            <div ref={sentinelRef} aria-hidden="true" className="h-0" />
            <div
              className="sticky z-50 grid gap-2 bg-[var(--card)] pb-2 shadow-[0_6px_12px_rgba(0,0,0,0.45)] relative"
              style={{ top: headerRowTop }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-0 right-0 bg-[var(--card)]"
                style={{
                  top: overlayTop,
                  height: headerRowTop,
                  opacity: hasScrolled ? 1 : 0,
                  transition: "opacity 120ms ease",
                }}
              />

              <div className="overflow-hidden rounded-xl border border-[var(--hairline)] bg-[var(--card)] shadow-sm">
                <table
                  className="min-w-[960px] w-full border-collapse text-sm"
                  style={{ transform: `translateX(-${scrollLeft}px)` }}
                >
                  <thead>
                    <tr className="text-left uppercase text-xs tracking-[0.25em] text-[var(--muted)]">
                      {columns.map((column) => {
                        const { key, label, stickyLeft, width } = column;
                        const sortable = column.type !== "button" || key === "roles" || key === "isActive";
                        const isSorted = sortState?.key === key;
                        const indicator = !sortable ? null : isSorted ? (sortState?.direction === "asc" ? "^" : "v") : null;
                        const style: CSSProperties = {};
                        if (width) {
                          style.minWidth = width;
                          style.maxWidth = width;
                        }
                        if (stickyLeft !== undefined) {
                          style.left = stickyLeft;
                          style.transform = `translateX(${scrollLeft}px)`;
                        }
                        return (
                          <th
                            key={key}
                            className={clsx(
                              "border-b border-[var(--hairline)] px-3 py-2 font-medium bg-[var(--card)]",
                              stickyLeft !== undefined && "sticky z-40 shadow-[2px_0_0_rgba(0,0,0,0.45)]",
                              sortable && "cursor-pointer select-none"
                            )}
                            style={style}
                            onClick={() => sortable && toggleSort(column)}
                          >
                            <span className="inline-flex items-center gap-2">
                              {label}
                              {indicator && <span className="text-[0.65rem]">{indicator}</span>}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                </table>
              </div>

              <div
                ref={topScrollRef}
                className="overflow-x-auto rounded-full border border-[var(--hairline)] bg-[var(--card)] px-1"
                style={{ height: TOP_SCROLLBAR_HEIGHT }}
              >
                <div style={{ width: scrollWidth, height: TOP_SCROLLBAR_HEIGHT }} />
              </div>
            </div>

            <div
              className="mt-4 overflow-x-auto"
              ref={tableScrollRef}
              style={{ scrollbarGutter: "stable both-edges" }}
            >
              <table className="min-w-[960px] w-full border-collapse text-sm">
                <thead className="sr-only">
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map(({ row, index }) => {
                    const rowKey = getRowId(row) ?? `row-${index}`;
                    const displayName = row.name || row.nick || row.email || `Usuario ${index + 1}`;
                    const rowId = getRowId(row);
                    return (
                      <tr key={rowKey} className="odd:bg-[var(--card-muted)]">
                        {columns.map((column) => {
                          const value = row[column.key] ?? "";
                          const stickyLeft = column.stickyLeft;
                          const dirty = isDirty(rowKey, column.key);
                          const cellClasses = clsx(
                            "border-b border-[var(--hairline)] px-3 py-2 align-top",
                            stickyLeft !== undefined && "sticky z-40 shadow-[2px_0_0_rgba(0,0,0,0.45)]"
                          );
                          const style: CSSProperties = {};
                          if (column.width) {
                            style.minWidth = column.width;
                            style.maxWidth = column.width;
                          }
                          if (stickyLeft !== undefined) {
                            style.left = stickyLeft;
                            style.backgroundColor = dirty ? HIGHLIGHT_COLOR : "var(--card)";
                          } else if (dirty) {
                            style.backgroundColor = HIGHLIGHT_COLOR;
                          }

                          if (column.key === "roles") {
                            return (
                              <td key={column.key} className={cellClasses} style={style}>
                                <RolesDropdown
                                  value={value}
                                  onChange={(next) => handleCellChange(row, column.key, next, index)}
                                />
                              </td>
                            );
                          }

                          if (column.key === "isActive") {
                            const active = isActiveValue(value);
                            return (
                              <td key={column.key} className={cellClasses} style={style}>
                                <button
                                  type="button"
                                  onClick={() => handleCellChange(row, column.key, active ? "false" : "true", index)}
                                  className={clsx(
                                    "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] border border-transparent",
                                    active ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                                  )}
                                >
                                  {active ? "Si" : "No"}
                                </button>
                              </td>
                            );
                          }

                          if (column.type === "button") {
                            const variant = column.buttonVariant ?? "accent";
                            const isDeleteButton = column.key === "__delete";
                            const isDeleting = isDeleteButton && rowId != null && deleting === rowId;
                            const buttonClasses = clsx(
                              "btn text-xs font-semibold uppercase tracking-[0.2em] disabled:opacity-60 disabled:pointer-events-none",
                              variant === "danger"
                                ? "bg-red-600 text-white border-transparent hover:bg-red-700"
                                : "btn-accent"
                            );
                            const label = isDeleteButton
                              ? isDeleting
                                ? "Eliminando..."
                                : column.buttonLabel ?? "Eliminar"
                              : column.buttonLabel ?? "Accion";
                            return (
                              <td key={column.key} className={cellClasses} style={style}>
                                <button
                                  type="button"
                                  className={buttonClasses}
                                  onClick={() => handleButtonAction(column, row, index)}
                                  disabled={isDeleting || (isDeleteButton && rowId == null)}
                                >
                                  {label}
                                </button>
                              </td>
                            );
                          }

                          if (column.type === "image") {
                            const avatarUrl = row.avatarUrl || "";
                            const oauthAvatarUrl = row.oauthAvatarUrl || value || "";
                            return (
                              <td key={column.key} className={cellClasses} style={style}>
                                <div className="flex items-center gap-3 pr-2">
                                  <Avatar
                                    size={44}
                                    displayName={displayName}
                                    avatarUrl={avatarUrl || undefined}
                                    oauthAvatarUrl={oauthAvatarUrl || undefined}
                                  />
                                </div>
                              </td>
                            );
                          }

                          if (isDateColumnKey(column.key)) {
                            const formatted = formatDateDisplay(value, hasHydrated);
                            const showRaw =
                              Boolean(value) &&
                              formatted !== null &&
                              formatted !== value &&
                              column.key !== "createdAt" &&
                              column.key !== "updatedAt";

                            if (EDITABLE_DATE_COLUMNS.has(column.key)) {
                              const dateValue = toDateInputValue(value);
                              return (
                                <td key={column.key} className={cellClasses} style={style}>
                                  <div className="flex flex-col gap-1">
                                    <input
                                      type="date"
                                      value={dateValue}
                                      onChange={(event) =>
                                        handleCellChange(
                                          row,
                                          column.key,
                                          event.target.value ? toIsoDateFromInput(event.target.value) : "",
                                          index
                                        )
                                      }
                                      className="w-full rounded-lg border border-[var(--hairline)] bg-transparent px-2 py-1 text-sm"
                                    />
                                    <span className="text-xs leading-tight text-[var(--muted)] whitespace-pre-wrap break-words">
                                      {formatted ?? "Sin fecha"}
                                      {showRaw && (
                                        <span className="block opacity-70">{value}</span>
                                      )}
                                    </span>
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td key={column.key} className={cellClasses} style={style}>
                                <div className="whitespace-pre-wrap break-words leading-tight text-sm">
                                  {formatted ?? (value ? value : "Sin fecha")}
                                  {showRaw && (
                                    <span className="block text-xs text-[var(--muted)]">{value}</span>
                                  )}
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={column.key} className={cellClasses} style={style}>
                              <input
                                value={value}
                                onChange={(event) => handleCellChange(row, column.key, event.target.value, index)}
                                className="w-full rounded-lg border border-[var(--hairline)] bg-transparent px-2 py-1 text-sm"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
      {editInfo && editForm && (
        <div
          className="fixed inset-0 z-[980] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          onClick={closeEditModal}
        >
          <div
            className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--hairline)] bg-[var(--card)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-[var(--hairline)] bg-[var(--card-muted)] px-6 py-4">
              <div>
                <p className="text-xs text-[var(--muted)]">#{editInfo.idLabel}</p>
                <h2 className="text-xl font-semibold text-[var(--text)]">{editInfo.displayName}</h2>
                <p className="text-xs text-[var(--muted)]">{editInfo.email}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn" onClick={closeEditModal}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-accent" onClick={handleEditModalSave}>
                  Guardar
                </button>
              </div>
            </header>
            <div className="space-y-6 px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-[var(--muted)]">Nick</p>
                  <p className="text-base font-semibold text-[var(--text)]">{editInfo.nick}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-[var(--muted)]">Roles</p>
                  <p className="text-base font-semibold text-[var(--text)]">{currentEditedRow?.roles || "Sin roles"}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-[var(--muted)]">Tiene llave</p>
                  <button
                    type="button"
                    className={clsx(
                      "mt-2 inline-flex min-w-[96px] items-center justify-center rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition",
                      editForm.hasKey ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    )}
                    onClick={() => handleEditFormChange({ hasKey: !editForm.hasKey })}
                  >
                    {editForm.hasKey ? "Si" : "No"}
                  </button>
                </div>
                <div>
                  <p className="text-xs uppercase text-[var(--muted)]">Numero de vitrinas</p>
                  <input
                    type="number"
                    min={0}
                    className="mt-2 w-full rounded-xl border border-[var(--hairline)] bg-transparent px-3 py-2 text-sm"
                    value={editForm.vitrinas}
                    onChange={(event) =>
                      handleEditFormChange({ vitrinas: Math.max(0, Number(event.target.value) || 0) })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-[var(--muted)]">Cuota esperada</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--text)]">
                    {(20 + Math.max(0, Number(editForm.vitrinas) || 0) * 5).toFixed(2)} €
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-[var(--muted)]">Exenciones a la cuota</p>
                  <input
                    type="text"
                    className="mt-2 w-full rounded-xl border border-[var(--hairline)] bg-transparent px-3 py-2 text-sm"
                    placeholder="Ej. Exencion parcial"
                    value={editForm.exenciones}
                    onChange={(event) => handleEditFormChange({ exenciones: event.target.value })}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--muted)]">Notas</p>
                <textarea
                  className="mt-2 w-full rounded-xl border border-[var(--hairline)] bg-transparent p-3 text-sm"
                  rows={4}
                  value={editForm.notes}
                  onChange={(event) => handleEditFormChange({ notes: event.target.value })}
                />
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--muted)]">Etiquetas detectadas</p>
                {editInfo.tags.length === 0 ? (
                  <p className="mt-2 text-sm text-[var(--muted)]">Sin etiquetas asignadas.</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {editInfo.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-[var(--hairline)] px-3 py-1 text-xs text-[var(--text)]">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {newUserOpen && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          onClick={handleCloseNewUser}
        >
          <div
            className="w-full max-w-3xl rounded-3xl border border-[var(--hairline)] bg-[var(--card)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-[var(--hairline)] px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Alta manual</p>
                <h2 className="text-lg font-semibold text-[var(--text)]">Crear nuevo usuario</h2>
              </div>
              <button type="button" className="btn" onClick={handleCloseNewUser}>
                Cerrar
              </button>
            </header>
            <form onSubmit={handleCreateUser} className="space-y-5 px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--text)]">Nombre completo</label>
                  <input
                    type="text"
                    value={newUserForm.name}
                    onChange={(event) => handleNewUserFormChange({ name: event.target.value })}
                    className="w-full rounded-xl border border-[var(--hairline)] bg-transparent px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--text)]">Nick</label>
                  <input
                    type="text"
                    value={newUserForm.nick}
                    onChange={(event) => handleNewUserFormChange({ nick: event.target.value })}
                    className="w-full rounded-xl border border-[var(--hairline)] bg-transparent px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-semibold text-[var(--text)]">Email</label>
                  <input
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={(event) => handleNewUserFormChange({ email: event.target.value })}
                    className="w-full rounded-xl border border-[var(--hairline)] bg-transparent px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
                    placeholder="persona@email.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--text)]">Roles</label>
                  <RolesDropdown value={newUserForm.roles} onChange={(value) => handleNewUserFormChange({ roles: value })} />
                  <p className="text-xs text-[var(--muted)]">Selecciona uno o varios roles. Por defecto se asigna SOCIO.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--text)]">Etiquetas</label>
                  <input
                    type="text"
                    value={newUserForm.etiquetas}
                    onChange={(event) => handleNewUserFormChange({ etiquetas: event.target.value })}
                    className="w-full rounded-xl border border-[var(--hairline)] bg-transparent px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
                    placeholder="pago, llaves, liga"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--text)]">Miembro desde</label>
                  <input
                    type="date"
                    value={newUserForm.membershipSince}
                    onChange={(event) => handleNewUserFormChange({ membershipSince: event.target.value })}
                    className="w-full rounded-xl border border-[var(--hairline)] bg-transparent px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--text)]">Miembro hasta</label>
                  <input
                    type="date"
                    value={newUserForm.membershipUntil}
                    onChange={(event) => handleNewUserFormChange({ membershipUntil: event.target.value })}
                    className="w-full rounded-xl border border-[var(--hairline)] bg-transparent px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--hairline)] bg-[var(--card-muted)] px-4 py-3">
                <span className="text-sm font-semibold text-[var(--text)]">Estado</span>
                <label className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
                  <input
                    type="checkbox"
                    checked={newUserForm.isActive}
                    onChange={(event) => handleNewUserFormChange({ isActive: event.target.checked })}
                    className="h-4 w-4 rounded border-[var(--hairline)] bg-[var(--card)]"
                  />
                  {newUserForm.isActive ? "Activo" : "Inactivo"}
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--text)]">Notas internas</label>
                <textarea
                  rows={3}
                  value={newUserForm.descripcion}
                  onChange={(event) => handleNewUserFormChange({ descripcion: event.target.value })}
                  className="w-full rounded-xl border border-[var(--hairline)] bg-transparent px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
                  placeholder="Observaciones, exenciones, etc."
                />
              </div>

              <div className="rounded-xl border border-dashed border-[var(--hairline)] bg-[var(--card-muted)] px-4 py-3 text-sm text-[var(--muted)]">
                La cuenta se creara con la contrasena temporal{" "}
                <span className="font-semibold text-[var(--text)]">{NEW_USER_TEMP_PASSWORD}</span>. El sistema la
                hasheara automaticamente y podras solicitar al socio que la cambie tras el primer acceso.
              </div>

              {newUserError && <p className="text-sm text-red-400">{newUserError}</p>}

              <div className="flex justify-end gap-3">
                <button type="button" className="btn" onClick={handleCloseNewUser}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-accent" disabled={newUserLoading}>
                  {newUserLoading ? "Creando..." : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {inviteOpen && (
        <div
          className="fixed inset-0 z-[998] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          onClick={handleCloseInvite}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-[var(--hairline)] bg-[var(--card)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-[var(--hairline)] px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Invitaciones</p>
                <h2 className="text-lg font-semibold text-[var(--text)]">Generar enlace por correo</h2>
              </div>
              <button type="button" className="btn" onClick={handleCloseInvite}>
                Cerrar
              </button>
            </header>
            <div className="space-y-4 px-6 py-5">
              {inviteResult ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[var(--hairline)] bg-[var(--card-muted)] p-4">
                    <p className="text-sm font-semibold text-[var(--text)]">
                      {inviteResult.status === "pending" ? "Formulario pendiente" : "Enlace listo"}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {inviteResult.message ??
                        (inviteResult.status === "pending"
                          ? "Ese correo ya tenia un formulario sin usar. Reutiliza el mismo enlace."
                          : "Comparte este enlace con la persona invitada. Deja de funcionar en cuanto complete el registro.")}
                    </p>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      Correo vinculado: <span className="font-semibold text-[var(--text)]">{inviteResult.email}</span>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase text-[var(--muted)]">Enlace de registro</label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        readOnly
                        value={inviteResult.url}
                        className="flex-1 rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        className="btn btn-accent whitespace-nowrap"
                        onClick={handleCopyInvite}
                      >
                        {inviteCopied ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      Si el navegador no permite copiar automaticamente, selecciona y copia el enlace manualmente.
                    </p>
                  </div>
                  {inviteError && <p className="text-sm text-red-400">{inviteError}</p>}
                  <div className="flex flex-wrap justify-between gap-3">
                    <button type="button" className="btn" onClick={handleInviteReset}>
                      Generar nuevo enlace
                    </button>
                    <button type="button" className="btn btn-accent" onClick={handleCloseInvite}>
                      Listo
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleInviteSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[var(--text)]">Correo del invitado</label>
                    <input
                      type="email"
                      required
                      autoFocus
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      className="w-full rounded-xl border border-[var(--hairline)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                      placeholder="persona@email.com"
                      disabled={inviteLoading}
                    />
                    <p className="text-xs text-[var(--muted)]">
                      Se generara un enlace unico para ese correo. Si ya existe uno pendiente, se mostrara el mismo.
                    </p>
                  </div>
                  {inviteError && <p className="text-sm text-red-400">{inviteError}</p>}
                  <div className="flex justify-end gap-3">
                    <button type="button" className="btn" onClick={handleCloseInvite}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-accent" disabled={inviteLoading}>
                      {inviteLoading ? "Generando..." : "Generar enlace"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {historyOpen && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          onClick={handleCloseHistory}
        >
          <div
            className="relative max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--card)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-[var(--hairline)] bg-[var(--card-muted)] px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text)]">Historial de cambios</h2>
                <p className="text-xs text-[var(--muted)]">
                  Ultimas 100 modificaciones realizadas desde este panel.
                </p>
              </div>
              <button
                type="button"
                className="btn"
                onClick={handleCloseHistory}
                aria-label="Cerrar historial"
              >
                Cerrar
              </button>
            </header>
            <div className="max-h-[calc(80vh-4.5rem)] overflow-y-auto px-6 py-4">
              {historyLoading ? (
                <p className="text-sm text-[var(--muted)]">Cargando historial...</p>
              ) : historyError ? (
                <p className="text-sm text-red-400">{historyError}</p>
              ) : historyEntries.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">
                  Aun no hay cambios registrados desde este panel.
                </p>
              ) : (
                <ul className="space-y-4">
                  {historyEntries.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-xl border border-[var(--hairline)] bg-[var(--card-muted)] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <div>
                          <span className="font-semibold text-[var(--text)]">
                            {entry.userLabel}
                          </span>
                          <span className="ml-2 text-xs text-[var(--muted)]">
                            ID {entry.userId}
                          </span>
                        </div>
                        <span className="text-xs text-[var(--muted)]">
                          {hasHydrated ? historyDateFormatter.format(new Date(entry.createdAt)) : entry.createdAt}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-[var(--muted)]">
                        Modificado por {entry.adminLabel}
                        {entry.adminEmail ? ` (${entry.adminEmail})` : ""}
                      </div>
                      <ul className="mt-3 space-y-2 text-sm">
                        {entry.changes.map((change, index) => (
                          <li key={`${entry.id}-${index}`} className="rounded-lg bg-[var(--card)] p-3">
                            <div className="font-semibold text-[var(--text)]">
                              {COLUMN_LABELS[change.field] ?? change.field}
                            </div>
                            <div className="mt-2 grid gap-1 text-xs text-[var(--muted)]">
                              <div>
                                <span className="font-semibold text-[var(--text)]">Antes:</span>{" "}
                                {renderChangeValue(change.field, change.before)}
                              </div>
                              <div>
                                <span className="font-semibold text-[var(--text)]">Ahora:</span>{" "}
                                {renderChangeValue(change.field, change.after)}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export type { ColumnConfig } from "./table-config";



























