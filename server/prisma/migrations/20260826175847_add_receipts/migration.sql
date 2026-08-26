-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('issued', 'voided');

-- CreateTable
CREATE TABLE "receipts" (
    "id" UUID NOT NULL,
    "mosqueId" UUID NOT NULL,
    "receiptNumber" VARCHAR(64) NOT NULL,
    "userId" UUID,
    "donationId" UUID,
    "fundId" UUID,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'issued',
    "issuedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMPTZ,
    "voidReason" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "receipts_mosqueId_status_idx" ON "receipts"("mosqueId", "status");

-- CreateIndex
CREATE INDEX "receipts_mosqueId_issuedAt_idx" ON "receipts"("mosqueId", "issuedAt");

-- CreateIndex
CREATE INDEX "receipts_mosqueId_createdAt_idx" ON "receipts"("mosqueId", "createdAt");

-- CreateIndex
CREATE INDEX "receipts_mosqueId_userId_idx" ON "receipts"("mosqueId", "userId");

-- CreateIndex
CREATE INDEX "receipts_mosqueId_donationId_idx" ON "receipts"("mosqueId", "donationId");

-- CreateIndex
CREATE INDEX "receipts_mosqueId_fundId_idx" ON "receipts"("mosqueId", "fundId");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_mosqueId_receiptNumber_key" ON "receipts"("mosqueId", "receiptNumber");

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "mosques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "donation_funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
