import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  CompetitiveMatchKind,
  CompetitiveMatchOutcome,
  CompetitiveMatchReportChannel,
  EventRegistrationSource,
  EventRegistrationStatus,
} from "@prisma/client";

import prisma from "../src/lib/prisma";
import { slugify } from "../src/lib/slugify";

type CsvRow = Record<string, string>;

type CliOptions = {
  filePath: string;
  apply: boolean;
  ensureRegistrations: boolean;
  eventOverride?: string;
  gameOverride?: string;
};

type ResolvedPlayer = {
  userId: number | null;
  displayName: string;
  factionLabel: string;
  outcome: CompetitiveMatchOutcome;
  score: number;
};

type PreparedReport = {
  rowNumber: number;
  eventId: string;
  eventTitle: string;
  gameId: string | null;
  kind: CompetitiveMatchKind;
  playedAt: Date;
  roundNumber: number | null;
  channel: CompetitiveMatchReportChannel;
  submittedById: number | null;
  externalMessageId: string;
  notes: string | null;
  players: [ResolvedPlayer, ResolvedPlayer];
};

const CUID_PATTERN = /^[a-z0-9]{16,}$/i;

function usage() {
  return [
    "Uso:",
    "  npm run import:competitive-reports -- <csv> [--apply] [--ensure-registrations] [--event=<id-o-slug>] [--game=<id-o-slug>]",
    "",
    "Por defecto solo valida y muestra un resumen. Usa --apply para escribir en la base de datos.",
  ].join("\n");
}

function parseArgs(argv: string[]): CliOptions {
  const filePath = argv.find((arg) => !arg.startsWith("--"));
  if (!filePath) {
    throw new Error(usage());
  }

  const eventOverride = argv.find((arg) => arg.startsWith("--event="))?.slice("--event=".length).trim();
  const gameOverride = argv.find((arg) => arg.startsWith("--game="))?.slice("--game=".length).trim();

  return {
    filePath,
    apply: argv.includes("--apply"),
    ensureRegistrations: argv.includes("--ensure-registrations"),
    eventOverride: eventOverride || undefined,
    gameOverride: gameOverride || undefined,
  };
}

function parseCsv(content: string): CsvRow[] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      if (row.some((cell) => cell.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current);
  if (row.some((cell) => cell.trim().length > 0)) {
    rows.push(row);
  }

  const [rawHeader, ...dataRows] = rows;
  if (!rawHeader?.length) {
    throw new Error("El CSV no tiene cabecera.");
  }

  const header = rawHeader.map((cell, index) => (index === 0 ? cell.replace(/^\uFEFF/, "") : cell).trim());
  return dataRows.map((cells) =>
    Object.fromEntries(header.map((key, index) => [key, (cells[index] ?? "").trim()])),
  );
}

function required(row: CsvRow, key: string, rowNumber: number) {
  const value = row[key]?.trim() ?? "";
  if (!value) {
    throw new Error(`Fila ${rowNumber}: falta '${key}'.`);
  }
  return value;
}

function optional(row: CsvRow, key: string) {
  return row[key]?.trim() || null;
}

function parseKind(value: string | null, rowNumber: number) {
  const normalized = (value || "CASUAL").toUpperCase();
  if (normalized === CompetitiveMatchKind.LEAGUE) return CompetitiveMatchKind.LEAGUE;
  if (normalized === CompetitiveMatchKind.CASUAL) return CompetitiveMatchKind.CASUAL;
  throw new Error(`Fila ${rowNumber}: kind inválido '${value}'. Usa LEAGUE o CASUAL.`);
}

function parseChannel(value: string | null, rowNumber: number) {
  const normalized = (value || "IMPORT").toUpperCase();
  if (normalized in CompetitiveMatchReportChannel) {
    return normalized as CompetitiveMatchReportChannel;
  }
  throw new Error(`Fila ${rowNumber}: channel inválido '${value}'.`);
}

function parseOutcome(value: string, rowNumber: number) {
  const normalized = value.toUpperCase();
  if (normalized === CompetitiveMatchOutcome.WIN) return CompetitiveMatchOutcome.WIN;
  if (normalized === CompetitiveMatchOutcome.DRAW) return CompetitiveMatchOutcome.DRAW;
  if (normalized === CompetitiveMatchOutcome.LOSS) return CompetitiveMatchOutcome.LOSS;
  throw new Error(`Fila ${rowNumber}: outcome inválido '${value}'. Usa WIN, DRAW o LOSS.`);
}

function parseNonNegativeInteger(value: string | null, field: string, rowNumber: number) {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Fila ${rowNumber}: '${field}' debe ser un entero no negativo.`);
  }
  return parsed;
}

function parseRequiredScore(value: string, field: string, rowNumber: number) {
  const parsed = parseNonNegativeInteger(value, field, rowNumber);
  if (parsed == null) {
    throw new Error(`Fila ${rowNumber}: falta '${field}'.`);
  }
  return parsed;
}

function parsePlayedAt(value: string, rowNumber: number) {
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnly
    ? new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12, 0, 0))
    : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Fila ${rowNumber}: fecha inválida '${value}'.`);
  }
  return date;
}

