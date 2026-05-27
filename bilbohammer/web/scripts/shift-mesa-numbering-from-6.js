const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const MESA_RE = /^Mesa\s+(\d+)$/i;

async function main() {
  const rows = await prisma.clubTable.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const byNumber = new Map();
  for (const row of rows) {
    const match = row.name.match(MESA_RE);
    if (!match) continue;
    byNumber.set(Number(match[1]), row);
  }

  const mesa5 = byNumber.get(5);
  if (!mesa5) {
    console.log("Mesa 5 not found. Nothing to shift.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.clubTable.update({
      where: { id: mesa5.id },
      data: { name: "__tmp_mesa_5__" },
    });

    for (let current = 6; current <= 17; current += 1) {
      const row = byNumber.get(current);
      if (!row) continue;
      await tx.clubTable.update({
        where: { id: row.id },
        data: { name: `Mesa ${current - 1}` },
      });
    }

    await tx.clubTable.update({
      where: { id: mesa5.id },
      data: { name: "Mesa 17" },
    });
  });

  console.log("Shift done: Mesa 6..17 -> Mesa 5..16 and old Mesa 5 -> Mesa 17");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
