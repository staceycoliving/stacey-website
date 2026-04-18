/**
 * Reads the CSV export and updates Apartment.number + Apartment.address
 * by matching on Room.roomNumber (= CSV "Suite" column).
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
const header = lines[0].split(",");

// Parse CSV rows (handle quoted fields with commas inside)
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

// Build a map: suite → { apartment number, address }
const suiteMap = new Map();
for (let i = 1; i < lines.length; i++) {
  const cols = parseCSVLine(lines[i]);
  const suite = cols[5]; // Suite column
  const aptNum = parseInt(cols[4], 10); // Apartment column
  const address = cols[2]; // Address column
  if (!suite || isNaN(aptNum)) continue;
  suiteMap.set(suite, { number: aptNum, address });
}

console.log(`Parsed ${suiteMap.size} suite→apartment mappings from CSV`);

const client = new Client({ connectionString: process.env.DIRECT_URL });
await client.connect();

// For each suite in the map, find the Room → get its apartmentId → update
let updated = 0;
let notFound = 0;
const seen = new Set(); // track apartmentIds we've already updated

for (const [suite, data] of suiteMap) {
  const res = await client.query(
    `SELECT "apartmentId" FROM "Room" WHERE "roomNumber" = $1 LIMIT 1`,
    [suite]
  );
  if (res.rows.length === 0) {
    notFound++;
    continue;
  }
  const aptId = res.rows[0].apartmentId;
  if (seen.has(aptId)) continue; // already updated this apartment
  seen.add(aptId);

  await client.query(
    `UPDATE "Apartment" SET "number" = $1, "address" = $2 WHERE "id" = $3`,
    [data.number, data.address, aptId]
  );
  updated++;
}

console.log(`Updated ${updated} apartments, ${notFound} suites not found in DB`);
await client.end();
