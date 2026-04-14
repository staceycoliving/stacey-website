import { Client } from "pg";
import { readFileSync } from "fs";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

config({ path: resolve(projectRoot, ".env.local") });

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error("Usage: node scripts/run-migration.mjs <path/to/migration.sql>");
  process.exit(1);
}

const sqlPath = resolve(projectRoot, migrationFile);
const sql = readFileSync(sqlPath, "utf8");

const connectionString = process.env.DIRECT_URL;
if (!connectionString) {
  console.error("DIRECT_URL not set in .env.local");
  process.exit(1);
}

const client = new Client({ connectionString });
await client.connect();
console.log(`Connected. Running migration: ${migrationFile}`);
try {
  await client.query(sql);
  console.log("✅ Migration applied successfully");
} catch (err) {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
