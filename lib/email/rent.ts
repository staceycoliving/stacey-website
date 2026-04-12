import { resend, FROM, layout, detailRow, detailTable, ctaButton, warningBox, badge } from "./_shared";

// ─── Rent Reminder (Day 3 — friendly) ─────────────────────────

interface RentReminderData {
  firstName: string;
  email: string;
  locationName: string;
  month: string;
  amount: number; // in cents
  paymentUpdateUrl?: string;
}

export async function sendRentReminder(data: RentReminderData) {
  const amountEur = (data.amount / 100).toFixed(2);

  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">Rent for ${data.month} — payment issue</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
      Hi ${data.firstName}, we couldn't collect your rent for <strong>${data.month}</strong>.
      This usually happens when a card has expired or a SEPA mandate was revoked.
    </p>
    ${detailTable(
      detailRow("Location", `STACEY ${data.locationName}`) +
      detailRow("Month", data.month) +
      detailRow("Amount due", `€${amountEur}`, { highlight: "orange" })
    )}
    ${data.paymentUpdateUrl ? ctaButton("Update payment method", data.paymentUpdateUrl) : ""}
    <p style="font-size:14px;color:#555;line-height:1.6;">
      Please update your payment method so we can retry the charge.
      If you think this is an error, just get in touch — we're happy to help.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `Rent for ${data.month} — payment issue`,
    html,
  });
}

// ─── 1. Mahnung (Day 14) ────────────────────────────────────

interface MahnungData {
  firstName: string;
  lastName: string;
  email: string;
  locationName: string;
  month: string;
  amount: number; // in cents
  paymentUpdateUrl?: string;
}

export async function sendMahnung1(data: MahnungData) {
  const amountEur = (data.amount / 100).toFixed(2);

  const html = layout(`
    ${badge("First notice", "orange")}
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">Outstanding rent — first notice</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
      Hi ${data.firstName},
    </p>
    <p style="font-size:14px;color:#555;line-height:1.6;margin-bottom:20px;">
      Despite our previous reminder, we have not yet received your rent payment for <strong>${data.month}</strong>.
      Please arrange payment immediately.
    </p>
    ${detailTable(
      detailRow("Location", `STACEY ${data.locationName}`) +
      detailRow("Month", data.month) +
      detailRow("Outstanding", `€${amountEur}`, { highlight: "orange" })
    )}
    ${data.paymentUpdateUrl ? ctaButton("Update payment method", data.paymentUpdateUrl) : ""}
    <p style="font-size:14px;color:#555;line-height:1.6;">
      If you are experiencing difficulties, please contact us so we can find a solution together.
    </p>
  `, { accent: "orange" });

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `Outstanding rent — first notice (${data.month})`,
    html,
  });
}

// ─── 2. Mahnung (Day 30) ──────────────────────────────────

export async function sendMahnung2(data: MahnungData) {
  const amountEur = (data.amount / 100).toFixed(2);

  const html = layout(`
    ${badge("Second notice", "red")}
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">Outstanding rent — second notice</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
      Dear ${data.firstName} ${data.lastName},
    </p>
    <p style="font-size:14px;color:#555;line-height:1.6;margin-bottom:20px;">
      Your rent for <strong>${data.month}</strong> remains unpaid despite two prior notices.
      This is the second and final reminder before further action is taken.
    </p>
    ${detailTable(
      detailRow("Location", `STACEY ${data.locationName}`) +
      detailRow("Month", data.month) +
      detailRow("Outstanding", `€${amountEur}`, { highlight: "red" })
    )}
    ${warningBox("Continued non-payment may result in termination of your lease.")}
    ${ctaButton(`Pay now — €${amountEur}`, data.paymentUpdateUrl || "#", "red")}
    <p style="font-size:14px;color:#555;line-height:1.6;">
      If you are facing financial difficulties, please contact us immediately.
      We want to find a solution together.
    </p>
  `, { accent: "red" });

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `Outstanding rent — second notice (${data.month})`,
    html,
  });
}
