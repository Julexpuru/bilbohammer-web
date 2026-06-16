import { randomBytes, timingSafeEqual } from "crypto";
import {
  CompetitiveMatchKind,
  CompetitiveMatchOutcome,
  CompetitiveMatchReportChannel,
  EventRegistrationStatus,
  EventStatus,
  EventType,
  Prisma,
} from "@prisma/client";

import { createCompetitiveMatchReport } from "@/lib/competitive-matches";
import { extractEventIdFromSlug } from "@/lib/events/slug";
import { FACTIONS, fallbackGameName } from "@/lib/games";
import { prisma } from "@/lib/prisma";

type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

type TelegramChat = {
  id: number | string;
};

type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
};

type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

type OutgoingTelegramMessage = {
  chatId: number | string;
  text: string;
  replyMarkup?: TelegramInlineKeyboard;
};

type TelegramInlineKeyboard = {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
};

type TelegramUpdateResult = {
  messages: OutgoingTelegramMessage[];
  callbackQueryId?: string | null;
};

type BotStep =
  | "SELECT_EVENT"
  | "SELECT_KIND"
  | "SELECT_RIVAL"
  | "PLAYER_FACTION"
  | "RIVAL_FACTION"
  | "SELECT_OUTCOME"
  | "PLAYER_SCORE"
  | "RIVAL_SCORE"
  | "DATE"
  | "CONFIRM";

type SessionPayload = {
  eventId?: string;
  eventTitle?: string;
  gameId?: string | null;
  gameSlug?: string | null;
  gameName?: string | null;
  gameLegacyEnumKey?: string | null;
  kind?: CompetitiveMatchKind;
  playerRegistrationId?: string;
  playerUserId?: number | null;
  playerName?: string;
  playerFaction?: string;
  rivalRegistrationId?: string;
  rivalUserId?: number | null;
  rivalName?: string;
  rivalFaction?: string;
  outcome?: CompetitiveMatchOutcome;
  playerScore?: number;
  rivalScore?: number;
  playedAt?: string;
  notes?: string | null;
  returnToConfirm?: boolean;
};

type LinkedTelegramAccount = {
  userId: number;
  telegramUserId: string;
};

type LeagueOption = {
  id: string;
  title: string;
  gameId: string | null;
  gameSlug: string | null;
  gameName: string | null;
  gameLegacyEnumKey: string | null;
  startsAt: Date;
  endsAt: Date;
  registration: {
    id: string;
    userId: number | null;
    playerName: string;
    factionLabel: string | null;
  };
};

type RegistrationOption = {
  id: string;
  userId: number | null;
  playerName: string;
  factionLabel: string | null;
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
const SESSION_TTL_MINUTES = 30;
const ACTIVE_REGISTRATION_STATUSES = [EventRegistrationStatus.INSCRITO, EventRegistrationStatus.PAGADO];
type FactionGameKey = keyof typeof FACTIONS;

const HELP_TEXT = [
  "Puedes usar estos comandos:",
  "",
  "/resultado - iniciar reporte guiado de una partida.",
  "/cancelar - cancelar el reporte en curso.",
  "/ayuda - ver esta ayuda.",
  "",
  "El bot registra partidas dentro de una liga o evento donde estés inscrito. Las partidas quedan pendientes de revisión por organización.",
  "",
  "Modo rápido para usuarios avanzados:",
  "/resultado",
  "evento: <id o slug>",
  "tipo: liga",
  "fecha: 2026-06-16",
  "jugador: Tu nombre | Facción | victoria | 20",
  "rival: Rival | Facción rival | derrota | 0",
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

function asChatId(value: number | string) {
  return String(value);
}

function sessionExpiresAt() {
  return new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateEs(value: string | Date) {
  const date = typeof value === "string" ? new Date(`${value}T12:00:00.000Z`) : value;
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: "Europe/Madrid" }).format(date);
}

function displayUserName(user: TelegramUser) {
  return normalizeText([user.first_name, user.last_name].filter(Boolean).join(" ")) ?? user.username ?? String(user.id);
}

function playerLabel(player: { playerName: string; factionLabel: string | null }) {
  return player.factionLabel ? `${player.playerName} (${player.factionLabel})` : player.playerName;
}

function resolveFactionGameKey(payload: Pick<SessionPayload, "gameSlug" | "gameLegacyEnumKey">): FactionGameKey | null {
  const candidates = [payload.gameSlug, payload.gameLegacyEnumKey]
    .map((value) => normalizeText(value)?.toLowerCase())
    .filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (candidate === "w40k") return "w40k";
    if (candidate === "aos") return "aos";
    if (candidate === "tow") return "tow";
  }

  return null;
}

function factionCatalogForPayload(payload: Pick<SessionPayload, "gameSlug" | "gameLegacyEnumKey">) {
  const key = resolveFactionGameKey(payload);
  return key ? FACTIONS[key] : null;
}

function gameNameForPayload(payload: Pick<SessionPayload, "gameSlug" | "gameName">) {
  return payload.gameName ?? (payload.gameSlug ? fallbackGameName(payload.gameSlug) : "este juego");
}

function formatFactionCatalog(payload: Pick<SessionPayload, "gameSlug" | "gameLegacyEnumKey">) {
  const catalog = factionCatalogForPayload(payload);
  if (!catalog) return null;

  return catalog.map((faction, index) => `${index + 1}. ${faction.name}`).join("\n");
}

function parseFactionFromUserText(text: string, payload: Pick<SessionPayload, "gameSlug" | "gameLegacyEnumKey">) {
  const value = normalizeText(text);
  if (!value) return null;

  const catalog = factionCatalogForPayload(payload);
  if (!catalog) return value;

  if (/^\d+$/.test(value)) {
    const selected = catalog[Number(value) - 1];
    return selected?.name ?? null;
  }

  return catalog.find((faction) => faction.name === value)?.name ?? null;
}

