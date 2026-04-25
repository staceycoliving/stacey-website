import { isAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import FinancePage from "./FinancePage";

export const dynamic = "force-dynamic";

export default async function AdminFinancePage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const now = new Date();
  // Rolling 12-month window: start = first day of (current month - 11)
  const start12 = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [
    rentPayments,
    depositTenants,
    activeTenants,
    bookingsWithFee,
    extraCharges,
    bundledAdjustments,
    locations,
  ] = await Promise.all([
    // All rent payments in the 12-month window, plus tenant + location
    prisma.rentPayment.findMany({
      where: { month: { gte: start12 } },
      include: {
        tenant: {
          include: {
            room: { include: { apartment: { include: { location: true } } } },
          },
        },
      },
      orderBy: [{ month: "desc" }, { tenant: { lastName: "asc" } }],
    }),

    // Tenants with deposit currently held, for Deposits tab.
    prisma.tenant.findMany({
      where: { depositStatus: "RECEIVED" },
      include: {
        room: { include: { apartment: { include: { location: true } } } },
      },
    }),

    // All currently-active tenants (overlapping with today), used for
    // "Next-month forecast" MRR.
    prisma.tenant.findMany({
      where: {
        moveIn: { lte: now },
        OR: [{ moveOut: null }, { moveOut: { gte: now } }],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        monthlyRent: true,
        moveIn: true,
        moveOut: true,
        room: {
          select: {
            apartment: {
              select: { location: { select: { id: true, name: true } } },
            },
          },
        },
      },
    }),

    // Booking fees paid in the 12-month window.
    prisma.booking.findMany({
      where: { bookingFeePaidAt: { gte: start12 } },
      include: { location: true },
    }),

    // ExtraCharges in the window (for ExtraCharges visibility + chart).
    prisma.extraCharge.findMany({
      where: {
        OR: [
          { paidAt: { gte: start12 } },
          { paidAt: null }, // all currently open, regardless of when created
        ],
      },
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            room: {
              select: {
                roomNumber: true,
                apartment: { select: { location: { select: { name: true } } } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    // NEXT_RENT adjustments bundled into a rent PaymentIntent, for
    // per-row base/adj split in Rent Roll. We only need the rent PI IDs
    // of the 12-month window, so we can match them in-memory.
    prisma.extraCharge.findMany({
      where: {
        chargeOn: "NEXT_RENT",
        stripePaymentIntentId: { not: null },
      },
      select: {
        id: true,
        amount: true,
        type: true,
        description: true,
        paidAt: true,
        stripePaymentIntentId: true,
      },
    }),

    prisma.location.findMany({
      where: { stayType: "LONG" },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <FinancePage
      data={JSON.parse(
        JSON.stringify({
          rentPayments,
          depositTenants,
          activeTenants,
          bookingsWithFee,
          extraCharges,
          bundledAdjustments,
          locations,
          serverNow: now.toISOString(),
        })
      )}
    />
  );
}
