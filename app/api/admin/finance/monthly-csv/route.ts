import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/finance/monthly-csv?month=YYYY-MM[&location=ID]
 *
 * Simple bank-reconciliation CSV for a single rent month. One row per
 * RentPayment with tenant, room, amount, paid amount, status, and the
 * Stripe PaymentIntent ID (to match against the bank statement).
 */
function csvEscape(v: string | null | undefined): string {
  const value = v ?? "";
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function fmtEur(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function fmtDateDE(d: Date | null): string {
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const monthStr = params.get("month"); // "YYYY-MM"
  const locationId = params.get("location");

  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
    return Response.json(
      { error: "month=YYYY-MM required" },
      { status: 400 }
    );
  }

  const [y, m] = monthStr.split("-").map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const nextMonthStart = new Date(y, m, 1);

  const rents = await prisma.rentPayment.findMany({
    where: {
      month: { gte: monthStart, lt: nextMonthStart },
      ...(locationId
        ? { tenant: { room: { apartment: { locationId } } } }
        : {}),
    },
    include: {
      tenant: {
        include: {
          room: { include: { apartment: { include: { location: true } } } },
        },
      },
    },
    orderBy: [
      { tenant: { room: { apartment: { location: { name: "asc" } } } } },
      { tenant: { lastName: "asc" } },
    ],
  });

  const header = [
    "Location",
    "Zimmer",
    "Mieter",
    "Email",
    "Soll (EUR)",
    "Bezahlt (EUR)",
    "Offen (EUR)",
    "Status",
    "Bezahlt am",
    "Mahnung",
    "Stripe PaymentIntent",
  ].join(";");

  const lines = rents.map((r) => {
    const mahnung = r.mahnung2SentAt
      ? "2. Mahnung"
      : r.mahnung1SentAt
        ? "1. Mahnung"
        : r.reminder1SentAt
          ? "Reminded"
          : "";
    return [
      csvEscape(r.tenant.room?.apartment.location.name),
      csvEscape(r.tenant.room?.roomNumber),
      csvEscape(`${r.tenant.firstName} ${r.tenant.lastName}`),
      csvEscape(r.tenant.email),
      fmtEur(r.amount),
      fmtEur(r.paidAmount),
      fmtEur(Math.max(0, r.amount - r.paidAmount)),
      r.status,
      fmtDateDE(r.paidAt),
      mahnung,
      csvEscape(r.stripePaymentIntentId),
    ].join(";");
  });

  const csv = [header, ...lines].join("\r\n");
  const body = "\uFEFF" + csv;
  const filename = `rent_${monthStr}${locationId ? `_${locationId.slice(-6)}` : ""}.csv`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