function canonicalFactionFromStoredValue(value: string | null | undefined, payload: Pick<SessionPayload, "gameSlug" | "gameLegacyEnumKey">) {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  const catalog = factionCatalogForPayload(payload);
  if (!catalog) return normalized;

  return catalog.find((faction) => faction.name === normalized || faction.id === normalized)?.name ?? null;
}

function factionValidationMessage(
  payload: Pick<SessionPayload, "gameSlug" | "gameName" | "gameLegacyEnumKey">,
  label: "tu facción/lista" | "la facción/lista del rival",
) {
  const catalogText = formatFactionCatalog(payload);
  if (!catalogText) return `Necesito ${label} para guardar la partida.`;

  return [
    `Elige ${label} para ${gameNameForPayload(payload)}.`,
    "Responde con el número o con el nombre exacto de la lista:",
    "",
    catalogText,
  ].join("\n");
}

function keyboard(rows: Array<Array<{ text: string; data: string }>>): TelegramInlineKeyboard {
  return {
    inline_keyboard: rows.map((row) => row.map((button) => ({ text: button.text, callback_data: button.data }))),
  };
}

function cancelKeyboard(): TelegramInlineKeyboard {
  return keyboard([[{ text: "Cancelar", data: "tg:cancel" }]]);
}

function askOutcome(chatId: number | string): TelegramUpdateResult {
  return singleMessage(
    chatId,
    "Indica tu resultado.",
    keyboard([
      [
        { text: "Victoria", data: "tg:out:WIN" },
        { text: "Empate", data: "tg:out:DRAW" },
        { text: "Derrota", data: "tg:out:LOSS" },
      ],
      [{ text: "Cancelar", data: "tg:cancel" }],
    ])
  );
}

function singleMessage(chatId: number | string, text: string, replyMarkup?: TelegramInlineKeyboard): TelegramUpdateResult {
  return { messages: [{ chatId, text, replyMarkup }] };
}

function noMessage(callbackQueryId?: string | null): TelegramUpdateResult {
  return { messages: [], callbackQueryId };
}

function parseSessionPayload(value: Prisma.JsonValue): SessionPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as SessionPayload;
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

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<TelegramUpdateResult> {
  if (update.callback_query) {
    return handleCallbackQuery(update.callback_query);
  }

  const message = update.message;
  if (!message?.text) {
    return { messages: [] };
  }

  const text = message.text.trim();
  if (!text) {
    return { messages: [] };
  }

  if (text.startsWith("/start")) {
    return singleMessage(message.chat.id, await handleStartCommand(text, message));
  }

  if (text.startsWith("/ayuda") || text.startsWith("/help")) {
    return singleMessage(message.chat.id, HELP_TEXT);
  }

  if (text.startsWith("/cancelar") || text.startsWith("/cancel")) {
    await deleteSession(message.from?.id, message.chat.id);
    return singleMessage(message.chat.id, "He cancelado el reporte en curso.");
  }

  if (text.startsWith("/resultado")) {
    return handleResultCommand(text, message);
  }

  const linked = await getLinkedAccount(message.from);
  if (linked) {
    const session = await getActiveSession(linked, message.chat.id);
    if (session) {
      return handleSessionText(session, text, message.chat.id);
    }
  }

  return singleMessage(message.chat.id, "No he entendido el mensaje. Escribe /ayuda para ver las opciones disponibles.");
}

export async function sendTelegramMessage(message: OutgoingTelegramMessage) {
  const botToken = normalizeText(process.env.TELEGRAM_BOT_TOKEN);
  if (!botToken) return;

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: message.chatId,
      text: message.text,
      reply_markup: message.replyMarkup,
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    console.error("[telegram] sendMessage failed", response.status, await response.text().catch(() => ""));
  }
}

export async function answerTelegramCallbackQuery(callbackQueryId: string) {
  const botToken = normalizeText(process.env.TELEGRAM_BOT_TOKEN);
  if (!botToken) return;

  const response = await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId }),
  });

  if (!response.ok) {
    console.error("[telegram] answerCallbackQuery failed", response.status, await response.text().catch(() => ""));
  }
}

