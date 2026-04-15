import { resend, FROM, layout, detailRow, detailTable, badge, ctaButton, warningBox, infoBox, categoryName, formatDate } from "./_shared";

// ─── #2: Booking Fee Confirmed + Deposit Payment Link ─────────

interface DepositPaymentEmail {
  firstName: string;
  email: string;
  locationName: string;
  roomCategory: string;
  persons: number;
  moveInDate: string;
  monthlyRent: number; // in cents
  depositAmount: number; // in cents
  depositPaymentUrl: string;
  deadlineHours: number;
}

export async function sendDepositPaymentLink(data: DepositPaymentEmail) {
  const rentEur = (data.monthlyRent / 100).toFixed(2);
  const depositEur = (data.depositAmount / 100).toFixed(2);

  const html = layout(`
    ${badge("✓ Booking fee received", "green")}
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">Your room is reserved, ${data.firstName}!</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
      Thanks for your booking fee — your room at STACEY ${data.locationName} is now reserved.
      To confirm your move-in, please pay the security deposit within ${data.deadlineHours} hours:
    </p>
    ${detailTable(
      detailRow("Location", `STACEY ${data.locationName}`) +
      detailRow("Room", categoryName(data.roomCategory)) +
      detailRow("Persons", String(data.persons)) +
      detailRow("Move-in", formatDate(data.moveInDate)) +
      detailRow("Monthly rent", `€${rentEur}`) +
      detailRow("Security deposit", `€${depositEur} <span style="font-weight:400;color:#888;">(2× monthly rent)</span>`, { highlight: "orange" })
    )}
    ${ctaButton(`Pay deposit — €${depositEur}`, data.depositPaymentUrl)}
    ${warningBox(
      `Please pay within ${data.deadlineHours} hours to secure your room.`,
      "If the deposit is not received in time, your reservation will be released."
    )}
    <p style="font-size:14px;color:#555;line-height:1.6;">
      <strong>What happens next?</strong><br>
      After your deposit is received, you'll get your signed lease agreement and a link to set up your monthly rent payment.
      Then we'll send you check-in details before your move-in.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `STACEY ${data.locationName} — Your room is reserved`,
    html,
  });
}

// ─── #3: Deposit Confirmed + Lease PDF + Payment Setup ────────

interface DepositConfirmationEmail {
  firstName: string;
  lastName: string;
  email: string;
  locationName: string;
  moveInDate: string;
  depositAmount: number; // in cents
  paymentSetupUrl?: string;
  signedLeasePdf?: Buffer;
}

export async function sendDepositConfirmation(data: DepositConfirmationEmail) {
  const depositEur = (data.depositAmount / 100).toFixed(2);
  const pdfFilename = `${data.firstName.toLowerCase()}_${data.lastName.toLowerCase()}_rentalagreement.pdf`;

  const leaseNote = data.signedLeasePdf
    ? `<div style="background:#FAFAFA;border-radius:8px;padding:16px;margin-bottom:20px;">
        <table style="border:0;border-collapse:collapse;"><tr>
          <td style="padding:0 14px 0 0;vertical-align:middle;">
            <div style="background:#e8f5e9;border-radius:6px;padding:8px 10px;">
              <span style="font-size:18px;">📎</span>
            </div>
          </td>
          <td style="padding:0;vertical-align:middle;">
            <p style="margin:0;font-size:14px;font-weight:600;">Signed lease agreement attached</p>
            <p style="margin:2px 0 0;font-size:13px;color:#888;">${pdfFilename} — Please save for your records.</p>
          </td>
        </tr></table>
      </div>`
    : "";

  const setupSection = data.paymentSetupUrl
    ? infoBox(`
        <p style="margin:0 0 8px;font-size:16px;font-weight:600;">Last step: set up your monthly rent</p>
        <p style="margin:0 0 16px;color:#555;font-size:14px;line-height:1.5;">
          So we can automatically collect your rent each month, please set up your payment method. It takes about a minute.
        </p>
        <div style="text-align:center;">
          <a href="${data.paymentSetupUrl}" style="background:#1A1A1A;color:#fff;padding:14px 32px;border-radius:5px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">Set up payment method</a>
        </div>
        <p style="margin:12px 0 0;font-size:12px;color:#888;text-align:center;">SEPA Direct Debit, card, and other methods available.</p>
      `, { pink: true })
    : "";

  const html = layout(`
    ${badge("✓ Deposit received", "green")}
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">Your move-in is confirmed!</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
      Hi ${data.firstName}, your deposit of €${depositEur} has been received. Your room at STACEY ${data.locationName} is secured.
    </p>
    ${detailTable(
      detailRow("Location", `STACEY ${data.locationName}`) +
      detailRow("Move-in", formatDate(data.moveInDate)) +
      detailRow("Deposit", `€${depositEur} ✓`, { highlight: "green" })
    )}
    ${leaseNote}
    ${setupSection}
    <p style="font-size:14px;color:#555;line-height:1.6;">
      <strong>What happens next?</strong><br>
      ${data.paymentSetupUrl
        ? "Once your payment method is set up, you'll receive your check-in details shortly before your move-in. That's it — you're almost home."
        : "You'll receive your check-in details shortly before your move-in. That's it — you're almost home."}
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `Deposit received — Welcome to STACEY ${data.locationName}`,
    html,
    attachments: data.signedLeasePdf
      ? [{ filename: pdfFilename, content: data.signedLeasePdf }]
      : undefined,
  });
}

