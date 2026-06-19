-- Configuración competitiva persistente por evento.
CREATE TABLE "CompetitiveEventSettings" (
    "eventId" TEXT NOT NULL,
    "paladinFormula" TEXT NOT NULL,
    "updatedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitiveEventSettings_pkey" PRIMARY KEY ("eventId")
);

CREATE TABLE "CompetitiveEventSettingsAuditLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "actorId" INTEGER,
    "previousFormula" TEXT,
    "nextFormula" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitiveEventSettingsAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CompetitiveEventSettingsAuditLog_eventId_createdAt_idx" ON "CompetitiveEventSettingsAuditLog"("eventId", "createdAt");
CREATE INDEX "CompetitiveEventSettingsAuditLog_actorId_idx" ON "CompetitiveEventSettingsAuditLog"("actorId");

ALTER TABLE "CompetitiveEventSettings"
ADD CONSTRAINT "CompetitiveEventSettings_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompetitiveEventSettingsAuditLog"
ADD CONSTRAINT "CompetitiveEventSettingsAuditLog_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
