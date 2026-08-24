-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('super_admin', 'mosque_admin', 'secretary', 'treasurer', 'cashier', 'imam', 'member');

-- CreateEnum
CREATE TYPE "Position" AS ENUM ('president', 'vice_president', 'general_secretary', 'assistant_secretary', 'treasurer', 'cashier', 'imam', 'muazzin', 'khatib', 'education_coordinator', 'event_coordinator', 'volunteer_coordinator', 'volunteer', 'caretaker', 'member');

-- CreateTable
CREATE TABLE "mosques" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "email" VARCHAR(160),
    "phone" VARCHAR(32),
    "website" VARCHAR(255),
    "addressLine" VARCHAR(255),
    "city" VARCHAR(120),
    "district" VARCHAR(120),
    "country" VARCHAR(120),
    "postalCode" VARCHAR(24),
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Dhaka',
    "establishedYear" INTEGER,
    "description" TEXT,
    "logoUrl" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "mosques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mosque_settings" (
    "id" UUID NOT NULL,
    "mosqueId" UUID NOT NULL,
    "defaultLanguage" VARCHAR(8) NOT NULL DEFAULT 'en',
    "currency" VARCHAR(8) NOT NULL DEFAULT 'BDT',
    "dateFormat" VARCHAR(24) NOT NULL DEFAULT 'DD/MM/YYYY',
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "prayerReminders" BOOLEAN NOT NULL DEFAULT true,
    "eventReminders" BOOLEAN NOT NULL DEFAULT true,
    "calculationMethod" VARCHAR(48) NOT NULL DEFAULT 'MuslimWorldLeague',
    "asrMethod" VARCHAR(24) NOT NULL DEFAULT 'Standard',
    "iqamahOffset" INTEGER NOT NULL DEFAULT 10,
    "twoFactorRequired" BOOLEAN NOT NULL DEFAULT false,
    "sessionTimeoutMins" INTEGER NOT NULL DEFAULT 60,
    "passwordMinLength" INTEGER NOT NULL DEFAULT 8,
    "theme" VARCHAR(16) NOT NULL DEFAULT 'system',
    "primaryColor" VARCHAR(16),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "mosque_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "mosqueId" UUID NOT NULL,
    "fullName" VARCHAR(160) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "phone" VARCHAR(32),
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'member',
    "positions" "Position"[] DEFAULT ARRAY[]::"Position"[],
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deniedPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dateOfBirth" DATE,
    "gender" VARCHAR(8),
    "city" VARCHAR(120),
    "avatarUrl" VARCHAR(500),
    "newsletter" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMPTZ,
    "lastLoginAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "revokedAt" TIMESTAMPTZ,
    "replacedById" UUID,
    "userAgent" VARCHAR(255),
    "ipAddress" VARCHAR(64),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "mosqueId" UUID NOT NULL,
    "actorId" UUID,
    "actorName" VARCHAR(160) NOT NULL,
    "actorRole" VARCHAR(32),
    "action" VARCHAR(64) NOT NULL,
    "resource" VARCHAR(64) NOT NULL,
    "resourceId" VARCHAR(64),
    "changes" JSONB,
    "note" TEXT,
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(255),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mosques_slug_key" ON "mosques"("slug");

-- CreateIndex
CREATE INDEX "mosques_isActive_idx" ON "mosques"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "mosque_settings_mosqueId_key" ON "mosque_settings"("mosqueId");

-- CreateIndex
CREATE INDEX "users_mosqueId_role_idx" ON "users"("mosqueId", "role");

-- CreateIndex
CREATE INDEX "users_mosqueId_isActive_idx" ON "users"("mosqueId", "isActive");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_mosqueId_email_key" ON "users"("mosqueId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "users_mosqueId_phone_key" ON "users"("mosqueId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_revokedAt_idx" ON "refresh_tokens"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "audit_logs_mosqueId_createdAt_idx" ON "audit_logs"("mosqueId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_mosqueId_resource_resourceId_idx" ON "audit_logs"("mosqueId", "resource", "resourceId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- AddForeignKey
ALTER TABLE "mosque_settings" ADD CONSTRAINT "mosque_settings_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "mosques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "mosques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "mosques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

