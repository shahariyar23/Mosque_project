-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('draft', 'active', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "SalaryStatus" AS ENUM ('pending', 'paid', 'cancelled');

-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL,
    "mosqueId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "category" VARCHAR(120) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "status" "BudgetStatus" NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_records" (
    "id" UUID NOT NULL,
    "mosqueId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL,
    "payPeriod" VARCHAR(7) NOT NULL,
    "paymentDate" DATE NOT NULL,
    "status" "SalaryStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "salary_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "budgets_mosqueId_status_idx" ON "budgets"("mosqueId", "status");

-- CreateIndex
CREATE INDEX "budgets_mosqueId_category_idx" ON "budgets"("mosqueId", "category");

-- CreateIndex
CREATE INDEX "budgets_mosqueId_periodStart_idx" ON "budgets"("mosqueId", "periodStart");

-- CreateIndex
CREATE INDEX "budgets_mosqueId_createdAt_idx" ON "budgets"("mosqueId", "createdAt");

-- CreateIndex
CREATE INDEX "budgets_mosqueId_createdById_idx" ON "budgets"("mosqueId", "createdById");

-- CreateIndex
CREATE INDEX "salary_records_mosqueId_status_idx" ON "salary_records"("mosqueId", "status");

-- CreateIndex
CREATE INDEX "salary_records_mosqueId_userId_idx" ON "salary_records"("mosqueId", "userId");

-- CreateIndex
CREATE INDEX "salary_records_mosqueId_payPeriod_idx" ON "salary_records"("mosqueId", "payPeriod");

-- CreateIndex
CREATE INDEX "salary_records_mosqueId_paymentDate_idx" ON "salary_records"("mosqueId", "paymentDate");

-- CreateIndex
CREATE INDEX "salary_records_mosqueId_createdAt_idx" ON "salary_records"("mosqueId", "createdAt");

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "mosques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_records" ADD CONSTRAINT "salary_records_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "mosques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_records" ADD CONSTRAINT "salary_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
