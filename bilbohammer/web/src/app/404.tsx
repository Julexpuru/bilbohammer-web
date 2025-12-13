export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">404</p>
      <h1 className="text-3xl font-bold text-[var(--text)] sm:text-4xl">Página no encontrada</h1>
      <p className="text-[var(--muted)]">No hemos podido encontrar la página solicitada.</p>
      <div>
        <a href="/" className="btn btn-accent px-4 py-2 text-sm">
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
