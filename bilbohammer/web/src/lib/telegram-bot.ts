import { randomBytes, timingSafeEqual } from "crypto";
import {
  CompetitiveMatchKind,
  CompetitiveMatchOutcome,
  CompetitiveMatchReportChannel,
  Prisma,
} from "@prisma/client";

import { createCompetitiveMatchReport } from "@/lib/competitive-matches";
import { prisma } from "@/lib/prisma";
import { extractEventIdFromSlug } from "@/lib/events/slug";

type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number | string };
  text?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

type ParsedResultCommand = {
  eventRef: string | null;
  kind: CompetitiveMatchKind;
  playedAt: Date;
  roundNumber: number | null;
  notes: string | null;
  players: {
    displayName: string;
    factionLabel: string;
    outcome: CompetitiveMatchOutcome;
    score: number;
  }[];
};

const TELEGRAM_PROVIDER = "telegram";
const TELEGRAM_LINK_IDENTIFIER_PREFIX = "telegram-link:";
const TELEGRAM_LINK_TTL_MINUTES = 15;

const HELP_TEXT = [
  "Comandos disponibles:",
  "",
  "/start <código> vincula tu cuenta de Telegram con Bilbohammer.",
  "/resultado envía una partida para revisión.",
  "",
  "Formato de /resultado:",
  "/resultado",
  "evento: <id o slug del evento>",
  "tipo: liga",
  "fecha: 2026-06-04",
  "jugador: Tu nombre | Facción | victoria | 20",
  "rival: Rival | Facción rival | derrota | 0",
  "notas: opcional",
  "",
  "Usa tipo: pachanga para partidas que no puntúan en liga.",
].join("\n");

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized.length ? normalized : null;
}

function constantTimeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function validateTelegramWebhookSecret(headers: Headers) {
  const expectedSecret = normalizeText(process.env.TELEGRAM_WEBHOOK_SECRET);
  if (!expectedSecret) {
    return { ok: false, status: 503, error: "Webhook de Telegram no configurado." };
  }

  const receivedSecret = normalizeText(headers.get("x-telegram-bot-api-secret-token"));
  if (!receivedSecret || !constantTimeEquals(receivedSecret, expectedSecret)) {
    return { ok: false, status: 401, error: "Webhook de Telegram no autorizado." };
  }

  return { ok: true, status: 200, error: null };
}

export async function createTelegramLinkToken(userId: number) {
  const token = randomBytes(6).toString("base64url");
  const expires = new Date(Date.now() + TELEGRAM_LINK_TTL_MINUTES * 60 * 1000);
  const identifier = `${TELEGRAM_LINK_IDENTIFIER_PREFIX}${userId}`;

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: {
      identifier,
      token,
      expires,
    },
  });

  const botUsername = normalizeText(process.env.TELEGRAM_BOT_USERNAME);
  return {
    token,
    expiresAt: expires,
    command: `/start ${token}`,
    deepLink: botUsername ? `https://t.me/${botUsername}?start=${encodeURIComponent(token)}` : null,
  };
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  const message = update.message;
  if (!message?.text) {
    return { text: null };
  }

  const text = message.text.trim();
  if (!text) {
    return { text: null };
  }

  if (text.startsWith("/start")) {
    return { text: await handleStartCommand(text, message) };
  }

  if (text.startsWith("/ayuda") || text.startsWith("/help")) {
    return { text: HELP_TEXT };
  }

  if (text.startsWith("/resultado")) {
    return { text: await handleResultCommand(text, message) };
  }

  return { text: "No he entendido el mensaje. Escribe /ayuda para ver el formato disponible." };
}

export async function sendTelegramMessage(chatId: number | string, text: string) {
  const botToken = normalizeText(process.env.TELEGRAM_BOT_TOKEN);
  if (!botToken) return;

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    console.error("[telegram] sendMessage failed", response.status, await response.text().catch(() => ""));
  }
}

