import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  sendDepositTimeoutNotification,
  sendTeamNotification,
  sendRentReminder,
  sendMahnung1,
  sendMahnung2,
  sendPaymentSetupReminder,
  sendPaymentFinalWarning,
} from "@/lib/email";
import { stripe } from "@/lib/stripe";
import { isTestMode, canSendEmail, logSkipped } from "@/lib/test-mode";
import { env } from "@/lib/env";
import { reportError } from "@/lib/observability";
import { Resend } from "resend";

const resendClient = new Resend(env.RESEND_API_KEY);
const FROM = "STACEY Coliving <booking@stacey.de>";

// Test-mode wrapper. Returns `skipped: true` so callers can avoid updating
// DB flags (e.g. welcomeEmailSentAt) when the email never actually went out.
const resend = {
  emails: {
    send: async (params: Parameters<typeof resendClient.emails.send>[0]) => {
      const to = Array.isArray(params.to) ? params.to[0] : params.to;
      if (!canSendEmail(to as string)) {
        logSkipped(to as string, params.subject || "(no subject)");
        return { data: { id: "test-mode-skipped" }, error: null, skipped: true };
      }
      const result = await resendClient.emails.send(params);
      return { ...result, skipped: false };
    },
  },
};

// Reminder schedule (days after tenant creation)
const SETUP_REMINDER_DAYS = [1, 3, 7, 14];

// ─── Helper: create Stripe Checkout session in setup mode ──

async function createSetupSessionForTenant(tenant: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  stripeCustomerId: string | null;
}): Promise<string> {
  let customerId = tenant.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: `${tenant.firstName} ${tenant.lastName}`,
      email: tenant.email,
      metadata: { tenantId: tenant.id },
    });
    customerId = customer.id;
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    payment_method_types: ["card", "sepa_debit"],
    metadata: {
      type: "long_stay_payment_setup",
      tenantId: tenant.id,
    },
    success_url: `${env.NEXT_PUBLIC_BASE_URL}/move-in/payment-setup-success`,
    cancel_url: `${env.NEXT_PUBLIC_BASE_URL}/move-in/payment-setup-success?cancelled=1`,
  });

  return session.url!;
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Run each task isolated — one failing task should never block the others
  // and every failure must end up in Sentry tagged with which step broke.
  const runStep = async <T>(name: string, fn: () => Promise<T>) => {
    try {
      return { ok: true as const, value: await fn() };
    } catch (err) {
      reportError(err, { scope: "cron-daily", tags: { step: name } });
      return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
    }
  };

  const results = {
    depositTimeout: await runStep("depositTimeout", handleDepositTimeouts),
    paymentSetupReminders: await runStep("paymentSetupReminders", handlePaymentSetupReminders),
    welcomeEmails: await runStep("welcomeEmails", handleWelcomeEmails),
    rentReminders: await runStep("rentReminders", handleRentReminders),
  };

  return Response.json(results);
}

// ─── 1. Deposit Timeout ────────────────────────────────────

async function handleDepositTimeouts() {
  const now = new Date();
  const expiredBookings = await prisma.booking.findMany({
    where: {
      status: "DEPOSIT_PENDING",
      depositDeadline: { lt: now },
    },
    include: { location: true },
  });

  let cancelled = 0;
  for (const booking of expiredBookings) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
    });

    sendDepositTimeoutNotification({
      firstName: booking.firstName,
      email: booking.email,
      locationName: booking.location.name,
    }).catch((err) => console.error("Deposit timeout email error:", err));

    sendTeamNotification({
      stayType: "LONG",
      firstName: booking.firstName,
      lastName: booking.lastName,
      email: booking.email,
      phone: booking.phone,
      locationName: booking.location.name,
      category: booking.category,
      persons: booking.persons,
      moveInDate: booking.moveInDate?.toISOString().split("T")[0],
      bookingId: booking.id,
    }).catch((err) => console.error("Team notification error:", err));

    cancelled++;
  }

  return { cancelled };
}

