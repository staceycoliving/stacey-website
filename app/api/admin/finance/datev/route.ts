import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/finance/datev?from=YYYY-MM-DD&to=YYYY-MM-DD&chart=SKR03|SKR04&rent=1&fees=1&extras=1[&location=ID]
 *
 * Generates a DATEV-compatible CSV (semicolon-delimited) of paid transactions
 * in the date range. Format:
 *
 *   Buchungsdatum;Belegnummer;Betrag;Steuerschlüssel;Gegenkonto;Buchungstext
 */
const ACCOUNTS = {
  SKR03: { rent: "8400", fees: "8200", extras: "8300" },
  SKR04: { rent: "4400", fees: "4200", extras: "4300" },
} as const;

function fmtDateDE(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function fmtAmount(cents: number): string {
  // German decimal: 1234,56
  return (cents / 100).toFixed(2).replace(".", ",");
}

function csvEscape(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const fromStr = params.get("from");
  const toStr = params.get("to");
  const chart = (params.get("chart") ?? "SKR03") as keyof typeof ACCOUNTS;
  const includeRent = params.get("rent") !== "0";
  const includeFees = params.get("fees") !== "0";
  const includeExtras = params.get("extras") !== "0";
  const locationId = params.get("location");

  if (!fromStr || !toStr) {
    return Response.json({ error: "from and to required" }, { status: 400 });
  }
  if (!ACCOUNTS[chart]) {
    return Response.json({ error: "Invalid chart" }, { status: 400 });
  }

  const from = new Date(fromStr + "T00:00:00");
  const to = new Date(toStr + "T23:59:59");
  const accounts = ACCOUNTS[chart];

  const rows: {
    date: Date;
    belegNr: string;
    amount: number;
    account: string;
    text: string;
  }[] = [];

  // Rent payments (paid in window)
  if (includeRent) {
    const rents = await prisma.rentPayment.findMany({
      where: {
        paidAt: { gte: from, lte: to },
        ...(locationId
          ? {
              tenant: {
                room: { apartment: { locationId } },
              },
            }
          : {}),
      },
      include: {
        tenant: {
          include: {
            room: { include: { apartment: { include: { location: true } } } },
          },
        },
      },
    });
    for (const r of rents) {
      if (!r.paidAt || r.paidAmount <= 0) continue;
      rows.push({
        date: new Date(r.paidAt),
        belegNr: `RENT-${r.id.slice(-8)}`,
        amount: r.paidAmount,
        account: accounts.rent,
        text: `Miete ${r.tenant.firstName} ${r.tenant.lastName} ${new Date(r.month).toLocaleDateString("de-DE", { month: "short", year: "numeric" })} #${r.tenant.room!.roomNumber} ${r.tenant.room!.apartment.location.name}`,
      });
    }
  }

  // Booking fees (paid in window)
  if (includeFees) {
    const bookings = await prisma.booking.findMany({
      where: {
        bookingFeePaidAt: { gte: from, lte: to },
        ...(locationId ? { locationId } : {}),
      },
      include: { location: true },
    });
    for (const b of bookings) {
      if (!b.bookingFeePaidAt) continue;
      rows.push({
        date: new Date(b.bookingFeePaidAt),
        belegNr: `FEE-${b.id.slice(-8)}`,
        amount: 19500, // €195
        account: accounts.fees,
        text: `Booking Fee ${b.firstName} ${b.lastName} ${b.location.name}`,
      });
    }
  }

  // Extra charges (paid in window)
  if (includeExtras) {
    const extras = await prisma.extraCharge.findMany({
      where: {
        paidAt: { gte: from, lte: to },
        ...(locationId
          ? {
              tenant: {
                room: { apartment: { locationId } },
              },
            }
          : {}),
      },
      include: {
        tenant: {
          include: {
            room: { include: { apartment: { include: { location: true } } } },
          },
        },
      },
    });
    for (const e of extras) {
      if (!e.paidAt) continue;
      rows.push({
        date: new Date(e.paidAt),
        belegNr: `EXTRA-${e.id.slice(-8)}`,
        amount: e.amount,
        account: accounts.extras,
        text: `${e.description}, ${e.tenant.firstName} ${e.tenant.lastName} ${e.tenant.room!.apartment.location.name}`,
      });
    }
  }

  rows.sort((a, b) => a.date.getTime() - b.date.getTime());

  const header = "Buchungsdatum;Belegnummer;Betrag;Steuerschlüssel;Gegenkonto;Buchungstext";
  const lines = rows.map((r) =>
    [
      fmtDateDE(r.date),
      csvEscape(r.belegNr),
      fmtAmount(r.amount),
      "", // Steuerschlüssel (empty, coliving rent in DE is umsatzsteuerfrei)
      r.account,
      csvEscape(r.text),
    ].join(";")
  );

  const csv = [header, ...lines].join("\r\n");
  // BOM so Excel opens UTF-8 correctly
  const body = "\uFEFF" + csv;

  const filename = `datev_${chart}_${fromStr}_${toStr}.csv`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
