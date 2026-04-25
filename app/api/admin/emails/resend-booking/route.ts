import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sendDepositReminder } from "@/lib/email";

/**
 * POST /api/admin/emails/resend-booking
 * Body: { bookingId, templateKey }
 *
 * Bookings are pre-Tenant records, so they have their own set of
 * relevant templates (deposit payment link, deposit reminder). Used by
 * the dashboard funnel "Send reminder" action for bookings stuck
 * between fee-paid and deposit-paid.
 */
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { bookingId, templateKey } = await request.json();
  if (!bookingId || !templateKey) {
    return Response.json(
      { error: "bookingId and templateKey required" },
      { status: 400 }
    );
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { location: true },
  });
  if (!booking) {
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }
  const locationName = booking.location.name;

  let logStatus: "sent" | "failed" = "sent";
  let logError: string | null = null;
  try {
    switch (templateKey) {
      case "deposit_reminder": {
        if (!booking.depositPaymentLinkUrl) {
          return Response.json(
            {
              error:
                "No deposit payment link on this booking, booking fee likely not paid yet",
            },
            { status: 400 }
          );
        }
        const depositAmount = booking.monthlyRent
          ? booking.monthlyRent * 2
          : 0;
        const hoursLeft = booking.depositDeadline
          ? Math.max(
              0,
              Math.round(
                (new Date(booking.depositDeadline).getTime() - Date.now()) /
                  3_600_000
              )
            )
          : 24;
        await sendDepositReminder({
          firstName: booking.firstName,
          email: booking.email,
          locationName,
          depositAmount,
          depositPaymentUrl: booking.depositPaymentLinkUrl,
          hoursLeft,
        });
        break;
      }
      default:
        return Response.json(
          { error: `Unknown templateKey: ${templateKey}` },
          { status: 400 }
        );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStatus = "failed";
    logError = msg;
    await prisma.sentEmail.create({
      data: {
        templateKey,
        recipient: booking.email,
        entityType: "booking",
        entityId: bookingId,
        status: logStatus,
        error: logError,
        triggeredBy: "manual_resend",
      },
    });
    return Response.json(
      { error: `Email send failed: ${msg}` },
      { status: 500 }
    );
  }

  await prisma.sentEmail.create({
    data: {
      templateKey,
      recipient: booking.email,
      entityType: "booking",
      entityId: bookingId,
      status: logStatus,
      triggeredBy: "manual_resend",
    },
  });

  await audit(request, {
    module: "email",
    action: "resend",
    entityType: "booking",
    entityId: bookingId,
    summary: `Manually resent ${templateKey} to ${booking.firstName} ${booking.lastName} <${booking.email}>`,
    metadata: { templateKey, email: booking.email },
  });

  return Response.json({ ok: true, sentTo: booking.email });
}
