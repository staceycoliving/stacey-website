import { resend, FROM, layout, detailRow } from "./_shared";

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

// ─── 1. Mahnung (Day 14) ────────────────────────────────────

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

// ─── 2. Mahnung + Kündigungsandrohung (Day 30) ──────────────

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
