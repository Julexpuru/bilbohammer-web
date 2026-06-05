ALTER TABLE "CompetitiveMatchPlayer"
ALTER COLUMN "factionLabel" SET NOT NULL,
ALTER COLUMN "score" SET NOT NULL;

ALTER TABLE "CompetitiveMatchReportPlayer"
ALTER COLUMN "factionLabel" SET NOT NULL,
ALTER COLUMN "score" SET NOT NULL;
