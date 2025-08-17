/*
  Warnings:

  - The values [AoS,ToW] on the enum `Juego` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."Juego_new" AS ENUM ('W40K', 'AOS', 'TOW', 'ESDLA', 'BB', 'MARVEL', 'ROL', 'MAGIC', 'JUEGOS_DE_MESA', 'OTROS');
ALTER TABLE "public"."User" ALTER COLUMN "juegos" TYPE "public"."Juego_new"[] USING ("juegos"::text::"public"."Juego_new"[]);
ALTER TYPE "public"."Juego" RENAME TO "Juego_old";
ALTER TYPE "public"."Juego_new" RENAME TO "Juego";
DROP TYPE "public"."Juego_old";
COMMIT;
