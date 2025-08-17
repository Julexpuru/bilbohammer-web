/*
  Warnings:

  - The values [SLAVES_TO_DARKNESS,SOULBLIGHT_GRAVELORDS] on the enum `FaccionesAoS` will be removed. If these variants are still used in the database, this will fail.
  - The values [DWARFS,HIGH_ELVES,CHAOS] on the enum `FaccionesTOW` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."FaccionesAoS_new" AS ENUM ('BEASTMEN', 'BLADESOFKHORNE', 'BONNEZPLITTERZ', 'CITIESOFSIGMAR', 'DAUGHTERSOFKHAINE', 'DISCIPLESOFTZEENCH', 'FLESHEATERS', 'FYRESLAYERS', 'GLOOMSPITE', 'HEDONITESOFSLAANESH', 'IDONETH', 'IRONJAWZ', 'KHARADRON', 'KRULEBOYZ', 'LUMINETH', 'MAGGOTKINOFNURGLE', 'NIGHTHAUNT', 'OGORS', 'OSSIARCHBONERIPPERS', 'SERAPHON', 'SKAVEN', 'SLAVESTODARKNESS', 'SONSOFBEHEMATH', 'SOULBLIGHT', 'STORMCAST', 'SYLVANETH');
ALTER TABLE "public"."User" ALTER COLUMN "faccionesAoS" TYPE "public"."FaccionesAoS_new"[] USING ("faccionesAoS"::text::"public"."FaccionesAoS_new"[]);
ALTER TYPE "public"."FaccionesAoS" RENAME TO "FaccionesAoS_old";
ALTER TYPE "public"."FaccionesAoS_new" RENAME TO "FaccionesAoS";
DROP TYPE "public"."FaccionesAoS_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."FaccionesTOW_new" AS ENUM ('BEASTMEN', 'BRETONNIA', 'CATHAY', 'CHAOSDWARVES', 'CHAOSDAEMONS', 'DARKELVES', 'DWARVES', 'EMPIRE', 'GREENSKINS', 'HIGHELVES', 'KHEMRI', 'LIZARDMEN', 'OGRES', 'SKAVEN', 'VAMPIRECOUNTS', 'WARRIORSOFCHAOS', 'WOODELVES');
ALTER TABLE "public"."User" ALTER COLUMN "faccionesTOW" TYPE "public"."FaccionesTOW_new"[] USING ("faccionesTOW"::text::"public"."FaccionesTOW_new"[]);
ALTER TYPE "public"."FaccionesTOW" RENAME TO "FaccionesTOW_old";
ALTER TYPE "public"."FaccionesTOW_new" RENAME TO "FaccionesTOW";
DROP TYPE "public"."FaccionesTOW_old";
COMMIT;
