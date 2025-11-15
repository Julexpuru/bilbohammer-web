"use client";

import * as React from "react";
import Link from "next/link";
import type { ProfileEventRef } from "@/types/profile";
import { formatClubDateTime } from "@/lib/date-format";
import { buildEventSlug } from "@/lib/events/slug";

const EVENT_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

function formatEventDate(value?: string | null) {
  if (!value) return "Fecha sin especificar";
  const formatted = formatClubDateTime(value, EVENT_DATE_FORMAT);
  return formatted || "Fecha sin especificar";
}

function EventItem({ ev }: { ev: ProfileEventRef }) {
  const fmt = formatEventDate(ev.date);
  const slug = buildEventSlug(ev.id, ev.title);
  return (
    <Link
      href={`/eventos/${slug}`}
      className="flex items-center justify-between border-b border-white/10 py-2 transition hover:bg-white/5"
    >
      <span className="text-sm">{ev.title}</span>
      <span className="text-xs opacity-70">{fmt}</span>
    </Link>
  );
}

export function EventsTabs({
  organized,
  participated,
}: {
  organized?: ProfileEventRef[];
  participated?: ProfileEventRef[];
}) {
  const [tab, setTab] = React.useState<"org"|"part">("org");

  const curr = tab === "org" ? (organized ?? []) : (participated ?? []);

  return (
    <div className="rounded-xl border border-white/10 p-4 bg-slate-900/40">
      <div className="flex gap-2 mb-3">
        <button
          className={`px-3 py-1 rounded-md text-sm border ${tab==="org"?"bg-slate-700 border-white/20":"bg-slate-800 border-white/10"}`}
          onClick={() => setTab("org")}
        >
          Organizador
        </button>
        <button
          className={`px-3 py-1 rounded-md text-sm border ${tab==="part"?"bg-slate-700 border-white/20":"bg-slate-800 border-white/10"}`}
          onClick={() => setTab("part")}
        >
          Participante
        </button>
      </div>

      {curr.length === 0 ? (
        <p className="text-sm opacity-70">No hay eventos.</p>
      ) : (
        <div className="divide-y divide-white/5">
          {curr.map(ev => <EventItem key={ev.id} ev={ev} />)}
        </div>
      )}
    </div>
  );
}
