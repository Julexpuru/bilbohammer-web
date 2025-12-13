-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Rol" AS ENUM ('ADMIN', 'JUNTA', 'REDACTOR', 'SOCIO', 'AMIGO');

-- CreateEnum
CREATE TYPE "public"."PostType" AS ENUM ('ANUNCIO', 'EVENTO', 'NOTICIA_PRIVADA');

-- CreateEnum
CREATE TYPE "public"."EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'FINALIZED', 'POSTPONED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('SOCIAL', 'TOURNAMENT', 'LEAGUE', 'WORKSHOP', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."EventHighlightType" AS ENUM ('FIRST', 'SECOND', 'THIRD', 'AWARD');

-- CreateEnum
CREATE TYPE "public"."TableStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'IN_PLAY', 'BLOCKED');

-- CreateEnum
CREATE TYPE "public"."ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PLAY', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."MatchStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PLAY', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."SlotStatus" AS ENUM ('OPEN', 'MATCHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ParticipantRole" AS ENUM ('HOST', 'GUEST', 'STAFF');

-- CreateEnum
CREATE TYPE "public"."ParticipantStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED');

-- CreateEnum
CREATE TYPE "public"."FaccionesW40K" AS ENUM ('ADEPTA_SORORITAS', 'ADEPTUS_CUSTODES', 'ADEPTUS_MECHANICUS', 'AELDARI', 'ASTRA_MILITARUM', 'BLACK_TEMPLARS', 'BLOOD_ANGELS', 'CHAOS_DAEMONS', 'CHAOS_KNIGHTS', 'CHAOS_MARINES', 'DARK_ANGELS', 'DEATHWATCH', 'DEATH_GUARD', 'DRUKHARI', 'EMPERORS_CHILDREN', 'GENESTEALER_CULTS', 'GREY_KNIGHTS', 'IMPERIAL_AGENTS', 'IMPERIAL_KNIGHTS', 'LEAGUES_OF_VOTANN', 'NECRONS', 'ORKS', 'SPACE_MARINES', 'SPACE_WOLVES', 'TAU', 'THOUSAND_SONS', 'TYRANIDS', 'WORLD_EATERS');

-- CreateEnum
CREATE TYPE "public"."FaccionesAoS" AS ENUM ('BLADESOFKHORNE', 'CITIESOFSIGMAR', 'DAUGHTERSOFKHAINE', 'DISCIPLESOFTZEENCH', 'FLESHEATERS', 'FYRESLAYERS', 'GLOOMSPITE', 'HEDONITESOFSLAANESH', 'HELMSMITHS_OF_HASHUT', 'IDONETH', 'IRONJAWZ', 'KHARADRON', 'KRULEBOYZ', 'LUMINETH', 'MAGGOTKINOFNURGLE', 'NIGHTHAUNT', 'OGORS', 'OSSIARCHBONERIPPERS', 'SERAPHON', 'SKAVEN', 'SLAVESTODARKNESS', 'SONSOFBEHEMATH', 'SOULBLIGHT', 'STORMCAST', 'SYLVANETH');

-- CreateEnum
CREATE TYPE "public"."FaccionesTOW" AS ENUM ('BEASTMEN', 'BRETONNIA', 'CATHAY', 'CHAOSDWARVES', 'CHAOSDAEMONS', 'DARKELVES', 'DWARVES', 'EMPIRE', 'GREENSKINS', 'HIGHELVES', 'KHEMRI', 'LIZARDMEN', 'OGRES', 'SKAVEN', 'VAMPIRECOUNTS', 'WARRIORSOFCHAOS', 'WOODELVES');

