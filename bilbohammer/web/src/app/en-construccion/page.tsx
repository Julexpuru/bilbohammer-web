export const metadata = {
  title: "En construcción | Bilbohammer",
  description: "Esta sección está en construcción. Vuelve pronto.",
};

export default function EnConstruccionPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <section className="rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-8 shadow-lg sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent-600)]">En construcción</p>
        <h1 className="mt-3 text-3xl font-bold text-[var(--text)] sm:text-4xl">Estamos terminando esta sección</h1>
        <p className="mt-3 text-sm text-[var(--muted)] sm:text-base">
          Estamos afinando la experiencia para que funcione al 100 %. Si necesitas algo mientras la publicamos, ponte
          en contacto con el equipo.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <CardPill title="Acceso limitado" body="Solo el equipo puede entrar mientras ajustamos detalles." />
          <CardPill title="Contenido en camino" body="Añadiremos recursos, enlaces y guías cuando esté listo." />
          <CardPill title="Sin perderte nada" body="Todas las secciones ya publicadas siguen disponibles en la web." />
          <CardPill title="Vuelve pronto" body="Estamos trabajando para abrirla en cuanto sea estable." />
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <a href="/" className="btn btn-accent px-4 py-2 text-sm">
            Volver al inicio
          </a>
          <a href="mailto:bilbohammer@gmail.com" className="link text-sm text-[var(--muted)]">
            ¿Necesitas acceso? Escríbenos
          </a>
        </div>
      </section>
    </div>
  );
}

function CardPill({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--bg)] p-4">
      <p className="text-sm font-semibold text-[var(--text)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{body}</p>
    </div>
  );
}
