import { EventRegistrationStatus } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  findExistingLeagueMatchForPlayers,
  listPendingCompetitiveMatchReports,
  type CreateCompetitiveMatchReportInput,
} from "@/lib/competitive-matches";
import { buildEventSlug, extractEventIdFromSlug } from "@/lib/events/slug";
import { prisma } from "@/lib/prisma";
import { userCanEditEvent } from "@/lib/roles";

import {
  approveCompetitiveReportAction,
  rejectCompetitiveReportAction,
  updateCompetitiveReportAction,
} from "./actions";

type Params = {
  slug: string;
};

type SearchParams = {
  error?: string;
  feedback?: string;
};

type PendingCompetitiveReport = Awaited<ReturnType<typeof listPendingCompetitiveMatchReports>>[number];
type ReportPlayer = PendingCompetitiveReport["players"][number];
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

const channelLabels: Record<PendingCompetitiveReport["channel"], string> = {
  WEB: "Web",
  TELEGRAM: "Telegram",
  ADMIN: "Admin",
  IMPORT: "Importación",
};

const kindLabels: Record<NonNullable<CreateCompetitiveMatchReportInput["kind"]>, string> = {
  LEAGUE: "Liga",
  CASUAL: "Pachanga",
};

const statusLabels: Record<PendingCompetitiveReport["status"], string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  CANCELLED: "Cancelado",
};

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return dateTimeFormatter.format(value);
}

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function describePlayer(player: ReportPlayer | undefined) {
  if (!player) return "Sin datos";
  return player.displayName.trim() || `Jugador ${player.participantOrder}`;
}

function describeFaction(player: ReportPlayer | undefined) {
  return player?.factionLabel?.trim() || "Sin facción";
}

function describeResult(players: ReportPlayer[]) {
  const [first, second] = players;
  if (!first) return "Pendiente";
  if (!second) {
    return first.outcome === "DRAW" ? "Empate" : first.outcome === "WIN" ? "Victoria" : "Derrota";
  }
  if (first.outcome === "DRAW" && second.outcome === "DRAW") {
    return "Empate";
  }
  if (first.outcome === "WIN") {
    return `Victoria de ${describePlayer(first)}`;
  }
  if (first.outcome === "LOSS") {
    return `Victoria de ${describePlayer(second)}`;
  }
  return "Pendiente";
}

function describeScore(players: ReportPlayer[]) {
  const [first, second] = players;
  if (!first || !second) return first ? String(first.score) : "Sin puntos";
  return `${first.score} - ${second.score}`;
}

function describeLeague(report: PendingCompetitiveReport, fallbackEventTitle: string) {
  const eventLabel = report.event?.title ?? fallbackEventTitle;
  const kindLabel = kindLabels[report.kind] ?? report.kind;
  const gameLabel = report.game?.name?.trim();
  return [eventLabel, kindLabel, gameLabel].filter(Boolean).join(" · ");
}

function describeSubmitter(report: PendingCompetitiveReport) {
  const submittedBy =
    report.submittedBy?.nick?.trim() ||
    report.submittedBy?.name?.trim() ||
    report.submittedBy?.email?.trim();
  const externalParts = [report.externalSubmitterId, report.externalMessageId].filter(Boolean);

  if (submittedBy && externalParts.length > 0) {
    return `${submittedBy} · ${externalParts.join(" · ")}`;
  }
  if (submittedBy) return submittedBy;
  if (externalParts.length > 0) return externalParts.join(" · ");
  return "Sin trazabilidad adicional";
}

function FeedbackBanner({ searchParams }: { searchParams?: SearchParams }) {
  if (searchParams?.error) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
        {searchParams.error}
      </div>
    );
  }

  if (searchParams?.feedback === "approved") {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
        Reporte aprobado y convertido en partida canónica.
      </div>
    );
  }

  if (searchParams?.feedback === "rejected") {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Reporte rechazado.
      </div>
    );
  }

  if (searchParams?.feedback === "updated") {
    return (
      <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
        Reporte corregido.
      </div>
    );
  }

  return null;
}

function resolveRegistrationId(player: ReportPlayer | undefined, registrations: RegistrationOption[]) {
  if (!player) return "";
  const byUser = player.userId != null ? registrations.find((registration) => registration.userId === player.userId) : null;
  if (byUser) return byUser.id;
  const byName = registrations.find(
    (registration) => registration.playerName.trim().toLowerCase() === player.displayName.trim().toLowerCase(),
  );
  return byName?.id ?? "";
}

