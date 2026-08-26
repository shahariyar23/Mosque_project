-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'bank_transfer', 'card', 'online', 'other');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('pending', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('pending', 'approved', 'paid', 'cancelled');

-- CreateTable
CREATE TABLE "donations" (
    "id" UUID NOT NULL,
    "mosqueId" UUID NOT NULL,
    "userId" UUID,
    "fundId" UUID NOT NULL,
    "campaignId" UUID,
    "donorName" VARCHAR(160),
    "donorEmail" VARCHAR(160),
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "status" "DonationStatus" NOT NULL DEFAULT 'pending',
    "donatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" VARCHAR(120),
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "mosqueId" UUID NOT NULL,
    "category" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "expenseDate" DATE NOT NULL,
    "reference" VARCHAR(120),
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "donations_mosqueId_status_idx" ON "donations"("mosqueId", "status");

-- CreateIndex
CREATE INDEX "donations_mosqueId_donatedAt_idx" ON "donations"("mosqueId", "donatedAt");

-- CreateIndex
CREATE INDEX "donations_mosqueId_createdAt_idx" ON "donations"("mosqueId", "createdAt");

-- CreateIndex
CREATE INDEX "donations_mosqueId_userId_idx" ON "donations"("mosqueId", "userId");

-- CreateIndex
CREATE INDEX "donations_mosqueId_fundId_idx" ON "donations"("mosqueId", "fundId");

-- CreateIndex
CREATE INDEX "donations_mosqueId_campaignId_idx" ON "donations"("mosqueId", "campaignId");

-- CreateIndex
CREATE INDEX "donations_mosqueId_paymentMethod_idx" ON "donations"("mosqueId", "paymentMethod");

-- CreateIndex
CREATE INDEX "expenses_mosqueId_status_idx" ON "expenses"("mosqueId", "status");

-- CreateIndex
CREATE INDEX "expenses_mosqueId_expenseDate_idx" ON "expenses"("mosqueId", "expenseDate");

-- CreateIndex
CREATE INDEX "expenses_mosqueId_createdAt_idx" ON "expenses"("mosqueId", "createdAt");

-- CreateIndex
CREATE INDEX "expenses_mosqueId_category_idx" ON "expenses"("mosqueId", "category");

-- CreateIndex
CREATE INDEX "expenses_mosqueId_createdById_idx" ON "expenses"("mosqueId", "createdById");

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "mosques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "donation_funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "mosques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
