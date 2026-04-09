import { config } from "dotenv";
config({ path: ".env.local" });

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, StayType, RoomCategory } from "./lib/generated/prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Excel serial date → JS Date
function excelDate(serial: number): Date {
  return new Date((serial - 25569) * 86400000);
}

// Map Excel category names to Prisma enum
function mapCategory(name: string): RoomCategory {
  const map: Record<string, RoomCategory> = {
    "Basic+": "BASIC_PLUS",
    "Mighty": "MIGHTY",
    "Premium": "PREMIUM",
    "Premium+": "PREMIUM_PLUS",
    "Premium Balcony": "PREMIUM_BALCONY",
    "Premium+ Balcony": "PREMIUM_PLUS_BALCONY",
    "Jumbo": "JUMBO",
    "Jumbo Balcony": "JUMBO_BALCONY",
    "Studio": "STUDIO",
    "Duplex": "DUPLEX",
  };
  // Clean whitespace
  const cleaned = name.trim().replace(/\s+/g, " ");
  const result = map[cleaned];
  if (!result) {
    console.warn(`Unknown category: "${cleaned}" — skipping`);
  }
  return result;
}

// Location config: slug, city, stayType, address
const locationConfig: Record<string, { slug: string; city: string; stayType: StayType; address: string }> = {
  "Eimsbüttel": { slug: "eimsbuettel", city: "Hamburg", stayType: "LONG", address: "Bismarckstraße 13, 20259 Hamburg" },

  "Mühlenkamp": { slug: "muehlenkamp", city: "Hamburg", stayType: "LONG", address: "Dorotheenstraße 3-5, 22301 Hamburg" },
  "St. Pauli": { slug: "st-pauli", city: "Hamburg", stayType: "LONG", address: "Detlev-Bremer-Straße 2, 20359 Hamburg" },
  "Eppendorf": { slug: "eppendorf", city: "Hamburg", stayType: "LONG", address: "Eppendorfer Weg 270, 20251 Hamburg" },
  "Fischerinsel": { slug: "fischerinsel", city: "Berlin", stayType: "LONG", address: "Fischerinsel 13-15, 10179 Berlin" },
  "Vallendar": { slug: "vallendar", city: "Vallendar", stayType: "LONG", address: "Löhrstraße 54, 56179 Vallendar" },
};

async function main() {
  console.log("🌱 Seeding database...\n");

  // Clear existing data
  await prisma.tenant.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.room.deleteMany();
  await prisma.apartment.deleteMany();
  await prisma.location.deleteMany();

  // Read Excel
  const wb = XLSX.readFile(path.join(process.cwd(), "Longstay Mieterübersicht.xlsx"));
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

  // Track created entities
  const locations = new Map<string, string>(); // name → id
  const apartments = new Map<string, string>(); // locationId+apartment → id

  let roomCount = 0;
  let tenantCount = 0;

  for (const row of rows) {
    const locationName = (row["Location"] as string)?.trim();
    const addressRaw = (row["Address"] as string)?.trim();
    const apartmentNum = String(row["Apartment"]).trim();
    const suiteCode = (row["Suite"] as string)?.trim();
    const categoryName = (row["Category"] as string)?.trim();
    const priceRaw = row["Price"];
    const tenantName = (row["Name"] as string)?.trim();
    const email = (row["Email"] as string)?.trim();
    const startDateRaw = row["Start Date"];
    const endDateRaw = row["End Date"];

    if (!locationName || !categoryName) continue;

    const config = locationConfig[locationName];
    if (!config) {
      console.warn(`Unknown location: "${locationName}" — skipping`);
      continue;
    }

    const category = mapCategory(categoryName);
    if (!category) continue;

    // Create location if not exists
    if (!locations.has(locationName)) {
      const loc = await prisma.location.create({
        data: {
          slug: config.slug,
          name: locationName,
          city: config.city,
          stayType: config.stayType,
          address: config.address,
        },
      });
      locations.set(locationName, loc.id);
      console.log(`📍 Location: ${locationName}`);
    }
    const locationId = locations.get(locationName)!;

    // Create apartment if not exists
    const aptKey = `${locationId}:${apartmentNum}`;
    if (!apartments.has(aptKey)) {
      // Extract floor from address
      const floorMatch = addressRaw?.match(/(\d+\.\s*OG|EG|Gewerbe|Duplex|1\.\s*OG\s*I\.)/i);
      const floor = floorMatch ? floorMatch[0] : "EG";
      // Extract house identifier
      const houseId = addressRaw?.split(/\s/)[0] || apartmentNum;

      const apt = await prisma.apartment.create({
        data: {
          locationId,
          houseNumber: houseId,
          floor: floor,
          label: addressRaw || undefined,
        },
      });
      apartments.set(aptKey, apt.id);
    }
    const apartmentId = apartments.get(aptKey)!;

    // Create room
    const room = await prisma.room.create({
      data: {
        apartmentId,
        roomNumber: suiteCode || `R${roomCount + 1}`,
        category,
      },
    });
    roomCount++;

    // Create tenant if name exists
    if (tenantName && tenantName.length > 1) {
      // Parse name (first + last)
      const nameParts = tenantName.replace(/\s*\(.*?\)\s*/g, "").trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Parse dates
      const moveIn = typeof startDateRaw === "number" ? excelDate(startDateRaw) : new Date();

      let moveOut: Date | null = null;
      if (endDateRaw && endDateRaw !== "open-end" && typeof endDateRaw === "number") {
        moveOut = excelDate(endDateRaw);
      }

      // Parse email (take first if multiple)
      const primaryEmail = email
        ? email.split(/[,\/&]/).map(e => e.trim()).filter(e => e.includes("@"))[0] || email
        : "";

      // Parse price
      let price: string | undefined;
      if (priceRaw) {
        price = String(priceRaw).replace(/[",]/g, "").trim();
      }

      await prisma.tenant.create({
        data: {
          roomId: room.id,
          firstName,
          lastName,
          email: primaryEmail,
          moveIn,
          moveOut,
          notice: moveOut ? moveOut : undefined, // if there's an end date, assume notice given
        },
      });
      tenantCount++;
    }
  }

  console.log(`\n✅ Done! Created:`);
  console.log(`   ${locations.size} locations`);
  console.log(`   ${apartments.size} apartments`);
  console.log(`   ${roomCount} rooms`);
  console.log(`   ${tenantCount} tenants`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
