import { resend, FROM, layout, detailRow, detailTable, badge, categoryName, formatDate } from "./_shared";

interface ShortStayBooking {
  firstName: string;
  lastName: string;
  email: string;
  locationName: string;
  locationAddress: string;
  category: string;
  persons: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  grandTotal: number; // in EUR (e.g. 478.80)
  bookingId: string;
  heroImageUrl?: string; // Location community photo URL
}

export async function sendShortStayConfirmation(booking: ShortStayBooking) {
  const heroSection = booking.heroImageUrl
    ? `<div style="position:relative;">
        <img src="${booking.heroImageUrl}" alt="STACEY ${booking.locationName}" style="width:100%;height:200px;object-fit:cover;display:block;">
        <div style="position:absolute;bottom:0;left:0;right:0;height:60px;background:linear-gradient(transparent,rgba(0,0,0,0.4));"></div>
        <div style="position:absolute;bottom:12px;left:24px;color:#fff;font-size:13px;font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,0.5);">STACEY ${booking.locationName}</div>
      </div>`
    : "";

  const totalFormatted = booking.grandTotal.toFixed(2);

  const html = layout(`
    </div>
    ${heroSection}
    <div style="padding:32px;">
    ${badge("✓ Booking confirmed", "green")}
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">You're all set, ${booking.firstName}!</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
      Thanks for booking with Stacey. Here's everything you need to know:
    </p>
    ${detailTable(
      detailRow("Location", `STACEY ${booking.locationName}`) +
      detailRow("Address", booking.locationAddress) +
      detailRow("Room", categoryName(booking.category)) +
      detailRow("Guests", String(booking.persons)) +
      detailRow("Check-in", `${formatDate(booking.checkIn)} · from 4 PM`) +
      detailRow("Check-out", `${formatDate(booking.checkOut)} · until 11 AM`) +
      detailRow("Duration", `${booking.nights} nights`) +
      detailRow("Total paid", `€${totalFormatted} <span style="font-weight:400;color:#888;font-size:12px;">(incl. city tax)</span>`, { highlight: "green" })
    )}
    <div style="background:#FFF5F7;border-radius:8px;padding:20px;margin-bottom:20px;">
      <p style="margin:0 0 10px;font-size:15px;font-weight:600;">Check-in details</p>
      <p style="margin:0;font-size:14px;color:#555;line-height:1.6;">
        Come to <strong>${booking.locationAddress}</strong> from <strong>4 PM</strong>.
        You'll receive your digital access code and check-in instructions shortly before your arrival.
      </p>
    </div>
  `);

  return resend.emails.send({
    from: FROM,
    to: booking.email,
    subject: `Your booking at STACEY ${booking.locationName} is confirmed`,
    html,
  });
}