async function handleStartCommand(text: string, message: TelegramMessage) {
  const code = normalizeText(text.replace(/^\/start(?:@\w+)?/i, ""));
  if (!message.from?.id) {
    return "No he podido identificar tu usuario de Telegram.";
  }

  const existingAccount = await getLinkedAccount(message.from);
  if (!code) {
    if (existingAccount) {
      return "Tu Telegram ya está vinculado. Usa /resultado para reportar una partida o /ayuda para ver opciones.";
    }
    return "Para vincular Telegram, entra en Bilbohammer, abre Mi Perfil y pulsa Conectar Telegram.";
  }

  const token = await prisma.verificationToken.findUnique({ where: { token: code } });
  if (!token || token.expires.getTime() < Date.now()) {
    return "El código de vinculación no existe o ha caducado. Genera uno nuevo desde Mi Perfil.";
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
    ? `Cuenta de Telegram @${telegramUsername} vinculada correctamente. Usa /resultado cuando quieras reportar una partida.`
    : "Cuenta de Telegram vinculada correctamente. Usa /resultado cuando quieras reportar una partida.";
}

async function handleResultCommand(text: string, message: TelegramMessage): Promise<TelegramUpdateResult> {
  const linked = await getLinkedAccount(message.from);
  if (!linked) {
    return singleMessage(message.chat.id, "Antes de reportar partidas tienes que vincular tu Telegram desde Mi Perfil.");
  }

  const body = text.replace(/^\/resultado(?:@\w+)?/i, "").trim();
  if (body) {
    return handleQuickResultCommand(text, message, linked);
  }

  return startGuidedResultFlow(linked, message.chat.id);
}

async function startGuidedResultFlow(linked: LinkedTelegramAccount, chatId: number | string): Promise<TelegramUpdateResult> {
  const leagues = await listLeagueOptionsForUser(linked.userId);
  if (leagues.length === 0) {
    await deleteSessionByLinkedAccount(linked, chatId);
    return singleMessage(
      chatId,
      "No encuentro ninguna liga o evento activo donde estés inscrito. Para reportar una partida, primero necesitas estar inscrito o pagado en ese marco."
    );
  }

  if (leagues.length === 1) {
    const league = leagues[0];
    await upsertSession(linked, chatId, "SELECT_KIND", payloadFromLeague(league));
    return askMatchKind(chatId, league.title);
  }

  await upsertSession(linked, chatId, "SELECT_EVENT", {});
  return singleMessage(
    chatId,
    "Elige primero la liga o evento donde quieres registrar la partida:",
    keyboard([
      ...leagues.map((league) => [{ text: league.title.slice(0, 48), data: `tg:ev:${league.id}` }]),
      [{ text: "Cancelar", data: "tg:cancel" }],
    ])
  );
}

async function handleCallbackQuery(callback: TelegramCallbackQuery): Promise<TelegramUpdateResult> {
  const chatId = callback.message?.chat.id;
  if (chatId == null) return noMessage(callback.id);

  const linked = await getLinkedAccount(callback.from);
  if (!linked) {
    return { ...singleMessage(chatId, "Antes de reportar partidas tienes que vincular tu Telegram desde Mi Perfil."), callbackQueryId: callback.id };
  }

  const data = callback.data ?? "";
  if (data === "tg:cancel") {
    await deleteSessionByLinkedAccount(linked, chatId);
    return { ...singleMessage(chatId, "He cancelado el reporte en curso."), callbackQueryId: callback.id };
  }

  if (data === "tg:restart") {
    await deleteSessionByLinkedAccount(linked, chatId);
    return { ...(await startGuidedResultFlow(linked, chatId)), callbackQueryId: callback.id };
  }

  const session = await getActiveSession(linked, chatId);
  if (!session) {
    return { ...singleMessage(chatId, "No hay ningún reporte en curso. Usa /resultado para empezar."), callbackQueryId: callback.id };
  }

  const payload = parseSessionPayload(session.payload);

  if (data === "tg:edit:event") {
    const leagues = await listLeagueOptionsForUser(linked.userId);
    if (leagues.length <= 1) {
      return { ...singleMessage(chatId, "Solo tienes una liga o evento disponible para reportar. No hay otro marco al que cambiar."), callbackQueryId: callback.id };
    }
    await updateSession(session.id, "SELECT_EVENT", {});
    return {
      ...singleMessage(
        chatId,
        "Elige de nuevo la liga o evento donde quieres registrar la partida:",
        keyboard([
          ...leagues.map((league) => [{ text: league.title.slice(0, 48), data: `tg:ev:${league.id}` }]),
          [{ text: "Cancelar", data: "tg:cancel" }],
        ])
      ),
      callbackQueryId: callback.id,
    };
  }

  if (data === "tg:edit:rival") {
    const nextPayload: SessionPayload = {
      ...payload,
      rivalRegistrationId: undefined,
      rivalUserId: undefined,
      rivalName: undefined,
      rivalFaction: undefined,
      returnToConfirm: true,
    };
    await updateSession(session.id, "SELECT_RIVAL", nextPayload);
    return { ...(await askRival(chatId, nextPayload)), callbackQueryId: callback.id };
  }

  if (data === "tg:edit:factions") {
    const nextPayload: SessionPayload = {
      ...payload,
      playerFaction: undefined,
      rivalFaction: undefined,
      returnToConfirm: true,
    };
    return { ...(await continueAfterRivalSelected(session.id, chatId, nextPayload)), callbackQueryId: callback.id };
  }

  if (data === "tg:edit:outcome") {
    const nextPayload: SessionPayload = { ...payload, outcome: undefined, returnToConfirm: true };
    await updateSession(session.id, "SELECT_OUTCOME", nextPayload);
    return { ...askOutcome(chatId), callbackQueryId: callback.id };
  }

  if (data === "tg:edit:scores") {
    const nextPayload: SessionPayload = {
      ...payload,
      playerScore: undefined,
      rivalScore: undefined,
      returnToConfirm: true,
    };
    await updateSession(session.id, "PLAYER_SCORE", nextPayload);
    return { ...singleMessage(chatId, "Indica tus puntos de partida.", cancelKeyboard()), callbackQueryId: callback.id };
  }

  if (data === "tg:edit:date") {
    const nextPayload: SessionPayload = { ...payload, playedAt: undefined, returnToConfirm: true };
    await updateSession(session.id, "DATE", nextPayload);
    return {
      ...singleMessage(
        chatId,
        "Indica la fecha de la partida en formato AAAA-MM-DD o pulsa Hoy.",
        keyboard([[{ text: "Hoy", data: "tg:date:today" }], [{ text: "Cancelar", data: "tg:cancel" }]])
      ),
      callbackQueryId: callback.id,
    };
  }

  if (data.startsWith("tg:ev:")) {
    const eventId = data.slice("tg:ev:".length);
    const league = await findLeagueOptionForUser(linked.userId, eventId);
    if (!league) {
      return { ...singleMessage(chatId, "No puedes reportar partidas en esa liga o ya no está activa."), callbackQueryId: callback.id };
    }
    await updateSession(session.id, "SELECT_KIND", payloadFromLeague(league));
    return { ...askMatchKind(chatId, league.title), callbackQueryId: callback.id };
  }

  if (data.startsWith("tg:kind:")) {
    const kind = data.slice("tg:kind:".length) === "CASUAL" ? CompetitiveMatchKind.CASUAL : CompetitiveMatchKind.LEAGUE;
    const nextPayload = { ...payload, kind };
    await updateSession(session.id, "SELECT_RIVAL", nextPayload);
    return { ...(await askRival(chatId, nextPayload)), callbackQueryId: callback.id };
  }

  if (data.startsWith("tg:rival:")) {
    const registrationId = data.slice("tg:rival:".length);
    const rival = await findRivalRegistration(payload.eventId, registrationId, linked.userId);
    if (!rival) {
      return { ...singleMessage(chatId, "No encuentro ese rival entre los participantes activos."), callbackQueryId: callback.id };
    }
    const nextPayload: SessionPayload = {
      ...payload,
      rivalRegistrationId: rival.id,
      rivalUserId: rival.userId,
      rivalName: rival.playerName,
    };
    const rivalFaction = canonicalFactionFromStoredValue(rival.factionLabel, nextPayload);
    if (rivalFaction) nextPayload.rivalFaction = rivalFaction;
    return { ...(await continueAfterRivalSelected(session.id, chatId, nextPayload)), callbackQueryId: callback.id };
  }

  if (data.startsWith("tg:pf:")) {
    const faction = canonicalFactionFromStoredValue(data.slice("tg:pf:".length), payload);
    if (!faction) {
      return { ...singleMessage(chatId, factionValidationMessage(payload, "tu facción/lista"), cancelKeyboard()), callbackQueryId: callback.id };
    }
    const nextPayload = { ...payload, playerFaction: faction };
    return { ...(await continueAfterPlayerFaction(session.id, chatId, nextPayload)), callbackQueryId: callback.id };
  }

  if (data.startsWith("tg:rf:")) {
    const faction = canonicalFactionFromStoredValue(data.slice("tg:rf:".length), payload);
    if (!faction) {
      return { ...singleMessage(chatId, factionValidationMessage(payload, "la facción/lista del rival"), cancelKeyboard()), callbackQueryId: callback.id };
    }
    const nextPayload = { ...payload, rivalFaction: faction };
    return { ...(await continueAfterRivalFaction(session.id, chatId, nextPayload)), callbackQueryId: callback.id };
  }

  if (data.startsWith("tg:out:")) {
    const outcome = parseOutcomeCode(data.slice("tg:out:".length));
    const nextPayload = { ...payload, outcome };
    if (payload.returnToConfirm && payload.playerScore != null && payload.rivalScore != null && payload.playedAt) {
      return { ...(await continueAfterDate(session.id, chatId, { ...nextPayload, returnToConfirm: undefined })), callbackQueryId: callback.id };
    }
    await updateSession(session.id, "PLAYER_SCORE", nextPayload);
    return { ...singleMessage(chatId, "Indica tus puntos de partida. No asumo un sistema concreto, así que solo necesito un número entero no negativo.", cancelKeyboard()), callbackQueryId: callback.id };
  }

  if (data === "tg:date:today") {
    const nextPayload = { ...payload, playedAt: todayIsoDate(), returnToConfirm: undefined };
    return { ...(await continueAfterDate(session.id, chatId, nextPayload)), callbackQueryId: callback.id };
  }

  if (data === "tg:confirm") {
    return { ...(await confirmGuidedReport(session, linked, chatId)), callbackQueryId: callback.id };
  }

  return { ...singleMessage(chatId, "No he podido interpretar esa acción. Usa /resultado para empezar de nuevo."), callbackQueryId: callback.id };
}

async function handleSessionText(
  session: Awaited<ReturnType<typeof getActiveSession>> extends infer T ? NonNullable<T> : never,
  text: string,
  chatId: number | string,
): Promise<TelegramUpdateResult> {
  const payload = parseSessionPayload(session.payload);

  if (session.step === "SELECT_RIVAL") {
    const rival = await findRivalRegistrationByName(payload.eventId, text, session.userId);
    if (!rival) {
      return singleMessage(chatId, "No he encontrado ese rival entre los participantes activos. Escribe otro nombre o usa uno de los botones.");
    }
    const nextPayload: SessionPayload = {
      ...payload,
      rivalRegistrationId: rival.id,
      rivalUserId: rival.userId,
      rivalName: rival.playerName,
    };
    const rivalFaction = canonicalFactionFromStoredValue(rival.factionLabel, nextPayload);
    if (rivalFaction) nextPayload.rivalFaction = rivalFaction;
    return continueAfterRivalSelected(session.id, chatId, nextPayload);
  }

  if (session.step === "PLAYER_FACTION") {
    const faction = parseFactionFromUserText(text, payload);
    if (!faction) return singleMessage(chatId, factionValidationMessage(payload, "tu facción/lista"), cancelKeyboard());
    return continueAfterPlayerFaction(session.id, chatId, { ...payload, playerFaction: faction });
  }

  if (session.step === "RIVAL_FACTION") {
    const faction = parseFactionFromUserText(text, payload);
    if (!faction) return singleMessage(chatId, factionValidationMessage(payload, "la facción/lista del rival"), cancelKeyboard());
    return continueAfterRivalFaction(session.id, chatId, { ...payload, rivalFaction: faction });
  }

  if (session.step === "PLAYER_SCORE") {
    const score = parseScore(text, "tus puntos");
    if (score == null) return singleMessage(chatId, "Los puntos deben ser un entero no negativo. Ejemplo: 17", cancelKeyboard());
    await updateSession(session.id, "RIVAL_SCORE", { ...payload, playerScore: score });
    return singleMessage(chatId, "Indica los puntos del rival.", cancelKeyboard());
  }

  if (session.step === "RIVAL_SCORE") {
    const score = parseScore(text, "los puntos del rival");
    if (score == null) return singleMessage(chatId, "Los puntos del rival deben ser un entero no negativo. Ejemplo: 3", cancelKeyboard());
    const nextPayload = { ...payload, rivalScore: score };
    if (payload.returnToConfirm && payload.playedAt) {
      return continueAfterDate(session.id, chatId, { ...nextPayload, returnToConfirm: undefined });
    }
    await updateSession(session.id, "DATE", nextPayload);
    return singleMessage(
      chatId,
      "Indica la fecha de la partida en formato AAAA-MM-DD o pulsa Hoy.",
      keyboard([[{ text: "Hoy", data: "tg:date:today" }], [{ text: "Cancelar", data: "tg:cancel" }]])
    );
  }

  if (session.step === "DATE") {
    const playedAt = parsePlayedAt(text);
    if (!playedAt) return singleMessage(chatId, "La fecha debe tener formato AAAA-MM-DD. Ejemplo: 2026-06-16", cancelKeyboard());
    return continueAfterDate(session.id, chatId, { ...payload, playedAt: playedAt.toISOString().slice(0, 10), returnToConfirm: undefined });
  }

  return singleMessage(chatId, "Para continuar usa los botones o escribe /cancelar para empezar de nuevo.");
}

async function continueAfterRivalSelected(sessionId: string, chatId: number | string, payload: SessionPayload) {
  if (payload.playerFaction) {
    return continueAfterPlayerFaction(sessionId, chatId, payload);
  }

  if (payload.playerFaction == null && payload.playerRegistrationId) {
    const registration = await prisma.eventRegistration.findUnique({
      where: { id: payload.playerRegistrationId },
      select: { factionLabel: true },
    });
    const registeredFaction = canonicalFactionFromStoredValue(registration?.factionLabel, payload);
    if (registeredFaction) {
      await updateSession(sessionId, "PLAYER_FACTION", payload);
      return singleMessage(
        chatId,
        factionValidationMessage(payload, "tu facción/lista"),
        keyboard([
          [{ text: `Usar ${registeredFaction}`.slice(0, 60), data: `tg:pf:${registeredFaction.slice(0, 45)}` }],
          [{ text: "Cancelar", data: "tg:cancel" }],
        ])
      );
    }
  }

  await updateSession(sessionId, "PLAYER_FACTION", payload);
  if (factionCatalogForPayload(payload)) {
    return singleMessage(chatId, factionValidationMessage(payload, "tu facción/lista"), cancelKeyboard());
  }
  return singleMessage(chatId, "Indica tu facción/lista para esta partida.", cancelKeyboard());
}

async function continueAfterPlayerFaction(sessionId: string, chatId: number | string, payload: SessionPayload) {
  if (payload.rivalFaction) {
    return continueAfterRivalFaction(sessionId, chatId, payload);
  }

  await updateSession(sessionId, "RIVAL_FACTION", payload);
  if (payload.rivalFaction == null && payload.rivalRegistrationId) {
    const registration = await prisma.eventRegistration.findUnique({
      where: { id: payload.rivalRegistrationId },
      select: { factionLabel: true },
    });
    const registeredFaction = canonicalFactionFromStoredValue(registration?.factionLabel, payload);
    if (registeredFaction) {
      return singleMessage(
        chatId,
        factionValidationMessage(payload, "la facción/lista del rival"),
        keyboard([
          [{ text: `Usar ${registeredFaction}`.slice(0, 60), data: `tg:rf:${registeredFaction.slice(0, 45)}` }],
          [{ text: "Cancelar", data: "tg:cancel" }],
        ])
      );
    }
    if (factionCatalogForPayload(payload)) {
      return singleMessage(chatId, factionValidationMessage(payload, "la facción/lista del rival"), cancelKeyboard());
    }
  }

  return singleMessage(chatId, "Indica la facción/lista del rival.", cancelKeyboard());
}

async function continueAfterRivalFaction(sessionId: string, chatId: number | string, payload: SessionPayload) {
  if (
    payload.returnToConfirm &&
    payload.outcome &&
    payload.playerScore != null &&
    payload.rivalScore != null &&
    payload.playedAt
  ) {
    return continueAfterDate(sessionId, chatId, { ...payload, returnToConfirm: undefined });
  }

  await updateSession(sessionId, "SELECT_OUTCOME", payload);
  return askOutcome(chatId);
}

async function continueAfterDate(sessionId: string, chatId: number | string, payload: SessionPayload) {
  const cleanPayload = { ...payload, returnToConfirm: undefined };
  await updateSession(sessionId, "CONFIRM", cleanPayload);
  return singleMessage(chatId, buildConfirmationText(cleanPayload), await buildConfirmationKeyboard(cleanPayload));
}

async function confirmGuidedReport(
  session: Awaited<ReturnType<typeof getActiveSession>> extends infer T ? NonNullable<T> : never,
  linked: LinkedTelegramAccount,
  chatId: number | string,
) {
  const payload = parseSessionPayload(session.payload);
  const validationError = validateCompletePayload(payload);
  if (validationError) return singleMessage(chatId, validationError);

  const playedAt = parsePlayedAt(payload.playedAt);
  if (!playedAt) return singleMessage(chatId, "La fecha del reporte no es válida. Usa /resultado para empezar de nuevo.");

  const outcome = payload.outcome!;
  const rivalOutcome = outcome === CompetitiveMatchOutcome.WIN
    ? CompetitiveMatchOutcome.LOSS
    : outcome === CompetitiveMatchOutcome.LOSS
      ? CompetitiveMatchOutcome.WIN
      : CompetitiveMatchOutcome.DRAW;

  try {
    const report = await createCompetitiveMatchReport({
      eventId: payload.eventId!,
      gameId: payload.gameId ?? null,
      kind: payload.kind!,
      playedAt,
      channel: CompetitiveMatchReportChannel.TELEGRAM,
      submittedById: linked.userId,
      externalSubmitterId: linked.telegramUserId,
      externalMessageId: `${asChatId(chatId)}:session:${session.id}`,
      notes: null,
      players: [
        {
          userId: payload.playerUserId ?? null,
          displayName: payload.playerName!,
          factionLabel: payload.playerFaction!,
          outcome,
          score: payload.playerScore!,
        },
        {
          userId: payload.rivalUserId ?? null,
          displayName: payload.rivalName!,
          factionLabel: payload.rivalFaction!,
          outcome: rivalOutcome,
          score: payload.rivalScore!,
        },
      ],
    });

    await prisma.telegramBotSession.delete({ where: { id: session.id } });
    const [first, second] = report.players;
    return singleMessage(
      chatId,
      [
        "Reporte recibido.",
        "Queda pendiente de revisión por organización.",
        "",
        `${first.displayName} (${first.factionLabel}) ${first.score} - ${second.score} ${second.displayName} (${second.factionLabel})`,
      ].join("\n")
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      await prisma.telegramBotSession.delete({ where: { id: session.id } }).catch(() => null);
      return singleMessage(chatId, "Este reporte ya se había recibido. No he creado un duplicado.");
    }
    return singleMessage(chatId, error instanceof Error ? error.message : "No se pudo guardar el reporte.");
  }
}

function buildConfirmationText(payload: SessionPayload) {
  const kindLabel = payload.kind === CompetitiveMatchKind.LEAGUE ? "Partida de liga" : "Pachanga registrada";
  const outcomeLabel =
    payload.outcome === CompetitiveMatchOutcome.WIN ? "Victoria" :
    payload.outcome === CompetitiveMatchOutcome.DRAW ? "Empate" :
    "Derrota";

  return [
    "Revisa el reporte antes de enviarlo:",
    "",
    `Marco: ${payload.eventTitle}`,
    `Tipo: ${kindLabel}`,
    `Fecha: ${payload.playedAt ? formatDateEs(payload.playedAt) : "-"}`,
    `Tú: ${payload.playerName} | ${payload.playerFaction} | ${outcomeLabel} | ${payload.playerScore}`,
    `Rival: ${payload.rivalName} | ${payload.rivalFaction} | ${payload.rivalScore}`,
    "",
    "¿Enviar para revisión?",
  ].join("\n");
}

async function buildConfirmationKeyboard(payload: SessionPayload) {
  const rows: Array<Array<{ text: string; data: string }>> = [
    [{ text: "Confirmar", data: "tg:confirm" }],
    [
      { text: "Cambiar rival", data: "tg:edit:rival" },
      { text: "Cambiar facciones", data: "tg:edit:factions" },
    ],
    [
      { text: "Cambiar resultado", data: "tg:edit:outcome" },
      { text: "Cambiar puntos", data: "tg:edit:scores" },
    ],
    [{ text: "Cambiar fecha", data: "tg:edit:date" }],
  ];

  if (payload.playerUserId) {
    const leagues = await listLeagueOptionsForUser(payload.playerUserId);
    if (leagues.length > 1) {
      rows.push([{ text: "Cambiar liga", data: "tg:edit:event" }]);
    }
  }

  rows.push([{ text: "Empezar de nuevo", data: "tg:restart" }]);
  rows.push([{ text: "Cancelar", data: "tg:cancel" }]);

  return keyboard(rows);
}

function validateCompletePayload(payload: SessionPayload) {
  if (!payload.eventId || !payload.eventTitle) return "Falta la liga o evento.";
  if (!payload.kind) return "Falta el tipo de partida.";
  if (!payload.playerName || !payload.rivalName) return "Faltan jugadores.";
  if (!payload.playerFaction || !payload.rivalFaction) return "Faltan facciones/listas.";
  if (!payload.outcome) return "Falta el resultado.";
  if (payload.playerScore == null || payload.rivalScore == null) return "Faltan puntos.";
  if (!payload.playedAt) return "Falta la fecha.";
  return null;
}

async function askRival(chatId: number | string, payload: SessionPayload): Promise<TelegramUpdateResult> {
  const rivals = await listRivalRegistrations(payload.eventId, payload.playerUserId ?? null);
  if (rivals.length === 0) {
    return singleMessage(chatId, "No encuentro rivales activos en esa liga o evento.");
  }

  const rows = rivals.slice(0, 20).map((rival) => [{ text: playerLabel(rival).slice(0, 60), data: `tg:rival:${rival.id}` }]);
  rows.push([{ text: "Cancelar", data: "tg:cancel" }]);

  return singleMessage(chatId, "Elige el rival. También puedes escribir su nombre.", keyboard(rows));
}

function askMatchKind(chatId: number | string, eventTitle: string): TelegramUpdateResult {
  return singleMessage(
    chatId,
    `Marco seleccionado: ${eventTitle}\n\n¿La partida cuenta para la clasificación de liga?`,
    keyboard([
      [{ text: "Sí, partida de liga", data: "tg:kind:LEAGUE" }],
      [{ text: "No, pachanga registrada", data: "tg:kind:CASUAL" }],
      [{ text: "Cancelar", data: "tg:cancel" }],
    ])
  );
}

async function getLinkedAccount(user?: TelegramUser): Promise<LinkedTelegramAccount | null> {
  if (!user?.id) return null;
  const account = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: TELEGRAM_PROVIDER,
        providerAccountId: String(user.id),
      },
    },
    select: { userId: true, providerAccountId: true },
  });
  return account ? { userId: account.userId, telegramUserId: account.providerAccountId } : null;
}

