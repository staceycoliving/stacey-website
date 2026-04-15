import { Client } from "pg";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
config({ path: resolve(projectRoot, ".env.local") });

const client = new Client({ connectionString: process.env.DIRECT_URL });
await client.connect();

try {
  // Find all 🧪 test tenants + their bookings
  const tenants = await client.query(
    `SELECT id, "bookingId", "firstName", "lastName" FROM "Tenant" WHERE "firstName" LIKE $1`,
    ["🧪%"]
  );
  if (tenants.rowCount === 0) {
    console.log("No test tenants to clean up.");
    process.exit(0);
  }

  const tenantIds = tenants.rows.map((r) => r.id);
  const bookingIds = tenants.rows.map((r) => r.bookingId).filter(Boolean);

  // Cascade: RentPayment / ExtraCharge / Defect / Note delete on tenant delete
  const delTenants = await client.query(`DELETE FROM "Tenant" WHERE id = ANY($1::text[])`, [tenantIds]);
  console.log(`Deleted ${delTenants.rowCount} test tenants (cascade cleared their rents/charges/defects/notes).`);

  // Bookings have no cascade — delete explicitly
  if (bookingIds.length > 0) {
    const delBookings = await client.query(
      `DELETE FROM "Booking" WHERE id = ANY($1::text[])`,
      [bookingIds]
    );
    console.log(`Deleted ${delBookings.rowCount} test bookings.`);
  }

  console.log("✅ Cleanup done.");
} catch (err) {
  console.error("❌ Cleanup failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
