-- ─── Payment method per tenant ─────────────────────────────
-- Distinguishes tenants who pay via SEPA (auto-charged by cron)
-- from legacy tenants who still pay by manual bank transfer
-- (recorded manually by admin after bank statement check).
--
-- Previously we used sepaMandateId = 'legacy_manual' as a sentinel;
-- this makes the distinction explicit and catches the case where a
-- legacy tenant has no mandate at all.

CREATE TYPE "PaymentMethod" AS ENUM ('SEPA', 'BANK_TRANSFER');

ALTER TABLE "Tenant"
  ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'SEPA';

-- Migrate existing legacy tenants.
-- Legacy = imported manually with the 'legacy_manual' sentinel OR a bare
-- record that was never linked to a Booking (stripeCustomerId + bookingId
-- both null). New tenants mid-setup still have a Booking + Stripe customer,
-- so they stay on SEPA (the default).
UPDATE "Tenant"
SET "paymentMethod" = 'BANK_TRANSFER'
WHERE "sepaMandateId" = 'legacy_manual'
   OR ("stripeCustomerId" IS NULL AND "bookingId" IS NULL);
