import Image from "next/image";
import { redirect } from "next/navigation";
import type { Rol } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractRoles } from "@/lib/roles";

export const metadata = {
  title: "Tablon de socios | Bilbohammer",
  description:
    "Listado interno de personas socias de Bilbohammer con la junta destacada para facilitar el contacto directo.",
};

const ALLOWED_ROLES = new Set<Rol>(["SOCIO", "JUNTA", "ADMIN"]);
const BOARD_ROLES = new Set<Rol>(["JUNTA", "ADMIN"]);

type RawMember = {
  id: number;
  name: string | null;
  nick: string | null;
  avatarUrl: string | null;
  image: string | null;
  roles: Rol[];
  descripcion: string | null;
  membershipSince: Date | null;
};

type MemberCard = {
  id: number;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  roleLabel: string;
  memberSince: string | null;
  bio: string | null;
};

const ROLE_LABEL: Record<Rol, string> = {
  ADMIN: "Administracion del club",
  JUNTA: "Junta directiva",
  SOCIO: "Persona socia",
  AMIGO: "Amigo del club",
};

export default async function TablonSociosPage() {
  const session = await auth();
  const targetUrl = "/sobre-nosotros/tablon-de-socios";

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(targetUrl)}`);
  }

  const roles = extractRoles(session);
  const authorized = roles.some((role) => role === "SOCIO" || role === "JUNTA" || role === "ADMIN");

  if (!authorized) {
    return (
      <section className="card space-y-4">
        <h1 className="text-3xl font-semibold">Tablon de socios</h1>
        <p>
          Tu cuenta no dispone del rol de socio. Si crees que es un error, ponte en contacto con la junta para revisar
          tu alta.
        </p>
      </section>
    );
  }

  const rawMembers = await prisma.user.findMany({
    where: {
      isActive: true,
      roles: { hasSome: Array.from(ALLOWED_ROLES) },
    },
    select: {
      id: true,
      name: true,
      nick: true,
      avatarUrl: true,
      image: true,
      roles: true,
      descripcion: true,
      membershipSince: true,
    },
  });

  const boardMembers = rawMembers.filter((member) => member.roles.some((role) => BOARD_ROLES.has(role)));
  const boardIds = new Set(boardMembers.map((member) => member.id));
  const socios = rawMembers.filter((member) => !boardIds.has(member.id));

  const boardCards = boardMembers.map(toMemberCard).sort((a, b) => a.displayName.localeCompare(b.displayName, "es"));
  const socioCards = socios.map(toMemberCard).sort((a, b) => a.displayName.localeCompare(b.displayName, "es"));

  return (
    <div className="space-y-10">
      <section className="card space-y-3">
        <h1 className="text-3xl font-semibold">Tablon de socios</h1>
        <p>
          Este directorio interno te ayuda a contactar con la junta, encontrar personas para organizar eventos y poner
          cara a quienes comparten el local contigo.
        </p>
        <p className="text-sm text-[var(--muted)]">
          Actualiza tu avatar y tu biografia desde el perfil personal para que aparezcan aqui.
        </p>
      </section>

      {boardCards.length > 0 && (
        <section className="card space-y-4">
          <header className="space-y-1">
            <h2 className="text-2xl font-semibold">Junta y coordinacion</h2>
            <p className="text-sm text-[var(--muted)]">
              Personas con rol de administracion o junta, visibles primero para consultas rapidas.
            </p>
          </header>
          <MemberGrid members={boardCards} highlight />
        </section>
      )}

      <section className="card space-y-4">
        <header className="space-y-1">
          <h2 className="text-2xl font-semibold">Personas socias</h2>
          <p className="text-sm text-[var(--muted)]">
            El resto de socios y socias activos ordenados alfabeticamente por nick o nombre.
          </p>
        </header>
        {socioCards.length > 0 ? (
          <MemberGrid members={socioCards} />
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Todavia no hay socios activos registrados en el sistema. La junta actualizara este listado en breve.
          </p>
        )}
      </section>
    </div>
  );
}

function toMemberCard(member: RawMember): MemberCard {
  const displayName = member.nick || member.name || `Socio ${member.id}`;
  const avatarUrl = member.avatarUrl || member.image;
  const initials = toInitials(displayName);
  const highest = pickHighestRole(member.roles);
  const roleLabel = highest ? ROLE_LABEL[highest] : ROLE_LABEL.SOCIO;
  const memberSince = member.membershipSince
    ? new Intl.DateTimeFormat("es-ES", { month: "short", year: "numeric" }).format(member.membershipSince)
    : null;

  return {
    id: member.id,
    displayName,
    initials,
    avatarUrl,
    roleLabel,
    memberSince,
    bio: member.descripcion,
  };
}

function pickHighestRole(roles: Rol[]): Rol | null {
  const priority: Rol[] = ["ADMIN", "JUNTA", "SOCIO", "AMIGO"];
  for (const role of priority) {
    if (roles.includes(role)) return role;
  }
  return roles[0] ?? null;
}

function toInitials(value: string): string {
  const parts = value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "BH";
  return parts
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

function MemberGrid({ members, highlight = false }: { members: MemberCard[]; highlight?: boolean }) {
  const baseCard =
    "flex flex-col gap-4 rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-5 shadow-sm transition";
  const highlightCard = highlight ? "ring-2 ring-[var(--accent-200)] ring-offset-2 ring-offset-[var(--card)]" : "";

  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {members.map((member) => (
        <li key={member.id} className={`${baseCard} ${highlightCard}`}>
          <div className="flex items-center gap-4">
            <Avatar initials={member.initials} avatarUrl={member.avatarUrl} highlight={highlight} />
            <div className="space-y-1">
              <p className="text-lg font-semibold text-[var(--text)]">{member.displayName}</p>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--accent-600)]">
                {member.roleLabel}
              </p>
              {member.memberSince && (
                <p className="text-xs text-[var(--muted)]">En el club desde {member.memberSince}</p>
              )}
            </div>
          </div>
          {member.bio && <p className="text-sm text-[var(--muted)]">{member.bio}</p>}
        </li>
      ))}
    </ul>
  );
}

function Avatar({
  initials,
  avatarUrl,
  highlight,
}: {
  initials: string;
  avatarUrl: string | null;
  highlight: boolean;
}) {
  const frame =
    "relative h-16 w-16 overflow-hidden rounded-full border border-[var(--hairline)] bg-[var(--card)]";
  const ring = highlight ? "ring-2 ring-[var(--accent-300)] ring-offset-2 ring-offset-[var(--card-muted)]" : "";

  if (!avatarUrl) {
    return (
      <div className={`${frame} ${ring} flex items-center justify-center text-lg font-semibold text-[var(--text)]`}>
        {initials}
      </div>
    );
  }

  const isRemoteAvatar = /^https?:\/\//i.test(avatarUrl);

  if (isRemoteAvatar) {
    return (
      <div className={`${frame} ${ring}`}>
        <img src={avatarUrl} alt={`Avatar de ${initials}`} className="h-full w-full object-cover" loading="lazy" />
      </div>
    );
  }

  return (
    <div className={`${frame} ${ring}`}>
      <Image src={avatarUrl} alt={`Avatar de ${initials}`} fill sizes="64px" className="object-cover" />
    </div>
  );
}