function ReportCard({
  eventId,
  fallbackEventTitle,
  hasLeagueDuplicate,
  report,
  registrations,
}: {
  eventId: string;
  fallbackEventTitle: string;
  hasLeagueDuplicate: boolean;
  report: PendingCompetitiveReport;
  registrations: RegistrationOption[];
}) {
  const [firstPlayer, secondPlayer] = report.players;
  const firstRegistrationId = resolveRegistrationId(firstPlayer, registrations);
  const secondRegistrationId = resolveRegistrationId(secondPlayer, registrations);

  return (
    <article className="space-y-5 rounded-3xl border border-white/10 bg-black/20 p-5 shadow-lg">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="break-words text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
            {describeLeague(report, fallbackEventTitle)}
          </p>
          <h2 className="break-words text-xl font-semibold text-white">
            {describePlayer(firstPlayer)} vs {describePlayer(secondPlayer)}
          </h2>
          <p className="text-sm text-[var(--muted)]">
            Enviado el {formatDate(report.createdAt)} por {channelLabels[report.channel] ?? report.channel}
          </p>
        </div>
        <span className="w-fit rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-amber-100">
          {statusLabels[report.status] ?? report.status}
        </span>
      </div>

      <dl className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1">
          <dt className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Fecha de partida</dt>
          <dd className="text-sm text-white">{formatDate(report.playedAt)}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Canal</dt>
          <dd className="text-sm text-white">{channelLabels[report.channel] ?? report.channel}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Jugador</dt>
          <dd className="text-sm text-white">{describePlayer(firstPlayer)}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Rival</dt>
          <dd className="text-sm text-white">{describePlayer(secondPlayer)}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Facciones</dt>
          <dd className="break-words text-sm text-white">
            {describeFaction(firstPlayer)} vs {describeFaction(secondPlayer)}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Resultado</dt>
          <dd className="text-sm text-white">{describeResult(report.players)}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Puntos</dt>
          <dd className="text-sm text-white">{describeScore(report.players)}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Trazabilidad</dt>
          <dd className="break-all text-sm text-white">{describeSubmitter(report)}</dd>
        </div>
      </dl>

      {(report.roundNumber != null || report.notes) && (
        <div className="grid gap-4 md:grid-cols-2">
          {report.roundNumber != null && (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Ronda</p>
              <p className="text-sm text-white">{report.roundNumber}</p>
            </div>
          )}
          {report.notes && (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Notas</p>
              <p className="break-words text-sm text-white/90">{report.notes}</p>
            </div>
          )}
        </div>
      )}

      {hasLeagueDuplicate && (
        <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Ya existe una partida de liga aprobada entre estos jugadores en este evento. Para aprobar este reporte primero habrá que cambiarlo a pachanga.
        </div>
      )}

      <details className="rounded-2xl border border-white/10 bg-black/10 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-white">Corregir reporte</summary>
        <form action={updateCompetitiveReportAction} className="mt-4 space-y-4">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="reportId" value={report.id} />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor={`kind-${report.id}`} className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                Tipo
              </label>
              <select
                id={`kind-${report.id}`}
                name="kind"
                defaultValue={report.kind}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              >
                <option value="LEAGUE">Liga</option>
                <option value="CASUAL">Pachanga</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor={`playedAt-${report.id}`} className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                Fecha
              </label>
              <input
                id={`playedAt-${report.id}`}
                name="playedAt"
                type="date"
                defaultValue={formatDateInput(report.playedAt)}
                required
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor={`roundNumber-${report.id}`} className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                Ronda
              </label>
              <input
                id={`roundNumber-${report.id}`}
                name="roundNumber"
                type="number"
                min={0}
                defaultValue={report.roundNumber ?? ""}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-2xl border border-white/10 p-3">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Jugador</p>
              <select
                name="firstRegistrationId"
                defaultValue={firstRegistrationId}
                required
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
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
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                placeholder="Facción"
              />
              <input
                name="firstScore"
                type="number"
                min={0}
                defaultValue={firstPlayer?.score ?? ""}
                required
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                placeholder="Puntos"
              />
              <select
                name="firstOutcome"
                defaultValue={firstPlayer?.outcome ?? "WIN"}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              >
                <option value="WIN">Victoria</option>
                <option value="DRAW">Empate</option>
                <option value="LOSS">Derrota</option>
              </select>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 p-3">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Rival</p>
              <select
                name="secondRegistrationId"
                defaultValue={secondRegistrationId}
                required
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              >
                <option value="">Selecciona rival</option>
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
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                placeholder="Facción"
              />
              <input
                name="secondScore"
                type="number"
                min={0}
                defaultValue={secondPlayer?.score ?? ""}
                required
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                placeholder="Puntos"
              />
              <p className="text-xs leading-relaxed text-[var(--muted)]">
                El resultado del rival se calcula automáticamente como opuesto al del jugador.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor={`notes-${report.id}`} className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
              Notas
            </label>
            <textarea
              id={`notes-${report.id}`}
              name="notes"
              rows={3}
              maxLength={1000}
              defaultValue={report.notes ?? ""}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
            />
          </div>

          <button
            type="submit"
            className="rounded-full border border-sky-300/40 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/10"
          >
            Guardar corrección
          </button>
        </form>
      </details>

      <form action={rejectCompetitiveReportAction} className="space-y-3 rounded-2xl border border-white/10 p-4">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="reportId" value={report.id} />
          <div className="space-y-2">
            <label htmlFor={`rejectionReason-${report.id}`} className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
              Motivo de rechazo opcional
            </label>
            <textarea
              id={`rejectionReason-${report.id}`}
              name="rejectionReason"
              rows={3}
              maxLength={500}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none transition focus:border-white/30"
              placeholder="Explica brevemente qué falta o qué dato es incorrecto."
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-full border border-red-400/40 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/10"
            >
              Rechazar
            </button>
            <button
              type="submit"
              formAction={approveCompetitiveReportAction}
              disabled={hasLeagueDuplicate}
              className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
            >
              {hasLeagueDuplicate ? "Aprobación bloqueada" : "Aprobar"}
            </button>
          </div>
        </form>
    </article>
  );
}

