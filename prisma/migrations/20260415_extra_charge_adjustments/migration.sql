-- Adjustments: ExtraCharge wird von "nur charges" zu "charges + discounts",
-- die optional mit der nächsten Miete eingezogen/verrechnet werden oder
-- erst beim Auszug (Deposit-Settlement) landen.
--
-- Charge  = Mieter schuldet uns was (Schlüsselersatz, extra Reinigung)
-- Discount = Wir gewähren dem Mieter Nachlass (Heizungsausfall, Goodwill)
--
-- Timing:
--   NEXT_RENT          → mit nächstem Monats-SEPA-Einzug verrechnen
--   DEPOSIT_SETTLEMENT → erst am Ende bei der Kautionsabrechnung

CREATE TYPE "ExtraChargeType" AS ENUM ('CHARGE', 'DISCOUNT');
CREATE TYPE "ExtraChargeTiming" AS ENUM ('NEXT_RENT', 'DEPOSIT_SETTLEMENT');

ALTER TABLE "ExtraCharge"
  ADD COLUMN "type"     "ExtraChargeType"   NOT NULL DEFAULT 'CHARGE',
  ADD COLUMN "chargeOn" "ExtraChargeTiming" NOT NULL DEFAULT 'NEXT_RENT',
  ADD COLUMN "stripePaymentIntentId" TEXT;
