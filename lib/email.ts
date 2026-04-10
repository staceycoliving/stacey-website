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

// ─── LONG Stay: Deposit Payment Link ───────────────────────

interface DepositPaymentEmail {
  firstName: string;
  email: string;
  locationName: string;
  roomCategory: string;
  monthlyRent: number; // in cents
  depositAmount: number; // in cents
  depositPaymentUrl: string;
  deadlineHours: number;
  signedLeasePdf?: Buffer; // Optional signed lease document
}

export async function sendDepositPaymentLink(data: DepositPaymentEmail) {
  const rentEur = (data.monthlyRent / 100).toFixed(2);
  const depositEur = (data.depositAmount / 100).toFixed(2);

  const leaseNote = data.signedLeasePdf
    ? `<p style="font-size:13px;color:#555;margin-top:16px;">📎 Your signed lease agreement is attached to this email.</p>`
    : "";

  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:20px;">Booking confirmed — deposit payment</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">
      Hi ${data.firstName}, your lease is signed and your booking fee has been received. One last step to secure your room:
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#FAFAFA;border-radius:5px;padding:4px;">
      ${detailRow("Location", `STACEY ${data.locationName}`)}
      ${detailRow("Room type", categoryName(data.roomCategory))}
      ${detailRow("Monthly rent", `€${rentEur}`)}
      ${detailRow("Security deposit", `€${depositEur} (2× monthly rent)`)}
    </table>
    <p style="font-size:14px;color:#c00;font-weight:600;margin-bottom:16px;">
      ⏰ Please pay within ${data.deadlineHours} hours to secure your room.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${data.depositPaymentUrl}" style="background:#1A1A1A;color:#fff;padding:14px 32px;border-radius:5px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
        Pay deposit — €${depositEur}
      </a>
    </div>
    ${leaseNote}
    <p style="font-size:13px;color:#888;margin-top:16px;">
      If the deposit is not received within ${data.deadlineHours} hours, your room reservation will be released.
      The booking fee (€195) is non-refundable.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `STACEY ${data.locationName} — Booking confirmed, deposit due`,
    html,
    attachments: data.signedLeasePdf
      ? [{ filename: "lease-agreement.pdf", content: data.signedLeasePdf }]
      : undefined,
  });
}

// ─── LONG Stay: Deposit Confirmed ──────────────────────────

interface DepositConfirmationEmail {
  firstName: string;
  email: string;
  locationName: string;
  moveInDate: string;
  depositAmount: number; // in cents
  paymentSetupUrl?: string; // Optional setup link for monthly rent
}

export async function sendDepositConfirmation(data: DepositConfirmationEmail) {
  const depositEur = (data.depositAmount / 100).toFixed(2);

  const setupSection = data.paymentSetupUrl
    ? `
    <div style="margin-top:24px;padding:20px;background:#FFF5F7;border-left:4px solid #FCB0C0;border-radius:5px;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:600;">One last step: set up your monthly rent payment</p>
      <p style="margin:0 0 16px;color:#555;font-size:14px;">
        So we can automatically charge your rent each month, please set up your preferred payment method.
        It only takes a minute.
      </p>
      <div style="text-align:center;">
        <a href="${data.paymentSetupUrl}" style="background:#1A1A1A;color:#fff;padding:12px 28px;border-radius:5px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
          Set up payment method
        </a>
      </div>
      <p style="margin:12px 0 0;font-size:12px;color:#888;text-align:center;">
        Card, SEPA Direct Debit, and other methods available based on your country.
      </p>
    </div>
    `
    : "";

  const nextStepsText = data.paymentSetupUrl
    ? "Set up your payment method (link above) and we'll send you a welcome email with check-in details 3 days before your move-in."
    : "We'll send you a welcome email with check-in details 3 days before your move-in.";

  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:20px;">Welcome to STACEY! 🎉</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">
      Hi ${data.firstName}, your deposit of €${depositEur} has been received.
      Your move-in is confirmed!
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#FAFAFA;border-radius:5px;padding:4px;">
      ${detailRow("Location", `STACEY ${data.locationName}`)}
      ${detailRow("Move-in", formatDate(data.moveInDate))}
      ${detailRow("Deposit", `€${depositEur} ✓`)}
    </table>
    ${setupSection}
    <p style="font-size:14px;color:#555;margin-top:24px;">
      <strong>What happens next?</strong><br>
      ${nextStepsText}
    </p>
    <p style="font-size:14px;color:#555;margin-top:16px;">
      Questions? Just reply to this email.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `Deposit received — Welcome to STACEY ${data.locationName}`,
    html,
  });
}

