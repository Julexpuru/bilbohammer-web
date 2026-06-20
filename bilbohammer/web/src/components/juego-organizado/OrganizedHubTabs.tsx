"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { OrganizedCalendarView } from "@/components/juego-organizado/OrganizedCalendarView";
import { TableMap } from "@/components/juego-organizado/TableMap";

type FilterItem = {
  id: string;
  name: string;
};

type Props = {
  games: FilterItem[];
  tables: FilterItem[];
  initialError?: string | null;
  canManage: boolean;
  canUseOrganizedPlay: boolean;
};

type TabKey = "calendar" | "tables";

export function OrganizedHubTabs({
  games,
  tables,
  initialError = null,
  canManage,
  canUseOrganizedPlay,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("calendar");

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-full rounded-2xl border border-[var(--hairline)] bg-[var(--bg)] p-1 sm:w-auto">
            <TabButton
              active={activeTab === "calendar"}
              label="Partidas"
              onClick={() => setActiveTab("calendar")}
            />
            <TabButton
              active={activeTab === "tables"}
              label="Mesas"
              onClick={() => setActiveTab("tables")}
            />
          </div>

          {activeTab === "calendar" && canUseOrganizedPlay && (
            <Link
              href="/juego-organizado/mis-partidas"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--accent-600)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg transition hover:bg-[var(--accent)] hover:text-[#0b1216] sm:min-w-[240px]"
            >
              Ir a Mis Partidas
            </Link>
          )}
        </div>
      </div>

      {activeTab === "calendar" ? (
        <section className="space-y-5">
          <div className="rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-6 shadow-sm">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-[var(--text)]">Partidas, reservas internas y ofertas abiertas</h2>
              <p className="max-w-3xl text-sm text-[var(--muted)]">
                Consulta el calendario completo del club y filtra por juego o mesa. Si ya tienes cuenta, desde Mis
                Partidas puedes gestionar tus slots, cancelar cruces y asignar mesa a tus partidas confirmadas.
              </p>
            </div>
          </div>

          <OrganizedCalendarView
            games={games}
            tables={tables}
            initialError={initialError}
            canUseOrganizedPlay={canUseOrganizedPlay}
          />
        </section>
      ) : (
        <section className="space-y-5">
          <div className="rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-6 shadow-sm">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-[var(--text)]">Mapa en tiempo real del club</h2>
              <p className="max-w-3xl text-sm text-[var(--muted)]">
                Revisa el estado actual de cada mesa, sus layouts y la ocupacion del dia. La reserva de mesas se
                gestiona desde las partidas; este mapa queda como panel de consulta y administracion del plano.
              </p>
            </div>
          </div>

          <TableMap canManage={canManage} />
        </section>
      )}
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition sm:flex-none sm:min-w-[140px]",
        active
          ? "bg-[var(--card)] text-[var(--text)] shadow-sm"
          : "text-[var(--muted)] hover:bg-[var(--card)]/60 hover:text-[var(--text)]"
      )}
    >
      {label}
    </button>
  );
}
