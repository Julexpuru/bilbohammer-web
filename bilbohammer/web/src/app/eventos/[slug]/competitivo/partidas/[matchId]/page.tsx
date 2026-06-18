import { CompetitiveMatchStatus, EventRegistrationStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { buildEventSlug, extractEventIdFromSlug } from "@/lib/events/slug";
import { prisma } from "@/lib/prisma";
import { userCanEditEvent } from "@/lib/roles";

import {
  updateApprovedCompetitiveMatchAction,
  voidApprovedCompetitiveMatchAction,
} from "./actions";

type Params = {
  slug: string;
  matchId: string;
};

type SearchParams = {
  error?: string;
  feedback?: string;
};

type RegistrationOption = {
  id: string;
  userId: number | null;
  playerName: string;
  factionLabel: string | null;
};

const dateTimeFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Madrid",
});

const kindLabels: Record<string, string> = {
  LEAGUE: "Liga",
  CASUAL: "Pachanga",
};

const outcomeLabels: Record<string, string> = {
  WIN: "Victoria",
  DRAW: "Empate",
  LOSS: "Derrota",
};

export const dynamic = "force-dynamic";

function displayUser(user: { id: number; nick: string | null; name: string | null; email: string } | null) {
  if (!user) return "Sin usuario";
  return user.nick?.trim() || user.name?.trim() || user.email || `Usuario ${user.id}`;
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function resolveRegistrationId(
  player: { userId: number | null; displayName: string } | undefined,
  registrations: RegistrationOption[],
) {
  if (!player) return "";
  const byUser = player.userId != null ? registrations.find((registration) => registration.userId === player.userId) : null;
  if (byUser) return byUser.id;
  const byName = registrations.find(
    (registration) => registration.playerName.trim().toLowerCase() === player.displayName.trim().toLowerCase(),
  );
  return byName?.id ?? "";
}

function FeedbackBanner({ searchParams }: { searchParams?: SearchParams }) {
  if (searchParams?.error) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
        {searchParams.error}
      </div>
    );
  }
  if (searchParams?.feedback === "updated") {
    return (
      <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
        Partida corregida.
      </div>
    );
  }
  if (searchParams?.feedback === "voided") {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Partida anulada. Ya no cuenta para las clasificaciones.
      </div>
    );
  }
  return null;
}

