import { resend, FROM, layout, detailRow, detailTable, infoBox, formatDate } from "./_shared";

interface PreArrivalData {
  firstName: string;
  email: string;
  locationName: string;
  locationAddress: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  nights: number;
}

export async function sendPreArrival(data: PreArrivalData) {
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">Your stay starts tomorrow!</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
      Hi ${data.firstName}, everything is ready for you at STACEY ${data.locationName}.
    </p>
    ${detailTable(
      detailRow("Check-in", `${formatDate(data.checkIn)} · from 4 PM`) +
      detailRow("Check-out", `${formatDate(data.checkOut)} · until 11 AM`) +
      detailRow("Duration", `${data.nights} nights`) +
      detailRow("Address", data.locationAddress) +
      detailRow("Room", `#${data.roomNumber}`)
    )}
    ${infoBox(`
      <p style="margin:0 0 10px;font-size:15px;font-weight:600;">How to check in</p>
      <p style="margin:0;font-size:14px;color:#555;line-height:1.6;">
        Come to <strong>${data.locationAddress}</strong> from <strong>4 PM</strong>.
        You'll receive a separate email from our digital key provider to set up your access.
        Once registered, your access to the building, your room and all community spaces
        will be activated automatically for the duration of your stay.
      </p>
    `, { pink: true })}
    <div style="background:#FAFAFA;border-radius:8px;padding:20px;margin-bottom:16px;">
      <p style="margin:0 0 10px;font-size:15px;font-weight:600;">Good to know</p>
      <ul style="margin:0;padding-left:20px;font-size:14px;color:#555;line-height:1.8;">
        <li>Your room is <strong>fully furnished</strong> with fresh towels and bed linen</li>
        <li>You'll find a <strong>fully equipped kitchen</strong> in the common areas</li>
        <li>WiFi password: <strong>welcometostacey</strong></li>
        <li>Check-out is on <strong>${formatDate(data.checkOut)} until 11 AM</strong></li>
      </ul>
    </div>
    <p style="font-size:14px;color:#555;line-height:1.6;">
      Questions? Just reply to this email — we're here to help.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `Your stay at STACEY ${data.locationName} starts tomorrow`,
    html,
  });
}
