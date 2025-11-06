export type ColumnConfig = {
  key: string;
  label: string;
  type?: "text" | "button" | "image";
  buttonLabel?: string;
  buttonVariant?: "accent" | "danger";
  stickyLeft?: number;
  width?: number;
};

export type RawUserRow = Record<string, unknown>;
export type PreparedRow = Record<string, string>;

export const HIDDEN_COLUMNS = new Set([
  "emailVerified",
  "avatarUrl",
  "nombre",
  "descripcion",
  "faccionesW40K",
  "faccionesAoS",
  "faccionesTOW",
]);

export const COLUMN_LABELS: Record<string, string> = {
  image: "Imagen",
  name: "Nombre",
  nick: "Nick",
  email: "Email",
  descripcion: "Descripción",
  roles: "Roles",
  etiquetas: "Etiquetas",
  passwordHash: "Cambiar contrasena",
  isActive: "Activo",
  lastLoginAt: "Ultima conexion",
  membershipSince: "Miembro desde",
  membershipUntil: "Miembro hasta",
  createdAt: "Creado",
  updatedAt: "Modificado",
  __edit: "Editar informacion",
  __delete: "Acciones",
};

export const COLUMN_WIDTHS: Record<string, number> = {
  id: 72,
  image: 108,
  name: 132,
  nick: 132,
  email: 210,
  roles: 164,
  etiquetas: 220,
  __edit: 164,
  passwordHash: 164,
  __delete: 142,
  lastLoginAt: 140,
  membershipSince: 140,
  membershipUntil: 140,
  createdAt: 140,
  updatedAt: 140,
};

export const BUTTON_COLUMNS = new Set(["passwordHash", "__edit", "__delete"]);
export const IMAGE_COLUMNS = new Set(["image"]);

export const STICKY_LEFTS: Record<string, number> = {
  id: 0,
  image: COLUMN_WIDTHS.id,
  name: COLUMN_WIDTHS.id + COLUMN_WIDTHS.image,
};

export const PRIORITY_ORDER = [
  "id",
  "image",
  "name",
  "nick",
  "email",
  "roles",
  "etiquetas",
  "isActive",
  "lastLoginAt",
  "membershipSince",
  "membershipUntil",
  "createdAt",
  "updatedAt",
];

const BUTTON_LABELS: Record<string, string> = {
  passwordHash: "Cambiar contrasena",
  __edit: "Editar usuario",
  __delete: "Eliminar",
};

const BUTTON_VARIANTS: Record<string, "accent" | "danger"> = {
  passwordHash: "accent",
  __edit: "accent",
  __delete: "danger",
};

export function serializeUsers(users: Array<RawUserRow>) {
  if (users.length === 0) {
    return { columns: [] as ColumnConfig[], rows: [] as PreparedRow[] };
  }

  const visibleKeys = new Set<string>();
  const rows: PreparedRow[] = users.map((user) => {
    const row: PreparedRow = {};
    for (const [key, value] of Object.entries(user)) {
      if (Array.isArray(value)) {
        row[key] = value
          .map((item) => String(item ?? ""))
          .filter(Boolean)
          .join(", ");
      } else if (value instanceof Date) {
        row[key] = value.toISOString();
      } else if (value === null || typeof value === "undefined") {
        row[key] = "";
      } else if (typeof value === "object") {
        row[key] = JSON.stringify(value);
      } else {
        row[key] = String(value);
      }
      if (!HIDDEN_COLUMNS.has(key)) visibleKeys.add(key);
    }

    for (const key of PRIORITY_ORDER) {
      if (!(key in row)) row[key] = "";
      if (!HIDDEN_COLUMNS.has(key)) visibleKeys.add(key);
    }

    return row;
  });

  const orderedKeys: string[] = [
    ...PRIORITY_ORDER.filter((key) => visibleKeys.has(key)),
    ...Array.from(visibleKeys).filter((key) => !PRIORITY_ORDER.includes(key)),
  ];

  const baseColumns: ColumnConfig[] = orderedKeys
    .filter((key) => key !== "passwordHash")
    .map((key) => ({
      key,
      label: COLUMN_LABELS[key] ?? key,
      type: BUTTON_COLUMNS.has(key)
        ? "button"
        : IMAGE_COLUMNS.has(key)
        ? "image"
        : "text",
      buttonLabel: BUTTON_LABELS[key],
      buttonVariant: BUTTON_VARIANTS[key],
      stickyLeft: STICKY_LEFTS[key],
      width: COLUMN_WIDTHS[key],
    }));

  const finalColumns = [...baseColumns];

  if (visibleKeys.has("passwordHash")) {
    finalColumns.push({
      key: "__edit",
      label: COLUMN_LABELS.__edit,
      type: "button",
      buttonLabel: BUTTON_LABELS.__edit,
      buttonVariant: BUTTON_VARIANTS.__edit,
      width: COLUMN_WIDTHS.__edit,
    });

    finalColumns.push({
      key: "passwordHash",
      label: COLUMN_LABELS.passwordHash,
      type: "button",
      buttonLabel: BUTTON_LABELS.passwordHash,
      buttonVariant: BUTTON_VARIANTS.passwordHash,
      width: COLUMN_WIDTHS.passwordHash,
    });
  } else {
    finalColumns.push({
      key: "__edit",
      label: COLUMN_LABELS.__edit,
      type: "button",
      buttonLabel: BUTTON_LABELS.__edit,
      buttonVariant: BUTTON_VARIANTS.__edit,
      width: COLUMN_WIDTHS.__edit,
    });
  }

  finalColumns.push({
    key: "__delete",
    label: COLUMN_LABELS.__delete,
    type: "button",
    buttonLabel: BUTTON_LABELS.__delete,
    buttonVariant: BUTTON_VARIANTS.__delete,
    width: COLUMN_WIDTHS.__delete,
  });

  return { columns: finalColumns, rows };
}
