ALTER TABLE "mosques" ADD COLUMN "domain" VARCHAR(255);

CREATE UNIQUE INDEX "mosques_domain_key" ON "mosques"("domain");

UPDATE "mosques"
SET "domain" = 'mostak.tech'
WHERE "slug" = 'noor-jame-masjid';

UPDATE "mosques"
SET "slug" = 'uttara', "domain" = 'uttara.mostak.tech'
WHERE "slug" = 'uttara-central-masjid';