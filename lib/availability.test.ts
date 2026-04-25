// Tests for the LONG-stay 14-day flexibility rule and room/persons filter.
//
// These exercise the helpers that have caused recurring "wrong rooms shown"
// bugs because three pages used to inline the same logic and drift apart.
// Pinning behaviour with tests so the next refactor can't silently break it.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COUPLE_CATEGORIES,
  expandMoveInDates,
  filterRoomsForPersons,
  flexWindowEndLocal,
  isMoveInDateBookable,
  localDate,
  todayLocal,
} from "./availability";

// All tests pin the clock to a known date so "today" + "today+14" are stable
const FAKE_TODAY = new Date("2026-04-11T12:00:00");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FAKE_TODAY);
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── localDate / todayLocal / flexWindowEndLocal ────────────

describe("localDate", () => {
  it("formats a Date as YYYY-MM-DD in local time", () => {
    expect(localDate(new Date("2026-04-11T12:00:00"))).toBe("2026-04-11");
    expect(localDate(new Date("2026-01-05T12:00:00"))).toBe("2026-01-05");
    expect(localDate(new Date("2026-12-31T12:00:00"))).toBe("2026-12-31");
  });

  it("zero-pads single-digit months and days", () => {
    expect(localDate(new Date("2026-03-04T12:00:00"))).toBe("2026-03-04");
  });
});

describe("todayLocal", () => {
  it("returns today's date as YYYY-MM-DD", () => {
    expect(todayLocal()).toBe("2026-04-11");
  });
});

describe("flexWindowEndLocal", () => {
  it("returns today + 14 days", () => {
    expect(flexWindowEndLocal()).toBe("2026-04-25");
  });
});

// ─── expandMoveInDates ──────────────────────────────────────

describe("expandMoveInDates", () => {
  it("returns an empty array for no input", () => {
    expect(expandMoveInDates([])).toEqual([]);
  });

  it("expands a date inside the 14-day window into every day until today+14", () => {
    // Earliest is today → should produce 15 consecutive days (today through today+14 inclusive)
    const result = expandMoveInDates(["2026-04-11"]);
    expect(result).toEqual([
      "2026-04-11",
      "2026-04-12",
      "2026-04-13",
      "2026-04-14",
      "2026-04-15",
      "2026-04-16",
      "2026-04-17",
      "2026-04-18",
      "2026-04-19",
      "2026-04-20",
      "2026-04-21",
      "2026-04-22",
      "2026-04-23",
      "2026-04-24",
      "2026-04-25",
    ]);
  });

  it("expands a date inside the window starting later than today", () => {
    // Earliest is 5 days from now → only 11 days (15 → 25)
    const result = expandMoveInDates(["2026-04-15"]);
    expect(result).toEqual([
      "2026-04-15",
      "2026-04-16",
      "2026-04-17",
      "2026-04-18",
      "2026-04-19",
      "2026-04-20",
      "2026-04-21",
      "2026-04-22",
      "2026-04-23",
      "2026-04-24",
      "2026-04-25",
    ]);
  });

  it("keeps a date outside the 14-day window as a single bookable date (no expansion)", () => {
    // 2026-05-01 is > today+14 → only that exact date is bookable
    expect(expandMoveInDates(["2026-05-01"])).toEqual(["2026-05-01"]);
    expect(expandMoveInDates(["2026-08-01"])).toEqual(["2026-08-01"]);
  });

  it("skips past dates", () => {
    expect(expandMoveInDates(["2026-04-01"])).toEqual([]);
    expect(expandMoveInDates(["2025-12-15"])).toEqual([]);
  });

  it("merges overlapping windows from multiple earliest dates without duplicates", () => {
    const result = expandMoveInDates(["2026-04-11", "2026-04-15"]);
    // Both expand into overlapping ranges; result is the union, deduped + sorted
    expect(result).toEqual([
      "2026-04-11",
      "2026-04-12",
      "2026-04-13",
      "2026-04-14",
      "2026-04-15",
      "2026-04-16",
      "2026-04-17",
      "2026-04-18",
      "2026-04-19",
      "2026-04-20",
      "2026-04-21",
      "2026-04-22",
      "2026-04-23",
      "2026-04-24",
      "2026-04-25",
    ]);
  });

  it("combines an in-window expansion with out-of-window single dates", () => {
    // Reproduces the real Berlin Mitte JUMBO case from the bug log:
    // earliest = today, 2026-05-01, 2026-06-01
    const result = expandMoveInDates(["2026-04-11", "2026-05-01", "2026-06-01"]);
    expect(result).toContain("2026-04-11"); // expanded
    expect(result).toContain("2026-04-25"); // expanded edge
    expect(result).toContain("2026-05-01"); // single
    expect(result).toContain("2026-06-01"); // single
    expect(result).not.toContain("2026-04-26"); // outside expansion
    expect(result).not.toContain("2026-05-02"); // never freed on this day
    expect(result).not.toContain("2026-08-01"); // never freed on this day
  });

  it("returns the result sorted ascending", () => {
    const result = expandMoveInDates(["2026-08-01", "2026-04-11", "2026-05-01"]);
    const sorted = [...result].sort();
    expect(result).toEqual(sorted);
  });
});

// ─── isMoveInDateBookable ───────────────────────────────────

