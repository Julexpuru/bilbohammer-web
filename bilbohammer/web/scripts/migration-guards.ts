import type { PrismaClient } from "@prisma/client";

export type GuardCheckResult = {
  blockingCount: number;
  sample?: any[];
  details?: string;
};

export type GuardFixResult = {
  updated: number;
};

export type MigrationGuard = {
  id: string;
  description: string;
  check: (prisma: PrismaClient) => Promise<GuardCheckResult>;
  fix?: (prisma: PrismaClient) => Promise<GuardFixResult>;
};

type EnumArrayPruneOptions = {
  id: string;
  description: string;
  model: keyof PrismaClient | string;
  field: string;
  values: readonly string[];
  primaryKey?: string;
};

function getDelegate<T = any>(prisma: PrismaClient, model: string): T {
  const delegate = (prisma as unknown as Record<string, unknown>)[model];
  if (!delegate) {
    throw new Error(`No Prisma delegate found for model "${model}"`);
  }
  return delegate as T;
}

export function enumArrayPruneGuard(options: EnumArrayPruneOptions): MigrationGuard {
  const removalSet = new Set(options.values);
  const primaryKey = options.primaryKey ?? "id";

  function buildSelect() {
    const select: Record<string, true> = {
      [primaryKey]: true,
      [options.field]: true,
    };
    return select;
  }

  function filterBlocking(records: Record<string, any>[]) {
    return records.filter((record) => {
      const values: unknown[] = record[options.field] ?? [];
      return Array.isArray(values) && values.some((value) => removalSet.has(String(value)));
    });
  }

  return {
    id: options.id,
    description: options.description,
    async check(prisma) {
      const delegate = getDelegate(prisma, options.model as string);
      const candidates = await delegate.findMany({
        where: {
          NOT: {
            [options.field]: {
              isEmpty: true,
            },
          },
        } as any,
        select: buildSelect(),
      });
      const blocking = filterBlocking(candidates);

      if (!blocking.length) {
        return { blockingCount: 0 };
      }

      return {
        blockingCount: blocking.length,
        sample: blocking.slice(0, 5).map((row: any) => ({
          id: row[primaryKey],
          values: row[options.field],
        })),
      };
    },
    async fix(prisma) {
      const delegate = getDelegate(prisma, options.model as string);
      const candidates = await delegate.findMany({
        where: {
          NOT: {
            [options.field]: {
              isEmpty: true,
            },
          },
        } as any,
        select: buildSelect(),
      });

      const affected = filterBlocking(candidates);

      if (!affected.length) {
        return { updated: 0 };
      }

      let updated = 0;
      for (const record of affected) {
        const values: string[] = (record as any)[options.field] ?? [];
        const filtered = values.filter((value) => !removalSet.has(value));
        if (filtered.length === values.length) {
          continue;
        }

        await delegate.update({
          where: {
            [primaryKey]: record[primaryKey],
          },
          data: {
            [options.field]: filtered,
          },
        });
        updated += 1;
      }

      return { updated };
    },
  };
}

export const MIGRATION_GUARDS: MigrationGuard[] = [
  enumArrayPruneGuard({
    id: "user-facciones-aos",
    description: "Usuarios con facciones de Age of Sigmar eliminadas (Beastmen, Bonnezplitterz)",
    model: "user",
    field: "faccionesAoS",
    values: ["BEASTMEN", "BONNEZPLITTERZ"],
  }),
];
