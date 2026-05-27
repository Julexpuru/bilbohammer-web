CREATE TYPE "public"."SlotProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

ALTER TABLE "public"."Match"
ADD COLUMN "proposalId" TEXT;

CREATE TABLE "public"."SlotProposal" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "gameId" TEXT,
    "proposedStart" TIMESTAMP(3) NOT NULL,
    "proposedEnd" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "status" "public"."SlotProposalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlotProposal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Match_proposalId_key" ON "public"."Match"("proposalId");
CREATE INDEX "SlotProposal_slotId_status_idx" ON "public"."SlotProposal"("slotId", "status");
CREATE INDEX "SlotProposal_requesterId_status_idx" ON "public"."SlotProposal"("requesterId", "status");
CREATE INDEX "SlotProposal_proposedStart_proposedEnd_idx" ON "public"."SlotProposal"("proposedStart", "proposedEnd");

ALTER TABLE "public"."Match"
ADD CONSTRAINT "Match_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "public"."SlotProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."SlotProposal"
ADD CONSTRAINT "SlotProposal_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "public"."AvailabilitySlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."SlotProposal"
ADD CONSTRAINT "SlotProposal_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."SlotProposal"
ADD CONSTRAINT "SlotProposal_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
