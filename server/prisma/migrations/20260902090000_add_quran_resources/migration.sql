-- CreateEnum
CREATE TYPE "QuranResourceType" AS ENUM ('recitation', 'tafsir', 'memorisation', 'tajweed', 'translation');

-- CreateEnum
CREATE TYPE "QuranFormat" AS ENUM ('audio', 'video', 'document');

-- CreateEnum
CREATE TYPE "QuranStatus" AS ENUM ('draft', 'published', 'scheduled', 'archived');

-- CreateTable
CREATE TABLE "quran_resources" (
    "id" UUID NOT NULL,
    "mosqueId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "summary" VARCHAR(500),
    "description" TEXT NOT NULL,
    "type" "QuranResourceType" NOT NULL,
    "format" "QuranFormat" NOT NULL,
    "status" "QuranStatus" NOT NULL DEFAULT 'draft',
    "surah" VARCHAR(120) NOT NULL,
    "reference" VARCHAR(200) NOT NULL,
    "ayahStart" INTEGER,
    "ayahEnd" INTEGER,
    "reciter" VARCHAR(160),
    "author" VARCHAR(160),
    "language" VARCHAR(64) NOT NULL DEFAULT 'Arabic',
    "mediaUrl" VARCHAR(500),
    "thumbnailUrl" VARCHAR(500),
    "duration" VARCHAR(64),
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMPTZ,
    "scheduledAt" TIMESTAMPTZ,
    "archivedAt" TIMESTAMPTZ,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "quran_resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quran_resources_mosqueId_status_publishedAt_idx" ON "quran_resources"("mosqueId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "quran_resources_mosqueId_type_idx" ON "quran_resources"("mosqueId", "type");

-- CreateIndex
CREATE INDEX "quran_resources_mosqueId_status_scheduledAt_idx" ON "quran_resources"("mosqueId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "quran_resources_mosqueId_status_createdAt_idx" ON "quran_resources"("mosqueId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "quran_resources_mosqueId_deletedAt_idx" ON "quran_resources"("mosqueId", "deletedAt");

-- AddForeignKey
ALTER TABLE "quran_resources" ADD CONSTRAINT "quran_resources_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "mosques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quran_resources" ADD CONSTRAINT "quran_resources_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quran_resources" ADD CONSTRAINT "quran_resources_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