async function listLeagueOptionsForUser(userId: number): Promise<LeagueOption[]> {
  const now = new Date();
  const registrations = await prisma.eventRegistration.findMany({
    where: {
      userId,
      status: { in: ACTIVE_REGISTRATION_STATUSES },
      event: {
        type: EventType.LEAGUE,
        status: { notIn: [EventStatus.DRAFT, EventStatus.FINALIZED, EventStatus.CANCELLED, EventStatus.POSTPONED] },
        endsAt: { gte: now },
      },
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          gameId: true,
          startsAt: true,
          endsAt: true,
          game: { select: { slug: true, name: true, legacyEnumKey: true } },
        },
      },
    },
    orderBy: [{ event: { startsAt: "asc" } }, { registeredAt: "asc" }],
  });

  return registrations.map((registration) => ({
    id: registration.event.id,
    title: registration.event.title,
    gameId: registration.event.gameId,
    gameSlug: registration.event.game?.slug ?? null,
    gameName: registration.event.game?.name ?? null,
    gameLegacyEnumKey: registration.event.game?.legacyEnumKey ?? null,
    startsAt: registration.event.startsAt,
    endsAt: registration.event.endsAt,
    registration: {
      id: registration.id,
      userId: registration.userId,
      playerName: registration.playerName,
      factionLabel: registration.factionLabel,
    },
  }));
}

