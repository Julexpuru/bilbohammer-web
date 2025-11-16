import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractRoles } from "@/lib/roles";
import { formatClubDateTime } from "@/lib/date-format";
import { RolePills } from "@/components/profile/RolePills";
import { Avatar } from "@/components/profile/Avatar";

export const metadata = {
  title: "Perfil de la comunidad | Bilbohammer",
};

export default async function MemberProfilePage({ params }: { params: { memberId: string } }) {
  const session = await auth();
  const targetUrl = `/sobre-nosotros/tablon-de-socios/${params.memberId}`;

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(targetUrl)}`);
  }

  const roles = extractRoles(session);
  const authorized = roles.includes("SOCIO") || roles.includes("JUNTA") || roles.includes("ADMIN");

  if (!authorized) {
    return (
      <section className="card space-y-4">
        <h1 className="text-3xl font-semibold">Perfil no disponible</h1>
        <p>
          Este perfil solo es accesible para personas socias. Si crees que deberias verlo, contacta con la junta para
          revisar tu cuenta.
        </p>
      </section>
    );
  }

  const memberId = Number(params.memberId);
  if (!Number.isInteger(memberId)) {
    redirect("/sobre-nosotros/tablon-de-socios");
  }

  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      isActive: true,
      name: true,
      nick: true,
      email: true,
      roles: true,
      avatarUrl: true,
      oauthAvatarUrl: true,
      image: true,
      descripcion: true,
      membershipSince: true,
    },
  });

  if (!member || !member.isActive) {
    redirect("/sobre-nosotros/tablon-de-socios");
  }

  const displayName = member.nick || member.name || `Socio ${member.id}`;
  const roleBadges = member.roles.map((role) => String(role) as string);
  const memberSince = member.membershipSince
    ? formatClubDateTime(member.membershipSince, { month: "long", year: "numeric" })
    : null;
  const bio = member.descripcion || "Esta persona aun no ha compartido su biografia.";

  return (
    <div className="space-y-6">
      <Link href="/sobre-nosotros/tablon-de-socios" className="text-sm text-[var(--muted)] hover:text-[var(--text)]">
        &larr; Volver al tablon
      </Link>

      <section className="card space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar
            avatarUrl={member.avatarUrl}
            oauthAvatarUrl={member.oauthAvatarUrl ?? member.image ?? null}
            displayName={displayName}
            size={112}
          />
          <div className="space-y-2">
            <p className="text-sm text-[var(--muted)]">{member.email}</p>
            <h1 className="text-3xl font-semibold">{displayName}</h1>
            <RolePills roles={roleBadges} />
            {memberSince && <p className="text-sm text-[var(--muted)]">En el club desde {memberSince}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Biografia</h2>
          <p className="text-sm text-[var(--text)]">{bio}</p>
        </div>
      </section>
    </div>
  );
}
