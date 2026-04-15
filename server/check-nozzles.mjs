import { createConnection } from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();
const conn = await createConnection(process.env.DATABASE_URL);

// Check nozzles table
const [nozzles] = await conn.execute(`SELECT * FROM nozzles ORDER BY nozzle_number`);
console.log("Nozzles:", JSON.stringify(nozzles, null, 2));

// Check daily_reports for March 31 - what nozzle data is there
const [dr] = await conn.execute(`SELECT * FROM daily_reports WHERE report_date = '2026-03-31'`);
console.log("March 31 daily_reports:", JSON.stringify(dr, null, 2));

// Check what columns daily_reports has
const [cols] = await conn.execute(`DESCRIBE daily_reports`);
console.log("daily_reports columns:", cols.map(c => c.Field));

await conn.end();
