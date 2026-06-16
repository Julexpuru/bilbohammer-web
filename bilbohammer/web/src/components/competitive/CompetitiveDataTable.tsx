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

export type CompetitiveTableValue = string | number | boolean | null;

export type CompetitiveTableRow = {
  id: string;
  [key: string]: CompetitiveTableValue;
};

export type CompetitiveTableColumn = {
  id: string;
  label: string;
  numeric?: boolean;
  hideOnMobile?: boolean;
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
  return String(value);
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
        cell: (info) => renderValue(info.getValue() as CompetitiveTableValue),
        meta: { numeric: column.numeric, hideOnMobile: column.hideOnMobile },
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
          className="w-full rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-white/30 sm:max-w-xs"
        />
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
          {filteredRows.length} de {rows.length} filas
        </p>
      </div>

      {filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-[var(--muted)]">
          {emptyMessage}
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-white/10 md:block">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const meta = header.column.columnDef.meta as { numeric?: boolean } | undefined;
                      const sorted = header.column.getIsSorted();
                      return (
                        <th
                          key={header.id}
                          className={`whitespace-nowrap px-4 py-3 ${meta?.numeric ? "text-right" : "text-left"}`}
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
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-white/10">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-white/[0.03]">
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as { numeric?: boolean } | undefined;
                      return (
                        <td
                          key={cell.id}
                          className={`max-w-[18rem] break-words px-4 py-3 text-white/90 ${
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

          <div className="space-y-3 md:hidden">
            {table.getRowModel().rows.map((row) => (
              <article key={row.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <dl className="space-y-3">
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as { hideOnMobile?: boolean } | undefined;
                    if (meta?.hideOnMobile) return null;
                    return (
                      <div key={cell.id} className="grid gap-1">
                        <dt className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                          {String(cell.column.columnDef.header)}
                        </dt>
                        <dd className="break-words text-sm text-white">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
