/**
 * Reads the CSV export and updates Apartment fields by matching on
 * Room.roomNumber (= CSV "Suite" column).
 *
 * Updates: number, address, AND floor (= CSV "Zusatz" column, e.g.
 * "EG rechts", "VH 1.OG") so the admin table matches the CSV exactly.
 *
 * Usage: node scripts/seed-apartment-data.mjs
 */
import { readFileSync } from "fs";
import { Client } from "pg";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const csvPath = resolve(
  __dirname,
  "..",
  "Longstay Mieterübersicht - Mieter Dashboard.csv"
);
const raw = readFileSync(csvPath, "utf-8");
const lines = raw.split("\n").filter((l) => l.trim());

function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

// Build map: suite → { apartment number, address, floor (= Zusatz) }
const suiteMap = new Map();
for (let i = 1; i < lines.length; i++) {
  const cols = parseCSVLine(lines[i]);
  const suite = cols[5];   // Suite
  const aptNum = parseInt(cols[4], 10); // Apartment
  const address = cols[2]; // Address
  const floor = cols[3];   // Zusatz (= floor + orientation)
  if (!suite) continue;
  suiteMap.set(suite, {
    number: isNaN(aptNum) ? null : aptNum,
    address: address || null,
    floor: floor || null,
  });
}

console.log(`Parsed ${suiteMap.size} suite→apartment mappings from CSV`);

const client = new Client({ connectionString: process.env.DIRECT_URL });
await client.connect();

let updated = 0;
let notFound = 0;
const seen = new Map(); // apartmentId → first CSV data (in case of conflicts)

for (const [suite, data] of suiteMap) {
  const res = await client.query(
    `SELECT "apartmentId" FROM "Room" WHERE "roomNumber" = $1 LIMIT 1`,
    [suite]
  );
  if (res.rows.length === 0) {
    notFound++;
    console.log(`  NOT FOUND: ${suite}`);
    continue;
  }
  const aptId = res.rows[0].apartmentId;
  if (seen.has(aptId)) continue; // already updated
  seen.set(aptId, data);

  const updates = [];
  const params = [];
  let idx = 1;

  if (data.number !== null) {
    updates.push(`"number" = $${idx++}`);
    params.push(data.number);
  }
  if (data.address) {
    updates.push(`"address" = $${idx++}`);
    params.push(data.address);
  }
  if (data.floor) {
    updates.push(`"floor" = $${idx++}`);
    params.push(data.floor);
  }

  if (updates.length === 0) continue;
  params.push(aptId);

  await client.query(
    `UPDATE "Apartment" SET ${updates.join(", ")} WHERE "id" = $${idx}`,
    params
  );
  updated++;
}

console.log(`Updated ${updated} apartments, ${notFound} suites not found in DB`);
await client.end();
