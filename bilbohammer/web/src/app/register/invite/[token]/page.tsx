import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RegistrationForm } from "@/components/auth/RegistrationForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
  params: { token: string };
};

async function invalidateInvite(inviteId: string, usedById?: number | null) {
  try {
    await prisma.userInvite.update({
      where: { id: inviteId },
      data: { usedAt: new Date(), usedById: usedById ?? undefined },
    });
  } catch {
    // si ya se invalido no hacemos nada
  }
}

type InviteState =
  | {
      kind: "ready";
      id: string;
      email: string;
      token: string;
      role: string;
    }
  | {
      kind: "invalid";
      reason: string;
    };

async function loadInvite(token: string): Promise<InviteState> {
  const invite = await prisma.userInvite.findUnique({
    where: { token },
    select: { id: true, email: true, token: true, role: true, usedAt: true, expiresAt: true },
  });

  if (!invite) {
    return { kind: "invalid", reason: "Este enlace de invitacion no existe o ya fue cancelado." };
  }

  if (invite.usedAt) {
    return { kind: "invalid", reason: "Este enlace de invitacion ya fue utilizado." };
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { kind: "invalid", reason: "Este enlace de invitacion ha caducado." };
  }

  const existing = await prisma.user.findUnique({
    where: { email: invite.email },
    select: { id: true },
  });
  if (existing) {
    await invalidateInvite(invite.id, existing.id);
    return { kind: "invalid", reason: "Ese email ya tiene una cuenta activa." };
  }

  return {
    kind: "ready",
    id: invite.id,
    email: invite.email,
    token: invite.token,
    role: invite.role,
  };
}

function InviteError({ reason }: { reason: string }) {
  return (
    <section className="mx-auto max-w-lg space-y-6 px-4 py-10 text-center">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold text-[var(--text)]">Invitacion no disponible</h1>
        <p className="text-sm text-[var(--muted)]">{reason}</p>
      </div>
      <Link href="/login" className="btn btn-accent inline-flex justify-center">
        Ir al login
      </Link>
    </section>
  );
}

export default async function InviteRegisterPage({ params }: Props) {
  const inviteState = await loadInvite(params.token);

  if (inviteState.kind === "invalid") {
    return <InviteError reason={inviteState.reason} />;
  }

  return (
    <section className="mx-auto max-w-lg space-y-6 px-4 py-10">
      <div className="space-y-3 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Invitacion exclusiva</p>
        <h1 className="text-3xl font-semibold text-[var(--text)]">Completa tu alta</h1>
        <p className="text-sm text-[var(--muted)]">
          Vas a crear la cuenta asociada al correo <span className="font-semibold text-[var(--text)]">{inviteState.email}</span>.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
        <div className="rounded-xl border border-dashed border-[var(--hairline)] bg-[var(--card-muted)] px-4 py-3 text-sm text-[var(--muted)]">
          Esta cuenta se creara con privilegios de <span className="font-semibold text-[var(--text)]">{inviteState.role}</span>.
        </div>
        <RegistrationForm defaultEmail={inviteState.email} emailReadOnly inviteToken={inviteState.token} />
      </div>

      <p className="text-center text-xs text-[var(--muted)]">
        Si tienes problemas con el enlace, responde al correo de invitacion o escribe a la junta del club.
      </p>
    </section>
  );
}
