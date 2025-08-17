-- CreateEnum
CREATE TYPE "public"."FaccionesW40K" AS ENUM ('VOTANN', 'SM', 'TAU', 'NECRONS', 'TYRANIDS');

-- CreateEnum
CREATE TYPE "public"."FaccionesAoS" AS ENUM ('STORMCAST', 'SLAVES', 'ORRUKS', 'SOULBLIGHT');

-- CreateEnum
CREATE TYPE "public"."FaccionesTOW" AS ENUM ('EMPIRE', 'BRETONNIA', 'GREENSkins', 'DWARFS');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "faccionesAoS" "public"."FaccionesAoS"[],
ADD COLUMN     "faccionesTOW" "public"."FaccionesTOW"[],
ADD COLUMN     "faccionesW40K" "public"."FaccionesW40K"[];