// ─── LONG Stay: Deposit Timeout ────────────────────────────

interface DepositTimeoutEmail {
  firstName: string;
  email: string;
  locationName: string;
}

export async function sendDepositTimeoutNotification(data: DepositTimeoutEmail) {
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:20px;">Room reservation expired</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">
      Hi ${data.firstName}, the deposit deadline for your room at STACEY ${data.locationName} has passed.
    </p>
    <p style="font-size:14px;color:#555;">
      Your room reservation has been released. The booking fee (€195) is non-refundable as stated in our terms.
    </p>
    <p style="font-size:14px;color:#555;margin-top:16px;">
      If you'd like to try again, visit <a href="https://stacey.de/move-in" style="color:#1A1A1A;font-weight:600;">stacey.de/move-in</a>.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `Room reservation expired — STACEY ${data.locationName}`,
    html,
  });
}

// ─── Payment Setup Link ─────────────────────────────────────

interface PaymentSetupEmail {
  firstName: string;
  email: string;
  locationName: string;
  setupUrl: string;
}

export async function sendPaymentSetupLink(data: PaymentSetupEmail) {
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:20px;">Set up your monthly rent payment</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">
      Hi ${data.firstName}, welcome to STACEY ${data.locationName}!
    </p>
    <p style="font-size:14px;color:#555;margin-bottom:16px;">
      To make sure your monthly rent is paid automatically, please set up your preferred payment method:
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${data.setupUrl}" style="background:#1A1A1A;color:#fff;padding:14px 32px;border-radius:5px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
        Set up payment method
      </a>
    </div>
    <p style="font-size:13px;color:#888;margin-top:16px;">
      You can choose between:
    </p>
    <ul style="font-size:13px;color:#888;margin:8px 0;padding-left:20px;">
      <li>Credit/debit card (works worldwide)</li>
      <li>SEPA Direct Debit (EU bank accounts)</li>
      <li>Other payment methods available in your country</li>
    </ul>
    <p style="font-size:13px;color:#888;margin-top:16px;">
      After setup, your monthly rent will be automatically charged on the 1st of each month.
      You can update your payment method anytime through the same link.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `Set up your monthly rent payment — STACEY ${data.locationName}`,
    html,
  });
}

// ─── Payment Setup Confirmation ────────────────────────────

interface PaymentSetupConfirmationEmail {
  firstName: string;
  email: string;
  locationName: string;
  monthlyRent: number; // in cents
  paymentMethodLabel: string; // e.g. "Visa ****4242" or "SEPA Direct Debit"
}

export async function sendPaymentSetupConfirmation(data: PaymentSetupConfirmationEmail) {
  const rentEur = (data.monthlyRent / 100).toFixed(2);

  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:20px;">Payment method confirmed ✓</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">
      Hi ${data.firstName}, your payment method for STACEY ${data.locationName} is now set up.
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#FAFAFA;border-radius:5px;padding:4px;">
      ${detailRow("Payment method", data.paymentMethodLabel)}
      ${detailRow("Monthly rent", `€${rentEur}`)}
      ${detailRow("Charged on", "1st of each month")}
    </table>
    <p style="font-size:14px;color:#555;">
      <strong>What happens next?</strong><br>
      Your rent will be automatically charged on the 1st of each month. The first charge will be pro-rata for your move-in month.
    </p>
    <p style="font-size:14px;color:#555;margin-top:16px;">
      If you ever need to update your payment method or have questions, just reply to this email.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `Payment method confirmed — STACEY ${data.locationName}`,
    html,
  });
}

// ─── Payment Setup Reminder ────────────────────────────────

interface PaymentSetupReminderEmail {
  firstName: string;
  email: string;
  locationName: string;
  setupUrl: string;
  reminderNumber: number; // 1, 2, 3, or 4
}