export default async function CompetitiveMatchDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const session = await auth();
  const eventId = extractEventIdFromSlug(params.slug);
  const [match, canManage] = await Promise.all([
    prisma.competitiveMatch.findFirst({
      where: {
        id: params.matchId,
        eventId,
      },
      include: {
        event: { select: { id: true, title: true } },
        game: { select: { name: true, slug: true } },
        players: { orderBy: { participantOrder: "asc" } },
        createdBy: { select: { id: true, nick: true, name: true, email: true } },
        validatedBy: { select: { id: true, nick: true, name: true, email: true } },
        voidedBy: { select: { id: true, nick: true, name: true, email: true } },
        auditLogs: {
          include: { actor: { select: { id: true, nick: true, name: true, email: true } } },
          orderBy: { createdAt: "desc" },
        },
        sourceReport: {
          select: {
            id: true,
            channel: true,
            submittedBy: { select: { id: true, nick: true, name: true, email: true } },
            externalSubmitterId: true,
            externalMessageId: true,
            createdAt: true,
          },
        },
      },
    }),
    userCanEditEvent(session, eventId),
  ]);

  if (!match || !match.event) {
    notFound();
  }

  const registrations: RegistrationOption[] = canManage
    ? await prisma.eventRegistration.findMany({
        where: {
          eventId: match.event.id,
          status: { in: [EventRegistrationStatus.INSCRITO, EventRegistrationStatus.PAGADO] },
        },
        select: {
          id: true,
          userId: true,
          playerName: true,
          factionLabel: true,
        },
        orderBy: [{ playerName: "asc" }],
      })
    : [];

  const eventSlug = buildEventSlug(match.event.id, match.event.title);
  const competitiveHref = `/eventos/${eventSlug}/competitivo`;
  const sourceReport = match.sourceReport;
  const [firstPlayer, secondPlayer] = match.players;
  const firstRegistrationId = resolveRegistrationId(firstPlayer, registrations);
  const secondRegistrationId = resolveRegistrationId(secondPlayer, registrations);
  const isVoided = match.status === CompetitiveMatchStatus.VOIDED;

  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
          <Link href={competitiveHref} className="transition hover:text-white">
            Competitivo
          </Link>
          <span>/</span>
          <span>Detalle de partida</span>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
              {kindLabels[match.kind] ?? match.kind}
              {match.roundNumber != null ? ` · Ronda ${match.roundNumber}` : ""}
              {isVoided ? " · Anulada" : ""}
            </p>
            <h1 className="text-3xl font-semibold text-white">{match.event.title}</h1>
            <p className="text-sm text-[var(--muted)]">
              {dateTimeFormatter.format(match.playedAt)} · {match.game?.name ?? match.game?.slug ?? "Juego"}
            </p>
          </div>
          <Link
            href={`${competitiveHref}?hoja=partidas`}
            className="w-fit rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Volver a partidas
          </Link>
        </div>
      </header>

      <FeedbackBanner searchParams={searchParams} />

      {isVoided && (
        <section className="rounded-3xl border border-amber-400/30 bg-amber-500/10 p-5 text-sm text-amber-100">
          <p className="font-semibold">Partida anulada. No cuenta para clasificaciones ni duplicados.</p>
          <p className="mt-2">
            {match.voidedAt ? `Anulada el ${dateTimeFormatter.format(match.voidedAt)}` : "Anulación sin fecha registrada"}
            {match.voidedBy ? ` por ${displayUser(match.voidedBy)}` : ""}.
          </p>
          {match.voidReason && <p className="mt-2 break-words">Motivo: {match.voidReason}</p>}
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        {match.players.map((player) => (
          <article key={player.id} className="rounded-3xl border border-white/10 bg-black/20 p-5 shadow-lg">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
              Jugador {player.participantOrder}
            </p>
            <h2 className="mt-2 break-words text-2xl font-semibold text-white">{player.displayName}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Facción</dt>
                <dd className="mt-1 break-words text-white">{player.factionLabel}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Resultado</dt>
                <dd className="mt-1 text-white">{outcomeLabels[player.outcome] ?? player.outcome}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Puntos</dt>
                <dd className="mt-1 text-white">{player.score}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/20 p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-white">Trazabilidad</h2>
        <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Enviado por</dt>
            <dd className="mt-1 text-white">{displayUser(sourceReport?.submittedBy ?? match.createdBy)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Validado por</dt>
            <dd className="mt-1 text-white">{displayUser(match.validatedBy)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Canal</dt>
            <dd className="mt-1 text-white">{sourceReport?.channel ?? "Sin reporte asociado"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Validada</dt>
            <dd className="mt-1 text-white">
              {match.validatedAt ? dateTimeFormatter.format(match.validatedAt) : "Sin fecha de validación"}
            </dd>
          </div>
          {sourceReport?.externalSubmitterId && (
            <div>
              <dt className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Remitente externo</dt>
              <dd className="mt-1 break-all text-white">{sourceReport.externalSubmitterId}</dd>
            </div>
          )}
          {sourceReport?.externalMessageId && (
            <div>
              <dt className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Mensaje externo</dt>
              <dd className="mt-1 break-all text-white">{sourceReport.externalMessageId}</dd>
            </div>
          )}
        </dl>
        {match.notes && (
          <div className="mt-5 space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Notas</p>
            <p className="break-words text-sm text-white/90">{match.notes}</p>
          </div>
        )}
      </section>

      {match.auditLogs.length > 0 && (
        <section className="rounded-3xl border border-white/10 bg-black/20 p-5 shadow-lg">
          <h2 className="text-lg font-semibold text-white">Auditoría</h2>
          <div className="mt-4 space-y-3">
            {match.auditLogs.map((entry) => (
              <article key={entry.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
                <p className="font-semibold text-white">
                  {entry.action === "VOIDED" ? "Anulación" : "Corrección"} · {dateTimeFormatter.format(entry.createdAt)}
                </p>
                <p className="mt-1 text-[var(--muted)]">Actor: {displayUser(entry.actor)}</p>
                {entry.reason && <p className="mt-2 break-words text-white/90">Motivo: {entry.reason}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {canManage && !isVoided && (
        <section className="rounded-3xl border border-white/10 bg-black/20 p-5 shadow-lg">
          <h2 className="text-lg font-semibold text-white">Gestión de la partida</h2>
          <details className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <summary className="cursor-pointer text-sm font-semibold text-white">Corregir partida aprobada</summary>
            <form action={updateApprovedCompetitiveMatchAction} className="mt-4 space-y-4">
              <input type="hidden" name="eventId" value={match.event.id} />
              <input type="hidden" name="matchId" value={match.id} />
              <div className="grid gap-3 md:grid-cols-3">
                <select
                  name="kind"
                  defaultValue={match.kind}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                >
                  <option value="LEAGUE">Liga</option>
                  <option value="CASUAL">Pachanga</option>
                </select>
                <input
                  name="playedAt"
                  type="date"
                  defaultValue={formatDateInput(match.playedAt)}
                  required
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                />
                <input
                  name="roundNumber"
                  type="number"
                  min={0}
                  defaultValue={match.roundNumber ?? ""}
                  placeholder="Ronda"
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2 rounded-2xl border border-white/10 p-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Jugador 1</p>
                  <select
                    name="firstRegistrationId"
                    defaultValue={firstRegistrationId}
                    required
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                  >
                    <option value="">Selecciona jugador</option>
                    {registrations.map((registration) => (
                      <option key={registration.id} value={registration.id}>
                        {registration.playerName}
                      </option>
                    ))}
                  </select>
                  <input
                    name="firstFaction"
                    defaultValue={firstPlayer?.factionLabel ?? ""}
                    required
                    placeholder="Facción"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      name="firstOutcome"
                      defaultValue={firstPlayer?.outcome ?? "WIN"}
                      className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                    >
                      <option value="WIN">Victoria</option>
                      <option value="DRAW">Empate</option>
                      <option value="LOSS">Derrota</option>
                    </select>
                    <input
                      name="firstScore"
                      type="number"
                      min={0}
                      defaultValue={firstPlayer?.score ?? 0}
                      required
                      className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-2xl border border-white/10 p-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Jugador 2</p>
                  <select
                    name="secondRegistrationId"
                    defaultValue={secondRegistrationId}
                    required
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                  >
                    <option value="">Selecciona jugador</option>
                    {registrations.map((registration) => (
                      <option key={registration.id} value={registration.id}>
                        {registration.playerName}
                      </option>
                    ))}
                  </select>
                  <input
                    name="secondFaction"
                    defaultValue={secondPlayer?.factionLabel ?? ""}
                    required
                    placeholder="Facción"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                  />
                  <input
                    name="secondScore"
                    type="number"
                    min={0}
                    defaultValue={secondPlayer?.score ?? 0}
                    required
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                  />
                  <p className="text-xs text-[var(--muted)]">El resultado del segundo jugador se calcula como el opuesto.</p>
                </div>
              </div>

              <textarea
                name="notes"
                defaultValue={match.notes ?? ""}
                placeholder="Notas visibles"
                className="min-h-24 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
              />
              <textarea
                name="reason"
                placeholder="Motivo interno de la corrección"
                className="min-h-20 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
              />
              <button
                type="submit"
                className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white hover:bg-sky-400"
              >
                Guardar corrección
              </button>
            </form>
          </details>

          <form action={voidApprovedCompetitiveMatchAction} className="mt-4 space-y-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
            <input type="hidden" name="eventId" value={match.event.id} />
            <input type="hidden" name="matchId" value={match.id} />
            <label className="block text-xs uppercase tracking-[0.22em] text-red-100" htmlFor="voidReason">
              Motivo de anulación
            </label>
            <textarea
              id="voidReason"
              name="reason"
              placeholder="Explica por qué esta partida no debe contar."
              className="min-h-20 w-full rounded-xl border border-red-300/20 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-red-200/50"
            />
            <button
              type="submit"
              className="rounded-xl border border-red-300/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-100 hover:bg-red-500/10"
            >
              Anular partida
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