async function handleStartCommand(text: string, message: TelegramMessage) {
  const code = normalizeText(text.replace(/^\/start(?:@\w+)?/i, ""));
  if (!code) {
    return "Pásame el código de vinculación generado en Bilbohammer. Ejemplo: /start ABC123";
  }
  if (!message.from?.id) {
    return "No he podido identificar tu usuario de Telegram.";
  }

  const token = await prisma.verificationToken.findUnique({ where: { token: code } });
  if (!token || token.expires.getTime() < Date.now()) {
    return "El código de vinculación no existe o ha caducado. Genera uno nuevo desde Bilbohammer.";
  }

  const match = token.identifier.match(/^telegram-link:(\d+)$/);
  const userId = match ? Number(match[1]) : null;
  if (!userId || !Number.isInteger(userId)) {
    return "El código de vinculación no es válido.";
  }

  const telegramId = String(message.from.id);
  const telegramUsername = normalizeText(message.from.username);

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: TELEGRAM_PROVIDER,
            providerAccountId: telegramId,
          },
        },
      });

      if (existing && existing.userId !== userId) {
        throw new Error("Este Telegram ya está vinculado a otro usuario de Bilbohammer.");
      }

      await tx.account.deleteMany({
        where: {
          provider: TELEGRAM_PROVIDER,
          userId,
          providerAccountId: { not: telegramId },
        },
      });

      if (existing) {
        await tx.account.update({
          where: { id: existing.id },
          data: { type: TELEGRAM_PROVIDER, providerAccountId: telegramId },
        });
      } else {
        await tx.account.create({
          data: {
            userId,
            type: TELEGRAM_PROVIDER,
            provider: TELEGRAM_PROVIDER,
            providerAccountId: telegramId,
          },
        });
      }

      await tx.verificationToken.deleteMany({ where: { token: code } });
    });
  } catch (error) {
    return error instanceof Error ? error.message : "No se pudo vincular la cuenta de Telegram.";
  }

  return telegramUsername
    ? `Cuenta de Telegram @${telegramUsername} vinculada correctamente.`
    : "Cuenta de Telegram vinculada correctamente.";
}

async function handleResultCommand(text: string, message: TelegramMessage) {
  if (!message.from?.id) {
    return "No he podido identificar tu usuario de Telegram.";
  }

  const linkedAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: TELEGRAM_PROVIDER,
        providerAccountId: String(message.from.id),
      },
    },
    select: { userId: true },
  });

  if (!linkedAccount) {
    return "Antes de reportar partidas tienes que vincular tu Telegram con Bilbohammer.";
  }

  let parsed: ParsedResultCommand;
  try {
    parsed = parseResultCommand(text);
  } catch (error) {
    return `${error instanceof Error ? error.message : "No se pudo interpretar el resultado."}\n\n${HELP_TEXT}`;
  }

  const event = parsed.eventRef
    ? await prisma.event.findUnique({
        where: { id: extractEventIdFromSlug(parsed.eventRef) },
        select: { id: true, title: true, gameId: true },
      })
    : null;

  if (parsed.kind === CompetitiveMatchKind.LEAGUE && !event) {
    return "Una partida de liga necesita un evento válido. Usa `evento: <id o slug>`.";
  }

  const externalMessageId = `${message.chat.id}:${message.message_id}`;

  try {
    const report = await createCompetitiveMatchReport({
      eventId: event?.id ?? null,
      gameId: event?.gameId ?? null,
      kind: parsed.kind,
      playedAt: parsed.playedAt,
      roundNumber: parsed.roundNumber,
      channel: CompetitiveMatchReportChannel.TELEGRAM,
      submittedById: linkedAccount.userId,
      externalSubmitterId: String(message.from.id),
      externalMessageId,
      notes: parsed.notes,
      players: parsed.players,
    });

    const [first, second] = report.players;
    const eventLabel = event ? ` para ${event.title}` : "";
    return [
      `Reporte recibido${eventLabel}.`,
      "Queda pendiente de revisión por organización.",
      "",
      `${first.displayName} (${first.factionLabel}) ${first.score} - ${second.score} ${second.displayName} (${second.factionLabel})`,
    ].join("\n");
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return "Este mensaje ya se había recibido. No he creado un reporte duplicado.";
    }
    return error instanceof Error ? error.message : "No se pudo guardar el reporte.";
  }
}

