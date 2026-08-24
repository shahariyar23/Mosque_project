-- CreateTable
CREATE TABLE "prayer_settings" (
    "id" UUID NOT NULL,
    "mosqueId" UUID NOT NULL,
    "method" INTEGER,
    "school" INTEGER,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "timezone" VARCHAR(64),
    "imsakOffset" INTEGER NOT NULL DEFAULT 0,
    "fajrOffset" INTEGER NOT NULL DEFAULT 0,
    "sunriseOffset" INTEGER NOT NULL DEFAULT 0,
    "dhuhrOffset" INTEGER NOT NULL DEFAULT 0,
    "asrOffset" INTEGER NOT NULL DEFAULT 0,
    "sunsetOffset" INTEGER NOT NULL DEFAULT 0,
    "maghribOffset" INTEGER NOT NULL DEFAULT 0,
    "ishaOffset" INTEGER NOT NULL DEFAULT 0,
    "midnightOffset" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "prayer_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jumuah_schedules" (
    "id" UUID NOT NULL,
    "mosqueId" UUID NOT NULL,
    "date" DATE,
    "khutbahTime" VARCHAR(5) NOT NULL,
    "prayerTime" VARCHAR(5) NOT NULL,
    "imam" VARCHAR(160),
    "location" VARCHAR(160),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "jumuah_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ramadan_schedules" (
    "id" UUID NOT NULL,
    "mosqueId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "fastingStart" VARCHAR(5) NOT NULL,
    "fastingEnd" VARCHAR(5) NOT NULL,
    "suhoorTime" VARCHAR(5),
    "iftarTime" VARCHAR(5),
    "taraweehTime" VARCHAR(5),
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ramadan_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prayer_settings_mosqueId_key" ON "prayer_settings"("mosqueId");

-- CreateIndex
CREATE INDEX "jumuah_schedules_mosqueId_date_idx" ON "jumuah_schedules"("mosqueId", "date");

-- CreateIndex
CREATE INDEX "jumuah_schedules_mosqueId_isActive_idx" ON "jumuah_schedules"("mosqueId", "isActive");

-- CreateIndex
CREATE INDEX "ramadan_schedules_mosqueId_year_date_idx" ON "ramadan_schedules"("mosqueId", "year", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ramadan_schedules_mosqueId_year_date_key" ON "ramadan_schedules"("mosqueId", "year", "date");

-- AddForeignKey
ALTER TABLE "prayer_settings" ADD CONSTRAINT "prayer_settings_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "mosques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jumuah_schedules" ADD CONSTRAINT "jumuah_schedules_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "mosques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ramadan_schedules" ADD CONSTRAINT "ramadan_schedules_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "mosques"("id") ON DELETE CASCADE ON UPDATE CASCADE;
