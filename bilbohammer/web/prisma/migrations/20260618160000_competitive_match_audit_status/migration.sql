-- CreateEnum
CREATE TYPE "CompetitiveMatchStatus" AS ENUM ('APPROVED', 'VOIDED');

-- CreateEnum
CREATE TYPE "CompetitiveMatchAuditAction" AS ENUM ('UPDATED', 'VOIDED');

-- AlterTable
ALTER TABLE "CompetitiveMatch"
ADD COLUMN "status" "CompetitiveMatchStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN "voidedById" INTEGER,
ADD COLUMN "voidedAt" TIMESTAMP(3),
ADD COLUMN "voidReason" TEXT;

-- CreateTable
CREATE TABLE "CompetitiveMatchAuditLog" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "actorId" INTEGER,
    "action" "CompetitiveMatchAuditAction" NOT NULL,
    "reason" TEXT,
    "previousData" JSONB,
    "nextData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitiveMatchAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetitiveMatch_eventId_status_idx" ON "CompetitiveMatch"("eventId", "status");

-- CreateIndex
CREATE INDEX "CompetitiveMatchAuditLog_matchId_createdAt_idx" ON "CompetitiveMatchAuditLog"("matchId", "createdAt");

-- CreateIndex
CREATE INDEX "CompetitiveMatchAuditLog_actorId_idx" ON "CompetitiveMatchAuditLog"("actorId");

-- AddForeignKey
ALTER TABLE "CompetitiveMatch" ADD CONSTRAINT "CompetitiveMatch_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitiveMatchAuditLog" ADD CONSTRAINT "CompetitiveMatchAuditLog_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "CompetitiveMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitiveMatchAuditLog" ADD CONSTRAINT "CompetitiveMatchAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