describe("isMoveInDateBookable", () => {
  it("returns false when no earliest dates are given", () => {
    expect(isMoveInDateBookable("2026-04-15", [])).toBe(false);
  });

  // ── In-window earliest (≤ today+14) ──
  it("accepts any day inside the window for an in-window earliest", () => {
    const earliest = ["2026-04-11"]; // today
    expect(isMoveInDateBookable("2026-04-11", earliest)).toBe(true);
    expect(isMoveInDateBookable("2026-04-15", earliest)).toBe(true);
    expect(isMoveInDateBookable("2026-04-25", earliest)).toBe(true);
  });

  it("rejects days before an in-window earliest", () => {
    expect(isMoveInDateBookable("2026-04-10", ["2026-04-15"])).toBe(false);
    expect(isMoveInDateBookable("2026-04-14", ["2026-04-15"])).toBe(false);
  });

  it("rejects days after the 14-day window", () => {
    expect(isMoveInDateBookable("2026-04-26", ["2026-04-11"])).toBe(false);
    expect(isMoveInDateBookable("2026-05-01", ["2026-04-11"])).toBe(false);
  });

  // ── Out-of-window earliest (> today+14) ──
  it("requires an exact match for an out-of-window earliest", () => {
    expect(isMoveInDateBookable("2026-05-01", ["2026-05-01"])).toBe(true);
    expect(isMoveInDateBookable("2026-05-02", ["2026-05-01"])).toBe(false);
    expect(isMoveInDateBookable("2026-04-30", ["2026-05-01"])).toBe(false);
  });

  it("does NOT use >= for out-of-window earliest dates", () => {
    // Regression: earlier code used `>=` which let any later date book a
    // category that was actually only available on that exact day. This
    // test pins the contract.
    const earliest = ["2026-04-10", "2026-05-01", "2026-06-01"];
    expect(isMoveInDateBookable("2026-08-01", earliest)).toBe(false);
    expect(isMoveInDateBookable("2026-07-01", earliest)).toBe(false);
  });

  it("matches a category that has an in-window earliest even if the picked date is later in the window", () => {
    // The Berlin Mitte JUMBO scenario from the bug report
    const earliest = ["2026-04-11", "2026-05-01", "2026-06-01"];
    // Picking today is fine
    expect(isMoveInDateBookable("2026-04-11", earliest)).toBe(true);
    // Picking 2026-04-20 (inside 14-day window from today) is fine
    expect(isMoveInDateBookable("2026-04-20", earliest)).toBe(true);
    // Picking 2026-05-01 (exact future earliest) is fine
    expect(isMoveInDateBookable("2026-05-01", earliest)).toBe(true);
    // Picking 2026-08-01 must NOT be fine for this category
    expect(isMoveInDateBookable("2026-08-01", earliest)).toBe(false);
  });

  it("any earliest matching is enough, first hit wins", () => {
    const earliest = ["2026-04-10", "2026-05-01"];
    // 2026-05-01 is matched by the out-of-window exact match, even though
    // 2026-04-10 in-window also covers the date 2026-04-15.
    expect(isMoveInDateBookable("2026-05-01", earliest)).toBe(true);
  });
});

// ─── filterRoomsForPersons ──────────────────────────────────

type TestRoom = { name: string; forCouples?: boolean };

const ROOMS: TestRoom[] = [
  { name: "Mighty", forCouples: false },
  { name: "Premium", forCouples: false },
  { name: "Premium Balcony", forCouples: false },
  { name: "Premium+", forCouples: false },
  { name: "Premium+ Balcony", forCouples: true },
  { name: "Jumbo", forCouples: true },
  { name: "Jumbo Balcony", forCouples: true },
  { name: "Studio", forCouples: true },
];

describe("filterRoomsForPersons", () => {
  it("returns all rooms for 1 person", () => {
    expect(filterRoomsForPersons(ROOMS, 1)).toHaveLength(8);
  });

  it("returns only couple-friendly rooms for 2 persons", () => {
    const result = filterRoomsForPersons(ROOMS, 2);
    expect(result.map((r) => r.name)).toEqual([
      "Premium+ Balcony",
      "Jumbo",
      "Jumbo Balcony",
      "Studio",
    ]);
  });

  it("treats missing forCouples as false", () => {
    const rooms: TestRoom[] = [{ name: "Some Room" }];
    expect(filterRoomsForPersons(rooms, 2)).toEqual([]);
    expect(filterRoomsForPersons(rooms, 1)).toEqual(rooms);
  });

  it("does not mutate the input array", () => {
    const original = [...ROOMS];
    filterRoomsForPersons(ROOMS, 2);
    expect(ROOMS).toEqual(original);
  });
});

// ─── COUPLE_CATEGORIES constant ─────────────────────────────

describe("COUPLE_CATEGORIES", () => {
  it("contains exactly the four couple-friendly category enums", () => {
    expect(COUPLE_CATEGORIES.size).toBe(4);
    expect(COUPLE_CATEGORIES.has("JUMBO")).toBe(true);
    expect(COUPLE_CATEGORIES.has("JUMBO_BALCONY")).toBe(true);
    expect(COUPLE_CATEGORIES.has("STUDIO")).toBe(true);
    expect(COUPLE_CATEGORIES.has("PREMIUM_PLUS_BALCONY")).toBe(true);
  });

  it("does not include any non-couple categories", () => {
    expect(COUPLE_CATEGORIES.has("MIGHTY")).toBe(false);
    expect(COUPLE_CATEGORIES.has("PREMIUM")).toBe(false);
    expect(COUPLE_CATEGORIES.has("PREMIUM_BALCONY")).toBe(false);
    expect(COUPLE_CATEGORIES.has("PREMIUM_PLUS")).toBe(false);
    expect(COUPLE_CATEGORIES.has("BASIC_PLUS")).toBe(false);
  });
});
