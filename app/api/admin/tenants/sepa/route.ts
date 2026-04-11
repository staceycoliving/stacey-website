import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { sendPaymentSetupLink } from "@/lib/email";
import { env } from "@/lib/env";

// POST /api/admin/tenants/sepa
// Sends (or resends) the payment setup link to a tenant.
// The tenant fills in their own payment details via Stripe Checkout (setup mode).
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = await request.json();
  if (!tenantId) {
    return Response.json({ error: "tenantId required" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { room: { include: { apartment: { include: { location: true } } } } },
  });
  if (!tenant) {
    return Response.json({ error: "Tenant not found" }, { status: 404 });
  }

  try {
    // Create or reuse Stripe Customer
    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: `${tenant.firstName} ${tenant.lastName}`,
        email: tenant.email,
        metadata: { tenantId: tenant.id },
      });
      customerId = customer.id;
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create Checkout Session in setup mode
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

    // Send the email
    await sendPaymentSetupLink({
      firstName: tenant.firstName,
      email: tenant.email,
      locationName: tenant.room.apartment.location.name,
      setupUrl: session.url!,
    });

    return Response.json({ ok: true, setupUrl: session.url });
  } catch (err: any) {
    console.error("Setup link error:", err);
    return Response.json(
      { error: "Failed to send setup link", details: err.message },
      { status: 500 }
    );
  }
}
