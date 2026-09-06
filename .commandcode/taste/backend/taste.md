# Backend (NestJS/Prisma) engineering preferences

- Reuse existing models, services, and modules; never create duplicate financial systems, parallel implementations, or duplicate API routes/logic that already exist in other controllers (e.g., reuse the existing PrayerTimesService instead of re-implementing AlAdhan logic; don't re-add announcements/funds routes that already exist — rejected a deliverable for this). Confidence: 0.97
- Inspect the existing architecture first (Prisma schema, auth guards, permissions, DTO validation, pagination, response conventions) and follow its patterns — do not redesign. Confidence: 0.9
- Use Decimal for all money, never float. Validate amounts with a positive-money pattern and serialize as strings. Confidence: 0.95
- Compute financial totals with database aggregation (Prisma aggregate/groupBy) — never load rows into memory to sum, and never derive totals from paginated rows. Confidence: 0.9
- Use Prisma database transactions for atomic multi-write operations; on failure reject the operation with no partial financial records. Confidence: 0.85
- Never trust mosqueId/fundId/userId from the client when it should come from the authenticated context; enforce mosque isolation on every query (cross-mosque access must fail). Confidence: 0.95
- Never expose password hashes, tokens, or other private authentication data in API responses. Confidence: 0.9
- Use the existing RBAC/permission system; never compare role names manually to decide access. Reuse existing permission strings where available rather than adding new ones. Confidence: 0.9
- Prefer status transitions (cancel/void/archive) over hard-deleting financial records; deletion only where the architecture explicitly requires it and history is preserved. Confidence: 0.85
- Financial history/collection records are append-only: each new public collection (e.g., Jumu'ah) is inserted as its own database row via a create-only API, and historical records must never be overwritten or merged when a new record is added ("Each Jummah must remain its own database record. Do not overwrite historical records when a new Jummah collection is added."). Confidence: 0.85
- Write `data` field by field, never spreading DTOs (whitelist + forbidNonWhitelisted validation means stray fields are a 400). Confidence: 0.85
- Serve public read-only data through dedicated `@Public()` endpoints that resolve the tenant by slug and scope every query to it, projecting lean public DTOs as the security boundary — no internal ids, fees, booking/admin counts, or PII; a field not declared in the public DTO cannot reach the client. Confidence: 0.85