// ─── Deposit Reminder (24h left) ────────────────────────────

interface DepositReminderEmail {
  firstName: string;
  email: string;
  locationName: string;
  depositAmount: number; // in cents
  depositPaymentUrl: string;
  hoursLeft: number;
}

export async function sendDepositReminder(data: DepositReminderEmail) {
  const depositEur = (data.depositAmount / 100).toFixed(2);

  const html = layout(`
    ${badge("Action required", "orange")}
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">Your deposit is still pending</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
      Hi ${data.firstName}, your room at STACEY ${data.locationName} is still reserved — but your security deposit
      hasn't been paid yet. You have about <strong>${data.hoursLeft} hours left</strong>.
    </p>
    ${detailTable(
      detailRow("Security deposit", `€${depositEur}`, { highlight: "orange" })
    )}
    ${ctaButton(`Pay deposit — €${depositEur}`, data.depositPaymentUrl)}
    ${warningBox(
      "Your reservation will be released if the deposit is not received in time.",
      "After that, the room may no longer be available."
    )}
  `, { accent: "orange" });

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `Reminder: Deposit pending — STACEY ${data.locationName}`,
    html,
  });
}

// ─── Deposit Timeout ────────────────────────────────────────

interface DepositTimeoutEmail {
  firstName: string;
  email: string;
  locationName: string;
}

export async function sendDepositTimeoutNotification(data: DepositTimeoutEmail) {
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">Room reservation expired</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
      Hi ${data.firstName}, the deposit deadline for your room at STACEY ${data.locationName} has passed
      and your reservation has been released.
    </p>
    <p style="font-size:14px;color:#555;line-height:1.6;">
      If you'd like to try again, visit <a href="https://stacey.de/move-in" style="color:#1A1A1A;font-weight:600;">stacey.de/move-in</a>.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `Room reservation expired — STACEY ${data.locationName}`,
    html,
  });
}

// ─── Deposit Return Notification ────────────────────────────

interface DepositReturnData {
  firstName: string;
  email: string;
  locationName: string;
  depositAmount: number;
  damagesAmount: number;
  arrearsAmount: number;
  /** Pro-rata rent the tenant overpaid (e.g. shortened stay). Optional —
   *  omit or pass 0 for tenants without any overpayment. */
  overpaymentAmount?: number;
  refundAmount: number;
  iban: string;
}

export async function sendDepositReturnNotification(data: DepositReturnData) {
  const overpayment = data.overpaymentAmount ?? 0;
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">Deposit settlement</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
      Hi ${data.firstName}, here's your deposit settlement for STACEY ${data.locationName}:
    </p>
    ${detailTable(
      detailRow("Security deposit", `€${(data.depositAmount / 100).toFixed(2)}`) +
      (overpayment > 0
        ? detailRow("Rent credit (pro-rata)", `+ €${(overpayment / 100).toFixed(2)}`)
        : "") +
      detailRow("Damages", data.damagesAmount > 0 ? `- €${(data.damagesAmount / 100).toFixed(2)}` : "€0.00") +
      detailRow("Rent arrears", data.arrearsAmount > 0 ? `- €${(data.arrearsAmount / 100).toFixed(2)}` : "€0.00") +
      detailRow("<strong>Refund amount</strong>", `<strong>€${(data.refundAmount / 100).toFixed(2)}</strong>`, { highlight: "green" })
    )}
    <p style="font-size:14px;color:#555;line-height:1.6;">
      The refund of <strong>€${(data.refundAmount / 100).toFixed(2)}</strong> will be transferred to your bank account ending in ...${data.iban.slice(-4)}.
      Please allow 3-5 business days for the transfer to complete.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `Deposit settlement — STACEY ${data.locationName}`,
    html,
  });
}
