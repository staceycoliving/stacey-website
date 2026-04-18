import { Client } from "pg";
import { config } from "dotenv";
config({ path: "/Users/matteo/Desktop/stacey-website/.env.local" });
const c = new Client({ connectionString: process.env.DIRECT_URL });
await c.connect();

// 1. Location table: name, slug, address, city
const locs = await c.query(`SELECT id, name, slug, city, address, "stayType" FROM "Location" ORDER BY name`);
console.log("=== DB Locations ===");
for (const l of locs.rows) console.log(`  ${l.name} (slug: ${l.slug}) · ${l.city} · "${l.address}" · ${l.stayType}`);

// 2. Frontend data.ts location names
console.log("");
await c.end();
