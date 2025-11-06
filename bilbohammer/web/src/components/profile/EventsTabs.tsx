"use client";

import * as React from "react";
import Link from "next/link";
import type { ProfileEventRef } from "@/types/profile";

function EventItem({ ev }: { ev: ProfileEventRef }) {
  const d = ev.date ? new Date(ev.date) : null;
  const fmt = d ? d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" }) : "Fecha sin especificar";
  return (
    <Link
      href={`/eventos/${ev.id}`}
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
