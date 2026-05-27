import { type Game, type PrismaClient, TableStatus } from "@prisma/client";

export type SeedTableLayout = {
  title: string;
  description?: string;
  game?: string;
  sceneryNotes?: string;
  isDefault?: boolean;
  weekday?: number;
};

export type SeedTable = {
  name: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation?: number;
  sizeTag?: string;
  notes?: string;
  status?: TableStatus;
  layouts?: SeedTableLayout[];
};

export const SEED_TABLES: SeedTable[] = [
  { name: "Mesa 1", posX: 946, posY: 555, width: 80, height: 140 },
  { name: "Mesa 2", posX: 890, posY: 424, width: 140, height: 80 },
  { name: "Mesa 3", posX: 890, posY: 299, width: 140, height: 80 },
  { name: "Mesa 4", posX: 889, posY: 164, width: 140, height: 80 },
  { name: "Mesa 5", posX: 888, posY: 35, width: 140, height: 80, sizeTag: "Horizontal" },
  { name: "Mesa 6", posX: 615, posY: 38, width: 80, height: 170, sizeTag: "Vertical" },
  { name: "Mesa 7", posX: 620, posY: 330, width: 80, height: 170, sizeTag: "Vertical" },
  { name: "Mesa 8", posX: 357, posY: 337, width: 140, height: 80, sizeTag: "Horizontal" },
  { name: "Mesa 9", posX: 356, posY: 458, width: 140, height: 80, sizeTag: "Horizontal" },
  { name: "Mesa 10", posX: 357, posY: 577, width: 140, height: 80, sizeTag: "Horizontal" },
  { name: "Mesa 11", posX: 389, posY: 703, width: 80, height: 140, sizeTag: "Vertical" },
  { name: "Mesa 12", posX: 62, posY: 41, width: 140, height: 80, sizeTag: "Vertical" },
  { name: "Mesa 13", posX: 60, posY: 159, width: 80, height: 140, sizeTag: "Vertical" },
  { name: "Mesa 14", posX: 60, posY: 338, width: 80, height: 140, sizeTag: "Vertical" },
  { name: "Mesa 15", posX: 67, posY: 517, width: 140, height: 80, sizeTag: "Horizontal" },
  { name: "Mesa 16", posX: 224, posY: 520, width: 140, height: 90, sizeTag: "4p" },
  { name: "Mesa 17", posX: 224, posY: 404, width: 140, height: 80, sizeTag: "4p" },
  { name: "Mesa Sofas", posX: 349, posY: 79, width: 120, height: 70, sizeTag: "Sofas" },
  { name: "Mesa Streaming", posX: 91, posY: 728, width: 90, height: 120, sizeTag: "Streaming" },
  { name: "Zona Comida", posX: 898, posY: 782, width: 130, height: 110, status: TableStatus.BLOCKED, sizeTag: "Zona Comida" },
  { name: "Zona Pintura", posX: 604, posY: 589, width: 200, height: 300, status: TableStatus.BLOCKED, sizeTag: "Zona Pintura" },
  { name: "Zona Sofas", posX: 305, posY: 20, width: 230, height: 180, status: TableStatus.BLOCKED, sizeTag: "Zona Sofas" },
  { name: "Zona Streaming", posX: 62, posY: 673, width: 220, height: 200, status: TableStatus.BLOCKED, sizeTag: "Zona Streaming" },
];

export async function upsertSeedTables(prisma: PrismaClient, gameIndex: Map<string, Game>) {
  for (const table of SEED_TABLES) {
    const persisted = await prisma.clubTable.upsert({
      where: { name: table.name },
      update: {
        posX: table.posX,
        posY: table.posY,
        width: table.width,
        height: table.height,
        rotation: table.rotation ?? 0,
        sizeTag: table.sizeTag ?? null,
        notes: table.notes ?? null,
        status: table.status ?? TableStatus.AVAILABLE,
        isActive: true,
      },
      create: {
        name: table.name,
        posX: table.posX,
        posY: table.posY,
        width: table.width,
        height: table.height,
        rotation: table.rotation ?? 0,
        sizeTag: table.sizeTag ?? null,
        notes: table.notes ?? null,
        status: table.status ?? TableStatus.AVAILABLE,
        isActive: true,
      },
    });

    if (table.layouts && table.layouts.length > 0) {
      for (const layout of table.layouts) {
        const gameId = layout.game ? gameIndex.get(layout.game)?.id ?? null : null;
        await prisma.tableLayout.upsert({
          where: {
            tableId_title: { tableId: persisted.id, title: layout.title },
          },
          update: {
            description: layout.description ?? null,
            sceneryNotes: layout.sceneryNotes ?? null,
            isDefault: layout.isDefault ?? false,
            weekday: layout.weekday ?? null,
            gameId,
          },
          create: {
            tableId: persisted.id,
            title: layout.title,
            description: layout.description ?? null,
            sceneryNotes: layout.sceneryNotes ?? null,
            isDefault: layout.isDefault ?? false,
            weekday: layout.weekday ?? null,
            gameId,
          },
        });
      }
    }
  }
}
