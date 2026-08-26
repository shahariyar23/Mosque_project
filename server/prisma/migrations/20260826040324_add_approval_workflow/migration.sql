-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" UUID NOT NULL,
    "mosqueId" UUID NOT NULL,
    "requestedById" UUID NOT NULL,
    "entity" VARCHAR(64) NOT NULL,
    "entityId" VARCHAR(64) NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMPTZ,
    "comment" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approval_requests_mosqueId_status_createdAt_idx" ON "approval_requests"("mosqueId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "approval_requests_entity_entityId_status_idx" ON "approval_requests"("entity", "entityId", "status");

-- CreateIndex
CREATE INDEX "approval_requests_requestedById_idx" ON "approval_requests"("requestedById");

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "mosques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
