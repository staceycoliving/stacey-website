import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  sendDepositTimeoutNotification,
  sendDepositReminder,
  sendTeamNotification,
  sendRentReminder,
  sendMahnung1,
  sendMahnung2,
  sendPaymentSetupReminder,
  sendPaymentFinalWarning,
  sendWelcomeEmail,
  sendPostStayFeedback,
  sendPreArrival,
  sendCheckoutReminder,
} from "@/lib/email";
import { stripe } from "@/lib/stripe";
import { getReservations, createInvoiceAndGetPdf } from "@/lib/apaleo";
import { locations } from "@/lib/data";
import { isTestMode, canSendEmail, logSkipped } from "@/lib/test-mode";
import { env } from "@/lib/env";
import { reportError } from "@/lib/observability";

// Reminder schedule: days BEFORE move-in (instead of days after deposit)
const SETUP_REMINDER_DAYS_BEFORE_MOVEIN = [30, 14, 7];

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
    // LONG stay
    depositTimeout: await runStep("depositTimeout", handleDepositTimeouts),
    paymentSetupReminders: await runStep("paymentSetupReminders", handlePaymentSetupReminders),
    welcomeEmails: await runStep("welcomeEmails", handleWelcomeEmails),
    rentReminders: await runStep("rentReminders", handleRentReminders),
    postStayFeedback: await runStep("postStayFeedback", handlePostStayFeedback),
    // SHORT stay (apaleo) — disabled until Matteo enables it
    // Enable by setting ENABLE_SHORT_STAY_EMAILS=true in env
    ...(process.env.ENABLE_SHORT_STAY_EMAILS === "true" ? {
      shortStayPreArrival: await runStep("shortStayPreArrival", handleShortStayPreArrival),
      shortStayCheckout: await runStep("shortStayCheckout", handleShortStayCheckoutReminder),
      shortStayPostStay: await runStep("shortStayPostStay", handleShortStayPostStayFeedback),
    } : { shortStay: "disabled" }),
  };

  return Response.json(results);
}

// ─── 1. Deposit Reminder (24h before deadline) + Timeout ───

async function handleDepositTimeouts() {
  const now = new Date();

  // ── Step 1a: Send 24h reminder for bookings halfway through their deadline ──
  const pendingBookings = await prisma.booking.findMany({
    where: {
      status: "DEPOSIT_PENDING",
      depositDeadline: { gt: now }, // not yet expired
      depositReminderSentAt: null,  // reminder not yet sent
    },
    include: { location: true },
  });

  let reminded = 0;
  for (const booking of pendingBookings) {
    if (!booking.depositDeadline) continue;

    // Send reminder when less than 24h left
    const hoursLeft = Math.floor(
      (booking.depositDeadline.getTime() - now.getTime()) / (1000 * 60 * 60)
    );
    if (hoursLeft > 24) continue;

    if (!canSendEmail(booking.email)) {
      logSkipped(booking.email, "Deposit reminder");
      continue;
    }

    try {
      await sendDepositReminder({
        firstName: booking.firstName,
        email: booking.email,
        locationName: booking.location.name,
        depositAmount: booking.depositAmount || 0,
        depositPaymentUrl: booking.depositPaymentLinkUrl || "",
        hoursLeft,
      });

      await prisma.booking.update({
        where: { id: booking.id },
        data: { depositReminderSentAt: now },
      });
      reminded++;
    } catch (err) {
      console.error(`Deposit reminder failed for ${booking.email}:`, err);
    }
  }

  // ── Step 1b: Cancel expired bookings (deadline passed) ──
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

  return { reminded, cancelled };
}

