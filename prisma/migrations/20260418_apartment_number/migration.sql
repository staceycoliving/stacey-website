-- Apartment gets a human-friendly number (1, 2, 3…) that groups suites
-- within the same unit, plus a full street address so we don't have to
-- parse it from location.address + houseNumber at render time.

ALTER TABLE "Apartment" ADD COLUMN "number" INTEGER;
ALTER TABLE "Apartment" ADD COLUMN "address" TEXT;
