-- AlterEnum
ALTER TYPE "UserNotificationType" ADD VALUE 'COMPETITIVE_REPORT_PENDING';
ALTER TYPE "UserNotificationType" ADD VALUE 'COMPETITIVE_REPORT_APPROVED';
ALTER TYPE "UserNotificationType" ADD VALUE 'COMPETITIVE_REPORT_REJECTED';

-- AlterTable
ALTER TABLE "UserNotificationPreference"
ADD COLUMN "competitivePendingInApp" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "competitivePendingEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "competitivePendingPush" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "competitiveApprovedInApp" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "competitiveApprovedEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "competitiveApprovedPush" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "competitiveRejectedInApp" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "competitiveRejectedEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "competitiveRejectedPush" BOOLEAN NOT NULL DEFAULT true;
