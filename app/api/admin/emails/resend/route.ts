import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import {
  sendWelcomeEmail,
  sendPaymentSetupLink,
  sendRentReminder,
  sendMahnung1,
  sendMahnung2,
  sendDepositReturnNotification,
} from "@/lib/email";

/**
 * POST /api/admin/emails/resend
 * Body: { templateKey, tenantId }
 *
 * Manual re-send of an automated email. First MVP supports the 7 most
 * common templates — others can be added as the need arises. Each handler
 * pulls fresh data from the DB so the email reflects current state
 * (useful when e.g. a tenant's room changed between the original send
 * and the resend).
 */
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { templateKey, tenantId } = await request.json();
  if (!templateKey || !tenantId) {
    return Response.json(
      { error: "templateKey and tenantId required" },
      { status: 400 }
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      room: { include: { apartment: { include: { location: true } } } },
      rentPayments: {
        where: { status: { in: ["FAILED", "PARTIAL", "PENDING"] } },
        orderBy: { month: "desc" },
      },
    },
  });
  if (!tenant) {
    return Response.json({ error: "Tenant not found" }, { status: 404 });
  }
  const locationName = tenant.room?.apartment.location.name ?? "STACEY";

  try {
    switch (templateKey) {
      case "welcome":
        if (!tenant.room) {
          return Response.json(
            { error: "Tenant has no room assigned — welcome email needs a room" },
            { status: 400 }
          );
        }
        await sendWelcomeEmail({
          firstName: tenant.firstName,
          lastName: tenant.lastName,
          email: tenant.email,
          locationName,
          locationAddress: tenant.room.apartment.location.address,
          locationSlug: tenant.room.apartment.location.slug,
          roomNumber: tenant.room.roomNumber,
          moveInDate: tenant.moveIn.toISOString(),
          floor: tenant.room.floorDescription ?? undefined,
        });
        break;

      case "payment_setup":
        if (!tenant.stripeCustomerId) {
          return Response.json(
            { error: "Tenant has no Stripe customer — payment setup link needs Stripe account first" },
            { status: 400 }
          );
        }
        // The setup URL normally comes from a Stripe Checkout Session.
        // For a manual resend we point to a stable admin-triggered URL
        // that the tenant route can regenerate on click.
        await sendPaymentSetupLink({
          firstName: tenant.firstName,
          email: tenant.email,
          locationName,
          setupUrl: `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://stacey.de"}/payment-setup?tenant=${tenant.id}`,
        });
        break;

      case "rent_reminder": {
        const rents = tenant.rentPayments;
        if (rents.length === 0) {
          return Response.json(
            { error: "No open rent to remind about" },
            { status: 400 }
          );
        }
        const months = rents.map((r) => ({
          month: r.month.toISOString(),
          amount: r.amount - r.paidAmount,
        }));
        const totalAmount = months.reduce((s, m) => s + m.amount, 0);
        await sendRentReminder({
          firstName: tenant.firstName,
          email: tenant.email,
          locationName,
          months,
          totalAmount,
          paymentUpdateUrl: `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://stacey.de"}/payment-setup?tenant=${tenant.id}`,
        });
        break;
      }

      case "mahnung1":
      case "mahnung2": {
        const rents = tenant.rentPayments;
        if (rents.length === 0) {
          return Response.json(
            { error: "No open rent to send a mahnung for" },
            { status: 400 }
          );
        }
        const months = rents.map((r) => ({
          month: r.month.toISOString(),
          amount: r.amount - r.paidAmount,
        }));
        const totalAmount = months.reduce((s, m) => s + m.amount, 0);
        const sender = templateKey === "mahnung1" ? sendMahnung1 : sendMahnung2;
        await sender({
          firstName: tenant.firstName,
          lastName: tenant.lastName,
          email: tenant.email,
          locationName,
          months,
          totalAmount,
          paymentUpdateUrl: `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://stacey.de"}/payment-setup?tenant=${tenant.id}`,
        });
        break;
      }

      case "deposit_return": {
        if (!tenant.depositRefundIban) {
          return Response.json(
            { error: "IBAN not set — open Deposits page to enter IBAN first" },
            { status: 400 }
          );
        }
        await sendDepositReturnNotification({
          firstName: tenant.firstName,
          email: tenant.email,
          locationName,
          depositAmount: tenant.depositAmount ?? 0,
          damagesAmount: tenant.damagesAmount ?? 0,
          arrearsAmount: tenant.arrearsAmount ?? 0,
          overpaymentAmount: tenant.rentOverpaymentAmount ?? 0,
          refundAmount: tenant.depositRefundAmount ?? 0,
          iban: tenant.depositRefundIban,
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
    return Response.json(
      { error: `Email send failed: ${msg}` },
      { status: 500 }
    );
  }

  await audit(request, {
    module: "email",
    action: "resend",
    entityType: "tenant",
    entityId: tenantId,
    summary: `Manually resent ${templateKey} to ${tenant.firstName} ${tenant.lastName} <${tenant.email}>`,
    metadata: { templateKey, email: tenant.email },
  });

  return Response.json({ ok: true, sentTo: tenant.email });
}
