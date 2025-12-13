import Link from "next/link";

const tiles = [
  {
    href: "/juego-organizado/mesas",
    title: "Mapa de mesas",
    desc: "Vista aérea con estado en tiempo real y herramientas de administración.",
  },
  {
    href: "/juego-organizado/calendario",
    title: "Calendario",
    desc: "Partidas y reservas por día/semana con filtros por juego y mesa.",
  },
  {
    href: "/juego-organizado/mis-partidas",
    title: "Mis partidas",
    desc: "Tus slots de disponibilidad, partidas futuras y reservas asociadas.",
  },
];

export default function JuegoOrganizadoHubPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-0">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Juego organizado</p>
        <h1 className="text-3xl font-bold text-[var(--text)] sm:text-4xl">Hub de mesas y partidas</h1>
        <p className="max-w-3xl text-[var(--muted)]">
          Punto de entrada único al ecosistema: estado de mesas, calendario de partidas, tus horarios y eventos activos.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="group rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text)]">{tile.title}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">{tile.desc}</p>
              </div>
              <span className="rounded-full bg-[var(--accent-50)] px-3 py-1 text-xs font-semibold text-[var(--accent-600)]">
                Abrir
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
