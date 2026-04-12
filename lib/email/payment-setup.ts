import { resend, FROM, layout, detailRow, detailTable, ctaButton, badge, formatDate } from "./_shared";

// ─── Payment Setup Link (manual admin send) ───────────────────

interface PaymentSetupEmail {
  firstName: string;
  email: string;
  locationName: string;
  setupUrl: string;
}

export async function sendPaymentSetupLink(data: PaymentSetupEmail) {
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">Set up your monthly rent payment</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
      Hi ${data.firstName}, to make sure your monthly rent at STACEY ${data.locationName} is paid automatically,
      please set up your preferred payment method:
    </p>
    ${ctaButton("Set up payment method", data.setupUrl)}
    <p style="font-size:13px;color:#888;margin-top:16px;">
      You can choose between credit/debit card, SEPA Direct Debit, or other methods available in your country.
      After setup, your rent will be automatically charged on the 1st of each month.
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
  paymentMethodLabel: string;
}

export async function sendPaymentSetupConfirmation(data: PaymentSetupConfirmationEmail) {
  const rentEur = (data.monthlyRent / 100).toFixed(2);

  const html = layout(`
    ${badge("✓ Payment method confirmed", "green")}
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">You're all set!</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
      Hi ${data.firstName}, your payment method for STACEY ${data.locationName} is now set up.
    </p>
    ${detailTable(
      detailRow("Payment method", data.paymentMethodLabel) +
      detailRow("Monthly rent", `€${rentEur}`) +
      detailRow("Charged on", "1st of each month")
    )}
    <p style="font-size:14px;color:#555;line-height:1.6;">
      Your rent will be automatically charged on the 1st of each month.
      The first charge will be pro-rata for your move-in month.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `Payment method confirmed — STACEY ${data.locationName}`,
    html,
  });
}

// ─── Payment Setup Reminder (cron: day 1, 3, 7, 14) ────────

interface PaymentSetupReminderEmail {
  firstName: string;
  email: string;
  locationName: string;
  setupUrl: string;
  reminderNumber: number;
}

export async function sendPaymentSetupReminder(data: PaymentSetupReminderEmail) {
  const isUrgent = data.reminderNumber >= 3;

  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">${isUrgent ? "Reminder: " : ""}Set up your payment method</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
      Hi ${data.firstName}, just a friendly reminder to set up your monthly rent payment for STACEY ${data.locationName}.
      We need this before your move-in so we can automatically charge your rent each month.
    </p>
    ${ctaButton("Set up payment method", data.setupUrl)}
    ${isUrgent ? `<p style="font-size:13px;color:#c00;font-weight:600;margin-top:16px;">This is reminder ${data.reminderNumber} of 4. Please complete the setup as soon as possible.</p>` : ""}
  `);

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `${isUrgent ? "Reminder: " : ""}Set up your monthly rent payment — STACEY ${data.locationName}`,
    html,
  });
}

// ─── Payment Final Warning (3 days before move-in, no SEPA) ─

interface PaymentFinalWarningEmail {
  firstName: string;
  email: string;
  locationName: string;
  moveInDate: string;
  setupUrl: string;
}

export async function sendPaymentFinalWarning(data: PaymentFinalWarningEmail) {
  const html = layout(`
    ${badge("Action required", "red")}
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">Set up payment before your move-in</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
      Hi ${data.firstName}, your move-in to STACEY ${data.locationName} is on <strong>${formatDate(data.moveInDate)}</strong>
      but your payment method isn't set up yet.
    </p>
    <p style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px;">
      We can't send you your welcome email with check-in details until this is done. Please complete the setup now:
    </p>
    ${ctaButton("Set up payment method now", data.setupUrl, "red")}
    <p style="font-size:14px;color:#555;line-height:1.6;margin-top:16px;">
      Once set up, we'll immediately send you your check-in details.
      If you're having trouble, reply to this email and we'll help.
    </p>
  `, { accent: "red" });

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `Action required — Set up payment for STACEY ${data.locationName}`,
    html,
  });
}
