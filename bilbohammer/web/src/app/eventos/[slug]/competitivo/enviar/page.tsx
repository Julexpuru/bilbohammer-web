import { EventRegistrationStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { resolveSessionUserId } from "@/lib/event-registrations";
import { buildEventSlug, extractEventIdFromSlug } from "@/lib/events/slug";
import { prisma } from "@/lib/prisma";

import { submitCompetitiveReportAction } from "./actions";

type Params = {
  slug: string;
};

type SearchParams = {
  error?: string;
  feedback?: string;
};

function FeedbackBanner({ searchParams }: { searchParams?: SearchParams }) {
  if (searchParams?.error) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
        {searchParams.error}
      </div>
    );
  }
  if (searchParams?.feedback === "submitted") {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
        Resultado enviado. Queda pendiente de revisión por la organización.
      </div>
    );
  }
  return null;
}

export const dynamic = "force-dynamic";

export default async function SubmitCompetitiveReportPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const session = await auth();
  const userId = resolveSessionUserId(session);
  const eventId = extractEventIdFromSlug(params.slug);
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      registrations: {
        where: {
          status: { in: [EventRegistrationStatus.INSCRITO, EventRegistrationStatus.PAGADO] },
        },
        orderBy: [{ playerName: "asc" }],
        select: {
          id: true,
          userId: true,
          playerName: true,
          factionLabel: true,
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const eventSlug = buildEventSlug(event.id, event.title);
  const competitiveHref = `/eventos/${eventSlug}/competitivo`;
  const ownRegistration = userId == null ? null : event.registrations.find((registration) => registration.userId === userId);
  const opponentRegistrations = ownRegistration
    ? event.registrations.filter((registration) => registration.id !== ownRegistration.id)
    : [];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
          <Link href={competitiveHref} className="transition hover:text-white">
            Competitivo
          </Link>
          <span>/</span>
          <span>Enviar resultado</span>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-white">Enviar resultado</h1>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              {event.title}. El resultado quedará pendiente hasta que la organización lo revise.
            </p>
          </div>
          <Link
            href={competitiveHref}
            className="w-fit rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Volver a datos
          </Link>
        </div>
      </header>

      <FeedbackBanner searchParams={searchParams} />

      {userId == null && (
        <section className="rounded-3xl border border-white/10 bg-black/20 p-6 text-sm text-[var(--muted)]">
          Necesitas iniciar sesión para enviar resultados.
        </section>
      )}

      {userId != null && !ownRegistration && (
        <section className="rounded-3xl border border-white/10 bg-black/20 p-6 text-sm text-[var(--muted)]">
          Solo los jugadores inscritos en este evento pueden enviar resultados.
        </section>
      )}

      {ownRegistration && (
        <form action={submitCompetitiveReportAction} className="space-y-5 rounded-3xl border border-white/10 bg-black/20 p-5 shadow-lg">
          <input type="hidden" name="eventId" value={event.id} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]" htmlFor="kind">
                Tipo
              </label>
              <select
                id="kind"
                name="kind"
                defaultValue="LEAGUE"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              >
                <option value="LEAGUE">Liga</option>
                <option value="CASUAL">Pachanga</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]" htmlFor="playedAt">
                Fecha
              </label>
              <input
                id="playedAt"
                name="playedAt"
                type="date"
                defaultValue={today}
                required
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]" htmlFor="opponentRegistrationId">
                Rival
              </label>
              <select
                id="opponentRegistrationId"
                name="opponentRegistrationId"
                required
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              >
                <option value="">Selecciona rival</option>
                {opponentRegistrations.map((registration) => (
                  <option key={registration.id} value={registration.id}>
                    {registration.playerName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]" htmlFor="roundNumber">
                Ronda
              </label>
              <input
                id="roundNumber"
                name="roundNumber"
                type="number"
                min={0}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]" htmlFor="ownFaction">
                Tu facción
              </label>
              <input
                id="ownFaction"
                name="ownFaction"
                defaultValue={ownRegistration.factionLabel ?? ""}
                required
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]" htmlFor="opponentFaction">
                Facción rival
              </label>
              <input
                id="opponentFaction"
                name="opponentFaction"
                required
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]" htmlFor="outcome">
                Resultado
              </label>
              <select
                id="outcome"
                name="outcome"
                defaultValue="WIN"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              >
                <option value="WIN">Victoria</option>
                <option value="DRAW">Empate</option>
                <option value="LOSS">Derrota</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]" htmlFor="ownScore">
                Tus puntos
              </label>
              <input
                id="ownScore"
                name="ownScore"
                type="number"
                min={0}
                required
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]" htmlFor="opponentScore">
                Puntos rival
              </label>
              <input
                id="opponentScore"
                name="opponentScore"
                type="number"
                min={0}
                required
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]" htmlFor="notes">
              Notas
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              maxLength={1000}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              placeholder="Opcional"
            />
          </div>

          <p className="rounded-2xl border border-amber-300/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Si ya existe una partida de liga aprobada entre ambos jugadores en este evento, tendrás que enviarla como pachanga.
          </p>

          <button
            type="submit"
            className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
          >
            Enviar resultado
          </button>
        </form>
      )}
    </div>
  );
}
