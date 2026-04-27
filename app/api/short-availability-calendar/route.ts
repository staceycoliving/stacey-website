import { NextRequest, NextResponse } from "next/server";
import { getShortStayCalendarAvailability } from "@/lib/apaleo";

// Per-day availability for the entire SHORT portfolio, 365 days ahead.
// Frontend uses this to grey out fully-booked dates in the calendar.
// 365d covers the typical "book a year out" pattern; apaleo rate plans
// drive the actual cutoffs per property/category, the frontend just
// needs enough window to reach them.
//
// Cache at the edge for 30 minutes, apaleo availability changes slowly
// and we don't need to re-fetch on every calendar open.

export const revalidate = 1800;

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const personsRaw = req.nextUrl.searchParams.get("persons");
  const persons = personsRaw === "2" ? 2 : 1;
  // Optional per-location scope: `?slug=alster` → only that property's
  // inventory / restrictions. Omitted = portfolio-wide (homepage/move-in).
  const slug = req.nextUrl.searchParams.get("slug") || undefined;
  const from = todayLocal();
  const to = addDays(from, 365);

  try {
    const { availableSlotsPerDate, minNights, maxNights, dateRestrictions } =
      await getShortStayCalendarAvailability(persons, from, to, slug);
    return NextResponse.json({
      ok: true,
      data: {
        availableSlotsPerDate,
        minNights,
        maxNights,
        dateRestrictions,
        from,
        to,
        persons,
        slug: slug ?? null,
      },
    });
  } catch (err) {
    console.error("short-availability-calendar error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch availability" },
      { status: 502 },
    );
  }
}
