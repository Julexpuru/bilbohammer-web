type NamedTable = {
  name: string;
  isActive?: boolean;
};

const MESA_NAME_PATTERN = /^Mesa\s+(\d+)$/i;

export function extractMesaNumber(name: string) {
  const match = name.trim().match(MESA_NAME_PATTERN);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function buildNextMesaName(tables: NamedTable[]) {
  const used = new Set(
    tables
      .filter((table) => table.isActive !== false)
      .map((table) => extractMesaNumber(table.name))
      .filter((value): value is number => value != null)
  );

  let next = 1;
  while (used.has(next)) next += 1;
  return `Mesa ${next}`;
}

export function buildArchivedTableName(name: string, id: string) {
  return `${name} [archived:${id}]`;
}

export function compareTableNames(a: string, b: string) {
  const mesaA = extractMesaNumber(a);
  const mesaB = extractMesaNumber(b);

  if (mesaA != null && mesaB != null) return mesaA - mesaB;
  if (mesaA != null) return -1;
  if (mesaB != null) return 1;

  return a.localeCompare(b, "es", { sensitivity: "base", numeric: true });
}
