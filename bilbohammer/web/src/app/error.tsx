"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Error</p>
      <h1 className="text-3xl font-bold text-[var(--text)] sm:text-4xl">Algo salió mal</h1>
      <p className="text-[var(--muted)]">
        Ha ocurrido un error inesperado. Puedes recargar la página o volver al inicio.
      </p>
      <div className="flex gap-2">
        <button type="button" className="btn btn-accent px-4 py-2 text-sm" onClick={() => reset()}>
          Reintentar
        </button>
        <a href="/" className="btn px-4 py-2 text-sm">
          Ir al inicio
        </a>
      </div>
    </div>
  );
}