// ─── 2a. Payment Setup Reminders (Day 1, 3, 7, 14) ─────────

async function handlePaymentSetupReminders() {
  const now = new Date();
  // Only send reminders if move-in is more than 3 days away
  // (otherwise the welcome/final-warning logic takes over)
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const tenants = await prisma.tenant.findMany({
    where: {
      bookingId: { not: null }, // Only tenants booked via frontend (skip legacy)
      sepaMandateId: null, // No payment method set up
      moveIn: { gt: threeDaysFromNow },
      moveOut: null,
      paymentSetupRemindersSent: { lt: SETUP_REMINDER_DAYS.length },
    },
    include: {
      room: { include: { apartment: { include: { location: true } } } },
    },
  });

  let sent = 0;
  for (const tenant of tenants) {
    const daysSinceCreation = Math.floor(
      (now.getTime() - tenant.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const nextReminderIndex = tenant.paymentSetupRemindersSent;
    const dueDay = SETUP_REMINDER_DAYS[nextReminderIndex];

    if (daysSinceCreation < dueDay) continue;

    // Don't create Stripe sessions or bump reminder counter when test-mode will skip the email
    if (!canSendEmail(tenant.email)) {
      logSkipped(tenant.email, `Payment setup reminder #${nextReminderIndex + 1}`);
      continue;
    }

    try {
      const setupUrl = await createSetupSessionForTenant(tenant);
      await sendPaymentSetupReminder({
        firstName: tenant.firstName,
        email: tenant.email,
        locationName: tenant.room.apartment.location.name,
        setupUrl,
        reminderNumber: nextReminderIndex + 1,
      });

      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { paymentSetupRemindersSent: nextReminderIndex + 1 },
      });
      sent++;
    } catch (err) {
      console.error(`Setup reminder failed for tenant ${tenant.id}:`, err);
    }
  }

  return { sent };
}

// ─── 2b. Welcome Email or Final Warning (3 days before move-in) ─

async function handleWelcomeEmails() {
  const now = new Date();
  // Find tenants moving in within next 3 days.
  // Floor at 7 days ago so we don't retroactively catch every historical tenant
  // whose welcomeEmailSentAt is still null (e.g. after first deploy of this feature).
  const targetStart = new Date(now);
  targetStart.setDate(targetStart.getDate() - 7);
  targetStart.setHours(0, 0, 0, 0);
  const targetEnd = new Date(now);
  targetEnd.setDate(targetEnd.getDate() + 3);
  targetEnd.setHours(23, 59, 59, 999);

  const tenants = await prisma.tenant.findMany({
    where: {
      bookingId: { not: null }, // Only tenants booked via frontend (skip legacy)
      moveIn: { gte: targetStart, lte: targetEnd },
      welcomeEmailSentAt: null,
      moveOut: null,
    },
    include: {
      room: { include: { apartment: { include: { location: true } } } },
    },
  });

  let welcomeSent = 0;
  let finalWarningSent = 0;

  for (const tenant of tenants) {
    const location = tenant.room.apartment.location;
    const moveInFormatted = tenant.moveIn.toLocaleDateString("en-GB", {
      day: "2-digit", month: "long", year: "numeric",
    });

    if (tenant.sepaMandateId) {
      // Payment is set up → send Welcome Email
      try {
        const result = await resend.emails.send({
          from: FROM,
          to: tenant.email,
          subject: `Welcome to STACEY ${location.name}!`,
          html: welcomeEmailHtml(tenant, location, moveInFormatted),
        });

        // Only mark as sent if the email actually went out (not test-mode-skipped)
        if (!result.skipped) {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { welcomeEmailSentAt: new Date() },
          });
          welcomeSent++;
        }
      } catch (err) {
        console.error(`Welcome email failed for ${tenant.email}:`, err);
      }
    } else {
      // No payment method → send Final Warning (only once)
      if (tenant.paymentFinalWarningSentAt) continue;

      try {
        // Don't create Stripe sessions or update DB flags when test-mode will skip the email
        if (!canSendEmail(tenant.email)) {
          logSkipped(tenant.email, "Final warning (skipping Stripe session + DB flag)");
          continue;
        }

        const setupUrl = await createSetupSessionForTenant(tenant);
        await sendPaymentFinalWarning({
          firstName: tenant.firstName,
          email: tenant.email,
          locationName: location.name,
          moveInDate: tenant.moveIn.toISOString().split("T")[0],
          setupUrl,
        });

        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { paymentFinalWarningSentAt: new Date() },
        });

        // Notify team
        sendTeamNotification({
          stayType: "LONG",
          firstName: tenant.firstName,
          lastName: tenant.lastName,
          email: tenant.email,
          phone: tenant.phone || "",
          locationName: location.name,
          category: tenant.room.category,
          persons: 1,
          moveInDate: tenant.moveIn.toISOString().split("T")[0],
          bookingId: `Final warning sent — payment not set up`,
        }).catch((err) => console.error("Team notif error:", err));

        finalWarningSent++;
      } catch (err) {
        console.error(`Final warning failed for ${tenant.email}:`, err);
      }
    }
  }

  return { welcomeSent, finalWarningSent };
}

