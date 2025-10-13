-- CreateTable
CREATE TABLE "public"."GalleryAlbum" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "displayDate" TEXT,
    "dateISO" TEXT,
    "coverImagePath" TEXT,
    "coverImageAlt" TEXT,
    "totalPhotos" INTEGER NOT NULL DEFAULT 0,
    "facetYear" TEXT NOT NULL,
    "facetGame" TEXT NOT NULL,
    "facetFormat" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryAlbum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GalleryImage" (
    "id" TEXT NOT NULL,
    "albumId" TEXT,
    "uploaderId" INTEGER,
    "storagePath" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "title" TEXT,
    "altText" TEXT,
    "description" TEXT,
    "takenAt" TIMESTAMP(3),
    "location" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "position" INTEGER,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GalleryAlbumTag" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryAlbumTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GalleryAlbumCollaborator" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryAlbumCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GalleryAlbum_slug_key" ON "public"."GalleryAlbum"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryAlbumTag_albumId_label_key" ON "public"."GalleryAlbumTag"("albumId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryAlbumCollaborator_albumId_userId_key" ON "public"."GalleryAlbumCollaborator"("albumId", "userId");

-- AddForeignKey
ALTER TABLE "public"."GalleryImage" ADD CONSTRAINT "GalleryImage_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "public"."GalleryAlbum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GalleryImage" ADD CONSTRAINT "GalleryImage_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GalleryAlbumTag" ADD CONSTRAINT "GalleryAlbumTag_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "public"."GalleryAlbum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GalleryAlbumCollaborator" ADD CONSTRAINT "GalleryAlbumCollaborator_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "public"."GalleryAlbum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GalleryAlbumCollaborator" ADD CONSTRAINT "GalleryAlbumCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
