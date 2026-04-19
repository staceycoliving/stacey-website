-- ─── Bookings upgrade (19.04.2026) ─────────────────────────
-- Lead-source tracking, retargeting eligibility, structured
-- cancellation kinds + refund tracking, TeamNote tags/follow-ups.

-- Cancellation kind enum
CREATE TYPE "CancellationKind" AS ENUM (
  'WIDERRUF_BY_TENANT',
  'CANCELLED_BY_STACEY',
  'DEPOSIT_TIMEOUT',
  'LEAD_ABANDONED',
  'TENANT_NO_SHOW',
  'OTHER'
);

-- Booking: lead source + cancellation kind + retargeting + refund fields
ALTER TABLE "Booking"
  ADD COLUMN "cancellationKind"       "CancellationKind",
  ADD COLUMN "leadSource"             TEXT,
  ADD COLUMN "leadMedium"             TEXT,
  ADD COLUMN "leadCampaign"           TEXT,
  ADD COLUMN "leadReferrer"           TEXT,
  ADD COLUMN "leadSourceOverride"     TEXT,
  ADD COLUMN "retargetingEligible"    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "retargetingLastSentAt"  TIMESTAMP(3),
  ADD COLUMN "retargetingSentCount"   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "bookingFeeRefundedAt"    TIMESTAMP(3),
  ADD COLUMN "bookingFeeRefundAmount"  INTEGER,
  ADD COLUMN "bookingFeeRefundId"      TEXT;

CREATE INDEX "Booking_retargetingEligible_idx" ON "Booking"("retargetingEligible");
CREATE INDEX "Booking_leadSource_idx" ON "Booking"("leadSource");

-- Existing CANCELLED bookings get LEAD_ABANDONED as a best-guess default
-- (most of them are stale leads; admins can reclassify later). Better than
-- leaving kind null on historical rows.
UPDATE "Booking" SET "cancellationKind" = 'LEAD_ABANDONED'
WHERE status = 'CANCELLED' AND "cancellationKind" IS NULL;

-- TeamNote: align with tenant Note (tags + followUpAt)
ALTER TABLE "TeamNote"
  ADD COLUMN "tags"        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "followUpAt"  TIMESTAMP(3);

CREATE INDEX "TeamNote_followUpAt_idx" ON "TeamNote"("followUpAt");