// ─── 2a. Payment Setup Reminders (30, 14, 7 days before move-in) ─

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
      paymentSetupRemindersSent: { lt: SETUP_REMINDER_DAYS_BEFORE_MOVEIN.length },
    },
    include: {
      room: { include: { apartment: { include: { location: true } } } },
    },
  });

  let sent = 0;
  for (const tenant of tenants) {
    const daysUntilMoveIn = Math.floor(
      (tenant.moveIn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const nextReminderIndex = tenant.paymentSetupRemindersSent;
    const triggerDaysBefore = SETUP_REMINDER_DAYS_BEFORE_MOVEIN[nextReminderIndex];

    // Send when we've reached or passed the reminder threshold
    if (daysUntilMoveIn > triggerDaysBefore) continue;

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

    if (tenant.sepaMandateId) {
      // Payment is set up → send Welcome Email
      try {
        const result = await sendWelcomeEmail({
          firstName: tenant.firstName,
          lastName: tenant.lastName,
          email: tenant.email,
          locationName: location.name,
          locationAddress: tenant.room.buildingAddress || location.address,
          locationSlug: location.slug,
          roomNumber: tenant.room.roomNumber,
          moveInDate: tenant.moveIn.toISOString().split("T")[0],
          floor: tenant.room.floorDescription || undefined,
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

// ─── 3. Daily Rent Retry + Reminders + Mahnungen ────────────

async function handleRentReminders() {
  const now = new Date();
  let retried = 0;
  let retriedSuccess = 0;
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
    orderBy: { month: "asc" },
  });

  // ── Step 3a: Daily SEPA retry for all FAILED/PENDING payments ──
  for (const rent of unpaidRents) {
    const tenant = rent.tenant;
    if (!tenant.stripeCustomerId || !tenant.sepaMandateId) continue;

    // Don't retry if we already tried today
    if (rent.lastRetryAt) {
      const hoursSinceRetry = (now.getTime() - rent.lastRetryAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceRetry < 20) continue; // At most once per day
    }

    retried++;
    try {
      const pi = await stripe.paymentIntents.create({
        amount: rent.amount,
        currency: "eur",
        customer: tenant.stripeCustomerId,
        payment_method: tenant.sepaMandateId,
        off_session: true,
        confirm: true,
        metadata: {
          type: "long_stay_rent",
          tenantId: tenant.id,
          rentPaymentId: rent.id,
          month: rent.month.toISOString(),
          retry: "true",
        },
      });

      await prisma.rentPayment.update({
        where: { id: rent.id },
        data: {
          status: "PROCESSING",
          stripePaymentIntentId: pi.id,
          lastRetryAt: now,
        },
      });
      retriedSuccess++;
    } catch (err: any) {
      await prisma.rentPayment.update({
        where: { id: rent.id },
        data: { lastRetryAt: now },
      });
      // Silent — the reminder emails below handle communication
    }
  }

  // Re-fetch after retries (some may have moved to PROCESSING)
  const stillUnpaid = await prisma.rentPayment.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      month: { lt: now },
      tenant: { bookingId: { not: null } },
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
    orderBy: { month: "asc" },
  });

  // ── Step 3b: Group by tenant for cumulative emails ──
  const byTenant = new Map<string, typeof stillUnpaid>();
  for (const rent of stillUnpaid) {
    const list = byTenant.get(rent.tenantId) || [];
    list.push(rent);
    byTenant.set(rent.tenantId, list);
  }

  for (const [, rents] of byTenant) {
    const tenant = rents[0].tenant;
    const location = tenant.room.apartment.location;
    const emailAllowed = canSendEmail(tenant.email);

    // Determine Mahnung level based on the OLDEST unpaid month
    const oldestRent = rents[0]; // already sorted by month asc
    const daysOverdue = Math.floor(
      (now.getTime() - oldestRent.month.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Cumulative data for all unpaid months
    const months = rents.map(r => ({
      month: r.month.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
      amount: r.amount,
    }));
    const totalAmount = rents.reduce((sum, r) => sum + r.amount, 0);

    // Check which email level is due (only send one email per tenant per day)
    // Priority: Mahnung 2 > Mahnung 1 > Reminder
    const needsMahnung2 = daysOverdue >= 30 && rents.some(r => !r.mahnung2SentAt);
    const needsMahnung1 = daysOverdue >= 14 && rents.some(r => !r.mahnung1SentAt);
    const needsReminder = daysOverdue >= 3 && rents.some(r => !r.reminder1SentAt);

    if (!needsMahnung2 && !needsMahnung1 && !needsReminder) continue;

    if (!emailAllowed) {
      logSkipped(tenant.email, `Rent email (${rents.length} months outstanding)`);
      continue;
    }

    // Create payment update URL for tenant
    let paymentUpdateUrl: string;
    try {
      paymentUpdateUrl = await createSetupSessionForTenant(tenant);
    } catch (err) {
      console.error(`Failed to create setup session for tenant ${tenant.id}:`, err);
      continue;
    }

    try {
      if (needsMahnung2) {
        await sendMahnung2({
          firstName: tenant.firstName,
          lastName: tenant.lastName,
          email: tenant.email,
          locationName: location.name,
          months,
          totalAmount,
          paymentUpdateUrl,
        });
        // Mark all rents that haven't had Mahnung 2 yet
        for (const r of rents) {
          if (!r.mahnung2SentAt) {
            await prisma.rentPayment.update({
              where: { id: r.id },
              data: { mahnung2SentAt: now },
            });
          }
        }
        mahnungen2++;
      } else if (needsMahnung1) {
        await sendMahnung1({
          firstName: tenant.firstName,
          lastName: tenant.lastName,
          email: tenant.email,
          locationName: location.name,
          months,
          totalAmount,
          paymentUpdateUrl,
        });
        for (const r of rents) {
          if (!r.mahnung1SentAt) {
            await prisma.rentPayment.update({
              where: { id: r.id },
              data: { mahnung1SentAt: now },
            });
          }
        }
        mahnungen1++;
      } else if (needsReminder) {
        await sendRentReminder({
          firstName: tenant.firstName,
          email: tenant.email,
          locationName: location.name,
          months,
          totalAmount,
          paymentUpdateUrl,
        });
        for (const r of rents) {
          if (!r.reminder1SentAt) {
            await prisma.rentPayment.update({
              where: { id: r.id },
              data: { reminder1SentAt: now },
            });
          }
        }
        reminders++;
      }
    } catch (err) {
      console.error(`Rent email failed for tenant ${tenant.id}:`, err);
    }
  }

  // ── Step 3c: Auto-Kündigung: 2+ months of unpaid rent ──
  // NEVER auto-terminate in test mode — this is an irreversible DB mutation
  if (isTestMode()) {
    return { retried, retriedSuccess, reminders, mahnungen1, mahnungen2, terminations, testModeSkippedAutoTermination: true };
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

      // No automatic termination email — this is handled manually by the team
      console.log(`Auto-terminated tenant ${tenant.id} (${tenant.firstName} ${tenant.lastName}): ${unpaidMonths} months unpaid`);
    }
  }

  return { retried, retriedSuccess, reminders, mahnungen1, mahnungen2, terminations };
}

// ─── 4. Post-Stay Feedback (1-2 days after move-out) ──��─────

async function handlePostStayFeedback() {
  const now = new Date();

  // Find tenants who moved out yesterday
  const yesterdayStart = new Date(now);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  yesterdayStart.setHours(0, 0, 0, 0);
  const yesterdayEnd = new Date(now);
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
  yesterdayEnd.setHours(23, 59, 59, 999);

  const tenants = await prisma.tenant.findMany({
    where: {
      bookingId: { not: null },
      moveOut: { gte: yesterdayStart, lte: yesterdayEnd },
      postStayFeedbackSentAt: null,
    },
    include: {
      room: { include: { apartment: { include: { location: true } } } },
    },
  });

  let sent = 0;
  for (const tenant of tenants) {
    if (!canSendEmail(tenant.email)) {
      logSkipped(tenant.email, "Post-stay feedback");
      continue;
    }

    const location = tenant.room.apartment.location;

    try {
      await sendPostStayFeedback({
        firstName: tenant.firstName,
        email: tenant.email,
        locationName: location.name,
        locationSlug: location.slug,
        stayType: "LONG",
      });

      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { postStayFeedbackSentAt: now },
      });
      sent++;
    } catch (err) {
      console.error(`Post-stay feedback failed for ${tenant.email}:`, err);
    }
  }

  return { sent };
}

// ─── Helper: location address lookup from data.ts ──────────

function getLocationAddress(slug: string): string {
  const loc = locations.find(l => l.slug === slug);
  return loc?.address || "";
}

function getLocationName(slug: string): string {
  const loc = locations.find(l => l.slug === slug);
  return loc?.name || slug;
}

// Helper: get or create email log for an apaleo reservation
async function getOrCreateEmailLog(reservationId: string, email: string, slug: string) {
  return prisma.shortStayEmailLog.upsert({
    where: { apaleoReservationId: reservationId },
    create: { apaleoReservationId: reservationId, guestEmail: email, locationSlug: slug },
    update: {},
  });
}

// ─── 5. SHORT Stay Pre-Arrival (check-in tomorrow, room assigned) ─

async function handleShortStayPreArrival() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split("T")[0];

  // Get reservations arriving tomorrow from apaleo
  const reservations = await getReservations({
    dateFilter: "arrival",
    from: dateStr,
    to: dateStr,
    status: "Confirmed",
  });

  let sent = 0;
  let missingEmail = 0;
  for (const res of reservations) {
    // Only send if room is assigned
    if (!res.unitName) continue;

    // No guest email → notify team
    if (!res.guestEmail) {
      sendTeamNotification({
        stayType: "SHORT",
        firstName: res.guestFirstName || "Unknown",
        lastName: res.guestLastName || "Guest",
        email: "no email provided",
        phone: "",
        locationName: getLocationName(res.locationSlug),
        category: res.category,
        persons: 1,
        checkIn: res.arrival,
        checkOut: res.departure,
        nights: Math.round((new Date(res.departure).getTime() - new Date(res.arrival).getTime()) / 86400000),
        bookingId: `⚠️ No guest email — Pre-Arrival not sent! Room ${res.unitName}`,
      }).catch((err) => console.error("Missing email team notif error:", err));
      missingEmail++;
      continue;
    }

    // Check if already sent
    const log = await getOrCreateEmailLog(res.id, res.guestEmail, res.locationSlug);
    if (log.preArrivalSentAt) continue;

    if (!canSendEmail(res.guestEmail)) {
      logSkipped(res.guestEmail, "SHORT pre-arrival");
      continue;
    }

    const nights = Math.round(
      (new Date(res.departure).getTime() - new Date(res.arrival).getTime()) / 86400000
    );

    try {
      // NOTE: Kiwi/Salto access is activated AFTER the guest completes the
      // Meldeschein form (POST /api/checkin), not here.

      await sendPreArrival({
        firstName: res.guestFirstName,
        lastName: res.guestLastName,
        email: res.guestEmail,
        locationName: getLocationName(res.locationSlug),
        locationAddress: getLocationAddress(res.locationSlug),
        locationSlug: res.locationSlug,
        roomNumber: res.unitName,
        checkIn: res.arrival,
        checkOut: res.departure,
        nights,
        reservationId: res.id,
      });

      await prisma.shortStayEmailLog.update({
        where: { apaleoReservationId: res.id },
        data: { preArrivalSentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(`Pre-arrival failed for ${res.guestEmail}:`, err);
    }
  }

  return { sent, missingEmail };
}

// ─── 6. SHORT Stay Check-out Reminder (check-out tomorrow) ──

async function handleShortStayCheckoutReminder() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split("T")[0];

  const reservations = await getReservations({
    dateFilter: "departure",
    from: dateStr,
    to: dateStr,
  });

  let sent = 0;
  for (const res of reservations) {
    if (!res.guestEmail) continue;

    const log = await getOrCreateEmailLog(res.id, res.guestEmail, res.locationSlug);
    if (log.checkoutReminderSentAt) continue;

    if (!canSendEmail(res.guestEmail)) {
      logSkipped(res.guestEmail, "SHORT checkout reminder");
      continue;
    }

    try {
      await sendCheckoutReminder({
        firstName: res.guestFirstName,
        email: res.guestEmail,
        locationName: getLocationName(res.locationSlug),
        locationAddress: getLocationAddress(res.locationSlug),
        checkOut: res.departure,
      });

      await prisma.shortStayEmailLog.update({
        where: { apaleoReservationId: res.id },
        data: { checkoutReminderSentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(`Checkout reminder failed for ${res.guestEmail}:`, err);
    }
  }

  return { sent };
}

// ─── 7. SHORT Stay Post-Stay Feedback (checked out yesterday) ──

async function handleShortStayPostStayFeedback() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0];

  const reservations = await getReservations({
    dateFilter: "departure",
    from: dateStr,
    to: dateStr,
    status: "CheckedOut",
  });

  let sent = 0;
  for (const res of reservations) {
    if (!res.guestEmail) continue;

    const log = await getOrCreateEmailLog(res.id, res.guestEmail, res.locationSlug);
    if (log.postStayFeedbackSentAt) continue;

    if (!canSendEmail(res.guestEmail)) {
      logSkipped(res.guestEmail, "SHORT post-stay feedback");
      continue;
    }

    try {
      // Try to get invoice from apaleo (non-blocking — send email even if invoice fails)
      let invoicePdf: Buffer | undefined;
      let invoiceNumber: string | undefined;
      try {
        const invoiceResult = await createInvoiceAndGetPdf(res.id);
        if (invoiceResult) {
          invoicePdf = invoiceResult.pdf;
          invoiceNumber = invoiceResult.invoiceNumber;
        }
      } catch (err) {
        console.error(`Invoice generation failed for ${res.id}, sending email without:`, err);
      }

      await sendPostStayFeedback({
        firstName: res.guestFirstName,
        email: res.guestEmail,
        locationName: getLocationName(res.locationSlug),
        locationSlug: res.locationSlug,
        stayType: "SHORT",
        checkIn: res.arrival,
        checkOut: res.departure,
        invoicePdf,
        invoiceNumber,
      });

      await prisma.shortStayEmailLog.update({
        where: { apaleoReservationId: res.id },
        data: {
          postStayFeedbackSentAt: new Date(),
          ...(invoicePdf ? { invoiceSentAt: new Date() } : {}),
        },
      });
      sent++;
    } catch (err) {
      console.error(`Post-stay feedback failed for ${res.guestEmail}:`, err);
    }
  }

  return { sent };
}

