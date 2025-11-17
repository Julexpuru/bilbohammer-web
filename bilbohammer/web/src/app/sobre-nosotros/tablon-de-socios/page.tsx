import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Rol } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractRoles } from "@/lib/roles";
import { SYSTEM_ACCOUNT_EMAILS } from "@/constants/system-users";
import { RolePills } from "@/components/profile/RolePills";
import {
  BOARD_SLOT_CONFIG,
  getBoardAssignments,
  toMemberCard,
  type BoardSlotConfig,
  type MemberCard,
  type RawMember,
  type SingleBoardSlotId,
} from "@/lib/member-directory";
import { AssignBoardMemberButton, RemoveBoardMemberButton } from "./AssignBoardMemberButton";
import { PonmeCaraButton } from "./PonmeCaraButton";

export const metadata = {
  title: "Tablon de socios | Bilbohammer",
  description:
    "Listado interno de personas socias de Bilbohammer con la junta destacada para facilitar el contacto directo.",
};

const ALLOWED_ROLES = new Set<Rol>(["SOCIO", "JUNTA", "ADMIN"]);

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

  const [rawMembers, boardAssignments] = await Promise.all([
    prisma.user.findMany({
      where: {
        isActive: true,
        roles: { hasSome: Array.from(ALLOWED_ROLES) },
        NOT: {
          email: { in: SYSTEM_ACCOUNT_EMAILS },
        },
      },
      select: {
        id: true,
        name: true,
        nick: true,
        avatarUrl: true,
        oauthAvatarUrl: true,
        facePhotoUrl: true,
        image: true,
        roles: true,
        descripcion: true,
        membershipSince: true,
      },
    }),
    getBoardAssignments(),
  ]);

  const members = (rawMembers ?? []) as RawMember[];
  const memberMap = new Map(members.map((member) => [member.id, member]));
  const viewerId = session.user?.id ? String(session.user.id) : null;
  const leadershipSlots = BOARD_SLOT_CONFIG.filter((slot) => slot.tier !== "vocales");
  const leadershipCards = leadershipSlots.map((slot) => {
    const slotId = slot.id as SingleBoardSlotId;
    const assignedId = boardAssignments[slotId];
    const assignedMember = assignedId ? memberMap.get(assignedId) ?? null : null;
    return { slot, member: assignedMember ? toMemberCard(assignedMember) : null };
  });
  const pyramidTop = leadershipCards.filter((entry) => entry.slot.tier === "presidencia");
  const pyramidCargos = leadershipCards.filter((entry) => entry.slot.tier === "cargos");

  const assignedIds = new Set<number>();
  leadershipCards.forEach(({ member }) => {
    if (member) assignedIds.add(member.id);
  });

  const vocalEntries = (boardAssignments.VOCAL ?? []).map((memberId, index) => {
    const raw = memberMap.get(memberId) ?? null;
    if (raw) assignedIds.add(raw.id);
    return {
      key: `vocal-${memberId}-${index}`,
      assignedId: memberId,
      member: raw ? toMemberCard(raw) : null,
    };
  });

  const socioCards = members
    .filter((member) => !assignedIds.has(member.id))
    .map((member) => toMemberCard(member))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "es"));

  const canAssign = roles.includes("JUNTA") || roles.includes("ADMIN");

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

      <section className="card space-y-6">
        <header>
          <h2 className="text-2xl font-semibold">Junta y coordinacion</h2>
        </header>

        <div className="flex flex-col gap-6">
          {pyramidTop.length > 0 && (
            <div className="mx-auto w-full max-w-2xl">
              <ul className="grid gap-4">
                {pyramidTop.map((entry) => (
                  <LeadershipSlotCard
                    key={entry.slot.id}
                    slot={entry.slot}
                    member={entry.member}
                    canAssign={canAssign}
                    viewerId={viewerId}
                  />
                ))}
              </ul>
            </div>
          )}

          {pyramidCargos.length > 0 && (
            <ul className="grid gap-4 md:grid-cols-3">
              {pyramidCargos.map((entry) => (
                <LeadershipSlotCard
                  key={entry.slot.id}
                  slot={entry.slot}
                  member={entry.member}
                  canAssign={canAssign}
                  viewerId={viewerId}
                />
              ))}
            </ul>
          )}

          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Base</p>
                <h3 className="text-xl font-semibold text-[var(--text)]">Vocales</h3>
              </div>
              {canAssign && (
                <AssignBoardMemberButton
                  slotId="VOCAL"
                  slotLabel="Nueva vocalia"
                  mode="append"
                  buttonLabel="Añadir vocal"
                />
              )}
            </div>
            {vocalEntries.length > 0 ? (
              <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {vocalEntries.map((entry, index) => (
                  <VocalCard
                    key={entry.key}
                    entry={entry}
                    index={index}
                    canAssign={canAssign}
                    viewerId={viewerId}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Todavia no hay vocalias activas. {canAssign ? "Pulsa en “Añadir vocal” para estrenar la base." : ""}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <header>
          <h2 className="text-2xl font-semibold">Soci@s</h2>
        </header>
        {socioCards.length > 0 ? (
          <MemberGrid members={socioCards} canViewProfiles={authorized} viewerId={viewerId} />
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Todavia no hay socios activos registrados en el sistema. La junta actualizara este listado en breve.
          </p>
        )}
      </section>
    </div>
  );
}

function LeadershipSlotCard({
  slot,
  member,
  canAssign,
  viewerId,
}: {
  slot: BoardSlotConfig;
  member: MemberCard | null;
  canAssign: boolean;
  viewerId: string | null;
}) {
  const highlight = slot.tier === "presidencia";
  return (
    <li
      className={`flex flex-col gap-4 rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-5 shadow-sm ${
        highlight ? "ring-2 ring-[var(--accent-200)] ring-offset-2 ring-offset-[var(--card)]" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Cargo</p>
          <h3 className="text-xl font-semibold text-[var(--text)]">{slot.label}</h3>
        </div>
        {canAssign && (
          <AssignBoardMemberButton slotId={slot.id as SingleBoardSlotId} slotLabel={slot.label} buttonLabel="Asignar" />
        )}
      </div>
      {member ? (
        <>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-4">
              <Avatar initials={member.initials} avatarUrl={member.avatarUrl} highlight={highlight} />
              <div className="space-y-2">
                <div className="space-y-0.5">
                  <p className="text-lg font-semibold text-[var(--text)]">
                    <Link href={member.profileHref} className="hover:text-[var(--accent)] focus-visible:underline">
                      {member.displayName}
                    </Link>
                  </p>
                  {member.nick && member.nick !== member.displayName && (
                    <p className="text-sm italic text-[var(--muted)]">"{member.nick}"</p>
                  )}
                </div>
                <RolePills roles={member.roles} />
                <MemberSinceBadge value={member.memberSince} />
              </div>
            </div>
            <PonmeCaraButton
              memberId={member.id}
              displayName={member.displayName}
              photoUrl={member.facePhotoUrl}
              isCurrentUser={viewerId === String(member.id)}
            />
          </div>
          {member.bio && <p className="text-sm text-[var(--muted)]">{member.bio}</p>}
        </>
      ) : (
        <p className="text-sm text-[var(--muted)]">Sin perfil asignado.</p>
      )}
    </li>
  );
}

type VocalEntry = { key: string; assignedId: number | null; member: MemberCard | null };

function VocalCard({
  entry,
  index,
  canAssign,
  viewerId,
}: {
  entry: VocalEntry;
  index: number;
  canAssign: boolean;
  viewerId: string | null;
}) {
  const { member, assignedId } = entry;
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Vocal #{index + 1}</p>
          {member ? (
            <div className="space-y-0.5">
              <p className="text-lg font-semibold text-[var(--text)]">
                <Link href={member.profileHref} className="hover:text-[var(--accent)] focus-visible:underline">
                  {member.displayName}
                </Link>
              </p>
              {member.nick && member.nick !== member.displayName && (
                <p className="text-sm italic text-[var(--muted)]">"{member.nick}"</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">Sin perfil asignado.</p>
          )}
        </div>
        {canAssign && assignedId != null && (
          <RemoveBoardMemberButton slotId="VOCAL" targetId={assignedId} buttonLabel="Quitar" />
        )}
      </div>
      {member && (
        <>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <RolePills roles={member.roles} />
              <MemberSinceBadge value={member.memberSince} />
            </div>
            <PonmeCaraButton
              memberId={member.id}
              displayName={member.displayName}
              photoUrl={member.facePhotoUrl}
              isCurrentUser={viewerId === String(member.id)}
            />
          </div>
          {member.bio && <p className="text-sm text-[var(--muted)]">{member.bio}</p>}
        </>
      )}
      {canAssign && (
        <div className="pt-1">
          <AssignBoardMemberButton
            slotId="VOCAL"
            slotLabel={`Vocal ${index + 1}`}
            mode="replace"
            targetId={assignedId}
            buttonLabel={member ? "Reasignar" : "Asignar"}
          />
        </div>
      )}
    </li>
  );
}

function MemberGrid({
  members,
  canViewProfiles,
  viewerId,
}: {
  members: MemberCard[];
  canViewProfiles: boolean;
  viewerId: string | null;
}) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {members.map((member) => (
        <li
          key={member.id}
          className="flex flex-col gap-4 rounded-2xl border border-[var(--hairline)] bg-[var(--card-muted)] p-5 shadow-sm transition"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-4">
              <Avatar initials={member.initials} avatarUrl={member.avatarUrl} highlight={false} />
              <div className="space-y-2">
                <div className="space-y-0.5">
                  <p className="text-lg font-semibold text-[var(--text)]">
                    {canViewProfiles ? (
                      <Link
                        href={member.profileHref}
                        className="hover:text-[var(--accent)] focus-visible:underline focus-visible:outline-none"
                      >
                        {member.displayName}
                      </Link>
                    ) : (
                      member.displayName
                    )}
                  </p>
                  {member.nick && member.nick !== member.displayName && (
                    <p className="text-sm italic text-[var(--muted)]">"{member.nick}"</p>
                  )}
                </div>
                <RolePills roles={member.roles} />
                <MemberSinceBadge value={member.memberSince} />
              </div>
            </div>
            <PonmeCaraButton
              memberId={member.id}
              displayName={member.displayName}
              photoUrl={member.facePhotoUrl}
              isCurrentUser={viewerId === String(member.id)}
            />
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

function MemberSinceBadge({ value }: { value: string | null }) {
  if (!value) return null;
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--card)] px-3 py-1 text-xs text-[var(--muted)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" aria-hidden="true" />
      <span>En el club desde</span>
      <span className="font-semibold text-[var(--text)]">{value}</span>
    </div>
  );
}
