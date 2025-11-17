import prisma from "../src/lib/prisma";
import { MIGRATION_GUARDS, type MigrationGuard } from "./migration-guards";

function parseArgs() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const guardFilters = args
    .filter((arg) => arg.startsWith("--guard="))
    .map((arg) => arg.split("=")[1]?.trim())
    .filter((value): value is string => Boolean(value));

  return { apply, guardFilters };
}

function selectGuards(filters: string[]): MigrationGuard[] {
  if (!filters.length) {
    return MIGRATION_GUARDS;
  }
  const selected = MIGRATION_GUARDS.filter((guard) => filters.includes(guard.id));
  const missing = filters.filter((id) => !selected.some((guard) => guard.id === id));

  if (missing.length) {
    throw new Error(`Unknown guard id(s): ${missing.join(", ")}`);
  }

  return selected;
}

async function run() {
  const { apply, guardFilters } = parseArgs();
  const guards = selectGuards(guardFilters);

  if (!guards.length) {
    console.log("No hay guardias configuradas. Añade alguna en scripts/migration-guards.ts");
    return;
  }

  let blockingFound = false;
  let unresolvedBlocking = false;

  for (const guard of guards) {
    console.log(`\n[${guard.id}] ${guard.description}`);
    const result = await guard.check(prisma);

    if (!result.blockingCount) {
      console.log("  ✔ Sin datos bloqueando esta operación");
      continue;
    }

    blockingFound = true;
    console.warn(`  ⚠ Encontrados ${result.blockingCount} registro(s) que impedirían la migración.`);
    if (result.sample?.length) {
      console.warn("  Muestras:", JSON.stringify(result.sample, null, 2));
    }

    if (!apply) {
      continue;
    }

    if (!guard.fix) {
      console.warn("  ✖ Este guardia no tiene acción de limpieza automática. Resuélvelo manualmente.");
      unresolvedBlocking = true;
      continue;
    }

    const fixResult = await guard.fix(prisma);
    console.log(`  → Limpieza realizada. Registros actualizados: ${fixResult.updated}.`);

    const verify = await guard.check(prisma);
    if (verify.blockingCount) {
      console.error(
        `  ✖ Tras la limpieza aún quedan ${verify.blockingCount} registro(s) bloqueando la migración. Revisión manual necesaria.`
      );
      unresolvedBlocking = true;
    } else {
      console.log("  ✔ Verificación OK después de la limpieza.");
    }
  }

  await prisma.$disconnect();

  if (!apply && blockingFound) {
    process.exitCode = 1;
  }

  if (apply && unresolvedBlocking) {
    process.exitCode = 2;
  }
}

run().catch((error) => {
  console.error("Fallo ejecutando las comprobaciones de migración:", error);
  prisma.$disconnect().catch(() => {
    // ignore
  });
  process.exit(1);
});
