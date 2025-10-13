-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "roles" "Rol"[] DEFAULT ARRAY[]::"Rol"[];

UPDATE "User"
SET "roles" = ARRAY["rol"]
WHERE "rol" IS NOT NULL;

ALTER TABLE "User"
  ALTER COLUMN "roles" SET NOT NULL;

ALTER TABLE "User"
  DROP COLUMN "rol";
