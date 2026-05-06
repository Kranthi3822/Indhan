/**
 * One-time migration script: adds incharge approval columns + photo columns
 * Run: node run-migration.mjs
 */
import { createConnection } from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await createConnection(url);

const statements = [
  "ALTER TABLE `nozzle_readings` ADD COLUMN IF NOT EXISTS `photo_url` varchar(1000)",
  "ALTER TABLE `nozzle_readings` ADD COLUMN IF NOT EXISTS `photo_key` varchar(500)",
  "ALTER TABLE `shift_sessions` ADD COLUMN IF NOT EXISTS `incharge_approval_status` enum('pending_approval','approved','rejected')",
  "ALTER TABLE `shift_sessions` ADD COLUMN IF NOT EXISTS `approved_by_name` varchar(100)",
  "ALTER TABLE `shift_sessions` ADD COLUMN IF NOT EXISTS `approved_at` timestamp NULL",
  "ALTER TABLE `shift_sessions` ADD COLUMN IF NOT EXISTS `approval_remarks` text",
];

for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    console.log("OK:", stmt.slice(0, 60));
  } catch (e) {
    if (e.code === "ER_DUP_FIELDNAME") {
      console.log("SKIP (already exists):", stmt.slice(0, 60));
    } else {
      console.error("ERR:", e.message, "\nSQL:", stmt);
    }
  }
}

await conn.end();
console.log("Migration complete.");
