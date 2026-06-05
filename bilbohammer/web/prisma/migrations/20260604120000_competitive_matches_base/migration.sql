-- CreateEnum
CREATE TYPE "EventRegistrationStatus" AS ENUM ('INSCRITO', 'PAGADO', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventRegistrationSource" AS ENUM ('WEB', 'ADMIN', 'TELEGRAM', 'IMPORT');

-- CreateEnum
CREATE TYPE "CompetitiveMatchKind" AS ENUM ('LEAGUE', 'CASUAL');

-- CreateEnum
CREATE TYPE "CompetitiveMatchOutcome" AS ENUM ('WIN', 'DRAW', 'LOSS');

-- CreateEnum
CREATE TYPE "CompetitiveMatchReportStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CompetitiveMatchReportChannel" AS ENUM ('WEB', 'TELEGRAM', 'ADMIN', 'IMPORT');

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" INTEGER,
    "playerName" TEXT NOT NULL,
    "factionLabel" TEXT,
    "status" "EventRegistrationStatus" NOT NULL DEFAULT 'INSCRITO',
    "source" "EventRegistrationSource" NOT NULL DEFAULT 'WEB',
    "listData" JSONB,
    "notes" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitiveMatch" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "gameId" TEXT,
    "kind" "CompetitiveMatchKind" NOT NULL DEFAULT 'CASUAL',
    "playedAt" TIMESTAMP(3) NOT NULL,
    "roundNumber" INTEGER,
    "sourceReportId" TEXT,
    "notes" TEXT,
    "createdById" INTEGER,
    "validatedById" INTEGER,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitiveMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitiveMatchPlayer" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" INTEGER,
    "participantOrder" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "factionLabel" TEXT,
    "outcome" "CompetitiveMatchOutcome" NOT NULL,
    "score" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitiveMatchPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitiveMatchReport" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "gameId" TEXT,
    "kind" "CompetitiveMatchKind" NOT NULL DEFAULT 'CASUAL',
    "playedAt" TIMESTAMP(3) NOT NULL,
    "roundNumber" INTEGER,
    "channel" "CompetitiveMatchReportChannel" NOT NULL DEFAULT 'WEB',
    "status" "CompetitiveMatchReportStatus" NOT NULL DEFAULT 'PENDING',
    "submittedById" INTEGER,
    "externalSubmitterId" TEXT,
    "externalMessageId" TEXT,
    "notes" TEXT,
    "rejectionReason" TEXT,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitiveMatchReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitiveMatchReportPlayer" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" INTEGER,
    "participantOrder" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "factionLabel" TEXT,
    "outcome" "CompetitiveMatchOutcome" NOT NULL,
    "score" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitiveMatchReportPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventChronicle" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "label" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventChronicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_eventId_userId_key" ON "EventRegistration"("eventId", "userId");

-- CreateIndex
CREATE INDEX "EventRegistration_eventId_status_idx" ON "EventRegistration"("eventId", "status");

-- CreateIndex
CREATE INDEX "EventRegistration_userId_idx" ON "EventRegistration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitiveMatch_sourceReportId_key" ON "CompetitiveMatch"("sourceReportId");

-- CreateIndex
CREATE INDEX "CompetitiveMatch_eventId_kind_playedAt_idx" ON "CompetitiveMatch"("eventId", "kind", "playedAt");

-- CreateIndex
CREATE INDEX "CompetitiveMatch_gameId_playedAt_idx" ON "CompetitiveMatch"("gameId", "playedAt");

-- CreateIndex
CREATE INDEX "CompetitiveMatch_playedAt_idx" ON "CompetitiveMatch"("playedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitiveMatchPlayer_matchId_participantOrder_key" ON "CompetitiveMatchPlayer"("matchId", "participantOrder");

-- CreateIndex
CREATE INDEX "CompetitiveMatchPlayer_userId_idx" ON "CompetitiveMatchPlayer"("userId");

-- CreateIndex
CREATE INDEX "CompetitiveMatchPlayer_matchId_outcome_idx" ON "CompetitiveMatchPlayer"("matchId", "outcome");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitiveMatchReport_channel_externalMessageId_key" ON "CompetitiveMatchReport"("channel", "externalMessageId");

-- CreateIndex
CREATE INDEX "CompetitiveMatchReport_eventId_status_idx" ON "CompetitiveMatchReport"("eventId", "status");

-- CreateIndex
CREATE INDEX "CompetitiveMatchReport_status_createdAt_idx" ON "CompetitiveMatchReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CompetitiveMatchReport_submittedById_idx" ON "CompetitiveMatchReport"("submittedById");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitiveMatchReportPlayer_reportId_participantOrder_key" ON "CompetitiveMatchReportPlayer"("reportId", "participantOrder");

-- CreateIndex
CREATE INDEX "CompetitiveMatchReportPlayer_userId_idx" ON "CompetitiveMatchReportPlayer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventChronicle_eventId_articleId_key" ON "EventChronicle"("eventId", "articleId");

-- CreateIndex
CREATE INDEX "EventChronicle_eventId_position_idx" ON "EventChronicle"("eventId", "position");

-- CreateIndex
CREATE INDEX "EventChronicle_articleId_idx" ON "EventChronicle"("articleId");

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitiveMatch" ADD CONSTRAINT "CompetitiveMatch_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitiveMatch" ADD CONSTRAINT "CompetitiveMatch_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitiveMatch" ADD CONSTRAINT "CompetitiveMatch_sourceReportId_fkey" FOREIGN KEY ("sourceReportId") REFERENCES "CompetitiveMatchReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitiveMatch" ADD CONSTRAINT "CompetitiveMatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitiveMatch" ADD CONSTRAINT "CompetitiveMatch_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitiveMatchPlayer" ADD CONSTRAINT "CompetitiveMatchPlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "CompetitiveMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitiveMatchPlayer" ADD CONSTRAINT "CompetitiveMatchPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitiveMatchReport" ADD CONSTRAINT "CompetitiveMatchReport_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitiveMatchReport" ADD CONSTRAINT "CompetitiveMatchReport_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitiveMatchReport" ADD CONSTRAINT "CompetitiveMatchReport_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitiveMatchReport" ADD CONSTRAINT "CompetitiveMatchReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitiveMatchReportPlayer" ADD CONSTRAINT "CompetitiveMatchReportPlayer_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "CompetitiveMatchReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitiveMatchReportPlayer" ADD CONSTRAINT "CompetitiveMatchReportPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventChronicle" ADD CONSTRAINT "EventChronicle_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventChronicle" ADD CONSTRAINT "EventChronicle_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "NewsArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
