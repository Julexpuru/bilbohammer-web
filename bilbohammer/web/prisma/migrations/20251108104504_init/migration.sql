/*
  Warnings:

  - Made the column `createdAt` on table `UserChangeLog` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."UserChangeLog_createdAt_idx";

-- DropIndex
DROP INDEX "public"."UserGame_gameId_idx";

-- AlterTable
ALTER TABLE "public"."Game" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."SiteContent" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."UserChangeLog" ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "UserChangeLog_createdAt_idx" ON "public"."UserChangeLog"("createdAt");
