/*
  Warnings:

  - A unique constraint covering the columns `[albumId]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX IF EXISTS "public"."UserGame_gameId_idx";

-- AlterTable
ALTER TABLE "public"."Event" ALTER COLUMN "capacityCurrent" DROP NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."EventAttachment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."EventHighlight" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."EventLink" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."EventRankingEntry" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
DO $$
BEGIN
  IF to_regclass('public."Game"') IS NOT NULL THEN
    ALTER TABLE "public"."Game"
      ADD COLUMN IF NOT EXISTS "heroImagePath" TEXT,
      ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END
$$;

-- AlterTable
ALTER TABLE "public"."Organization" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "public"."GameInfo" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "investment" TEXT NOT NULL DEFAULT '',
    "playtime" TEXT NOT NULL DEFAULT '',
    "learning" TEXT NOT NULL DEFAULT 'Media',
    "contactUserId" INTEGER,
    "contactNote" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameInfo_gameId_key" ON "public"."GameInfo"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_albumId_key" ON "public"."Event"("albumId");

-- AddForeignKey
ALTER TABLE "public"."GameInfo" ADD CONSTRAINT "GameInfo_contactUserId_fkey" FOREIGN KEY ("contactUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DO $$
BEGIN
  IF to_regclass('public."Game"') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'GameInfo_gameId_fkey'
    ) THEN
      ALTER TABLE "public"."GameInfo"
        ADD CONSTRAINT "GameInfo_gameId_fkey"
        FOREIGN KEY ("gameId")
        REFERENCES "public"."Game"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;
  END IF;
END
$$;
