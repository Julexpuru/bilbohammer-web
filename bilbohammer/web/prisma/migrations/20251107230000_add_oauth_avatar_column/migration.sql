ALTER TABLE "User" ADD COLUMN "oauthAvatarUrl" TEXT;
UPDATE "User" SET "oauthAvatarUrl" = "image" WHERE "oauthAvatarUrl" IS NULL AND "image" IS NOT NULL;
