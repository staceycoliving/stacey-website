/**
 * Datenmigration: Room.monthlyRent + Tenant.monthlyRent befüllen
 *
 * Liest Preise aus lib/data.ts (locations → rooms → priceMonthly)
 * und schreibt sie in die DB (Room.monthlyRent in Cent).
 *
 * Usage: npx tsx scripts/migrate-room-prices.ts
 */

import { prisma } from "../lib/db";
import { locations as staticLocations } from "../lib/data";
import { ROOM_NAME_TO_CATEGORY } from "../lib/data";

async function main() {
  // Build price map: slug → category → priceInCents
  const priceMap = new Map<string, Map<string, number>>();

  for (const loc of staticLocations) {
    if (loc.stayType !== "LONG") continue;
    const catPrices = new Map<string, number>();
    for (const room of loc.rooms) {
      const category = ROOM_NAME_TO_CATEGORY[room.name];
      if (category) {
        catPrices.set(category, room.priceMonthly * 100); // EUR → Cent
      }
    }
    priceMap.set(loc.slug, catPrices);
  }

  console.log("Price map built:");
  for (const [slug, cats] of priceMap) {
    for (const [cat, price] of cats) {
      console.log(`  ${slug} / ${cat} = €${price / 100}`);
    }
  }

  // Get all LONG Stay locations from DB
  const dbLocations = await prisma.location.findMany({
    where: { stayType: "LONG" },
    include: {
      apartments: {
        include: {
          rooms: { include: { tenant: true } },
        },
      },
    },
  });

  let roomsUpdated = 0;
  let tenantsUpdated = 0;

  for (const loc of dbLocations) {
    const catPrices = priceMap.get(loc.slug);
    if (!catPrices) {
      console.warn(`⚠ No prices found for location: ${loc.slug}`);
      continue;
    }

    for (const apt of loc.apartments) {
      for (const room of apt.rooms) {
        const price = catPrices.get(room.category);
        if (!price) {
          console.warn(`⚠ No price for ${loc.slug} / ${room.category} (Room #${room.roomNumber})`);
          continue;
        }

        if (room.monthlyRent !== price) {
          await prisma.room.update({
            where: { id: room.id },
            data: { monthlyRent: price },
          });
          roomsUpdated++;
        }

        // Also update tenant's monthlyRent if tenant exists
        if (room.tenant && room.tenant.monthlyRent !== price) {
          await prisma.tenant.update({
            where: { id: room.tenant.id },
            data: { monthlyRent: price },
          });
          tenantsUpdated++;
        }
      }
    }
  }

  console.log(`\n✓ ${roomsUpdated} rooms updated`);
  console.log(`✓ ${tenantsUpdated} tenants updated`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