async function findLeagueOptionForUser(userId: number, eventId: string) {
  return (await listLeagueOptionsForUser(userId)).find((event) => event.id === eventId) ?? null;
}

function payloadFromLeague(league: LeagueOption): SessionPayload {
  const payload: SessionPayload = {
    eventId: league.id,
    eventTitle: league.title,
    gameId: league.gameId,
    gameSlug: league.gameSlug,
    gameName: league.gameName,
    gameLegacyEnumKey: league.gameLegacyEnumKey,
    playerRegistrationId: league.registration.id,
    playerUserId: league.registration.userId,
    playerName: league.registration.playerName,
  };
  const faction = canonicalFactionFromStoredValue(league.registration.factionLabel, payload);
  if (faction) payload.playerFaction = faction;
  return payload;
}

async function listRivalRegistrations(eventId: string | undefined, playerUserId: number | null): Promise<RegistrationOption[]> {
  if (!eventId) return [];
  const rivals = await prisma.eventRegistration.findMany({
    where: {
      eventId,
      status: { in: ACTIVE_REGISTRATION_STATUSES },
      userId: playerUserId == null ? undefined : { not: playerUserId },
    },
    orderBy: [{ status: "asc" }, { playerName: "asc" }],
    select: { id: true, userId: true, playerName: true, factionLabel: true },
  });
  return rivals;
}

