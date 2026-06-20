import { CompetitiveReportScoringMode, EventRegistrationStatus } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  findExistingLeagueMatchForPlayers,
  getCompetitiveEventSettings,
  listPendingCompetitiveMatchReports,
  type CreateCompetitiveMatchReportInput,
} from "@/lib/competitive-matches";
import { buildEventSlug, extractEventIdFromSlug } from "@/lib/events/slug";
import { prisma } from "@/lib/prisma";
import { userCanEditEvent } from "@/lib/roles";

import ReportReviewForms from "./ReportReviewForms";

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

function describeSubmittedAt(report: PendingCompetitiveReport) {
  return `${formatDate(report.createdAt)} · ${channelLabels[report.channel] ?? report.channel}`;
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

function reportPlayerKey(player: ReportPlayer | undefined) {
  if (!player) return null;
  return player.userId != null ? `user:${player.userId}` : `name:${player.displayName.trim().toLowerCase()}`;
}

function hasSamePlayerOnBothSides(report: PendingCompetitiveReport) {
  const [first, second] = report.players;
  const firstKey = reportPlayerKey(first);
  const secondKey = reportPlayerKey(second);
  return Boolean(firstKey && secondKey && firstKey === secondKey);
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
  eventSlug,
  fallbackEventTitle,
  hasLeagueDuplicate,
  hasSamePlayer,
  report,
  registrations,
  showReportRound,
  scoringMode,
}: {
  eventId: string;
  eventSlug: string;
  fallbackEventTitle: string;
  hasLeagueDuplicate: boolean;
  hasSamePlayer: boolean;
  report: PendingCompetitiveReport;
  registrations: RegistrationOption[];
  showReportRound: boolean;
  scoringMode: CompetitiveReportScoringMode;
}) {
  const [firstPlayer, secondPlayer] = report.players;
  const firstRegistrationId = resolveRegistrationId(firstPlayer, registrations);
  const secondRegistrationId = resolveRegistrationId(secondPlayer, registrations);
  const hasSecondaryDetails = (showReportRound && report.roundNumber != null) || report.notes || describeSubmitter(report);
  const scoreMax = scoringMode === CompetitiveReportScoringMode.SUM_20 ? 20 : 100;
  const scoreHelp =
    scoringMode === CompetitiveReportScoringMode.SUM_20
      ? "La suma de ambos jugadores debe ser exactamente 20."
      : "Cada jugador puede tener entre 0 y 100 puntos.";

  return (
    <article className="space-y-4 rounded-3xl border border-white/10 bg-black/20 p-4 shadow-lg sm:space-y-5 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="break-words text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted)] sm:text-xs sm:tracking-[0.3em]">
            {describeLeague(report, fallbackEventTitle)}
          </p>
          <h2 className="break-words text-lg font-semibold text-white sm:text-xl">
            {describePlayer(firstPlayer)} vs {describePlayer(secondPlayer)}
          </h2>
          <p className="text-xs text-[var(--muted)] sm:text-sm">
            Enviado el {describeSubmittedAt(report)}
          </p>
        </div>
        <span className="w-fit rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-amber-100">
          {statusLabels[report.status] ?? report.status}
        </span>
      </div>

      <dl className="grid gap-3 rounded-2xl border border-white/10 bg-black/10 p-3 sm:hidden">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-[0.65rem] uppercase tracking-[0.18em] text-[var(--muted)]">Fecha</dt>
          <dd className="text-right text-sm text-white">{formatDate(report.playedAt)}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-[0.65rem] uppercase tracking-[0.18em] text-[var(--muted)]">Resultado</dt>
          <dd className="text-right text-sm text-white">{describeResult(report.players)}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-[0.65rem] uppercase tracking-[0.18em] text-[var(--muted)]">Puntos</dt>
          <dd className="text-right text-sm text-white">{describeScore(report.players)}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-[0.65rem] uppercase tracking-[0.18em] text-[var(--muted)]">Facciones</dt>
          <dd className="break-words text-sm text-white">
            {describeFaction(firstPlayer)} vs {describeFaction(secondPlayer)}
          </dd>
        </div>
      </dl>

      {hasSecondaryDetails && (
        <details className="rounded-2xl border border-white/10 bg-black/10 p-3 sm:hidden">
          <summary className="cursor-pointer text-sm font-semibold text-white">Ver trazabilidad y notas</summary>
          <dl className="mt-3 space-y-3">
            <div className="grid gap-1">
              <dt className="text-[0.65rem] uppercase tracking-[0.18em] text-[var(--muted)]">Trazabilidad</dt>
              <dd className="break-all text-sm text-white">{describeSubmitter(report)}</dd>
            </div>
            {showReportRound && report.roundNumber != null && (
              <div className="grid gap-1">
                <dt className="text-[0.65rem] uppercase tracking-[0.18em] text-[var(--muted)]">Ronda</dt>
                <dd className="text-sm text-white">{report.roundNumber}</dd>
              </div>
            )}
            {report.notes && (
              <div className="grid gap-1">
                <dt className="text-[0.65rem] uppercase tracking-[0.18em] text-[var(--muted)]">Notas</dt>
                <dd className="break-words text-sm text-white/90">{report.notes}</dd>
              </div>
            )}
          </dl>
        </details>
      )}

      <dl className="hidden gap-4 sm:grid md:grid-cols-2 xl:grid-cols-4">
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

      {((showReportRound && report.roundNumber != null) || report.notes) && (
        <div className="hidden gap-4 sm:grid md:grid-cols-2">
          {showReportRound && report.roundNumber != null && (
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

      {hasSamePlayer && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          El reporte tiene el mismo jugador en ambos lados. No puede aprobarse; corrígelo o recházalo.
        </div>
      )}

      <ReportReviewForms
        eventId={eventId}
        eventSlug={eventSlug}
        reportId={report.id}
        approvalBlocked={hasLeagueDuplicate || hasSamePlayer}
        kind={report.kind}
        playedAt={formatDateInput(report.playedAt)}
        roundNumber={report.roundNumber}
        showReportRound={showReportRound}
        notes={report.notes ?? ""}
        registrations={registrations}
        firstRegistrationId={firstRegistrationId}
        secondRegistrationId={secondRegistrationId}
        firstFaction={firstPlayer?.factionLabel ?? ""}
        secondFaction={secondPlayer?.factionLabel ?? ""}
        firstScore={firstPlayer?.score ?? ""}
        secondScore={secondPlayer?.score ?? ""}
        firstOutcome={firstPlayer?.outcome ?? "WIN"}
        scoreMax={scoreMax}
        scoreHelp={scoreHelp}
      />
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

  const [reports, registrations, competitiveSettings] = await Promise.all([
    listPendingCompetitiveMatchReports(event.id),
    prisma.eventRegistration.findMany({
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
    }),
    getCompetitiveEventSettings(event.id),
  ]);
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
          <Link
            href={`/eventos/${params.slug}/reportes/opciones`}
            className="w-fit rounded-full border border-sky-300/40 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/10"
          >
            Opciones de reportes
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
              eventSlug={params.slug}
              fallbackEventTitle={event.title}
              hasLeagueDuplicate={duplicateReportIds.has(report.id)}
              hasSamePlayer={hasSamePlayerOnBothSides(report)}
              registrations={registrations}
              report={report}
              showReportRound={competitiveSettings.showReportRound}
              scoringMode={competitiveSettings.scoringMode}
            />
          ))}
        </section>
      )}
    </div>
  );
}
