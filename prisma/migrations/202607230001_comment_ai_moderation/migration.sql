ALTER TABLE "comments"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS "moderationReason" TEXT,
  ADD COLUMN IF NOT EXISTS "moderationSource" TEXT,
  ADD COLUMN IF NOT EXISTS "moderatedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "comments_status_idx" ON "comments"("status");
