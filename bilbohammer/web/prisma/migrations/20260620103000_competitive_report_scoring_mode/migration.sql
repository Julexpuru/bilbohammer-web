CREATE TYPE "CompetitiveReportScoringMode" AS ENUM ('INDIVIDUAL_0_100', 'SUM_20');

ALTER TABLE "CompetitiveEventSettings"
ADD COLUMN "scoringMode" "CompetitiveReportScoringMode" NOT NULL DEFAULT 'INDIVIDUAL_0_100';
