import { resend, FROM, layout, detailRow, categoryName, formatDate } from "./_shared";

interface ShortStayBooking {
  firstName: string;
  lastName: string;
  email: string;
  locationName: string;
  category: string;
  persons: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  bookingId: string;
}

export async function sendShortStayConfirmation(booking: ShortStayBooking) {
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:20px;">Booking confirmed!</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">
      Hi ${booking.firstName}, thanks for booking with STACEY. Here are your details:
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#FAFAFA;border-radius:5px;padding:4px;">
      ${detailRow("Location", `STACEY ${booking.locationName}`)}
      ${detailRow("Room type", categoryName(booking.category))}
      ${detailRow("Guests", String(booking.persons))}
      ${detailRow("Check-in", formatDate(booking.checkIn))}
      ${detailRow("Check-out", formatDate(booking.checkOut))}
      ${detailRow("Nights", String(booking.nights))}
      ${detailRow("Booking ID", `<code style="font-size:12px;">${booking.bookingId}</code>`)}
    </table>
    <p style="font-size:14px;color:#555;">
      <strong>Check-in:</strong> from 4 PM · <strong>Check-out:</strong> until 11 AM
    </p>
    <p style="font-size:14px;color:#555;margin-top:16px;">
      We'll send you all the details about your stay a few days before your arrival.
      If you have any questions, just reply to this email.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: booking.email,
    subject: `Your booking at STACEY ${booking.locationName} is confirmed`,
    html,
  });
}
