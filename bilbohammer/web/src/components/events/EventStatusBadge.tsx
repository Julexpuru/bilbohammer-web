"use client";

import clsx from "clsx";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  PUBLISHED: {
    label: "Published",
    className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
  },
  ONGOING: {
    label: "En curso",
    className: "border-sky-500/40 bg-sky-500/15 text-sky-200",
  },
  FINALIZED: {
    label: "Finalizado",
    className: "border-zinc-400/40 bg-zinc-400/15 text-zinc-200",
  },
  DRAFT: {
    label: "Borrador",
    className: "border-amber-500/40 bg-amber-500/15 text-amber-200",
  },
  CANCELLED: {
    label: "Cancelado",
    className: "border-rose-500/45 bg-rose-500/20 text-rose-200",
  },
};

export default function EventStatusBadge({ status }: { status: string }) {
  const key = (status ?? "").toUpperCase();
  const config = STATUS_STYLES[key] ?? {
    label: key || "Sin estado",
    className: "border-[var(--hairline)] bg-white/10 text-[var(--muted)]",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