export async function sendPaymentSetupReminder(data: PaymentSetupReminderEmail) {
  const isUrgent = data.reminderNumber >= 3;

  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:20px;">${isUrgent ? "Reminder: " : ""}Set up your payment method</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">
      Hi ${data.firstName}, just a friendly reminder to set up your monthly rent payment for STACEY ${data.locationName}.
    </p>
    <p style="font-size:14px;color:#555;margin-bottom:16px;">
      We need this set up before your move-in so we can automatically charge your rent each month.
      It only takes a minute.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${data.setupUrl}" style="background:#1A1A1A;color:#fff;padding:14px 32px;border-radius:5px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
        Set up payment method
      </a>
    </div>
    ${isUrgent ? `<p style="font-size:13px;color:#c00;font-weight:600;margin-top:16px;">⚠ This is reminder ${data.reminderNumber} of 4. Please complete the setup as soon as possible.</p>` : ""}
    <p style="font-size:13px;color:#888;margin-top:16px;">
      Need help? Just reply to this email.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `${isUrgent ? "Reminder: " : ""}Set up your monthly rent payment — STACEY ${data.locationName}`,
    html,
  });
}

// ─── Payment Final Warning (3 days before move-in) ─────────

interface PaymentFinalWarningEmail {
  firstName: string;
  email: string;
  locationName: string;
  moveInDate: string;
  setupUrl: string;
}

export async function sendPaymentFinalWarning(data: PaymentFinalWarningEmail) {
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#c00;">⚠ Action required before your move-in</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">
      Hi ${data.firstName}, your move-in to STACEY ${data.locationName} is on <strong>${formatDate(data.moveInDate)}</strong>.
    </p>
    <p style="font-size:14px;color:#555;margin-bottom:16px;">
      We were going to send you your welcome email today with check-in details — but your payment method
      isn't set up yet. We can't proceed with your move-in until this is done.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${data.setupUrl}" style="background:#c00;color:#fff;padding:14px 32px;border-radius:5px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
        Set up payment method now
      </a>
    </div>
    <p style="font-size:13px;color:#555;margin-top:16px;">
      Once you've set up your payment method, we'll immediately send you the welcome email with all check-in details.
    </p>
    <p style="font-size:13px;color:#888;margin-top:16px;">
      If you're having trouble, please reply to this email and we'll help you sort it out.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `⚠ Action required — Set up payment for STACEY ${data.locationName}`,
    html,
  });
}

// ─── Rent Reminder (Day 3) ──────────────────────────────────

interface RentReminderData {
  firstName: string;
  email: string;
  locationName: string;
  month: string;
  amount: number; // in cents
}

export async function sendRentReminder(data: RentReminderData) {
  const amountEur = (data.amount / 100).toFixed(2);

  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:20px;">Rent reminder</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">
      Hi ${data.firstName}, we noticed your rent for <strong>${data.month}</strong> hasn't been received yet.
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#FAFAFA;border-radius:5px;padding:4px;">
      ${detailRow("Location", `STACEY ${data.locationName}`)}
      ${detailRow("Month", data.month)}
      ${detailRow("Amount due", `€${amountEur}`)}
    </table>
    <p style="font-size:14px;color:#555;">
      If you've already paid, please disregard this message. Otherwise, please arrange payment at your earliest convenience.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `Rent reminder — ${data.month}`,
    html,
  });
}

// ─── 1. Mahnung (Day 14) ───────────────────────────────────

interface MahnungData {
  firstName: string;
  lastName: string;
  email: string;
  locationName: string;
  month: string;
  amount: number; // in cents
}

export async function sendMahnung1(data: MahnungData) {
  const amountEur = (data.amount / 100).toFixed(2);

  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:20px;">1. Mahnung — Mietrückstand</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">
      Dear ${data.firstName} ${data.lastName},
    </p>
    <p style="font-size:14px;color:#555;margin-bottom:16px;">
      Despite our previous reminder, we have not yet received your rent payment for <strong>${data.month}</strong>.
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#FAFAFA;border-radius:5px;padding:4px;">
      ${detailRow("Location", `STACEY ${data.locationName}`)}
      ${detailRow("Month", data.month)}
      ${detailRow("Outstanding", `€${amountEur}`)}
    </table>
    <p style="font-size:14px;color:#555;">
      Please arrange payment immediately. If you are experiencing difficulties, please contact us so we can find a solution together.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `1. Mahnung — Mietrückstand ${data.month}`,
    html,
  });
}

