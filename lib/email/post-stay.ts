import { sendTrackedEmail, FROM, layout, ctaButton, detailRow, detailTable, formatDate, type SendMeta } from "./_shared";

type Meta = Omit<SendMeta, "templateKey"> | undefined;
import { env } from "@/lib/env";

interface PostStayEmailData {
  firstName: string;
  email: string;
  locationName: string;
  locationSlug: string;
  stayType: "SHORT" | "LONG";
  // SHORT stay only: invoice attachment
  checkIn?: string;
  checkOut?: string;
  invoicePdf?: Buffer;
  invoiceNumber?: string;
}

export async function sendPostStayFeedback(data: PostStayEmailData, meta?: Meta) {
  const stayLabel = data.stayType === "SHORT" ? "stay" : "time";

  const feedbackUrl = `${env.NEXT_PUBLIC_BASE_URL}/feedback?` + new URLSearchParams({
    location: data.locationSlug,
    name: `STACEY ${data.locationName}`,
    firstName: data.firstName,
    type: data.stayType,
  }).toString();

  const invoiceSection = data.invoicePdf && data.invoiceNumber
    ? `<div style="background:#FAFAFA;border-radius:8px;padding:16px;margin-bottom:24px;">
        <table style="border:0;border-collapse:collapse;"><tr>
          <td style="padding:0 14px 0 0;vertical-align:middle;">
            <div style="background:#e8f5e9;border-radius:6px;padding:8px 10px;">
              <span style="font-size:18px;">📎</span>
            </div>
          </td>
          <td style="padding:0;vertical-align:middle;">
            <p style="margin:0;font-size:14px;font-weight:600;">Your invoice is attached</p>
            <p style="margin:2px 0 0;font-size:13px;color:#888;">Invoice ${data.invoiceNumber}, please save for your records.</p>
          </td>
        </tr></table>
      </div>`
    : "";

  const stayDetails = data.checkIn && data.checkOut
    ? detailTable(
        detailRow("Location", `STACEY ${data.locationName}`) +
        detailRow("Check-in", formatDate(data.checkIn)) +
        detailRow("Check-out", formatDate(data.checkOut))
      )
    : "";

  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">Thanks for being part of STACEY, ${data.firstName}!</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
      We hope you enjoyed your ${stayLabel} at STACEY ${data.locationName}.
      It was great having you, our members make STACEY what it is.
    </p>
    ${stayDetails}
    ${invoiceSection}
    <div style="background:#FFF5F7;border-left:4px solid #FCB0C0;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:600;">How was your ${stayLabel}?</p>
      <p style="margin:0;font-size:14px;color:#555;line-height:1.5;">
        Your feedback helps us improve and helps future members find their new home.
        It only takes a minute.
      </p>
    </div>
    ${ctaButton("Rate your stay", feedbackUrl)}
    <p style="font-size:14px;color:#555;line-height:1.6;">
      ${data.stayType === "SHORT"
        ? "Thinking about a longer stay? Check out our <a href=\"https://stacey.de\" style=\"color:#1A1A1A;font-weight:600;\">long-term options</a>, many of our members started with a short stay."
        : "You'll always be part of the STACEY family. If you ever need a room again, you know where to find us."}
    </p>
  `);

  return sendTrackedEmail(
    {
      from: FROM,
      to: data.email,
      subject: `Thanks for staying at STACEY ${data.locationName}`,
      html,
      attachments:
        data.invoicePdf && data.invoiceNumber
          ? [{ filename: `invoice_${data.invoiceNumber}.pdf`, content: data.invoicePdf }]
          : undefined,
    },
    { templateKey: "post_stay_feedback", ...meta }
  );
}