-- CreateTable
CREATE TABLE "public"."NewsArticle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "banner" TEXT,
    "author" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "primaryCategory" TEXT NOT NULL,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "body" JSONB NOT NULL,
    "comments" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "roles" "public"."Rol"[] DEFAULT ARRAY[]::"public"."Rol"[],
    "nombre" TEXT,
    "nick" TEXT,
    "descripcion" TEXT,
    "etiquetas" TEXT[],
    "avatarUrl" TEXT,
    "oauthAvatarUrl" TEXT,
    "facePhotoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "membershipSince" TIMESTAMP(3),
    "membershipUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "faccionesW40K" "public"."FaccionesW40K"[],
    "faccionesAoS" "public"."FaccionesAoS"[],
    "faccionesTOW" "public"."FaccionesTOW"[],

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Game" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "legacyEnumKey" TEXT,
    "iconImagePath" TEXT,
    "heroImagePath" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserGame" (
    "userId" INTEGER NOT NULL,
    "gameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGame_pkey" PRIMARY KEY ("userId","gameId")
);

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

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."UserChangeLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "adminId" INTEGER,
    "adminEmail" TEXT,
    "changes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "type" "public"."PostType" NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "reactionScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" INTEGER,
    "eventId" TEXT,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bannerUrl" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "mapsUrl" TEXT,
    "details" TEXT,
    "recap" TEXT,
    "status" "public"."EventStatus" NOT NULL DEFAULT 'DRAFT',
    "type" "public"."EventType" NOT NULL DEFAULT 'OTHER',
    "gameId" TEXT,
    "priceGeneral" DECIMAL(10,2),
    "priceSocios" DECIMAL(10,2),
    "capacityMax" INTEGER,
    "capacityCurrent" INTEGER DEFAULT 0,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "isMembersOnly" BOOLEAN NOT NULL DEFAULT false,
    "showDescription" BOOLEAN NOT NULL DEFAULT true,
    "showAttachments" BOOLEAN NOT NULL DEFAULT true,
    "showLinks" BOOLEAN NOT NULL DEFAULT true,
    "showStandings" BOOLEAN NOT NULL DEFAULT true,
    "showRecap" BOOLEAN NOT NULL DEFAULT true,
    "showGallery" BOOLEAN NOT NULL DEFAULT true,
    "showLocation" BOOLEAN NOT NULL DEFAULT true,
    "showTabDescription" BOOLEAN NOT NULL DEFAULT true,
    "showTabResources" BOOLEAN NOT NULL DEFAULT true,
    "showTabClassification" BOOLEAN NOT NULL DEFAULT true,
    "showTabChronicle" BOOLEAN NOT NULL DEFAULT true,
    "showTabGallery" BOOLEAN NOT NULL DEFAULT true,
    "showTabLocation" BOOLEAN NOT NULL DEFAULT true,
    "chronicleArticleId" TEXT,
    "albumId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClubTable" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "posX" INTEGER NOT NULL DEFAULT 0,
    "posY" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL DEFAULT 180,
    "height" INTEGER NOT NULL DEFAULT 120,
    "rotation" INTEGER NOT NULL DEFAULT 0,
    "sizeTag" TEXT,
    "status" "public"."TableStatus" NOT NULL DEFAULT 'AVAILABLE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TableLayout" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "gameId" TEXT,
    "sceneryNotes" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "weekday" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableLayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TableBlock" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "eventId" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TableBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TableReservation" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "status" "public"."ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "matchId" TEXT,
    "createdById" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Match" (
    "id" TEXT NOT NULL,
    "gameId" TEXT,
    "eventId" TEXT,
    "slotId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."MatchStatus" NOT NULL DEFAULT 'PENDING',
    "format" TEXT,
    "notes" TEXT,
    "roundNumber" INTEGER,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MatchParticipant" (
    "matchId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "public"."ParticipantRole" NOT NULL DEFAULT 'HOST',
    "status" "public"."ParticipantStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchParticipant_pkey" PRIMARY KEY ("matchId","userId")
);

