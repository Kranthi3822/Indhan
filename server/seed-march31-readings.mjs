/**
 * Seed script: Insert March 31, 2026 closing meter readings as a virtual
 * "baseline" shift session so that any shift starting from 01/04/2026 onwards
 * correctly picks up the last operated date's closing readings.
 *
 * Source: BEES-Accounting31stMar-26(1).xlsx → Daily Reports sheet, row 2026-03-31
 */
import { createConnection } from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

// March 31 closing meter readings from Excel
const closingReadings = [
  { nozzleId: 1, label: "Pump 1 – Nozzle 1 (Petrol)", reading: 539188.178 },
  { nozzleId: 2, label: "Pump 1 – Nozzle 2 (Diesel)", reading: 235781.840 },
  { nozzleId: 3, label: "Pump 2 – Nozzle 3 (Petrol)", reading: 1899845.040 },
  { nozzleId: 4, label: "Pump 2 – Nozzle 4 (Diesel)", reading: 637925.500 },
];

// Check if a virtual session for 2026-03-31 already exists
const [existing] = await conn.execute(
  `SELECT id FROM shift_sessions WHERE shift_date = '2026-03-31' AND notes LIKE '%baseline%' LIMIT 1`
);

let sessionId;
if (existing.length > 0) {
  sessionId = existing[0].id;
  console.log(`Virtual session already exists: id=${sessionId}. Updating readings.`);
  // Delete existing readings for this session to re-seed
  await conn.execute(`DELETE FROM nozzle_readings WHERE session_id = ?`, [sessionId]);
} else {
  // Create a virtual baseline session for 2026-03-31
  const [result] = await conn.execute(
    `INSERT INTO shift_sessions (shift_date, employee_id, staff_name, shift_label, status, notes, createdAt, updatedAt)
     VALUES ('2026-03-31', 30001, 'Mahesh', 'full_day', 'closed', 'Baseline closing readings from Excel import (FY 2025-26)', NOW(), NOW())`
  );
  sessionId = result.insertId;
  console.log(`Created virtual baseline session: id=${sessionId}`);
}

// Insert closing readings
for (const { nozzleId, label, reading } of closingReadings) {
  await conn.execute(
    `INSERT INTO nozzle_readings (session_id, nozzle_id, reading_type, meter_reading, recorded_at)
     VALUES (?, ?, 'closing', ?, '2026-03-31 23:59:59')`,
    [sessionId, nozzleId, reading]
  );
  console.log(`  Inserted closing reading for ${label}: ${reading}`);
}

console.log("\nDone. March 31 baseline readings seeded successfully.");
await conn.end();
