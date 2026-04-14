import type { BookingStatus } from "./generated/prisma/client";

/**
 * Booking statuses that reserve (block) a room for other bookings.
 *
 * Policy: a room is reserved the moment the booking fee is paid. Earlier
 * statuses (PENDING = form submitted, SIGNED = Yousign contract signed)
 * do **not** lock the room — this prevents zombie reservations from
 * abandoned flows.
 *
 * CONFIRMED rooms are also locked, but that is handled via the
 * `Room.tenant` relation (the tenant record is the source of truth once
 * the booking is closed).
 */
export const ROOM_BLOCKING_BOOKING_STATUSES: BookingStatus[] = [
  "DEPOSIT_PENDING",
];