function welcomeEmailHtml(
  tenant: { firstName: string; room: { roomNumber: string } },
  location: { name: string; address: string },
  moveInFormatted: string
) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1A1A1A;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:5px;overflow:hidden;">
    <div style="background:#1A1A1A;padding:24px 32px;">
      <span style="color:#FCB0C0;font-size:22px;font-weight:700;letter-spacing:1px;">STACEY</span>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:20px;">See you in 3 days!</h2>
      <p style="margin:0 0 24px;color:#555;font-size:15px;">Hi ${tenant.firstName}, we're excited to welcome you to STACEY ${location.name}!</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#FAFAFA;border-radius:5px;padding:4px;">
        <tr><td style="padding:6px 12px 6px 0;color:#888;font-size:14px;">Move-in</td><td style="padding:6px 0;font-size:14px;font-weight:500;">${moveInFormatted}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#888;font-size:14px;">Address</td><td style="padding:6px 0;font-size:14px;font-weight:500;">${location.address}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#888;font-size:14px;">Room</td><td style="padding:6px 0;font-size:14px;font-weight:500;">#${tenant.room.roomNumber}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#888;font-size:14px;">Check-in</td><td style="padding:6px 0;font-size:14px;font-weight:500;">From 4 PM</td></tr>
      </table>
      <p style="font-size:14px;color:#555;"><strong>How to check in:</strong><br>Come to ${location.address} from 4 PM. Our community manager will welcome you and hand over your keys.</p>
      <p style="font-size:14px;color:#555;margin-top:16px;"><strong>What to bring:</strong><br>Just yourself and your personal belongings — your room is fully furnished.</p>
      <p style="font-size:14px;color:#555;margin-top:16px;">Questions? Just reply to this email.</p>
    </div>
    <div style="padding:20px 32px;background:#FAFAFA;font-size:13px;color:#888;text-align:center;">STACEY Coliving · stacey.de<br>Our members call us home.</div>
  </div>