async function findRivalRegistration(eventId: string | undefined, registrationId: string, playerUserId: number) {
  if (!eventId) return null;
  return prisma.eventRegistration.findFirst({
    where: {
      id: registrationId,
      eventId,
      status: { in: ACTIVE_REGISTRATION_STATUSES },
      userId: { not: playerUserId },
    },
    select: { id: true, userId: true, playerName: true, factionLabel: true },
  });
}

async function findRivalRegistrationByName(eventId: string | undefined, name: string, playerUserId: number) {
  const normalized = normalizeForSearch(name);
  if (!normalized) return null;
  const rivals = await listRivalRegistrations(eventId, playerUserId);
  const exact = rivals.find((rival) => normalizeForSearch(rival.playerName) === normalized);
  if (exact) return exact;
  const partial = rivals.filter((rival) => normalizeForSearch(rival.playerName).includes(normalized));
  return partial.length === 1 ? partial[0] : null;
}

function normalizeForSearch(value: string | null | undefined) {
  return normalizeText(value)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase() ?? "";
}

async function upsertSession(linked: LinkedTelegramAccount, chatId: number | string, step: BotStep, payload: SessionPayload) {
  return prisma.telegramBotSession.upsert({
    where: { telegramUserId_chatId: { telegramUserId: linked.telegramUserId, chatId: asChatId(chatId) } },
    update: { step, payload: payload as Prisma.InputJsonObject, expiresAt: sessionExpiresAt() },
    create: {
      telegramUserId: linked.telegramUserId,
      chatId: asChatId(chatId),
      userId: linked.userId,
      step,
      payload: payload as Prisma.InputJsonObject,
      expiresAt: sessionExpiresAt(),
    },
  });
}

