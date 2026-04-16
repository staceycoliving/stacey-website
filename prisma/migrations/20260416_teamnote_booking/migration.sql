-- Team notes can now be attached to a Booking as well as a Tenant. Used
-- by the Bookings detail panel so the admin team can leave context
-- ("called guest, no answer — trying again Monday") on pre-move-in
-- bookings too.

ALTER TABLE "TeamNote" ADD COLUMN "bookingId" TEXT;
CREATE INDEX "TeamNote_bookingId_idx" ON "TeamNote"("bookingId");
