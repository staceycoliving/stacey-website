import { resend, FROM, layout, detailRow, formatDate } from "./_shared";

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

// ─── Payment Setup Confirmation ─────────────────────────────

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

// ─── Payment Setup Reminder ─────────────────────────────────

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

// ─── Payment Final Warning (3 days before move-in) ──────────

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
