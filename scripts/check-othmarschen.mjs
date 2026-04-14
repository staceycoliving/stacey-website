import { Client } from "pg";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
config({ path: resolve(projectRoot, ".env.local") });

const client = new Client({ connectionString: process.env.DIRECT_URL });
await client.connect();

const tenants = await client.query(`
  SELECT
    t.id, t."firstName", t."lastName", t.email,
    t."moveIn", t."moveOut", t.notice,
    t."depositStatus", t."bookingId",
    r."roomNumber"
  FROM "Tenant" t
  JOIN "Room" r ON t."roomId" = r.id
  JOIN "Apartment" a ON r."apartmentId" = a.id
  JOIN "Location" l ON a."locationId" = l.id
  WHERE l.slug = 'othmarschen'
  ORDER BY t."lastName";
`);
console.log(`Tenants in Othmarschen: ${tenants.rowCount}`);
console.table(tenants.rows);

const rents = await client.query(`
  SELECT COUNT(*) as cnt
  FROM "RentPayment" rp
  JOIN "Tenant" t ON rp."tenantId" = t.id
  JOIN "Room" r ON t."roomId" = r.id
  JOIN "Apartment" a ON r."apartmentId" = a.id
  JOIN "Location" l ON a."locationId" = l.id
  WHERE l.slug = 'othmarschen';
`);
console.log(`RentPayments tied to those tenants: ${rents.rows[0].cnt}`);

const bookings = await client.query(`
  SELECT COUNT(*) as cnt FROM "Booking" b
  JOIN "Location" l ON b."locationId" = l.id
  WHERE l.slug = 'othmarschen';
`);
console.log(`Bookings referring to Othmarschen: ${bookings.rows[0].cnt}`);

await client.end();
