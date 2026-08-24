-- Password-recovery tokens are stored only as SHA-256 hashes. Nullable fields preserve existing accounts.
ALTER TABLE "users"
  ADD COLUMN "passwordResetTokenHash" VARCHAR(64),
  ADD COLUMN "passwordResetExpiresAt" TIMESTAMPTZ;

CREATE UNIQUE INDEX "users_passwordResetTokenHash_key" ON "users"("passwordResetTokenHash");
CREATE INDEX "users_passwordResetExpiresAt_idx" ON "users"("passwordResetExpiresAt");
