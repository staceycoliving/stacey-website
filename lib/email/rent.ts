import { sendTrackedEmail, FROM, layout, detailRow, detailTable, ctaButton, warningBox, badge, type SendMeta } from "./_shared";

type Meta = Omit<SendMeta, "templateKey"> | undefined;

// ─── Rent Reminder (Day 3 — friendly) ─────────────────────────

interface RentReminderData {
  firstName: string;
  email: string;
  locationName: string;
  months: { month: string; amount: number }[]; // all unpaid months
  totalAmount: number; // in cents, sum of all unpaid
  paymentUpdateUrl: string;
}

export async function sendRentReminder(data: RentReminderData, meta?: Meta) {
  const totalEur = (data.totalAmount / 100).toFixed(2);
  const monthRows = data.months.map(m =>
    detailRow(m.month, `€${(m.amount / 100).toFixed(2)}`, { highlight: "orange" })
  ).join("");

  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">Rent payment issue</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
      Hi ${data.firstName}, we couldn't collect your rent for STACEY ${data.locationName}.
      This usually happens when your payment method has expired or is no longer valid.
    </p>
    ${detailTable(
      detailRow("Location", `STACEY ${data.locationName}`) +
      monthRows +
      detailRow("<strong>Total due</strong>", `<strong>€${totalEur}</strong>`, { highlight: "orange" })
    )}
    ${ctaButton("Update payment method", data.paymentUpdateUrl)}
    <p style="font-size:14px;color:#555;line-height:1.6;">
      Please update your payment method so we can retry the charge.
      If you think this is an error, just get in touch — we're happy to help.
    </p>
  `);

  return sendTrackedEmail(
    {
      from: FROM,
      to: data.email,
      subject: `Outstanding rent — €${totalEur}`,
      html,
    },
    { templateKey: "rent_reminder", ...meta }
  );
}

// ─── 1. Mahnung (Day 14) ────────────────────────────────────

interface MahnungData {
  firstName: string;
  lastName: string;
  email: string;
  locationName: string;
  months: { month: string; amount: number }[];
  totalAmount: number; // in cents
  paymentUpdateUrl: string;
}

export async function sendMahnung1(data: MahnungData, meta?: Meta) {
  const totalEur = (data.totalAmount / 100).toFixed(2);
  const monthRows = data.months.map(m =>
    detailRow(m.month, `€${(m.amount / 100).toFixed(2)}`, { highlight: "orange" })
  ).join("");

  const html = layout(`
    ${badge("First notice", "orange")}
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">Outstanding rent — first notice</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
      Hi ${data.firstName},
    </p>
    <p style="font-size:14px;color:#555;line-height:1.6;margin-bottom:20px;">
      Despite our previous reminder, we have not yet received your rent payment.
      Please arrange payment immediately.
    </p>
    ${detailTable(
      detailRow("Location", `STACEY ${data.locationName}`) +
      monthRows +
      detailRow("<strong>Total outstanding</strong>", `<strong>€${totalEur}</strong>`, { highlight: "orange" })
    )}
    ${ctaButton("Update payment method", data.paymentUpdateUrl)}
    <p style="font-size:14px;color:#555;line-height:1.6;">
      If you are experiencing difficulties, please contact us so we can find a solution together.
    </p>
  `, { accent: "orange" });

  return sendTrackedEmail(
    {
      from: FROM,
      to: data.email,
      subject: `Outstanding rent — first notice (€${totalEur})`,
      html,
    },
    { templateKey: "mahnung1", ...meta }
  );
}

// ─── 2. Mahnung (Day 30) ──────────────────────────────────

export async function sendMahnung2(data: MahnungData, meta?: Meta) {
  const totalEur = (data.totalAmount / 100).toFixed(2);
  const monthRows = data.months.map(m =>
    detailRow(m.month, `€${(m.amount / 100).toFixed(2)}`, { highlight: "red" })
  ).join("");

  const html = layout(`
    ${badge("Second notice", "red")}
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">Outstanding rent — second notice</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
      Dear ${data.firstName} ${data.lastName},
    </p>
    <p style="font-size:14px;color:#555;line-height:1.6;margin-bottom:20px;">
      Your rent remains unpaid despite two prior notices.
      This is the second and final reminder before further action is taken.
    </p>
    ${detailTable(
      detailRow("Location", `STACEY ${data.locationName}`) +
      monthRows +
      detailRow("<strong>Total outstanding</strong>", `<strong>€${totalEur}</strong>`, { highlight: "red" })
    )}
    ${warningBox("Continued non-payment may result in termination of your lease.")}
    ${ctaButton(`Pay now — €${totalEur}`, data.paymentUpdateUrl, "red")}
    <p style="font-size:14px;color:#555;line-height:1.6;">
      If you are facing financial difficulties, please contact us immediately.
      We want to find a solution together.
    </p>
  `, { accent: "red" });

  return sendTrackedEmail(
    {
      from: FROM,
      to: data.email,
      subject: `Outstanding rent — second notice (€${totalEur})`,
      html,
    },
    { templateKey: "mahnung2", ...meta }
  );
}