</body></html>`;
}

// ─── 3. Rent Reminders + Mahnungen ──────────────────────────

async function handleRentReminders() {
  const now = new Date();
  let reminders = 0;
  let mahnungen1 = 0;
  let mahnungen2 = 0;
  let terminations = 0;

  // Find all unpaid rent payments from past months
  const unpaidRents = await prisma.rentPayment.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      month: { lt: now },
      tenant: { bookingId: { not: null } }, // Only frontend-booked tenants (skip legacy)
    },
    include: {
      tenant: {
        include: {
          room: {
            include: { apartment: { include: { location: true } } },
          },
        },
      },
    },
  });

  for (const rent of unpaidRents) {
    const daysOverdue = Math.floor(
      (now.getTime() - rent.month.getTime()) / (1000 * 60 * 60 * 24)
    );
    const tenant = rent.tenant;
    const location = tenant.room.apartment.location;
    const monthStr = rent.month.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

    // Skip DB-flag updates when test-mode will just discard the email
    const emailAllowed = canSendEmail(tenant.email);

    // Day 3: friendly reminder
    if (daysOverdue >= 3 && !rent.reminder1SentAt) {
      if (emailAllowed) {
        sendRentReminder({
          firstName: tenant.firstName,
          email: tenant.email,
          locationName: location.name,
          month: monthStr,
          amount: rent.amount,
        }).catch((err) => console.error("Rent reminder error:", err));

        await prisma.rentPayment.update({
          where: { id: rent.id },
          data: { reminder1SentAt: new Date() },
        });
        reminders++;
      } else {
        logSkipped(tenant.email, `Rent reminder ${monthStr}`);
      }
    }

    // Day 14: 1. Mahnung
    if (daysOverdue >= 14 && !rent.mahnung1SentAt) {
      if (emailAllowed) {
        sendMahnung1({
          firstName: tenant.firstName,
          lastName: tenant.lastName,
          email: tenant.email,
          locationName: location.name,
          month: monthStr,
          amount: rent.amount,
        }).catch((err) => console.error("Mahnung 1 error:", err));

        await prisma.rentPayment.update({
          where: { id: rent.id },
          data: { mahnung1SentAt: new Date() },
        });
        mahnungen1++;
      } else {
        logSkipped(tenant.email, `Mahnung 1 ${monthStr}`);
      }
    }

    // Day 30: 2. Mahnung + Kündigungsandrohung
    if (daysOverdue >= 30 && !rent.mahnung2SentAt) {
      if (emailAllowed) {
        sendMahnung2({
          firstName: tenant.firstName,
          lastName: tenant.lastName,
          email: tenant.email,
          locationName: location.name,
          month: monthStr,
          amount: rent.amount,
        }).catch((err) => console.error("Mahnung 2 error:", err));

        await prisma.rentPayment.update({
          where: { id: rent.id },
          data: { mahnung2SentAt: new Date() },
        });
        mahnungen2++;
      } else {
        logSkipped(tenant.email, `Mahnung 2 ${monthStr}`);
      }
    }
  }

  // Auto-Kündigung: 2+ months of unpaid rent
  // NEVER auto-terminate in test mode — this is an irreversible DB mutation
  if (isTestMode()) {
    return { reminders, mahnungen1, mahnungen2, terminations, testModeSkippedAutoTermination: true };
  }

  const tenantsWithArrears = await prisma.tenant.findMany({
    where: {
      bookingId: { not: null }, // Only frontend-booked tenants (skip legacy)
      moveOut: null, // Not already terminated
      notice: null,
    },
    include: {
      rentPayments: {
        where: { status: { in: ["PENDING", "FAILED"] } },
      },
      room: {
        include: { apartment: { include: { location: true } } },
      },
    },
  });

  for (const tenant of tenantsWithArrears) {
    const unpaidMonths = tenant.rentPayments.length;
    if (unpaidMonths >= 2) {
      // Auto-terminate: 3 months notice to end of month
      const noticeDate = new Date();
      const moveOutDate = new Date(noticeDate.getFullYear(), noticeDate.getMonth() + 4, 0); // Last day of month +3

      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          notice: noticeDate,
          moveOut: moveOutDate,
        },
      });
      terminations++;

      const location = tenant.room.apartment.location;

      // No automatic termination email — this is handled manually by the team

      console.log(`Auto-terminated tenant ${tenant.id} (${tenant.firstName} ${tenant.lastName}): ${unpaidMonths} months unpaid`);
    }
  }

  return { reminders, mahnungen1, mahnungen2, terminations };
}
