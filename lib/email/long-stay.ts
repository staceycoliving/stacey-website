import { resend, FROM, layout, detailRow, categoryName, formatDate } from "./_shared";

interface LongStayBooking {
  firstName: string;
  lastName: string;
  email: string;
  locationName: string;
  category: string;
  persons: number;
  moveInDate: string;
  bookingId: string;
}

export async function sendLongStayConfirmation(booking: LongStayBooking) {
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:20px;">Move-in request received!</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">
      Hi ${booking.firstName}, thanks for your interest in STACEY. We've received your move-in request:
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#FAFAFA;border-radius:5px;padding:4px;">
      ${detailRow("Location", `STACEY ${booking.locationName}`)}
      ${detailRow("Room type", categoryName(booking.category))}
      ${detailRow("Persons", String(booking.persons))}
      ${detailRow("Move-in", formatDate(booking.moveInDate))}
      ${detailRow("Booking ID", `<code style="font-size:12px;">${booking.bookingId}</code>`)}
    </table>
    <p style="font-size:14px;color:#555;">
      <strong>What happens next?</strong><br>
      Our team will review your request and get back to you within 1-2 business days
      with your lease agreement and next steps.
    </p>
    <p style="font-size:14px;color:#555;margin-top:16px;">
      Questions? Just reply to this email.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: booking.email,
    subject: `Your move-in request at STACEY ${booking.locationName}`,
    html,
  });
}
