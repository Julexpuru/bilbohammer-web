
-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'FINALIZED', 'POSTPONED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('SOCIAL', 'TOURNAMENT', 'LEAGUE', 'WORKSHOP', 'OTHER');

-- CreateEnum
CREATE TYPE "EventHighlightType" AS ENUM ('FIRST', 'SECOND', 'THIRD', 'AWARD');

-- AlterTable
ALTER TABLE "Event"
  ADD COLUMN     "albumId" TEXT,
  ADD COLUMN     "bannerUrl" TEXT,
  ADD COLUMN     "capacityCurrent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN     "capacityMax" INTEGER,
  ADD COLUMN     "game" "Juego",
  ADD COLUMN     "isInternal" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN     "isMembersOnly" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN     "latitude" DOUBLE PRECISION,
  ADD COLUMN     "longitude" DOUBLE PRECISION,
  ADD COLUMN     "mapsUrl" TEXT,
  ADD COLUMN     "priceGeneral" DECIMAL(10, 2),
  ADD COLUMN     "priceSocios" DECIMAL(10, 2),
  ADD COLUMN     "recap" TEXT,
  ADD COLUMN     "showAttachments" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN     "showDescription" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN     "showGallery" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN     "showLinks" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN     "showLocation" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN     "showRecap" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN     "showStandings" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN     "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN     "type" "EventType" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Event"
  ALTER COLUMN "details" TYPE TEXT;

-- AlterTable
ALTER TABLE "GalleryImage"
  ADD COLUMN     "eventId" TEXT;

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isClub" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventOrganization" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventOrganizer" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventOrganizer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTag" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventAttachment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventLink" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventHighlight" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "EventHighlightType" NOT NULL,
    "title" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "playerId" INTEGER,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRankingEntry" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "playerName" TEXT NOT NULL,
    "playerId" INTEGER,
    "score" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRankingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EventOrganization_eventId_organizationId_key" ON "EventOrganization"("eventId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "EventOrganizer_eventId_userId_key" ON "EventOrganizer"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventTag_eventId_label_key" ON "EventTag"("eventId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "EventRankingEntry_eventId_position_key" ON "EventRankingEntry"("eventId", "position");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "GalleryAlbum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOrganization" ADD CONSTRAINT "EventOrganization_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOrganization" ADD CONSTRAINT "EventOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOrganizer" ADD CONSTRAINT "EventOrganizer_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOrganizer" ADD CONSTRAINT "EventOrganizer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTag" ADD CONSTRAINT "EventTag_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttachment" ADD CONSTRAINT "EventAttachment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLink" ADD CONSTRAINT "EventLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventHighlight" ADD CONSTRAINT "EventHighlight_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventHighlight" ADD CONSTRAINT "EventHighlight_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRankingEntry" ADD CONSTRAINT "EventRankingEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRankingEntry" ADD CONSTRAINT "EventRankingEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryImage" ADD CONSTRAINT "GalleryImage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
