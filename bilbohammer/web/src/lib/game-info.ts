import type { Rol } from "@prisma/client";

type ContactUserLite = {
  nick: string | null;
  name: string | null;
  email: string | null;
  roles: Rol[];
};

type GameContactDisplay = {
  display: string;
  note: string;
  email: string | null;
};

const ROLE_PRIORITY: Rol[] = ["ADMIN", "JUNTA", "REDACTOR", "SOCIO", "AMIGO"];
const ROLE_LABEL: Record<Rol, string> = {
  ADMIN: "Admin",
  JUNTA: "Junta",
  REDACTOR: "Redactor",
  SOCIO: "Socio",
  AMIGO: "Amigo",
};

export function buildGameContactDisplay(user: ContactUserLite | null, note?: string): GameContactDisplay {
  if (!user) {
    return {
      display: "Referencia pendiente",
      note: note ?? "",
      email: null,
    };
  }

  const baseName = user.nick ?? user.name ?? user.email ?? "Socio asignado";
  const role = ROLE_PRIORITY.find((candidate) => user.roles.includes(candidate)) ?? user.roles[0] ?? null;
  const roleLabel = role ? ROLE_LABEL[role] ?? role : null;
  const display = roleLabel ? `${baseName} · ${roleLabel}` : baseName;

  return {
    display,
    note: note ?? "",
    email: user.email ?? null,
  };
}
