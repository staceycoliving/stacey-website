import { Client } from "pg";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
config({ path: resolve(projectRoot, ".env.local") });

const SLUG = "othmarschen";

const client = new Client({ connectionString: process.env.DIRECT_URL });
await client.connect();

try {
  await client.query("BEGIN");

  // Look up location
  const loc = await client.query(`SELECT id, name FROM "Location" WHERE slug = $1`, [SLUG]);
  if (loc.rowCount === 0) {
    console.log(`No location with slug "${SLUG}" — nothing to do.`);
    await client.query("ROLLBACK");
    process.exit(0);
  }
  const locationId = loc.rows[0].id;
  console.log(`Found location: ${loc.rows[0].name} (${locationId})`);

  // Safety check: bookings referencing this location
  const bookings = await client.query(
    `SELECT COUNT(*)::int AS cnt FROM "Booking" WHERE "locationId" = $1`,
    [locationId]
  );
  if (bookings.rows[0].cnt > 0) {
    throw new Error(
      `Refusing to delete: ${bookings.rows[0].cnt} bookings reference this location.`
    );
  }

  // 1. Delete tenants in this location's rooms
  //    (cascades to RentPayment, ExtraCharge, RentAdjustment, Defect, Note)
  const delTenants = await client.query(`
    DELETE FROM "Tenant" t
    USING "Room" r, "Apartment" a
    WHERE t."roomId" = r.id
      AND r."apartmentId" = a.id
      AND a."locationId" = $1
  `, [locationId]);
  console.log(`Deleted ${delTenants.rowCount} tenants (cascaded their rent/charges/defects/notes).`);

  // 2. Delete rooms
  const delRooms = await client.query(`
    DELETE FROM "Room" r
    USING "Apartment" a
    WHERE r."apartmentId" = a.id
      AND a."locationId" = $1
  `, [locationId]);
  console.log(`Deleted ${delRooms.rowCount} rooms.`);

  // 3. Delete apartments
  const delApts = await client.query(
    `DELETE FROM "Apartment" WHERE "locationId" = $1`,
    [locationId]
  );
  console.log(`Deleted ${delApts.rowCount} apartments.`);

  // 4. Delete location
  await client.query(`DELETE FROM "Location" WHERE id = $1`, [locationId]);
  console.log(`Deleted location.`);

  await client.query("COMMIT");
  console.log("✅ Done.");
} catch (err) {
  await client.query("ROLLBACK");
  console.error("❌ Rolled back:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
