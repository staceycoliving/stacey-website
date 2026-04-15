import { Client } from "pg";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
config({ path: resolve(projectRoot, ".env.local") });

const client = new Client({ connectionString: process.env.DIRECT_URL });
await client.connect();

function cuid() {
  // Quick & dirty cuid-shaped id (good enough for test seeds)
  return "cm" + crypto.randomBytes(10).toString("base64url").slice(0, 23);
}

async function findTwoFreeRooms() {
  const res = await client.query(`
    SELECT r.id, r."roomNumber", r."monthlyRent", r.category, l.name as location_name, l.id as location_id
    FROM "Room" r
    JOIN "Apartment" a ON r."apartmentId" = a.id
    JOIN "Location" l ON a."locationId" = l.id
    LEFT JOIN "Tenant" t ON t."roomId" = r.id
    WHERE t.id IS NULL
      AND r.status = 'ACTIVE'
      AND l."stayType" = 'LONG'
    LIMIT 2
  `);
  if (res.rowCount < 2) {
    throw new Error("Need at least 2 free rooms — found " + res.rowCount);
  }
  return res.rows;
}

async function seedTestTenant({
  room,
  firstName,
  lastName,
  email,
  daysSinceDepositPaid,
  paidFirstRent = false,
}) {
  const bookingId = cuid();
  const tenantId = cuid();
  const now = new Date();
  const depositPaidAt = new Date(
    now.getTime() - daysSinceDepositPaid * 24 * 60 * 60 * 1000
  );
  const moveIn = new Date(now.getTime() - daysSinceDepositPaid * 24 * 60 * 60 * 1000);
  const rent = room.monthlyRent || 50000;
  const deposit = rent * 2;

  await client.query("BEGIN");
  try {
    await client.query(
      `
      INSERT INTO "Booking" (
        id, "locationId", "stayType", category, persons,
        "moveInDate", "roomId", "monthlyRent",
        "firstName", "lastName", email, phone,
        "bookingFeePaidAt", "depositAmount", "depositPaidAt", "depositStatus",
        status, "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, 'LONG', $3, 1,
        $4, $5, $6,
        $7, $8, $9, '+49 0 000 0000',
        $10, $11, $12, 'RECEIVED',
        'CONFIRMED', NOW(), NOW()
      )
    `,
      [
        bookingId,
        room.location_id,
        room.category,
        moveIn,
        room.id,
        rent,
        firstName,
        lastName,
        email,
        depositPaidAt, // bookingFeePaidAt
        deposit,
        depositPaidAt,
      ]
    );

    await client.query(
      `
      INSERT INTO "Tenant" (
        id, "roomId", "bookingId",
        "firstName", "lastName", email, phone,
        "monthlyRent", "moveIn",
        "depositAmount", "depositStatus",
        "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3,
        $4, $5, $6, '+49 0 000 0000',
        $7, $8,
        $9, 'RECEIVED',
        NOW(), NOW()
      )
    `,
      [
        tenantId,
        room.id,
        bookingId,
        firstName,
        lastName,
        email,
        rent,
        moveIn,
        deposit,
      ]
    );

    // Optional: seed a PAID first-month rent for the move-in month
    // (simulates the tenant's first SEPA charge that landed the day they moved in)
    if (paidFirstRent) {
      const monthStart = new Date(moveIn.getFullYear(), moveIn.getMonth(), 1);
      const monthEnd = new Date(moveIn.getFullYear(), moveIn.getMonth() + 1, 0);
      const daysInMonth = monthEnd.getDate();
      const startDay = moveIn.getDate();
      const rentDays = daysInMonth - startDay + 1;
      const proRataAmount = Math.round((rent * rentDays) / daysInMonth);

      await client.query(
        `
        INSERT INTO "RentPayment" (
          id, "tenantId", month, amount, "paidAmount", status,
          "stripePaymentIntentId", "paidAt",
          "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $4, 'PAID',
          $5, $6, NOW(), NOW()
        )
      `,
        [
          cuid(),
          tenantId,
          monthStart,
          proRataAmount,
          // Fake PI id — Stripe refund will fail on this, but we can still
          // exercise the calculation flow up to the refund call.
          "pi_test_" + cuid().slice(-12),
          moveIn,
        ]
      );
    }

    await client.query("COMMIT");
    return { tenantId, bookingId, room: room.location_name + " #" + room.roomNumber };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

try {
  const rooms = await findTwoFreeRooms();
  console.log("Found free rooms:", rooms.map((r) => `${r.location_name} #${r.roomNumber}`).join(", "));

  const within = await seedTestTenant({
    room: rooms[0],
    firstName: "🧪 TestWithin",
    lastName: "Widerruf",
    email: "test-within-widerruf@example.com",
    daysSinceDepositPaid: 3,
    paidFirstRent: true, // already paid first month's pro-rata rent
  });

  const expired = await seedTestTenant({
    room: rooms[1],
    firstName: "🧪 TestExpired",
    lastName: "Widerruf",
    email: "test-expired-widerruf@example.com",
    daysSinceDepositPaid: 20,
    paidFirstRent: true,
  });

  console.log("\n✅ Seeded 2 test tenants:\n");
  console.log("  Within 14d window  →", within.room);
  console.log("    URL: http://localhost:3000/admin/tenants/" + within.tenantId);
  console.log("");
  console.log("  Past deadline      →", expired.room);
  console.log("    URL: http://localhost:3000/admin/tenants/" + expired.tenantId);
  console.log("");
  console.log("Cleanup: open the folio, click 'Widerruf bearbeiten', complete the flow.");
  console.log("(Stripe refund is skipped because depositPaymentLinkId is null — pure UI test.)");
} catch (err) {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
