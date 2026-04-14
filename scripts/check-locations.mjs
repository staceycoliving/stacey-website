import { Client } from "pg";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
config({ path: resolve(projectRoot, ".env.local") });

const client = new Client({ connectionString: process.env.DIRECT_URL });
await client.connect();

const res = await client.query(`
  SELECT l.id, l.slug, l.name, l."stayType",
    (SELECT COUNT(*) FROM "Apartment" a WHERE a."locationId" = l.id) as apartments,
    (SELECT COUNT(*) FROM "Room" r JOIN "Apartment" a ON r."apartmentId" = a.id WHERE a."locationId" = l.id) as rooms,
    (SELECT COUNT(*) FROM "Booking" b WHERE b."locationId" = l.id) as bookings,
    (SELECT COUNT(*) FROM "Tenant" t JOIN "Room" r ON t."roomId" = r.id JOIN "Apartment" a ON r."apartmentId" = a.id WHERE a."locationId" = l.id) as tenants
  FROM "Location" l ORDER BY l.name;
`);
console.table(res.rows);

await client.end();
