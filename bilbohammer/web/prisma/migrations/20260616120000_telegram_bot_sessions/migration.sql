CREATE TABLE "TelegramBotSession" (
    "id" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "step" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramBotSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramBotSession_telegramUserId_chatId_key" ON "TelegramBotSession"("telegramUserId", "chatId");
CREATE INDEX "TelegramBotSession_userId_idx" ON "TelegramBotSession"("userId");
CREATE INDEX "TelegramBotSession_expiresAt_idx" ON "TelegramBotSession"("expiresAt");

ALTER TABLE "TelegramBotSession"
ADD CONSTRAINT "TelegramBotSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
