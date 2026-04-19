import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/finance/datev/preview?from=…&to=…&rent=1&fees=1&extras=1[&location=ID]
 *
 * Lightweight preview of what a DATEV export would contain, so the admin
 * can sanity-check the scope before downloading the CSV.
 */
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const fromStr = params.get("from");
  const toStr = params.get("to");
  const includeRent = params.get("rent") !== "0";
  const includeFees = params.get("fees") !== "0";
  const includeExtras = params.get("extras") !== "0";
  const locationId = params.get("location");

  if (!fromStr || !toStr) {
    return Response.json({ error: "from and to required" }, { status: 400 });
  }

  const from = new Date(fromStr + "T00:00:00");
  const to = new Date(toStr + "T23:59:59");

  let rentCount = 0;
  let rentTotal = 0;
  let feesCount = 0;
  let feesTotal = 0;
  let extrasCount = 0;
  let extrasTotal = 0;

  if (includeRent) {
    const agg = await prisma.rentPayment.aggregate({
      where: {
        paidAt: { gte: from, lte: to },
        paidAmount: { gt: 0 },
        ...(locationId
          ? { tenant: { room: { apartment: { locationId } } } }
          : {}),
      },
      _count: true,
      _sum: { paidAmount: true },
    });
    rentCount = agg._count;
    rentTotal = agg._sum.paidAmount ?? 0;
  }

  if (includeFees) {
    const agg = await prisma.booking.aggregate({
      where: {
        bookingFeePaidAt: { gte: from, lte: to },
        ...(locationId ? { locationId } : {}),
      },
      _count: true,
    });
    feesCount = agg._count;
    feesTotal = agg._count * 19500;
  }

  if (includeExtras) {
    const agg = await prisma.extraCharge.aggregate({
      where: {
        paidAt: { gte: from, lte: to },
        ...(locationId
          ? { tenant: { room: { apartment: { locationId } } } }
          : {}),
      },
      _count: true,
      _sum: { amount: true },
    });
    extrasCount = agg._count;
    extrasTotal = agg._sum.amount ?? 0;
  }

  const total = rentTotal + feesTotal + extrasTotal;
  const count = rentCount + feesCount + extrasCount;

  return Response.json({
    from: fromStr,
    to: toStr,
    count,
    total,
    breakdown: {
      rent: { count: rentCount, total: rentTotal },
      fees: { count: feesCount, total: feesTotal },
      extras: { count: extrasCount, total: extrasTotal },
    },
  });
}
