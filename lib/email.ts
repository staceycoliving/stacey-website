import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "STACEY Coliving <booking@stacey.de>";
const TEAM_EMAIL = "booking@stacey.de";

// Category enum → human-readable name
const CATEGORY_NAMES: Record<string, string> = {
  BASIC_PLUS: "Basic+",
  MIGHTY: "Mighty",
  PREMIUM: "Premium",
  PREMIUM_PLUS: "Premium+",
  PREMIUM_BALCONY: "Premium Balcony",
  PREMIUM_PLUS_BALCONY: "Premium+ Balcony",
  JUMBO: "Jumbo",
  JUMBO_BALCONY: "Jumbo Balcony",
  STUDIO: "Studio",
  DUPLEX: "Duplex",
};

function categoryName(cat: string): string {
  return CATEGORY_NAMES[cat] || cat;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ─── Shared HTML Layout ─────────────────────────────────────

function layout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1A1A1A;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:5px;overflow:hidden;">
    <div style="background:#1A1A1A;padding:24px 32px;">
      <span style="color:#FCB0C0;font-size:22px;font-weight:700;letter-spacing:1px;">STACEY</span>
    </div>
    <div style="padding:32px;">
      ${content}
    </div>
    <div style="padding:20px 32px;background:#FAFAFA;font-size:13px;color:#888;text-align:center;">
      STACEY Coliving · stacey.de<br>
      Our members call us home.
    </div>
  </div>
</body>
</html>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 12px 6px 0;color:#888;font-size:14px;white-space:nowrap;">${label}</td>
    <td style="padding:6px 0;font-size:14px;font-weight:500;">${value}</td>
  </tr>`;
}

// ─── SHORT Stay: Guest Confirmation ─────────────────────────

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

// ─── LONG Stay: Guest Confirmation ──────────────────────────

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

// ─── Team Notification ──────────────────────────────────────

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
