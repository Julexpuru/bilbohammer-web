"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

export type CompetitiveTableLinkValue = {
  label: string;
  href: string;
};

export type CompetitiveTableValue = string | number | boolean | CompetitiveTableLinkValue | null;

export type CompetitiveTableRow = {
  id: string;
  [key: string]: CompetitiveTableValue;
};

export type CompetitiveTableColumn = {
  id: string;
  label: string;
  numeric?: boolean;
  hideOnMobile?: boolean;
  help?: string;
};

type Props = {
  columns: CompetitiveTableColumn[];
  rows: CompetitiveTableRow[];
  emptyMessage: string;
  searchPlaceholder?: string;
};

function renderValue(value: CompetitiveTableValue) {
  if (value === null || value === "") return "-";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "object") return value.label;
  return String(value);
}

function renderCellValue(value: CompetitiveTableValue) {
  if (value && typeof value === "object") {
    return (
      <a className="font-semibold text-sky-100 underline-offset-4 hover:underline" href={value.href}>
        {value.label}
      </a>
    );
  }
  return renderValue(value);
}

function valueMatchesSearch(value: CompetitiveTableValue, query: string) {
  if (!query) return true;
  return renderValue(value).toLowerCase().includes(query);
}

export default function CompetitiveDataTable({
  columns,
  rows,
  emptyMessage,
  searchPlaceholder = "Buscar en la hoja",
}: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = useMemo(
    () =>
      normalizedQuery
        ? rows.filter((row) => columns.some((column) => valueMatchesSearch(row[column.id], normalizedQuery)))
        : rows,
    [columns, normalizedQuery, rows],
  );

  const tableColumns = useMemo<ColumnDef<CompetitiveTableRow>[]>(
    () =>
      columns.map((column) => ({
        id: column.id,
        accessorKey: column.id,
        header: column.label,
        cell: (info) => renderCellValue(info.getValue() as CompetitiveTableValue),
        meta: { numeric: column.numeric, hideOnMobile: column.hideOnMobile, help: column.help },
      })),
    [columns],
  );

  const table = useReactTable({
    data: filteredRows,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none transition placeholder:text-white/40 focus:border-white/30 sm:max-w-xs sm:px-4 sm:text-sm"
        />
        <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[var(--muted)] sm:text-xs sm:tracking-[0.24em]">
          {filteredRows.length} de {rows.length} filas
        </p>
      </div>

      {filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-[var(--muted)]">
          {emptyMessage}
        </div>
      ) : (
        <div className="max-h-[70vh] max-w-full overflow-auto rounded-2xl border border-white/10 md:max-h-none">
            <table className="min-w-max divide-y divide-white/10 text-xs sm:text-sm md:min-w-full">
              <thead className="bg-white/5 text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)] sm:text-xs sm:tracking-[0.22em]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header, index) => {
                      const meta = header.column.columnDef.meta as { numeric?: boolean } | undefined;
                      const sorted = header.column.getIsSorted();
                      return (
                        <th
                          key={header.id}
                          className={`sticky top-0 z-20 whitespace-nowrap border-b border-white/10 bg-zinc-950 px-2 py-2 sm:px-4 sm:py-3 ${
                            index === 0 ? "left-0 z-40 w-[3.75rem] min-w-[3.75rem] sm:w-[5.5rem] sm:min-w-[5.5rem]" : ""
                          } ${
                            index === 1 ? "left-[3.75rem] z-30 w-[9.25rem] min-w-[9.25rem] sm:left-[5.5rem] sm:w-[13rem] sm:min-w-[13rem]" : ""
                          } ${meta?.numeric ? "text-right" : "text-left"}`}
                        >
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="inline-flex items-center gap-2 text-inherit transition hover:text-white"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <span className="text-white/50">
                              {sorted === "asc" ? "^" : sorted === "desc" ? "v" : ""}
                            </span>
                          </button>
                          {(header.column.columnDef.meta as { help?: string } | undefined)?.help && (
                            <span className="group relative ml-2 inline-flex">
                              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/20 text-[0.6rem] text-white/80 sm:h-5 sm:w-5 sm:text-[0.65rem]">
                                ?
                              </span>
                              <span className="pointer-events-none absolute left-0 top-6 z-10 hidden w-56 rounded-xl border border-white/10 bg-zinc-950 p-3 text-left text-xs normal-case tracking-normal text-white shadow-xl group-hover:block">
                                {(header.column.columnDef.meta as { help?: string }).help}
                              </span>
                            </span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-white/10">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-white/[0.03]">
                    {row.getVisibleCells().map((cell, index) => {
                      const meta = cell.column.columnDef.meta as { numeric?: boolean } | undefined;
                      return (
                        <td
                          key={cell.id}
                          className={`max-w-[14rem] break-words border-white/10 px-2 py-2 text-white/90 sm:max-w-[18rem] sm:px-4 sm:py-3 ${
                            index === 0 ? "sticky left-0 z-20 w-[3.75rem] min-w-[3.75rem] border-r bg-zinc-950 sm:w-[5.5rem] sm:min-w-[5.5rem]" : ""
                          } ${
                            index === 1 ? "sticky left-[3.75rem] z-10 w-[9.25rem] min-w-[9.25rem] border-r bg-zinc-950 sm:left-[5.5rem] sm:w-[13rem] sm:min-w-[13rem]" : ""
                          } ${
                            meta?.numeric ? "text-right tabular-nums" : "text-left"
                          }`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      )}
    </div>
  );
}