export default async function EventCompetitiveReportsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const session = await auth();
  const eventId = extractEventIdFromSlug(params.slug);
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true },
  });

  if (!event) {
    notFound();
  }

  const canEdit = await userCanEditEvent(session, event.id);
  if (!canEdit) {
    redirect(`/eventos/${buildEventSlug(event.id, event.title)}`);
  }

  const reports = await listPendingCompetitiveMatchReports(event.id);
  const registrations = await prisma.eventRegistration.findMany({
    where: {
      eventId: event.id,
      status: { in: [EventRegistrationStatus.INSCRITO, EventRegistrationStatus.PAGADO] },
    },
    select: {
      id: true,
      userId: true,
      playerName: true,
      factionLabel: true,
    },
    orderBy: [{ playerName: "asc" }],
  });
  const duplicateReportIds = new Set(
    (
      await Promise.all(
        reports.map(async (report) => {
          if (report.kind !== "LEAGUE") return null;
          const duplicate = await findExistingLeagueMatchForPlayers(event.id, report.players);
          return duplicate ? report.id : null;
        }),
      )
    ).filter((reportId): reportId is string => Boolean(reportId)),
  );
  const eventHref = `/eventos/${buildEventSlug(event.id, event.title)}`;

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
          <Link href={eventHref} className="transition hover:text-white">
            Evento
          </Link>
          <span>/</span>
          <span>Reportes competitivos</span>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-white">Revisión de reportes competitivos</h1>
            <p className="text-sm text-[var(--muted)]">
              {event.title}. Corrige, aprueba o rechaza los reportes pendientes antes de convertirlos en partidas aprobadas.
            </p>
          </div>
          <Link
            href={eventHref}
            className="w-fit rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Volver al evento
          </Link>
        </div>
      </header>

      <FeedbackBanner searchParams={searchParams} />

      {reports.length === 0 ? (
        <section className="rounded-3xl border border-white/10 bg-black/20 p-8 text-center shadow-lg">
          <h2 className="text-xl font-semibold text-white">No hay reportes pendientes</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Cuando el bot o la web creen nuevos reportes para este evento aparecerán aquí.
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              eventId={event.id}
              fallbackEventTitle={event.title}
              hasLeagueDuplicate={duplicateReportIds.has(report.id)}
              registrations={registrations}
              report={report}
            />
          ))}
        </section>
      )}
    </div>
  );
}
