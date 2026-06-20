"use client";

import { useState, useTransition } from "react";

import {
  approveCompetitiveReportAction,
  rejectCompetitiveReportAction,
  updateCompetitiveReportAction,
} from "./actions";
import { initialReportActionState, type ReportActionState } from "./report-action-state";

type RegistrationOption = {
  id: string;
  playerName: string;
};

type Props = {
  eventId: string;
  eventSlug: string;
  reportId: string;
  approvalBlocked: boolean;
  kind: string;
  playedAt: string;
  roundNumber: number | null;
  showReportRound: boolean;
  notes: string;
  registrations: RegistrationOption[];
  firstRegistrationId: string;
  secondRegistrationId: string;
  firstFaction: string;
  secondFaction: string;
  firstScore: number | "";
  secondScore: number | "";
  firstOutcome: string;
  scoreMax: number;
  scoreHelp: string;
};

function HiddenContext({ eventId, eventSlug, reportId }: Pick<Props, "eventId" | "eventSlug" | "reportId">) {
  return (
    <>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="eventSlug" value={eventSlug} />
      <input type="hidden" name="reportId" value={reportId} />
    </>
  );
}

function ActionFeedback({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
      {error}
    </div>
  );
}

function PendingLabel({ pending, children }: { pending: boolean; children: string }) {
  return pending ? "Procesando..." : children;
}

export default function ReportReviewForms({
  eventId,
  eventSlug,
  reportId,
  approvalBlocked,
  kind,
  playedAt,
  roundNumber,
  showReportRound,
  notes,
  registrations,
  firstRegistrationId,
  secondRegistrationId,
  firstFaction,
  secondFaction,
  firstScore,
  secondScore,
  firstOutcome,
  scoreMax,
  scoreHelp,
}: Props) {
  const [updateState, setUpdateState] = useState<ReportActionState>(initialReportActionState);
  const [approveState, setApproveState] = useState<ReportActionState>(initialReportActionState);
  const [rejectState, setRejectState] = useState<ReportActionState>(initialReportActionState);
  const [isUpdatePending, startUpdateTransition] = useTransition();
  const [isApprovePending, startApproveTransition] = useTransition();
  const [isRejectPending, startRejectTransition] = useTransition();

  function runAction(
    formData: FormData,
    action: typeof updateCompetitiveReportAction,
    setState: (state: ReportActionState) => void,
    startTransition: typeof startUpdateTransition,
  ) {
    startTransition(() => {
      void (async () => {
        setState(await action(initialReportActionState, formData));
      })();
    });
  }

  return (
    <>
      <details className="rounded-2xl border border-white/10 bg-black/10 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-white">Corregir reporte</summary>
        <form
          action={(formData) => runAction(formData, updateCompetitiveReportAction, setUpdateState, startUpdateTransition)}
          className="mt-4 space-y-4"
        >
          <HiddenContext eventId={eventId} eventSlug={eventSlug} reportId={reportId} />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor={`kind-${reportId}`} className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                Tipo
              </label>
              <select
                id={`kind-${reportId}`}
                name="kind"
                defaultValue={kind}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              >
                <option value="LEAGUE">Liga</option>
                <option value="CASUAL">Pachanga</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor={`playedAt-${reportId}`} className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                Fecha
              </label>
              <input
                id={`playedAt-${reportId}`}
                name="playedAt"
                type="date"
                defaultValue={playedAt}
                required
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              />
            </div>
            {showReportRound ? (
              <div className="space-y-2">
                <label htmlFor={`roundNumber-${reportId}`} className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                  Ronda
                </label>
                <input
                  id={`roundNumber-${reportId}`}
                  name="roundNumber"
                  type="number"
                  min={0}
                  defaultValue={roundNumber ?? ""}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                />
              </div>
            ) : (
              <input type="hidden" name="roundNumber" value={roundNumber ?? ""} />
            )}
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
                defaultValue={firstFaction}
                required
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                placeholder="Facción"
              />
              <input
                name="firstScore"
                type="number"
                min={0}
                max={scoreMax}
                defaultValue={firstScore}
                required
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                placeholder="Puntos"
              />
              <select
                name="firstOutcome"
                defaultValue={firstOutcome}
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
                defaultValue={secondFaction}
                required
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                placeholder="Facción"
              />
              <input
                name="secondScore"
                type="number"
                min={0}
                max={scoreMax}
                defaultValue={secondScore}
                required
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                placeholder="Puntos"
              />
              <p className="text-xs leading-relaxed text-[var(--muted)]">
                El resultado del rival se calcula automáticamente como opuesto al del jugador.
              </p>
            </div>
          </div>

          <p className="rounded-2xl border border-sky-300/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            {scoreHelp}
          </p>

          <div className="space-y-2">
            <label htmlFor={`notes-${reportId}`} className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
              Notas
            </label>
            <textarea
              id={`notes-${reportId}`}
              name="notes"
              rows={3}
              maxLength={1000}
              defaultValue={notes}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
            />
          </div>

          <ActionFeedback error={updateState.error} />

          <button
            type="submit"
            disabled={isUpdatePending}
            className="rounded-full border border-sky-300/40 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PendingLabel pending={isUpdatePending}>Guardar corrección</PendingLabel>
          </button>
        </form>
      </details>

      <div className="space-y-3 rounded-2xl border border-white/10 p-3 sm:p-4">
        <div className="flex flex-wrap gap-3">
          <form
            action={(formData) => runAction(formData, rejectCompetitiveReportAction, setRejectState, startRejectTransition)}
          >
            <HiddenContext eventId={eventId} eventSlug={eventSlug} reportId={reportId} />
            <button
              type="submit"
              disabled={isRejectPending}
              className="rounded-full border border-red-400/40 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PendingLabel pending={isRejectPending}>Rechazar</PendingLabel>
            </button>
          </form>
          <form
            action={(formData) => runAction(formData, approveCompetitiveReportAction, setApproveState, startApproveTransition)}
          >
            <HiddenContext eventId={eventId} eventSlug={eventSlug} reportId={reportId} />
            <button
              type="submit"
              disabled={approvalBlocked || isApprovePending}
              className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PendingLabel pending={isApprovePending}>{approvalBlocked ? "Aprobación bloqueada" : "Aprobar"}</PendingLabel>
            </button>
          </form>
        </div>

        <details>
          <summary className="cursor-pointer text-sm font-semibold text-[var(--muted)]">
            Añadir motivo de rechazo
          </summary>
          <form
            action={(formData) => runAction(formData, rejectCompetitiveReportAction, setRejectState, startRejectTransition)}
            className="mt-3 space-y-3"
          >
            <HiddenContext eventId={eventId} eventSlug={eventSlug} reportId={reportId} />
            <div className="space-y-2">
              <label htmlFor={`rejectionReason-${reportId}`} className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                Motivo opcional
              </label>
              <textarea
                id={`rejectionReason-${reportId}`}
                name="rejectionReason"
                rows={3}
                maxLength={500}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none transition focus:border-white/30"
                placeholder="Explica brevemente qué falta o qué dato es incorrecto."
              />
            </div>
            <button
              type="submit"
              disabled={isRejectPending}
              className="rounded-full border border-red-400/40 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PendingLabel pending={isRejectPending}>Rechazar con motivo</PendingLabel>
            </button>
          </form>
        </details>

        <ActionFeedback error={approveState.error} />
        <ActionFeedback error={rejectState.error} />
      </div>
    </>
  );
}
