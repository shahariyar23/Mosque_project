-- CreateEnum
CREATE TYPE "FundStatus" AS ENUM ('active', 'inactive', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'active', 'completed', 'cancelled', 'archived');

-- CreateTable
CREATE TABLE "donation_funds" (
    "id" UUID NOT NULL,
    "mosqueId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "description" TEXT,
    "status" "FundStatus" NOT NULL DEFAULT 'active',
    "targetAmount" DECIMAL(14,2),
    "startDate" DATE,
    "endDate" DATE,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "donation_funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "mosqueId" UUID NOT NULL,
    "fundId" UUID,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "description" TEXT,
    "targetAmount" DECIMAL(14,2) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "imageUrl" VARCHAR(500),
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "donation_funds_mosqueId_status_idx" ON "donation_funds"("mosqueId", "status");

-- CreateIndex
CREATE INDEX "donation_funds_mosqueId_createdAt_idx" ON "donation_funds"("mosqueId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "donation_funds_mosqueId_slug_key" ON "donation_funds"("mosqueId", "slug");

-- CreateIndex
CREATE INDEX "campaigns_mosqueId_status_idx" ON "campaigns"("mosqueId", "status");

-- CreateIndex
CREATE INDEX "campaigns_mosqueId_createdAt_idx" ON "campaigns"("mosqueId", "createdAt");

-- CreateIndex
CREATE INDEX "campaigns_fundId_idx" ON "campaigns"("fundId");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_mosqueId_slug_key" ON "campaigns"("mosqueId", "slug");

-- AddForeignKey
ALTER TABLE "donation_funds" ADD CONSTRAINT "donation_funds_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "mosques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "mosques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "donation_funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
