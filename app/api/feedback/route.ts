import { NextRequest } from "next/server";
import { sendTeamNotification } from "@/lib/email";

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { location, locationName, firstName, stayType, rating, feedback } = body;

  if (!feedback?.trim() || !rating) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);

  // Send as team notification to booking@stacey.de
  try {
    await sendTeamNotification({
      stayType: stayType === "LONG" ? "LONG" : "SHORT",
      firstName: firstName || "Guest",
      lastName: "",
      email: "via feedback form",
      phone: "",
      locationName: locationName || location || "Unknown",
      category: "",
      persons: 1,
      ...(stayType === "SHORT"
        ? { checkIn: "", checkOut: "", nights: 0 }
        : { moveInDate: "" }),
      bookingId: `⚠️ Negative feedback (${stars}): ${feedback.slice(0, 200)}`,
    });
  } catch (err) {
    console.error("Feedback team notification error:", err);
  }

  return Response.json({ ok: true });
}
