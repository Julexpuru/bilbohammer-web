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
  const whereClause = {
    [options.field]: {
      hasSome: options.values,
    },
  };

  function buildSelect() {
    const select: Record<string, true> = {
      [primaryKey]: true,
      [options.field]: true,
    };
    return select;
  }

  return {
    id: options.id,
    description: options.description,
    async check(prisma) {
      const delegate = getDelegate(prisma, options.model as string);
      const blockingCount = await delegate.count({
        where: whereClause,
      });

      if (!blockingCount) {
        return { blockingCount };
      }

      const sample = await delegate.findMany({
        where: whereClause,
        select: buildSelect(),
        take: 5,
        orderBy: {
          [primaryKey]: "asc",
        },
      });

      return {
        blockingCount,
        sample: sample.map((row: any) => ({
          id: row[primaryKey],
          values: row[options.field],
        })),
      };
    },
    async fix(prisma) {
      const delegate = getDelegate(prisma, options.model as string);
      const affected = await delegate.findMany({
        where: whereClause,
        select: buildSelect(),
      });

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