function parseResultCommand(text: string): ParsedResultCommand {
  const body = text.replace(/^\/resultado(?:@\w+)?/i, "").trim();
  if (!body) {
    throw new Error("Faltan los datos de la partida.");
  }

  const fields = parseKeyValueLines(body);
  const kind = parseKind(fields.get("tipo") ?? fields.get("puntua"));
  const playedAt = parsePlayedAt(fields.get("fecha"));
  const roundNumber = parseOptionalRound(fields.get("ronda") ?? fields.get("jornada"));
  const firstPlayer = parsePlayerLine(fields.get("jugador") ?? fields.get("jugador 1"), "jugador");
  const secondPlayer = parsePlayerLine(fields.get("rival") ?? fields.get("jugador 2"), "rival");

  return {
    eventRef: normalizeText(fields.get("evento")),
    kind,
    playedAt,
    roundNumber,
    notes: normalizeText(fields.get("notas")),
    players: [firstPlayer, secondPlayer],
  };
}

function parseKeyValueLines(body: string) {
  const fields = new Map<string, string>();
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();
    if (key && value) fields.set(key, value);
  }
  return fields;
}

function parseKind(value: string | null | undefined) {
  const normalized = normalizeText(value)?.toLowerCase();
  if (!normalized || normalized === "liga" || normalized === "league" || normalized === "si" || normalized === "sí") {
    return CompetitiveMatchKind.LEAGUE;
  }
  if (normalized === "pachanga" || normalized === "casual" || normalized === "no") {
    return CompetitiveMatchKind.CASUAL;
  }
  throw new Error("El tipo debe ser liga o pachanga.");
}

function parsePlayedAt(value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (!normalized) {
    throw new Error("La fecha es obligatoria.");
  }

  const isoDay = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = isoDay ? new Date(`${normalized}T12:00:00.000Z`) : new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error("La fecha debe tener formato válido, por ejemplo 2026-06-04.");
  }
  return date;
}

function parseOptionalRound(value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const round = Number(normalized);
  if (!Number.isInteger(round) || round < 0) {
    throw new Error("La ronda debe ser un entero positivo.");
  }
  return round;
}

function parsePlayerLine(value: string | null | undefined, label: string) {
  const normalized = normalizeText(value);
  if (!normalized) {
    throw new Error(`La línea ${label} es obligatoria.`);
  }

  const parts = normalized.split("|").map((part) => part.trim());
  if (parts.length !== 4 || parts.some((part) => !part)) {
    throw new Error(`La línea ${label} debe tener formato: Nombre | Facción | resultado | puntos.`);
  }

  const score = Number(parts[3]);
  if (!Number.isInteger(score) || score < 0) {
    throw new Error(`Los puntos de ${label} deben ser un entero positivo.`);
  }

  return {
    displayName: parts[0],
    factionLabel: parts[1],
    outcome: parseOutcome(parts[2]),
    score,
  };
}

function parseOutcome(value: string) {
  const normalized = value.trim().toLowerCase();
  if (["victoria", "win", "ganada", "gana"].includes(normalized)) return CompetitiveMatchOutcome.WIN;
  if (["empate", "draw", "empatada"].includes(normalized)) return CompetitiveMatchOutcome.DRAW;
  if (["derrota", "loss", "perdida", "pierde"].includes(normalized)) return CompetitiveMatchOutcome.LOSS;
  throw new Error("El resultado debe ser victoria, empate o derrota.");
}