function extractEventIdFromSlug(slugOrId: string) {
  const input = slugOrId.trim();
  const lastDash = input.lastIndexOf("-");
  if (lastDash === -1) return input;
  const candidate = input.slice(lastDash + 1);
  return candidate && CUID_PATTERN.test(candidate) ? candidate : input;
}

function externalMessageIdFor(row: CsvRow, rowNumber: number) {
  const explicit = optional(row, "external_message_id") ?? optional(row, "externalMessageId");
  if (explicit) return explicit;
  const hash = createHash("sha1").update(JSON.stringify(row)).digest("hex").slice(0, 32);
  return `csv:${hash}:row:${rowNumber}`;
}

async function resolveEvent(row: CsvRow, rowNumber: number, override?: string) {
  const raw = override ?? optional(row, "event_id") ?? optional(row, "event_slug");
  if (!raw) {
    throw new Error(`Fila ${rowNumber}: falta event_id, event_slug o --event.`);
  }

  const candidateId = extractEventIdFromSlug(raw);
  const byId = await prisma.event.findUnique({
    where: { id: candidateId },
    select: { id: true, title: true, gameId: true },
  });
  if (byId) return byId;

  const wantedSlug = slugify(raw, "evento");
  const events = await prisma.event.findMany({
    select: { id: true, title: true, gameId: true },
  });
  const matches = events.filter((event) => slugify(event.title, "evento") === wantedSlug);
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw new Error(`Fila ${rowNumber}: event_slug '${raw}' coincide con varios eventos. Usa event_id o --event.`);
  }
  throw new Error(`Fila ${rowNumber}: no se encontró evento para '${raw}'.`);
}

async function resolveGame(row: CsvRow, rowNumber: number, eventGameId: string | null, override?: string) {
  const raw = override ?? optional(row, "game_id") ?? optional(row, "game_slug");
  if (!raw) return eventGameId;

  const game = await prisma.game.findFirst({
    where: {
      OR: [{ id: raw }, { slug: raw }, { legacyEnumKey: raw }],
    },
    select: { id: true },
  });
  if (!game) {
    throw new Error(`Fila ${rowNumber}: no se encontró juego para '${raw}'.`);
  }
  return game.id;
}

async function resolveUserByEmail(email: string | null, field: string, rowNumber: number) {
  if (!email) return null;
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (!user) {
    throw new Error(`Fila ${rowNumber}: no existe usuario con email '${email}' en '${field}'.`);
  }
  return user.id;
}

async function resolvePlayer(row: CsvRow, prefix: "player_1" | "player_2", rowNumber: number): Promise<ResolvedPlayer> {
  const displayName = required(row, `${prefix}_name`, rowNumber);
  const factionLabel = required(row, `${prefix}_faction`, rowNumber);
  const outcome = parseOutcome(required(row, `${prefix}_outcome`, rowNumber), rowNumber);
  const score = parseRequiredScore(required(row, `${prefix}_score`, rowNumber), `${prefix}_score`, rowNumber);
  const userId = await resolveUserByEmail(optional(row, `${prefix}_email`), `${prefix}_email`, rowNumber);

  return {
    userId,
    displayName,
    factionLabel,
    outcome,
    score,
  };
}

function validateOutcomePair(players: [ResolvedPlayer, ResolvedPlayer], rowNumber: number) {
  const outcomes = players.map((player) => player.outcome).sort();
  const isDraw = outcomes[0] === CompetitiveMatchOutcome.DRAW && outcomes[1] === CompetitiveMatchOutcome.DRAW;
  const hasWinnerAndLoser =
    outcomes[0] === CompetitiveMatchOutcome.LOSS && outcomes[1] === CompetitiveMatchOutcome.WIN;
  if (!isDraw && !hasWinnerAndLoser) {
    throw new Error(`Fila ${rowNumber}: el resultado debe ser WIN/LOSS o DRAW/DRAW.`);
  }
}

async function prepareReport(row: CsvRow, rowNumber: number, options: CliOptions): Promise<PreparedReport> {
  const event = await resolveEvent(row, rowNumber, options.eventOverride);
  const players: [ResolvedPlayer, ResolvedPlayer] = [
    await resolvePlayer(row, "player_1", rowNumber),
    await resolvePlayer(row, "player_2", rowNumber),
  ];
  validateOutcomePair(players, rowNumber);

  return {
    rowNumber,
    eventId: event.id,
    eventTitle: event.title,
    gameId: await resolveGame(row, rowNumber, event.gameId, options.gameOverride),
    kind: parseKind(optional(row, "kind"), rowNumber),
    playedAt: parsePlayedAt(required(row, "played_at", rowNumber), rowNumber),
    roundNumber: parseNonNegativeInteger(optional(row, "round_number"), "round_number", rowNumber),
    channel: parseChannel(optional(row, "channel"), rowNumber),
    submittedById: await resolveUserByEmail(optional(row, "submitted_by_email"), "submitted_by_email", rowNumber),
    externalMessageId: externalMessageIdFor(row, rowNumber),
    notes: optional(row, "notes"),
    players,
  };
}

