import { resend, FROM, TEAM_EMAIL, layout, detailRow, categoryName, formatDate } from "./_shared";

interface TeamNotification {
  stayType: "SHORT" | "LONG";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  locationName: string;
  category: string;
  persons: number;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  moveInDate?: string;
  bookingId: string;
}

export async function sendTeamNotification(booking: TeamNotification) {
  const isShort = booking.stayType === "SHORT";
  const dateDetails = isShort
    ? `${detailRow("Check-in", formatDate(booking.checkIn!))}
       ${detailRow("Check-out", formatDate(booking.checkOut!))}
       ${detailRow("Nights", String(booking.nights))}`
    : detailRow("Move-in", formatDate(booking.moveInDate!));

  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:20px;">
      New ${isShort ? "booking" : "move-in request"} 🎉
    </h2>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#FAFAFA;border-radius:5px;padding:4px;">
      ${detailRow("Name", `${booking.firstName} ${booking.lastName}`)}
      ${detailRow("Email", `<a href="mailto:${booking.email}">${booking.email}</a>`)}
      ${detailRow("Phone", booking.phone)}
      ${detailRow("Location", `STACEY ${booking.locationName}`)}
      ${detailRow("Type", isShort ? "SHORT Stay" : "LONG Stay")}
      ${detailRow("Room", categoryName(booking.category))}
      ${detailRow("Persons", String(booking.persons))}
      ${dateDetails}
      ${detailRow("Booking ID", `<code style="font-size:12px;">${booking.bookingId}</code>`)}
    </table>
  `);

  return resend.emails.send({
    from: FROM,
    to: TEAM_EMAIL,
    subject: `[${isShort ? "SHORT" : "LONG"}] ${booking.firstName} ${booking.lastName} — STACEY ${booking.locationName}`,
    html,
  });
}
