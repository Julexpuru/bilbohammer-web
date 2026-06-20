import { CompetitiveReportScoringMode } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { getCompetitiveEventSettings } from "@/lib/competitive-matches";
import { buildEventSlug, extractEventIdFromSlug } from "@/lib/events/slug";
import { prisma } from "@/lib/prisma";
import { userCanEditEvent } from "@/lib/roles";

import { updateCompetitiveReportOptionsAction } from "../actions";

type Params = {
  slug: string;
};

export const dynamic = "force-dynamic";

export default async function CompetitiveReportOptionsPage({ params }: { params: Params }) {
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
  const eventSlug = buildEventSlug(event.id, event.title);
  if (!canEdit) {
    redirect(`/eventos/${eventSlug}`);
  }

  const settings = await getCompetitiveEventSettings(event.id);
  const reportsHref = `/eventos/${eventSlug}/reportes`;

  return (
    <div className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
          <Link href={`/eventos/${eventSlug}`} className="transition hover:text-white">
            Evento
          </Link>
          <span>/</span>
          <Link href={reportsHref} className="transition hover:text-white">
            Reportes competitivos
          </Link>
          <span>/</span>
          <span>Opciones</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Opciones de reportes</h1>
          <p className="text-sm text-[var(--muted)]">
            Ajustes de presentación para la bandeja de revisión de {event.title}.
          </p>
        </div>
      </header>

      <form action={updateCompetitiveReportOptionsAction} className="space-y-6 rounded-3xl border border-white/10 bg-black/20 p-6 shadow-lg">
        <input type="hidden" name="eventId" value={event.id} />
        <input type="hidden" name="eventSlug" value={eventSlug} />

        <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
          <input
            type="checkbox"
            name="showReportRound"
            defaultChecked={settings.showReportRound}
            className="mt-1 h-4 w-4 rounded border-white/20 bg-black/40"
          />
          <span className="space-y-1">
            <span className="block font-semibold text-white">Mostrar ronda en reportes</span>
            <span className="block text-sm leading-relaxed text-[var(--muted)]">
              Actívalo para ligas con jornadas o rondas. Si se desactiva, la bandeja oculta el campo y conserva el valor
              existente al corregir otros datos.
            </span>
          </span>
        </label>

        <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4">
          <label htmlFor="scoringMode" className="block font-semibold text-white">
            Tipo de puntuación
          </label>
          <select
            id="scoringMode"
            name="scoringMode"
            defaultValue={settings.scoringMode}
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          >
            <option value={CompetitiveReportScoringMode.INDIVIDUAL_0_100}>Cada jugador entre 0 y 100</option>
            <option value={CompetitiveReportScoringMode.SUM_20}>Entre ambos suman 20</option>
          </select>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            Esta opción es vinculante al enviar, corregir y aprobar reportes. Si un reporte importado no cumple la regla,
            deberá corregirse o rechazarse antes de aprobarlo.
          </p>
        </div>

        <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4">
          <label htmlFor="minimumPrizeGames" className="block font-semibold text-white">
            Mínimo de partidas para sorteos
          </label>
          <input
            id="minimumPrizeGames"
            name="minimumPrizeGames"
            type="number"
            min={0}
            defaultValue={settings.minimumPrizeGames}
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            Si es mayor que 0, la Tabla Liga mostrará una columna indicando si cada jugador cumple el mínimo. Si es 0,
            esa columna se oculta.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
          >
            Guardar opciones
          </button>
          <Link
            href={reportsHref}
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Volver a reportes
          </Link>
        </div>
      </form>
    </div>
  );
}
