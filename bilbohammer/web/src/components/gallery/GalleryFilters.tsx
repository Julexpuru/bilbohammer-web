import clsx from "clsx";

type FilterOption = {
  id: string;
  label: string;
  count?: number;
};

type FilterGroup = {
  id: string;
  title: string;
  options: FilterOption[];
};

type GalleryFiltersProps = {
  groups: FilterGroup[];
  activeFilters: Set<string>;
  tagQuery: string;
  onTagQueryChange: (value: string) => void;
  onToggle: (id: string) => void;
  onClear: () => void;
};

export function GalleryFilters({
  groups,
  activeFilters,
  tagQuery,
  onTagQueryChange,
  onToggle,
  onClear,
}: GalleryFiltersProps) {
  const hasFilters = activeFilters.size > 0 || tagQuery.trim().length > 0;

  return (
    <aside className="sticky top-[calc(var(--nav-h)+1.5rem)] space-y-6">
      <header className="space-y-4 rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Filtros</p>
          <h2 className="text-2xl font-semibold leading-tight">Filtra por juego o formato</h2>
          <p className="text-sm text-[var(--muted)]">
            Selecciona varias etiquetas para refinar los resultados. La galería se actualiza al instante.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="gallery-tag-search" className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
            Buscar por etiquetas
          </label>
          <input
            id="gallery-tag-search"
            type="search"
            value={tagQuery}
            onChange={(event) => onTagQueryChange(event.target.value)}
            placeholder="Ej. cosplay, narrativa, streaming"
            className="w-full rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-4 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={onClear}
          className={clsx(
            "btn text-sm transition",
            hasFilters ? "opacity-100" : "opacity-50 cursor-not-allowed"
          )}
          disabled={!hasFilters}
        >
          Limpiar filtros
        </button>
      </header>

      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.id} className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{group.title}</h3>
            <div className="flex flex-wrap gap-2">
              {group.options.map((option) => {
                const optionId = `${group.id}::${option.id}`;
                const isActive = activeFilters.has(optionId);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onToggle(optionId)}
                    className={clsx(
                      "rounded-full border px-4 py-1.5 text-sm transition",
                      "border-[var(--hairline)] bg-[var(--card)] text-[var(--muted)]",
                      isActive &&
                        "border-[var(--accent-600)] bg-[var(--accent-100)] text-[var(--accent-700)] font-semibold ring-2 ring-[var(--accent-200)] ring-offset-1 ring-offset-[var(--card)]"
                    )}
                    aria-pressed={isActive}
                  >
                    <span className="font-medium">{option.label}</span>
                    {typeof option.count === "number" && (
                      <span className="ml-2 text-xs opacity-70">({option.count})</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
