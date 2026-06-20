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
