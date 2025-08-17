"use client";

import * as React from "react";

function pillColor(role: string) {
  const key = role.toLowerCase();
  if (key.includes("admin")) return "bg-rose-600 text-white";
  if (key.includes("junta")) return "bg-amber-600 text-black";
  if (key.includes("arbitro") || key.includes("árbitro")) return "bg-indigo-600 text-white";
  return "bg-emerald-700 text-white";
}

export function RolePills({
  roles,
  juntaPositions,
}: {
  roles?: string[];
  juntaPositions?: string[];
}) {
  if ((!roles || roles.length === 0) && (!juntaPositions || juntaPositions.length === 0)) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {roles?.map((r) => (
        <span key={r} className={`px-2 py-0.5 rounded-full text-xs ${pillColor(r)}`}>{r}</span>
      ))}
      {juntaPositions?.map((p) => (
        <span key={p} className="px-2 py-0.5 rounded-full text-xs bg-amber-900 text-amber-100">{p}</span>
      ))}
    </div>
  );
}
