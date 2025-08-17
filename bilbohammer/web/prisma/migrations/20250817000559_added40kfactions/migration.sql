/*
  Warnings:

  - The values [GENEASTEALER_CULTS] on the enum `FaccionesW40K` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."FaccionesW40K_new" AS ENUM ('ADEPTA_SORORITAS', 'ADEPTUS_CUSTODES', 'ADEPTUS_MECHANICUS', 'ASTRA_MILITARUM', 'BLACK_TEMPLARS', 'BLOOD_ANGELS', 'CHAOS_DAEMONS', 'CHAOS_KNIGHTS', 'CHAOS_MARINES', 'DARK_ANGELS', 'DEATHWATCH', 'DEATH_GUARD', 'DRUKHARI', 'ELDARS', 'EMPERORS_CHILDREN', 'GENESTEALER_CULTS', 'GREY_KNIGHTS', 'IMPERIAL_AGENTS', 'IMPERIAL_KNIGHTS', 'LEAGUES_OF_VOTANN', 'NECRONS', 'ORKS', 'SPACE_MARINES', 'SPACE_WOLVES', 'TAU', 'THOUSAND_SONS', 'TYRANIDS', 'WORLD_EATERS');
ALTER TABLE "public"."User" ALTER COLUMN "faccionesW40K" TYPE "public"."FaccionesW40K_new"[] USING ("faccionesW40K"::text::"public"."FaccionesW40K_new"[]);
ALTER TYPE "public"."FaccionesW40K" RENAME TO "FaccionesW40K_old";
ALTER TYPE "public"."FaccionesW40K_new" RENAME TO "FaccionesW40K";
DROP TYPE "public"."FaccionesW40K_old";
COMMIT;