async function updateSession(sessionId: string, step: BotStep, payload: SessionPayload) {
  return prisma.telegramBotSession.update({
    where: { id: sessionId },
    data: { step, payload: payload as Prisma.InputJsonObject, expiresAt: sessionExpiresAt() },
  });
}

async function getActiveSession(linked: LinkedTelegramAccount, chatId: number | string) {
  const session = await prisma.telegramBotSession.findUnique({
    where: { telegramUserId_chatId: { telegramUserId: linked.telegramUserId, chatId: asChatId(chatId) } },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.telegramBotSession.delete({ where: { id: session.id } }).catch(() => null);
    return null;
  }
  return session;
}

async function deleteSession(telegramUserId: number | undefined, chatId: number | string) {
  if (!telegramUserId) return;
  await prisma.telegramBotSession.deleteMany({ where: { telegramUserId: String(telegramUserId), chatId: asChatId(chatId) } });
}

async function deleteSessionByLinkedAccount(linked: LinkedTelegramAccount, chatId: number | string) {
  await prisma.telegramBotSession.deleteMany({ where: { telegramUserId: linked.telegramUserId, chatId: asChatId(chatId) } });
}

async function handleQuickResultCommand(
  text: string,
  message: TelegramMessage,
  linked: LinkedTelegramAccount,
): Promise<TelegramUpdateResult> {
  let parsed: ParsedResultCommand;
  try {
    parsed = parseResultCommand(text);
  } catch (error) {
    return singleMessage(message.chat.id, `${error instanceof Error ? error.message : "No se pudo interpretar el resultado."}\n\n${HELP_TEXT}`);
  }

  if (!parsed.eventRef) {
    return singleMessage(message.chat.id, "El modo rápido necesita `evento: <id o slug>`. Las partidas del bot deben registrarse dentro de una liga o evento.");
  }

  const event = await prisma.event.findUnique({
    where: { id: extractEventIdFromSlug(parsed.eventRef) },
    select: {
      id: true,
      title: true,
      gameId: true,
      game: { select: { slug: true, name: true, legacyEnumKey: true } },
    },
  });

  if (!event) {
    return singleMessage(message.chat.id, "No encuentro ese evento o liga.");
  }

  const registration = await prisma.eventRegistration.findFirst({
    where: {
      eventId: event.id,
      userId: linked.userId,
      status: { in: ACTIVE_REGISTRATION_STATUSES },
    },
  });
  if (!registration) {
    return singleMessage(message.chat.id, "Solo puedes reportar partidas en ligas o eventos donde estés inscrito o pagado.");
  }

  const factionError = validateQuickResultFactions(parsed, {
    gameSlug: event.game?.slug ?? null,
    gameName: event.game?.name ?? null,
    gameLegacyEnumKey: event.game?.legacyEnumKey ?? null,
  });
  if (factionError) {
    return singleMessage(message.chat.id, factionError);
  }

  const externalMessageId = `${message.chat.id}:${message.message_id}`;

  try {
    const report = await createCompetitiveMatchReport({
      eventId: event.id,
      gameId: event.gameId,
      kind: parsed.kind,
      playedAt: parsed.playedAt,
      roundNumber: parsed.roundNumber,
      channel: CompetitiveMatchReportChannel.TELEGRAM,
      submittedById: linked.userId,
      externalSubmitterId: linked.telegramUserId,
      externalMessageId,
      notes: parsed.notes,
      players: parsed.players,
    });

    const [first, second] = report.players;
    return singleMessage(
      message.chat.id,
      [
        `Reporte recibido para ${event.title}.`,
        "Queda pendiente de revisión por organización.",
        "",
        `${first.displayName} (${first.factionLabel}) ${first.score} - ${second.score} ${second.displayName} (${second.factionLabel})`,
      ].join("\n")
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return singleMessage(message.chat.id, "Este mensaje ya se había recibido. No he creado un reporte duplicado.");
    }
    return singleMessage(message.chat.id, error instanceof Error ? error.message : "No se pudo guardar el reporte.");
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
  if (!playedAt) throw new Error("La fecha es obligatoria.");
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

function validateQuickResultFactions(
  parsed: ParsedResultCommand,
  payload: Pick<SessionPayload, "gameSlug" | "gameName" | "gameLegacyEnumKey">,
) {
  const catalog = factionCatalogForPayload(payload);
  if (!catalog) return null;

  for (const player of parsed.players) {
    const faction = catalog.find((entry) => entry.name === player.factionLabel);
    if (!faction) {
      return [
        `La facción de ${player.displayName} debe coincidir con el catálogo de ${gameNameForPayload(payload)}.`,
        "Usa uno de estos nombres exactos:",
        "",
        formatFactionCatalog(payload) ?? "",
      ].join("\n");
    }
    player.factionLabel = faction.name;
  }

  return null;
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
  if (!normalized) return null;

  const isoDay = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = isoDay ? new Date(`${normalized}T12:00:00.000Z`) : new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
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

  const score = parseScore(parts[3], `los puntos de ${label}`);
  if (score == null) {
    throw new Error(`Los puntos de ${label} deben ser un entero no negativo.`);
  }

  return {
    displayName: parts[0],
    factionLabel: parts[1],
    outcome: parseOutcome(parts[2]),
    score,
  };
}

function parseScore(value: string, _field: string) {
  const score = Number(value.trim());
  return Number.isInteger(score) && score >= 0 ? score : null;
}

function parseOutcome(value: string) {
  const normalized = value.trim().toLowerCase();
  if (["victoria", "win", "ganada", "gana"].includes(normalized)) return CompetitiveMatchOutcome.WIN;
  if (["empate", "draw", "empatada"].includes(normalized)) return CompetitiveMatchOutcome.DRAW;
  if (["derrota", "loss", "perdida", "pierde"].includes(normalized)) return CompetitiveMatchOutcome.LOSS;
  throw new Error("El resultado debe ser victoria, empate o derrota.");
}

function parseOutcomeCode(value: string) {
  if (value === "WIN") return CompetitiveMatchOutcome.WIN;
  if (value === "DRAW") return CompetitiveMatchOutcome.DRAW;
  if (value === "LOSS") return CompetitiveMatchOutcome.LOSS;
  throw new Error("Resultado no válido.");
}
