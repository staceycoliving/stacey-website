import { resend, FROM, layout, detailRow, detailTable, infoBox, formatDate } from "./_shared";
import { generateWohnungsgeberbestaetigung } from "@/lib/wohnungsgeberbestaetigung";
import { uploadLongstayDocument } from "@/lib/google-drive";

interface WelcomeEmailData {
  firstName: string;
  lastName: string;
  email: string;
  locationName: string;
  locationAddress: string;
  locationSlug: string;
  roomNumber: string;
  moveInDate: string;
  floor?: string;
  secondPerson?: { firstName: string; lastName: string };
}

export async function sendWelcomeEmail(data: WelcomeEmailData) {
  // Generate Wohnungsgeberbestätigung PDF
  let wohnungsgeberPdf: Buffer | null = null;
  try {
    const persons = [{ firstName: data.firstName, lastName: data.lastName }];
    if (data.secondPerson) persons.push(data.secondPerson);

    wohnungsgeberPdf = await generateWohnungsgeberbestaetigung({
      persons,
      moveInDate: data.moveInDate,
      roomNumber: data.roomNumber,
      locationSlug: data.locationSlug,
      floor: data.floor,
    });
  } catch (err) {
    console.error("Failed to generate Wohnungsgeberbestätigung:", err);
  }

  // Upload to Google Drive (non-blocking)
  if (wohnungsgeberPdf) {
    uploadLongstayDocument({
      pdf: wohnungsgeberPdf,
      firstName: data.firstName,
      lastName: data.lastName,
      locationName: data.locationName,
      date: data.moveInDate,
      documentType: "Wohnungsgeberbestätigung",
    }).catch(err => console.error("Wohnungsgeberbestätigung Drive upload failed:", err));
  }

  const pdfFilename = `wohnungsgeberbestaetigung_${data.firstName.toLowerCase()}_${data.lastName.toLowerCase()}.pdf`;

  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">See you soon, ${data.firstName}!</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
      We're excited to welcome you to STACEY ${data.locationName}. Here's everything you need for your move-in:
    </p>
    ${detailTable(
      detailRow("Move-in", formatDate(data.moveInDate)) +
      detailRow("Address", data.locationAddress) +
      detailRow("Room", `#${data.roomNumber}`) +
      detailRow("Check-in", "From 4 PM")
    )}
    ${infoBox(`
      <p style="margin:0 0 10px;font-size:15px;font-weight:600;">How to check in</p>
      <p style="margin:0;font-size:14px;color:#555;line-height:1.6;">
        Come to <strong>${data.locationAddress}</strong> from <strong>4 PM</strong>.
        You'll receive a separate email from our digital key provider to set up your access.
        Once registered, your access to the building, your room and all community spaces
        will be activated automatically.
      </p>
    `, { pink: true })}
    ${wohnungsgeberPdf ? `
    <div style="background:#FAFAFA;border-radius:8px;padding:16px;margin-bottom:20px;">
      <table style="border:0;border-collapse:collapse;"><tr>
        <td style="padding:0 14px 0 0;vertical-align:middle;">
          <div style="background:#e8f5e9;border-radius:6px;padding:8px 10px;">
            <span style="font-size:18px;">📎</span>
          </div>
        </td>
        <td style="padding:0;vertical-align:middle;">
          <p style="margin:0;font-size:14px;font-weight:600;">Wohnungsgeberbestätigung attached</p>
          <p style="margin:2px 0 0;font-size:13px;color:#888;">You'll need this to register your address at the Bürgeramt.</p>
        </td>
      </tr></table>
    </div>` : ""}
    <div style="background:#FAFAFA;border-radius:8px;padding:20px;margin-bottom:16px;">
      <p style="margin:0 0 10px;font-size:15px;font-weight:600;">Good to know</p>
      <ul style="margin:0;padding-left:20px;font-size:14px;color:#555;line-height:1.8;">
        <li>Your room is <strong>fully furnished</strong> — just bring your personal belongings</li>
        <li><strong>Towels and bed linen</strong> are provided</li>
        <li>You'll find a <strong>fully equipped kitchen</strong> in the common areas</li>
        <li>WiFi password: <strong>welcometostacey</strong></li>
      </ul>
    </div>
    <p style="font-size:14px;color:#555;line-height:1.6;">
      Questions before your move-in? Just reply to this email — we're here to help.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `Welcome to STACEY ${data.locationName}!`,
    html,
    attachments: wohnungsgeberPdf
      ? [{ filename: pdfFilename, content: wohnungsgeberPdf }]
      : undefined,
  });
}
