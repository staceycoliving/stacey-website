-- Mietüberzahlung-Tracking am Tenant
-- Wenn der moveOut nachträglich verkürzt wird, setzt reconcileMoveOutPayment
-- die RentPayment.amount auf den korrekten Pro-rata-Betrag. paidAmount bleibt
-- auf der ursprünglich eingezogenen Summe → Differenz ist die Überzahlung.
-- Bei der Endabrechnung (deposit calculate_refund) wird diese Summe als Plus-
-- Posten verrechnet, statt sofort via Stripe rückerstattet zu werden.

ALTER TABLE "Tenant" ADD COLUMN "rentOverpaymentAmount" INTEGER NOT NULL DEFAULT 0;
