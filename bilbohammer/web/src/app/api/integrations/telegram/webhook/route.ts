import { NextResponse } from "next/server";

import {
  answerTelegramCallbackQuery,
  handleTelegramUpdate,
  sendTelegramMessage,
  validateTelegramWebhookSecret,
  type TelegramUpdate,
} from "@/lib/telegram-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secretValidation = validateTelegramWebhookSecret(request.headers);
  if (!secretValidation.ok) {
    return NextResponse.json({ error: secretValidation.error }, { status: secretValidation.status });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Cuerpo de webhook inválido." }, { status: 400 });
  }

  try {
    const result = await handleTelegramUpdate(update);
    if (result.callbackQueryId) {
      await answerTelegramCallbackQuery(result.callbackQueryId);
    }
    for (const message of result.messages) {
      await sendTelegramMessage(message);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[telegram] webhook failed", error);
    return NextResponse.json({ error: "No se pudo procesar el webhook de Telegram." }, { status: 500 });
  }
}
