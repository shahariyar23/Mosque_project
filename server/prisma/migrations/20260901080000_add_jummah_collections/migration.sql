-- CreateEnum
CREATE TYPE "JummahCollectionStatus" AS ENUM ('completed', 'voided');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "jummahCollectionId" UUID;

-- CreateTable
CREATE TABLE "jummah_collections" (
    "id" UUID NOT NULL,
    "mosqueId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "scheduleId" UUID,
    "fundId" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL,
    "status" "JummahCollectionStatus" NOT NULL DEFAULT 'completed',
    "reference" VARCHAR(120),
    "notes" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "jummah_collections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jummah_collections_mosqueId_date_idx" ON "jummah_collections"("mosqueId", "date");

-- CreateIndex
CREATE INDEX "jummah_collections_mosqueId_fundId_idx" ON "jummah_collections"("mosqueId", "fundId");

-- CreateIndex
CREATE INDEX "jummah_collections_mosqueId_status_idx" ON "jummah_collections"("mosqueId", "status");

-- CreateIndex
CREATE INDEX "jummah_collections_mosqueId_scheduleId_idx" ON "jummah_collections"("mosqueId", "scheduleId");

-- CreateIndex
CREATE INDEX "jummah_collections_mosqueId_createdAt_idx" ON "jummah_collections"("mosqueId", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_mosqueId_jummahCollectionId_idx" ON "transactions"("mosqueId", "jummahCollectionId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_jummahCollectionId_fkey" FOREIGN KEY ("jummahCollectionId") REFERENCES "jummah_collections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jummah_collections" ADD CONSTRAINT "jummah_collections_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "mosques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jummah_collections" ADD CONSTRAINT "jummah_collections_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "jumuah_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jummah_collections" ADD CONSTRAINT "jummah_collections_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "donation_funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jummah_collections" ADD CONSTRAINT "jummah_collections_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
