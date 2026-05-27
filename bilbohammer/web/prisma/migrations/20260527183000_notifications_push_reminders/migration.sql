ALTER TYPE "UserNotificationType" ADD VALUE IF NOT EXISTS 'MATCH_REMINDER';
ALTER TYPE "UserNotificationType" ADD VALUE IF NOT EXISTS 'COMPATIBLE_SLOT_CREATED';

ALTER TABLE "UserNotification"
ADD COLUMN "dedupeKey" TEXT;

CREATE UNIQUE INDEX "UserNotification_dedupeKey_key" ON "UserNotification"("dedupeKey");

ALTER TABLE "UserNotificationPreference"
ADD COLUMN "proposalReceivedPush" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "proposalAcceptedPush" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "proposalRejectedPush" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "proposalSupersededPush" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "matchReminderInApp" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "matchReminderEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "matchReminderPush" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "matchReminderMinutes" INTEGER NOT NULL DEFAULT 1440,
ADD COLUMN "compatibleSlotInApp" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "compatibleSlotEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "compatibleSlotPush" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "UserPushSubscription" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),

  CONSTRAINT "UserPushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPushSubscription_endpoint_key" ON "UserPushSubscription"("endpoint");
CREATE INDEX "UserPushSubscription_userId_revokedAt_idx" ON "UserPushSubscription"("userId", "revokedAt");

ALTER TABLE "UserPushSubscription"
ADD CONSTRAINT "UserPushSubscription_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
