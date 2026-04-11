import { resend, FROM, layout, detailRow, categoryName, formatDate } from "./_shared";

// ─── Deposit Payment Link ───────────────────────────────────

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

// ─── Deposit Confirmed ──────────────────────────────────────

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

// ─── Deposit Timeout ────────────────────────────────────────

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

// ─── Deposit Return Notification ────────────────────────────

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