async function existingReport(report: PreparedReport) {
  return prisma.competitiveMatchReport.findFirst({
    where: {
      channel: report.channel,
      externalMessageId: report.externalMessageId,
    },
    select: { id: true },
  });
}

async function ensureRegistration(eventId: string, player: ResolvedPlayer, apply: boolean) {
  if (player.userId != null) {
    const existing = await prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId: player.userId } },
      select: { id: true },
    });
    if (existing || !apply) return existing?.id ?? null;
    const created = await prisma.eventRegistration.create({
      data: {
        eventId,
        userId: player.userId,
        playerName: player.displayName,
        factionLabel: player.factionLabel,
        status: EventRegistrationStatus.INSCRITO,
        source: EventRegistrationSource.IMPORT,
      },
      select: { id: true },
    });
    return created.id;
  }

  const registrations = await prisma.eventRegistration.findMany({
    where: { eventId },
    select: { id: true, playerName: true },
  });
  const existing = registrations.find(
    (registration) => registration.playerName.trim().toLowerCase() === player.displayName.trim().toLowerCase(),
  );
  if (existing || !apply) return existing?.id ?? null;

  const created = await prisma.eventRegistration.create({
    data: {
      eventId,
      playerName: player.displayName,
      factionLabel: player.factionLabel,
      status: EventRegistrationStatus.INSCRITO,
      source: EventRegistrationSource.IMPORT,
    },
    select: { id: true },
  });
  return created.id;
}

async function createReport(report: PreparedReport) {
  return prisma.competitiveMatchReport.create({
    data: {
      eventId: report.eventId,
      gameId: report.gameId,
      kind: report.kind,
      playedAt: report.playedAt,
      roundNumber: report.roundNumber,
      channel: report.channel,
      submittedById: report.submittedById,
      externalMessageId: report.externalMessageId,
      notes: report.notes,
      players: {
        create: report.players.map((player, index) => ({
          userId: player.userId,
          participantOrder: index + 1,
          displayName: player.displayName,
          factionLabel: player.factionLabel,
          outcome: player.outcome,
          score: player.score,
        })),
      },
    },
    select: { id: true },
  });
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const fullPath = path.resolve(options.filePath);
  const csv = await readFile(fullPath, "utf8");
  const rows = parseCsv(csv);
  await assertDatabaseReachable();

  let imported = 0;
  let skipped = 0;
  let registrationChecks = 0;
  const errors: string[] = [];
  const preparedReports: PreparedReport[] = [];

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    try {
      const report = await prepareReport(row, rowNumber, options);
      preparedReports.push(report);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Fila ${rowNumber}: error desconocido.`);
    }
  }

  if (errors.length) {
    console.error(`CSV inválido. Errores encontrados: ${errors.length}`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  for (const report of preparedReports) {
    const existing = await existingReport(report);
    if (existing) {
      skipped += 1;
      console.log(`Fila ${report.rowNumber}: ya existe reporte ${existing.id}; se omite.`);
      continue;
    }

    if (options.ensureRegistrations) {
      for (const player of report.players) {
        await ensureRegistration(report.eventId, player, options.apply);
        registrationChecks += 1;
      }
    }

    if (!options.apply) {
      console.log(
        `Fila ${report.rowNumber}: OK -> ${report.eventTitle} · ${report.kind} · ${report.players[0].displayName} vs ${report.players[1].displayName}`,
      );
      continue;
    }

    const created = await createReport(report);
    imported += 1;
    console.log(`Fila ${report.rowNumber}: creado reporte pendiente ${created.id}.`);
  }

  console.log("");
  console.log(`Archivo: ${fullPath}`);
  console.log(`Modo: ${options.apply ? "apply" : "dry-run"}`);
  console.log(`Filas válidas: ${preparedReports.length}`);
  console.log(`Reportes creados: ${imported}`);
  console.log(`Reportes omitidos por idempotencia: ${skipped}`);
  if (options.ensureRegistrations) {
    console.log(`Participantes revisados para inscripción: ${registrationChecks}`);
  }
  if (!options.apply) {
    console.log("No se ha escrito nada. Repite el comando con --apply para importar.");
  }
}

async function assertDatabaseReachable() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`No se puede conectar con la base de datos configurada. Detalle: ${message}`);
  }
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
