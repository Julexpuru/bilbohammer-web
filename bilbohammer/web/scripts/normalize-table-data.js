const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ARCHIVED_TAG = "[archived:";
const GENERIC_TABLE_PATTERN = /^Mesa\s+(\d+)(?:\s*\(copia\))?$/i;

function buildArchivedName(name, id) {
  return name.includes(ARCHIVED_TAG) ? name : `${name} [archived:${id}]`;
}

function extractMesaNumber(name) {
  const match = name.trim().match(GENERIC_TABLE_PATTERN);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isInteger(value) && value > 0 ? value : null;
}

async function main() {
  const tables = await prisma.clubTable.findMany({
    select: {
      id: true,
      name: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const inactiveToArchive = tables.filter((table) => !table.isActive && !table.name.includes(ARCHIVED_TAG));

  const renumberTargets = tables
    .filter((table) => table.isActive && GENERIC_TABLE_PATTERN.test(table.name))
    .sort((a, b) => {
      const numA = extractMesaNumber(a.name) ?? Number.MAX_SAFE_INTEGER;
      const numB = extractMesaNumber(b.name) ?? Number.MAX_SAFE_INTEGER;
      if (numA !== numB) return numA - numB;
      return a.createdAt.getTime() - b.createdAt.getTime() || a.updatedAt.getTime() - b.updatedAt.getTime();
    });

  if (inactiveToArchive.length === 0 && renumberTargets.length === 0) {
    console.log("No changes needed.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const table of inactiveToArchive) {
      await tx.clubTable.update({
        where: { id: table.id },
        data: { name: buildArchivedName(table.name, table.id) },
      });
    }

    for (const table of renumberTargets) {
      await tx.clubTable.update({
        where: { id: table.id },
        data: { name: `__tmp_table__${table.id}` },
      });
    }

    for (let index = 0; index < renumberTargets.length; index += 1) {
      const table = renumberTargets[index];
      await tx.clubTable.update({
        where: { id: table.id },
        data: { name: `Mesa ${index + 1}` },
      });
    }
  });

  const summary = {
    archivedInactive: inactiveToArchive.length,
    renumberedActiveGeneric: renumberTargets.length,
  };
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
