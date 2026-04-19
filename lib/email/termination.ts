import { sendTrackedEmail, FROM, layout, detailRow, formatDate, type SendMeta } from "./_shared";

type Meta = Omit<SendMeta, "templateKey"> | undefined;

interface TerminationData {
  firstName: string;
  lastName: string;
  email: string;
  locationName: string;
  moveOutDate: string;
  reason: string;
}

export async function sendTerminationNotice(data: TerminationData, meta?: Meta) {
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

  return sendTrackedEmail(
    {
      from: FROM,
      to: data.email,
      subject: `Termination notice — STACEY ${data.locationName}`,
      html,
    },
    { templateKey: "termination", ...meta }
  );
}
