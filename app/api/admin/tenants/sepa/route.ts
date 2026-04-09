import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId, iban, accountHolder } = await request.json();

  if (!tenantId || !iban) {
    return Response.json({ error: "tenantId and iban required" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return Response.json({ error: "Tenant not found" }, { status: 404 });
  }

  try {
    // Create or reuse Stripe Customer
    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: accountHolder || `${tenant.firstName} ${tenant.lastName}`,
        email: tenant.email,
        metadata: { tenantId },
      });
      customerId = customer.id;
    }

    // Create SEPA PaymentMethod
    const pm = await stripe.paymentMethods.create({
      type: "sepa_debit",
      sepa_debit: { iban },
      billing_details: {
        name: accountHolder || `${tenant.firstName} ${tenant.lastName}`,
        email: tenant.email,
      },
    });

    // Attach to customer
    await stripe.paymentMethods.attach(pm.id, { customer: customerId });

    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: pm.id },
    });

    // Store on tenant
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        stripeCustomerId: customerId,
        sepaMandateId: pm.id,
      },
    });

    return Response.json({
      ok: true,
      stripeCustomerId: customerId,
      paymentMethodId: pm.id,
    });
  } catch (err: any) {
    console.error("SEPA setup error:", err);
    return Response.json(
      { error: "Failed to setup SEPA", details: err.message },
      { status: 500 }
    );
  }
}