-- CreateTable
CREATE TABLE "public"."AvailabilitySlot" (
    "id" TEXT NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "gameId" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "status" "public"."SlotStatus" NOT NULL DEFAULT 'OPEN',
    "level" TEXT,
    "format" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecurringAvailability" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinutes" INTEGER NOT NULL,
    "endMinutes" INTEGER NOT NULL,
    "preferredGames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferencesNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GalleryAlbum" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "displayDate" TEXT,
    "dateISO" TEXT,
    "coverImagePath" TEXT,
    "coverImageAlt" TEXT,
    "totalPhotos" INTEGER NOT NULL DEFAULT 0,
    "facetYear" TEXT NOT NULL,
    "facetGame" TEXT NOT NULL,
    "facetFormat" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryAlbum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GalleryImage" (
    "id" TEXT NOT NULL,
    "albumId" TEXT,
    "uploaderId" INTEGER,
    "storagePath" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "title" TEXT,
    "altText" TEXT,
    "description" TEXT,
    "takenAt" TIMESTAMP(3),
    "location" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "position" INTEGER,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT,

    CONSTRAINT "GalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GalleryAlbumTag" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryAlbumTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GalleryAlbumCollaborator" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryAlbumCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Organization" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isClub" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventOrganization" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventOrganizer" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventOrganizer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventTag" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventAttachment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventLink" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventHighlight" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "public"."EventHighlightType" NOT NULL,
    "title" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "playerId" INTEGER,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventRankingEntry" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "playerName" TEXT NOT NULL,
    "playerId" INTEGER,
    "score" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRankingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SiteContent" (
    "key" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."UserInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" "public"."Rol" NOT NULL DEFAULT 'SOCIO',
    "createdById" INTEGER,
    "usedById" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "UserInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsArticle_slug_key" ON "public"."NewsArticle"("slug");

-- CreateIndex
CREATE INDEX "NewsArticle_primaryCategory_idx" ON "public"."NewsArticle"("primaryCategory");

-- CreateIndex
CREATE INDEX "NewsArticle_date_idx" ON "public"."NewsArticle"("date");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_nick_key" ON "public"."User"("nick");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Game_slug_key" ON "public"."Game"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Game_legacyEnumKey_key" ON "public"."Game"("legacyEnumKey");

-- CreateIndex
CREATE UNIQUE INDEX "GameInfo_gameId_key" ON "public"."GameInfo"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "UserChangeLog_createdAt_idx" ON "public"."UserChangeLog"("createdAt");

-- CreateIndex
CREATE INDEX "UserChangeLog_userId_idx" ON "public"."UserChangeLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_albumId_key" ON "public"."Event"("albumId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubTable_name_key" ON "public"."ClubTable"("name");

-- CreateIndex
CREATE INDEX "TableLayout_tableId_idx" ON "public"."TableLayout"("tableId");

-- CreateIndex
CREATE INDEX "TableLayout_gameId_idx" ON "public"."TableLayout"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "TableLayout_tableId_title_key" ON "public"."TableLayout"("tableId", "title");

-- CreateIndex
CREATE INDEX "TableBlock_tableId_start_end_idx" ON "public"."TableBlock"("tableId", "start", "end");

-- CreateIndex
CREATE INDEX "TableBlock_eventId_idx" ON "public"."TableBlock"("eventId");

-- CreateIndex
CREATE INDEX "TableReservation_tableId_start_end_idx" ON "public"."TableReservation"("tableId", "start", "end");

-- CreateIndex
CREATE INDEX "TableReservation_matchId_idx" ON "public"."TableReservation"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_slotId_key" ON "public"."Match"("slotId");

-- CreateIndex
CREATE INDEX "Match_startsAt_endsAt_idx" ON "public"."Match"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Match_eventId_idx" ON "public"."Match"("eventId");

-- CreateIndex
CREATE INDEX "MatchParticipant_userId_idx" ON "public"."MatchParticipant"("userId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_creatorId_idx" ON "public"."AvailabilitySlot"("creatorId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_start_end_idx" ON "public"."AvailabilitySlot"("start", "end");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_gameId_idx" ON "public"."AvailabilitySlot"("gameId");

-- CreateIndex
CREATE INDEX "RecurringAvailability_userId_weekday_idx" ON "public"."RecurringAvailability"("userId", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryAlbum_slug_key" ON "public"."GalleryAlbum"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryAlbumTag_albumId_label_key" ON "public"."GalleryAlbumTag"("albumId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryAlbumCollaborator_albumId_userId_key" ON "public"."GalleryAlbumCollaborator"("albumId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "public"."Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EventOrganization_eventId_organizationId_key" ON "public"."EventOrganization"("eventId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "EventOrganizer_eventId_userId_key" ON "public"."EventOrganizer"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventTag_eventId_label_key" ON "public"."EventTag"("eventId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "EventRankingEntry_eventId_position_key" ON "public"."EventRankingEntry"("eventId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvite_token_key" ON "public"."UserInvite"("token");

-- CreateIndex
CREATE INDEX "UserInvite_email_idx" ON "public"."UserInvite"("email");

-- CreateIndex
CREATE INDEX "UserInvite_createdAt_idx" ON "public"."UserInvite"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserGame" ADD CONSTRAINT "UserGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserGame" ADD CONSTRAINT "UserGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameInfo" ADD CONSTRAINT "GameInfo_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameInfo" ADD CONSTRAINT "GameInfo_contactUserId_fkey" FOREIGN KEY ("contactUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserChangeLog" ADD CONSTRAINT "UserChangeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserChangeLog" ADD CONSTRAINT "UserChangeLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Post" ADD CONSTRAINT "Post_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "public"."GalleryAlbum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_chronicleArticleId_fkey" FOREIGN KEY ("chronicleArticleId") REFERENCES "public"."NewsArticle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TableLayout" ADD CONSTRAINT "TableLayout_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."ClubTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TableLayout" ADD CONSTRAINT "TableLayout_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TableBlock" ADD CONSTRAINT "TableBlock_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."ClubTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TableBlock" ADD CONSTRAINT "TableBlock_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TableBlock" ADD CONSTRAINT "TableBlock_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TableReservation" ADD CONSTRAINT "TableReservation_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."ClubTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TableReservation" ADD CONSTRAINT "TableReservation_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TableReservation" ADD CONSTRAINT "TableReservation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "public"."AvailabilitySlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchParticipant" ADD CONSTRAINT "MatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchParticipant" ADD CONSTRAINT "MatchParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecurringAvailability" ADD CONSTRAINT "RecurringAvailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GalleryImage" ADD CONSTRAINT "GalleryImage_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "public"."GalleryAlbum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GalleryImage" ADD CONSTRAINT "GalleryImage_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GalleryImage" ADD CONSTRAINT "GalleryImage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GalleryAlbumTag" ADD CONSTRAINT "GalleryAlbumTag_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "public"."GalleryAlbum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GalleryAlbumCollaborator" ADD CONSTRAINT "GalleryAlbumCollaborator_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "public"."GalleryAlbum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GalleryAlbumCollaborator" ADD CONSTRAINT "GalleryAlbumCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventOrganization" ADD CONSTRAINT "EventOrganization_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventOrganization" ADD CONSTRAINT "EventOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventOrganizer" ADD CONSTRAINT "EventOrganizer_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventOrganizer" ADD CONSTRAINT "EventOrganizer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventTag" ADD CONSTRAINT "EventTag_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventAttachment" ADD CONSTRAINT "EventAttachment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventLink" ADD CONSTRAINT "EventLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventHighlight" ADD CONSTRAINT "EventHighlight_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventHighlight" ADD CONSTRAINT "EventHighlight_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventRankingEntry" ADD CONSTRAINT "EventRankingEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventRankingEntry" ADD CONSTRAINT "EventRankingEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserInvite" ADD CONSTRAINT "UserInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserInvite" ADD CONSTRAINT "UserInvite_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

