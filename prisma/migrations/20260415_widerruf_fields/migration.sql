-- Widerruf-spezifische Felder am Booking
-- Gesetzt vom /api/admin/tenants/[id]/withdraw route.
-- Erlauben Pro-rata Berechnung wenn der Mieter schon eingezogen war.

ALTER TABLE "Booking" ADD COLUMN "cancellationDate" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "proRataRentRetained" INTEGER;
ALTER TABLE "Booking" ADD COLUMN "depositRefundedAmount" INTEGER;
