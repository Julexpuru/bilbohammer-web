-- Track game assignment, layout image and scenery photo per table
ALTER TABLE "ClubTable" ADD COLUMN "gameId" TEXT;
ALTER TABLE "ClubTable" ADD COLUMN "gameLabel" TEXT;
ALTER TABLE "ClubTable" ADD COLUMN "layoutImagePath" TEXT;
ALTER TABLE "ClubTable" ADD COLUMN "sceneryImagePath" TEXT;

ALTER TABLE "ClubTable"
ADD CONSTRAINT "ClubTable_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ClubTable_gameId_idx" ON "ClubTable"("gameId");
