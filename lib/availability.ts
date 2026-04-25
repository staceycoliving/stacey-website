// ─── Shared availability + booking helpers ─────────────────
//
// Single source of truth for the LONG-stay 14-day flexibility rule and the
// persons-based room filter, used by:
//   - app/page.tsx                  (homepage hero LONG dropdown)
//   - app/locations/[slug]/page.tsx (location detail page filter + dropdown)
//   - app/move-in/page.tsx          (move-in page filter + dropdown)
//
// LONG stay rule: rooms freeing within 14 days of today are flexible, the
// user can move in on any day from `earliest` to today+14. Rooms freeing
// later can only be booked on the exact freeing date (Auszugstag+1).

const FLEX_WINDOW_DAYS = 14;

/** Categories that can host two persons. Single source of truth. */
export const COUPLE_CATEGORIES = new Set<string>([
  "JUMBO",
  "JUMBO_BALCONY",
  "STUDIO",
  "PREMIUM_PLUS_BALCONY",
]);

/** Format a Date as YYYY-MM-DD in local time (avoids UTC shift from toISOString). */
export function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Today's date as YYYY-MM-DD in local time. */
export function todayLocal(): string {
  return localDate(new Date());
}

/** today + FLEX_WINDOW_DAYS as YYYY-MM-DD in local time. */
export function flexWindowEndLocal(): string {
  const limit = new Date();
  limit.setDate(limit.getDate() + FLEX_WINDOW_DAYS);
  return localDate(limit);
}

/**
 * Expand a list of earliest moveInDates into the full set of bookable days,
 * applying the 14-day flexibility window. Returns sorted YYYY-MM-DD strings.
 */
export function expandMoveInDates(earliestDates: string[]): string[] {
  const today = todayLocal();
  const limitStr = flexWindowEndLocal();
  const bookable = new Set<string>();

  for (const earliest of earliestDates) {
    if (earliest < today) continue; // skip past dates
    if (earliest > limitStr) {
      // Outside the 14-day window: only the exact freeing date is bookable
      bookable.add(earliest);
      continue;
    }
    // Inside the 14-day window: every day from earliest to today+14
    const d = new Date(earliest + "T12:00:00"); // noon avoids DST/timezone shifts
    while (localDate(d) <= limitStr) {
      bookable.add(localDate(d));
      d.setDate(d.getDate() + 1);
    }
  }

  return [...bookable].sort();
}

/**
 * True if `moveInDate` is bookable for a category whose earliest moveInDates
 * are `earliestDates`. Honours the 14-day flexibility rule.
 */
export function isMoveInDateBookable(moveInDate: string, earliestDates: string[]): boolean {
  const limitStr = flexWindowEndLocal();
  return earliestDates.some((earliest) => {
    if (earliest > limitStr) {
      // Outside 14-day window → exact match only
      return moveInDate === earliest;
    }
    // Inside 14-day window → any day from earliest to today+14
    return moveInDate >= earliest && moveInDate <= limitStr;
  });
}

/**
 * Filter a list of rooms by persons count: 2 persons can only book
 * couple-friendly categories. 1 person sees all rooms.
 */
export function filterRoomsForPersons<T extends { name: string; forCouples?: boolean }>(
  rooms: T[],
  persons: 1 | 2,
): T[] {
  if (persons !== 2) return rooms;
  return rooms.filter((r) => r.forCouples);
}
