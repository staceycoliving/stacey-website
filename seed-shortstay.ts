import { config } from "dotenv";
config({ path: ".env.local" });

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, RoomCategory, BookingStatus } from "./lib/generated/prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Map category names → Prisma enum (case-insensitive matching)
function mapCategory(name: string): RoomCategory | null {
  const cleaned = name.trim().replace(/\s+/g, " ");
  const lower = cleaned.toLowerCase();
  const map: Record<string, RoomCategory> = {
    "basic+": "BASIC_PLUS",
    "mighty": "MIGHTY",
    "premium": "PREMIUM",
    "premium+": "PREMIUM_PLUS",
    "premium balcony": "PREMIUM_BALCONY",
    "premium+ balcony": "PREMIUM_PLUS_BALCONY",
    "premiumbalcony": "PREMIUM_BALCONY",
    "jumbo": "JUMBO",
    "jumbo balcony": "JUMBO_BALCONY",
    "studio": "STUDIO",
    "duplex": "DUPLEX",
  };
  return map[lower] || null;
}

// Parse date: Excel serial number or DD/MM/YYYY string
function parseDate(value: any): Date | null {
  if (typeof value === "number") {
    // Excel serial date → JS Date
    return new Date((value - 25569) * 86400000);
  }
  if (typeof value === "string") {
    const parts = value.trim().split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      return new Date(year, month - 1, day);
    }
  }
  return null;
}

// ─── Kapazitäten (aus den Zimmerübersicht-Fotos) ────────────

const shortStayLocations = {
  ALSTER: {
    slug: "alster",
    name: "Alster",
    city: "Hamburg",
    address: "Gurlittstraße 28, 20099 Hamburg",
    file: "Alster apaleo_reservation_report.xlsx",
    capacities: [
      { category: "JUMBO" as RoomCategory, totalUnits: 4 },
      { category: "PREMIUM" as RoomCategory, totalUnits: 4 },
      { category: "PREMIUM_PLUS" as RoomCategory, totalUnits: 3 },
      { category: "PREMIUM_PLUS_BALCONY" as RoomCategory, totalUnits: 1 },
      { category: "PREMIUM_BALCONY" as RoomCategory, totalUnits: 1 },
    ],
  },
  DOWNTOWN: {
    slug: "downtown",
    name: "Downtown",
    city: "Hamburg",
    address: "Brandstwiete 36, 20457 Hamburg",
    file: "Downtown apaleo_reservation_report.xlsx",
    capacities: [
      { category: "PREMIUM_PLUS" as RoomCategory, totalUnits: 10 },
      { category: "JUMBO" as RoomCategory, totalUnits: 4 },
      { category: "PREMIUM" as RoomCategory, totalUnits: 3 },
      { category: "MIGHTY" as RoomCategory, totalUnits: 3 },
      { category: "PREMIUM_BALCONY" as RoomCategory, totalUnits: 1 },
    ],
  },
};

async function main() {
  console.log("🏨 Seeding SHORT stay data...\n");

  // Clean existing SHORT stay data only (leave LONG stay untouched)
  const existingShort = await prisma.location.findMany({
    where: { stayType: "SHORT" },
  });
  for (const loc of existingShort) {
    await prisma.booking.deleteMany({ where: { locationId: loc.id } });
    await prisma.roomCapacity.deleteMany({ where: { locationId: loc.id } });
    await prisma.location.delete({ where: { id: loc.id } });
    console.log(`🗑️  Deleted existing: ${loc.name}`);
  }

  let totalBookings = 0;

  for (const [hotelCode, cfg] of Object.entries(shortStayLocations)) {
    // 1. Create Location
    const location = await prisma.location.create({
      data: {
        slug: cfg.slug,
        name: cfg.name,
        city: cfg.city,
        stayType: "SHORT",
        address: cfg.address,
      },
    });
    console.log(`📍 ${cfg.name}`);

    // 2. Create RoomCapacity records
    for (const cap of cfg.capacities) {
      await prisma.roomCapacity.create({
        data: {
          locationId: location.id,
          category: cap.category,
          totalUnits: cap.totalUnits,
        },
      });
    }
    const totalRooms = cfg.capacities.reduce((sum, c) => sum + c.totalUnits, 0);
    console.log(`   ${cfg.capacities.length} categories, ${totalRooms} rooms total`);

    // 3. Import Reservations from Excel
    const wb = XLSX.readFile(path.join(process.cwd(), cfg.file));
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    let count = 0;
    let skipped = 0;

    for (const row of rows) {
      const status = (row["Status"] as string)?.trim();
      if (status !== "Im Haus" && status !== "Bestätigt") {
        skipped++;
        continue;
      }

      // Dates: "Anreise" and "Abreise" columns (always filled)
      const checkIn = parseDate(row["Anreise"]);
      const checkOut = parseDate(row["Abreise"]);
      if (!checkIn || !checkOut) {
        console.warn(`   ⚠️  Missing dates for ${row["Vorname"]} ${row["Nachname"]} — skipping`);
        skipped++;
        continue;
      }

      // Category: "Zugeordnete Kategorie" (actual room) > "Kategorie" (booked)
      const assignedCat = (row["Zugeordnete Kategorie"] as string)?.trim();
      const bookedCat = (row["Kategorie"] as string)?.trim();
      const catName = assignedCat || bookedCat;
      if (!catName) {
        skipped++;
        continue;
      }

      const category = mapCategory(catName);
      if (!category) {
        console.warn(`   ⚠️  Unknown category "${catName}" for ${row["Vorname"]} ${row["Nachname"]}`);
        skipped++;
        continue;
      }

      const firstName = (row["Vorname"] as string)?.trim() || "";
      const lastName = (row["Nachname"] as string)?.trim() || "";
      const persons = Number(row["Gästeanzahl"]) || Number(row["Anzahl Erwachsener"]) || 1;
      const apaleoId = (row["Buchungs-ID"] as string)?.trim() || "";

      await prisma.booking.create({
        data: {
          locationId: location.id,
          stayType: "SHORT",
          category,
          persons,
          checkIn,
          checkOut,
          firstName,
          lastName,
          email: "",
          phone: "",
          status: "CONFIRMED",
          message: `apaleo:${apaleoId}`,
        },
      });
      count++;
    }

    console.log(`   ${count} bookings imported${skipped > 0 ? `, ${skipped} skipped` : ""}`);
    totalBookings += count;
  }

  console.log(`\n✅ Done! 2 locations, ${totalBookings} bookings`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
