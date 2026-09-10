-- AlterTable
ALTER TABLE "mosques" ADD COLUMN "story" TEXT,
ADD COLUMN "mission" TEXT,
ADD COLUMN "vision" TEXT;

-- CreateTable
CREATE TABLE "mosque_milestones" (
    "id" UUID NOT NULL,
    "mosqueId" UUID NOT NULL,
    "year" VARCHAR(16) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "mosque_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mosque_values" (
    "id" UUID NOT NULL,
    "mosqueId" UUID NOT NULL,
    "num" VARCHAR(8) NOT NULL,
    "icon" VARCHAR(64),
    "title" VARCHAR(160) NOT NULL,
    "subtitle" VARCHAR(200),
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "mosque_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mosque_gallery_items" (
    "id" UUID NOT NULL,
    "mosqueId" UUID NOT NULL,
    "imageUrl" VARCHAR(500) NOT NULL,
    "cloudinaryPublicId" VARCHAR(255),
    "title" VARCHAR(160),
    "altText" VARCHAR(200),
    "category" VARCHAR(64) NOT NULL DEFAULT 'general',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "mosque_gallery_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mosque_milestones_mosqueId_sortOrder_idx" ON "mosque_milestones"("mosqueId", "sortOrder");

-- CreateIndex
CREATE INDEX "mosque_milestones_mosqueId_isPublished_idx" ON "mosque_milestones"("mosqueId", "isPublished");

-- CreateIndex
CREATE INDEX "mosque_values_mosqueId_sortOrder_idx" ON "mosque_values"("mosqueId", "sortOrder");

-- CreateIndex
CREATE INDEX "mosque_values_mosqueId_isPublished_idx" ON "mosque_values"("mosqueId", "isPublished");

-- CreateIndex
CREATE INDEX "mosque_gallery_items_mosqueId_isPublished_sortOrder_idx" ON "mosque_gallery_items"("mosqueId", "isPublished", "sortOrder");

-- AddForeignKey
ALTER TABLE "mosque_milestones" ADD CONSTRAINT "mosque_milestones_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "mosques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mosque_values" ADD CONSTRAINT "mosque_values_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "mosques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mosque_gallery_items" ADD CONSTRAINT "mosque_gallery_items_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "mosques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