// ─── 2. Mahnung + Kündigungsandrohung (Day 30) ─────────────

export async function sendMahnung2(data: MahnungData) {
  const amountEur = (data.amount / 100).toFixed(2);

  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#c00;">2. Mahnung — Kündigungsandrohung</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">
      Dear ${data.firstName} ${data.lastName},
    </p>
    <p style="font-size:14px;color:#555;margin-bottom:16px;">
      Your rent for <strong>${data.month}</strong> remains unpaid despite two prior reminders.
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#FAFAFA;border-radius:5px;padding:4px;">
      ${detailRow("Location", `STACEY ${data.locationName}`)}
      ${detailRow("Month", data.month)}
      ${detailRow("Outstanding", `€${amountEur}`)}
    </table>
    <p style="font-size:14px;color:#c00;font-weight:600;">
      Please be advised that continued non-payment (2 or more months) will result in termination of your lease with 3 months' notice.
    </p>
    <p style="font-size:14px;color:#555;margin-top:16px;">
      If you are facing financial difficulties, please reach out to us immediately. We want to help find a solution before it comes to that.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `2. Mahnung — Kündigungsandrohung ${data.month}`,
    html,
  });
}

// ─── Termination Notice ────────────────────────────────────

interface TerminationData {
  firstName: string;
  lastName: string;
  email: string;
  locationName: string;
  moveOutDate: string;
  reason: string;
}

export async function sendTerminationNotice(data: TerminationData) {
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:20px;">Termination notice</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">
      Dear ${data.firstName} ${data.lastName},
    </p>
    <p style="font-size:14px;color:#555;margin-bottom:16px;">
      We regret to inform you that your lease at STACEY ${data.locationName} has been terminated.
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#FAFAFA;border-radius:5px;padding:4px;">
      ${detailRow("Location", `STACEY ${data.locationName}`)}
      ${detailRow("Move-out date", formatDate(data.moveOutDate))}
      ${detailRow("Reason", data.reason)}
    </table>
    <p style="font-size:14px;color:#555;">
      Please ensure your room is vacated by the move-out date. Your security deposit will be processed after a final inspection.
    </p>
    <p style="font-size:14px;color:#555;margin-top:16px;">
      If you have any questions, please contact us.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `Termination notice — STACEY ${data.locationName}`,
    html,
  });
}

// ─── Deposit Return Notification ───────────────────────────

interface DepositReturnData {
  firstName: string;
  email: string;
  locationName: string;
  depositAmount: number;
  damagesAmount: number;
  arrearsAmount: number;
  refundAmount: number;
  iban: string;
}

export async function sendDepositReturnNotification(data: DepositReturnData) {
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:20px;">Deposit settlement</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">
      Hi ${data.firstName}, here's your deposit settlement for STACEY ${data.locationName}:
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#FAFAFA;border-radius:5px;padding:4px;">
      ${detailRow("Security deposit", `€${(data.depositAmount / 100).toFixed(2)}`)}
      ${detailRow("Damages", data.damagesAmount > 0 ? `- €${(data.damagesAmount / 100).toFixed(2)}` : "€0.00")}
      ${detailRow("Rent arrears", data.arrearsAmount > 0 ? `- €${(data.arrearsAmount / 100).toFixed(2)}` : "€0.00")}
      ${detailRow("<strong>Refund amount</strong>", `<strong>€${(data.refundAmount / 100).toFixed(2)}</strong>`)}
    </table>
    <p style="font-size:14px;color:#555;">
      The refund of <strong>€${(data.refundAmount / 100).toFixed(2)}</strong> will be transferred to your bank account ending in ...${data.iban.slice(-4)}.
    </p>
    <p style="font-size:14px;color:#555;margin-top:16px;">
      Please allow 3-5 business days for the transfer to complete. If you have any questions about this settlement, please contact us.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `Deposit settlement — STACEY ${data.locationName}`,
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
