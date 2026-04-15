import { createConnection } from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

// Check nozzle_readings for any data
const [rows] = await conn.execute(`
  SELECT nr.nozzle_id, nr.reading_type, nr.meter_reading, nr.recorded_at, ss.shift_date
  FROM nozzle_readings nr
  JOIN shift_sessions ss ON nr.session_id = ss.id
  ORDER BY ss.shift_date DESC, nr.recorded_at DESC
  LIMIT 20
`);
console.log("nozzle_readings data:", JSON.stringify(rows, null, 2));

// Check if there's a nozzle_meter_readings or similar table
const [tables] = await conn.execute(`SHOW TABLES LIKE '%nozzle%'`);
console.log("Nozzle tables:", tables);

await conn.end();
