/*
  Warnings:

  - The values [SLAVES,ORRUKS,SOULBLIGHT] on the enum `FaccionesAoS` will be removed. If these variants are still used in the database, this will fail.
  - The values [BRETONNIA,GREENSkins] on the enum `FaccionesTOW` will be removed. If these variants are still used in the database, this will fail.
  - The values [VOTANN,SM] on the enum `FaccionesW40K` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."FaccionesAoS_new" AS ENUM ('STORMCAST', 'SLAVES_TO_DARKNESS', 'SOULBLIGHT_GRAVELORDS', 'IRONJAWZ');
ALTER TABLE "public"."User" ALTER COLUMN "faccionesAoS" TYPE "public"."FaccionesAoS_new"[] USING ("faccionesAoS"::text::"public"."FaccionesAoS_new"[]);
ALTER TYPE "public"."FaccionesAoS" RENAME TO "FaccionesAoS_old";
ALTER TYPE "public"."FaccionesAoS_new" RENAME TO "FaccionesAoS";
DROP TYPE "public"."FaccionesAoS_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."FaccionesTOW_new" AS ENUM ('EMPIRE', 'DWARFS', 'HIGH_ELVES', 'CHAOS');
ALTER TABLE "public"."User" ALTER COLUMN "faccionesTOW" TYPE "public"."FaccionesTOW_new"[] USING ("faccionesTOW"::text::"public"."FaccionesTOW_new"[]);
ALTER TYPE "public"."FaccionesTOW" RENAME TO "FaccionesTOW_old";
ALTER TYPE "public"."FaccionesTOW_new" RENAME TO "FaccionesTOW";
DROP TYPE "public"."FaccionesTOW_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."FaccionesW40K_new" AS ENUM ('ADEPTA_SORORITAS', 'ADEPTUS_CUSTODES', 'ADEPTUS_MECHANICUS', 'ASTRA_MILITARUM', 'BLACK_TEMPLARS', 'BLOOD_ANGELS', 'CHAOS_DAEMONS', 'CHAOS_KNIGHTS', 'CHAOS_MARINES', 'DARK_ANGELS', 'DEATHWATCH', 'DEATH_GUARD', 'DRUKHARI', 'ELDARS', 'EMPERORS_CHILDREN', 'GENEASTEALER_CULTS', 'GREY_KNIGHTS', 'IMPERIAL_AGENTS', 'IMPERIAL_KNIGHTS', 'LEAGUES_OF_VOTANN', 'NECRONS', 'ORKS', 'SPACE_MARINES', 'SPACE_WOLVES', 'TAU', 'THOUSAND_SONS', 'TYRANIDS', 'WORLD_EATERS');
ALTER TABLE "public"."User" ALTER COLUMN "faccionesW40K" TYPE "public"."FaccionesW40K_new"[] USING ("faccionesW40K"::text::"public"."FaccionesW40K_new"[]);
ALTER TYPE "public"."FaccionesW40K" RENAME TO "FaccionesW40K_old";
ALTER TYPE "public"."FaccionesW40K_new" RENAME TO "FaccionesW40K";
DROP TYPE "public"."FaccionesW40K_old";
COMMIT;
