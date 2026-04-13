import { resend, FROM, layout, detailRow, detailTable, formatDate } from "./_shared";

interface InvoiceEmailData {
  firstName: string;
  email: string;
  locationName: string;
  checkIn: string;
  checkOut: string;
  invoicePdf: Buffer;
  invoiceNumber: string;
}

export async function sendInvoice(data: InvoiceEmailData) {
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">Your invoice</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
      Hi ${data.firstName}, here's the invoice for your stay at STACEY ${data.locationName}.
    </p>
    ${detailTable(
      detailRow("Location", `STACEY ${data.locationName}`) +
      detailRow("Check-in", formatDate(data.checkIn)) +
      detailRow("Check-out", formatDate(data.checkOut)) +
      detailRow("Invoice", data.invoiceNumber)
    )}
    <div style="background:#FAFAFA;border-radius:8px;padding:16px;margin-bottom:20px;">
      <table style="border:0;border-collapse:collapse;"><tr>
        <td style="padding:0 14px 0 0;vertical-align:middle;">
          <div style="background:#e8f5e9;border-radius:6px;padding:8px 10px;">
            <span style="font-size:18px;">📎</span>
          </div>
        </td>
        <td style="padding:0;vertical-align:middle;">
          <p style="margin:0;font-size:14px;font-weight:600;">Invoice attached</p>
          <p style="margin:2px 0 0;font-size:13px;color:#888;">Please save for your records.</p>
        </td>
      </tr></table>
    </div>
    <p style="font-size:14px;color:#555;line-height:1.6;">
      Thank you for staying with us. Questions about your invoice? Just reply to this email.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `Invoice — STACEY ${data.locationName}`,
    html,
    attachments: [
      { filename: `invoice_${data.invoiceNumber}.pdf`, content: data.invoicePdf },
    ],
  });
}
