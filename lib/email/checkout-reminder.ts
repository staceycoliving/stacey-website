import { sendTrackedEmail, FROM, layout, detailRow, detailTable, formatDate, type SendMeta } from "./_shared";

type Meta = Omit<SendMeta, "templateKey"> | undefined;

interface CheckoutReminderData {
  firstName: string;
  email: string;
  locationName: string;
  locationAddress: string;
  checkOut: string;
}

export async function sendCheckoutReminder(data: CheckoutReminderData, meta?: Meta) {
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">Check-out tomorrow</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
      Hi ${data.firstName}, just a quick reminder — your stay at STACEY ${data.locationName} ends tomorrow.
    </p>
    ${detailTable(
      detailRow("Check-out", `${formatDate(data.checkOut)} · until 11 AM`) +
      detailRow("Address", data.locationAddress)
    )}
    <div style="background:#FAFAFA;border-radius:8px;padding:20px;margin-bottom:16px;">
      <p style="margin:0 0 10px;font-size:15px;font-weight:600;">Before you leave</p>
      <ul style="margin:0;padding-left:20px;font-size:14px;color:#555;line-height:1.8;">
        <li>Please check out by <strong>11 AM</strong></li>
        <li>Leave your room tidy — no need to clean, just the basics</li>
        <li>Your digital access will be deactivated automatically</li>
        <li>Don't forget to check for personal belongings</li>
      </ul>
    </div>
    <p style="font-size:14px;color:#555;line-height:1.6;">
      We hope you had a great time! If you need a late check-out, just reply to this email and we'll see what we can do.
    </p>
  `);

  return sendTrackedEmail(
    {
      from: FROM,
      to: data.email,
      subject: `Check-out reminder — STACEY ${data.locationName}`,
      html,
    },
    { templateKey: "checkout_reminder", ...meta }
  );
}
