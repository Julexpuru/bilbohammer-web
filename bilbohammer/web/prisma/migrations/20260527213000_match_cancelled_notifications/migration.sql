ALTER TYPE "UserNotificationType" ADD VALUE 'MATCH_CANCELLED';

ALTER TABLE "UserNotificationPreference"
ADD COLUMN "matchCancelledInApp" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "matchCancelledEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "matchCancelledPush" BOOLEAN NOT NULL DEFAULT true;
