/*
  Warnings:

  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'JUNTA', 'SOCIO', 'AMIGO');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "rol" "Rol" NOT NULL DEFAULT 'AMIGO';

-- DropEnum
DROP TYPE "Role";
