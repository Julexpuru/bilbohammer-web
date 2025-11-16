-- AlterTable
ALTER TABLE "public"."NewsArticle" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "facePhotoUrl" TEXT;

-- AlterTable
ALTER TABLE "public"."UserInvite" ALTER COLUMN "updatedAt" DROP DEFAULT;
