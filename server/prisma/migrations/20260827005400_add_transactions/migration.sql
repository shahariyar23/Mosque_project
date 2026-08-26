-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('income', 'expense', 'transfer');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('pending', 'completed', 'voided', 'cancelled');

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "mosqueId" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'completed',
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "category" VARCHAR(120),
    "reference" VARCHAR(120),
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'cash',
    "fundId" UUID,
    "toFundId" UUID,
    "donationId" UUID,
    "expenseId" UUID,
    "receiptId" UUID,
    "transactedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transactions_mosqueId_type_idx" ON "transactions"("mosqueId", "type");

-- CreateIndex
CREATE INDEX "transactions_mosqueId_status_idx" ON "transactions"("mosqueId", "status");

-- CreateIndex
CREATE INDEX "transactions_mosqueId_transactedAt_idx" ON "transactions"("mosqueId", "transactedAt");

-- CreateIndex
CREATE INDEX "transactions_mosqueId_createdAt_idx" ON "transactions"("mosqueId", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_mosqueId_fundId_idx" ON "transactions"("mosqueId", "fundId");

-- CreateIndex
CREATE INDEX "transactions_mosqueId_toFundId_idx" ON "transactions"("mosqueId", "toFundId");

-- CreateIndex
CREATE INDEX "transactions_mosqueId_donationId_idx" ON "transactions"("mosqueId", "donationId");

-- CreateIndex
CREATE INDEX "transactions_mosqueId_expenseId_idx" ON "transactions"("mosqueId", "expenseId");

-- CreateIndex
CREATE INDEX "transactions_mosqueId_receiptId_idx" ON "transactions"("mosqueId", "receiptId");

-- CreateIndex
CREATE INDEX "transactions_mosqueId_createdById_idx" ON "transactions"("mosqueId", "createdById");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "mosques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "donation_funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_toFundId_fkey" FOREIGN KEY ("toFundId") REFERENCES "donation_funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
