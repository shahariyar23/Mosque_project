-- CreateEnum
CREATE TYPE "VolunteerStatus" AS ENUM ('active', 'inactive', 'on_leave');

-- CreateTable
CREATE TABLE "facilities" (
    "id" UUID NOT NULL,
    "mosqueId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "capacity" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteers" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "VolunteerStatus" NOT NULL DEFAULT 'active',
    "skills" VARCHAR(500),
    "availability" VARCHAR(255),
    "notes" TEXT,
    "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "volunteers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "facilities_mosqueId_createdAt_idx" ON "facilities"("mosqueId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "volunteers_userId_key" ON "volunteers"("userId");

-- CreateIndex
CREATE INDEX "volunteers_status_createdAt_idx" ON "volunteers"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "mosques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteers" ADD CONSTRAINT "volunteers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
