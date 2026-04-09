import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "STACEY Coliving <booking@stacey.de>";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find tenants moving in 3 days from now who haven't received welcome email
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 3);
  targetDate.setHours(0, 0, 0, 0);

  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const tenants = await prisma.tenant.findMany({
    where: {
      moveIn: { gte: targetDate, lt: nextDay },
      welcomeEmailSentAt: null,
      moveOut: null, // Not already terminated
    },
    include: {
      room: {
        include: {
          apartment: {
            include: { location: true },
          },
        },
      },
    },
  });

  if (tenants.length === 0) {
    return Response.json({ message: "No welcome emails to send", count: 0 });
  }

  let sent = 0;

  for (const tenant of tenants) {
    const location = tenant.room.apartment.location;
    const moveInFormatted = tenant.moveIn.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1A1A1A;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:5px;overflow:hidden;">
    <div style="background:#1A1A1A;padding:24px 32px;">
      <span style="color:#FCB0C0;font-size:22px;font-weight:700;letter-spacing:1px;">STACEY</span>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:20px;">See you in 3 days! 🏠</h2>
      <p style="margin:0 0 24px;color:#555;font-size:15px;">
        Hi ${tenant.firstName}, we're excited to welcome you to STACEY ${location.name}!
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#FAFAFA;border-radius:5px;padding:4px;">
        <tr>
          <td style="padding:6px 12px 6px 0;color:#888;font-size:14px;">Move-in date</td>
          <td style="padding:6px 0;font-size:14px;font-weight:500;">${moveInFormatted}</td>
        </tr>
        <tr>
          <td style="padding:6px 12px 6px 0;color:#888;font-size:14px;">Address</td>
          <td style="padding:6px 0;font-size:14px;font-weight:500;">${location.address}</td>
        </tr>
        <tr>
          <td style="padding:6px 12px 6px 0;color:#888;font-size:14px;">Room</td>
          <td style="padding:6px 0;font-size:14px;font-weight:500;">#${tenant.room.roomNumber}</td>
        </tr>
        <tr>
          <td style="padding:6px 12px 6px 0;color:#888;font-size:14px;">Check-in</td>
          <td style="padding:6px 0;font-size:14px;font-weight:500;">From 4 PM</td>
        </tr>
      </table>
      <p style="font-size:14px;color:#555;">
        <strong>How to check in:</strong><br>
        Come to ${location.address} from 4 PM on your move-in day.
        Our community manager will welcome you and hand over your keys.
      </p>
      <p style="font-size:14px;color:#555;margin-top:16px;">
        <strong>What to bring:</strong><br>
        Just yourself and your personal belongings — your room is fully furnished.
      </p>
      <p style="font-size:14px;color:#555;margin-top:16px;">
        Questions? Just reply to this email and we'll get back to you.
      </p>
    </div>
    <div style="padding:20px 32px;background:#FAFAFA;font-size:13px;color:#888;text-align:center;">
      STACEY Coliving · stacey.de<br>
      Our members call us home.
    </div>
  </div>
</body>
</html>`;

    try {
      await resend.emails.send({
        from: FROM,
        to: tenant.email,
        subject: `See you in 3 days! — STACEY ${location.name}`,
        html,
      });

      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { welcomeEmailSentAt: new Date() },
      });

      sent++;
      console.log(`Welcome email sent to ${tenant.email} (${tenant.firstName} ${tenant.lastName})`);
    } catch (err) {
      console.error(`Failed to send welcome email to ${tenant.email}:`, err);
    }
  }

  return Response.json({ message: `Sent ${sent} welcome emails`, count: sent });
}
