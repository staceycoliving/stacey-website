import { NextRequest, NextResponse } from "next/server";
import { getShortStayCalendarAvailability } from "@/lib/apaleo";

// Per-day availability for the entire SHORT portfolio, 180 days ahead.
// Frontend uses this to grey out fully-booked dates in the calendar.
//
// Cache at the edge for 30 minutes — apaleo availability changes slowly
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
  const from = todayLocal();
  const to = addDays(from, 180);

  try {
    const { unavailableDates } = await getShortStayCalendarAvailability(persons, from, to);
    return NextResponse.json({
      ok: true,
      data: { unavailableDates, from, to, persons },
    });
  } catch (err) {
    console.error("short-availability-calendar error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch availability" },
      { status: 502 },
    );
  }
}
