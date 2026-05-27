CREATE TYPE "UserNotificationType" AS ENUM (
  'SLOT_PROPOSAL_RECEIVED',
  'SLOT_PROPOSAL_ACCEPTED',
  'SLOT_PROPOSAL_REJECTED',
  'SLOT_PROPOSAL_SUPERSEDED'
);

CREATE TYPE "UserNotificationChannel" AS ENUM (
  'EMAIL',
  'PUSH'
);

CREATE TYPE "UserNotificationDeliveryStatus" AS ENUM (
  'SENT',
  'FAILED',
  'SKIPPED'
);

CREATE TABLE "UserNotification" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "type" "UserNotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "linkUrl" TEXT,
  "metadata" JSONB,
  "actorUserId" INTEGER,
  "visibleInApp" BOOLEAN NOT NULL DEFAULT true,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserNotificationDelivery" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "channel" "UserNotificationChannel" NOT NULL,
  "status" "UserNotificationDeliveryStatus" NOT NULL,
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserNotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserNotificationPreference" (
  "userId" INTEGER NOT NULL,
  "proposalReceivedInApp" BOOLEAN NOT NULL DEFAULT true,
  "proposalReceivedEmail" BOOLEAN NOT NULL DEFAULT false,
  "proposalAcceptedInApp" BOOLEAN NOT NULL DEFAULT true,
  "proposalAcceptedEmail" BOOLEAN NOT NULL DEFAULT false,
  "proposalRejectedInApp" BOOLEAN NOT NULL DEFAULT true,
  "proposalRejectedEmail" BOOLEAN NOT NULL DEFAULT false,
  "proposalSupersededInApp" BOOLEAN NOT NULL DEFAULT true,
  "proposalSupersededEmail" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("userId")
);

CREATE INDEX "UserNotification_userId_createdAt_idx" ON "UserNotification"("userId", "createdAt");
CREATE INDEX "UserNotification_userId_visibleInApp_readAt_idx" ON "UserNotification"("userId", "visibleInApp", "readAt");
CREATE INDEX "UserNotificationDelivery_channel_status_idx" ON "UserNotificationDelivery"("channel", "status");

CREATE UNIQUE INDEX "UserNotificationDelivery_notificationId_channel_key" ON "UserNotificationDelivery"("notificationId", "channel");

ALTER TABLE "UserNotification"
ADD CONSTRAINT "UserNotification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserNotification"
ADD CONSTRAINT "UserNotification_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserNotificationDelivery"
ADD CONSTRAINT "UserNotificationDelivery_notificationId_fkey"
FOREIGN KEY ("notificationId") REFERENCES "UserNotification"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserNotificationPreference"
ADD CONSTRAINT "UserNotificationPreference_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
