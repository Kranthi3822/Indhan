import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Create dip_readings table
await conn.execute(`
  CREATE TABLE IF NOT EXISTS \`dip_readings\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`reading_date\` varchar(10) NOT NULL,
    \`fuel_type\` enum('petrol','diesel') NOT NULL,
    \`tank_id\` varchar(20) NOT NULL DEFAULT 'T1',
    \`dip_litres\` decimal(12,3) NOT NULL,
    \`reading_time\` varchar(8) DEFAULT '08:00',
    \`recorded_by\` varchar(100),
    \`notes\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`dip_readings_id\` PRIMARY KEY(\`id\`)
  )
`);
console.log("✓ dip_readings table created");

// Create fuel_config table
await conn.execute(`
  CREATE TABLE IF NOT EXISTS \`fuel_config\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`fuel_type\` enum('petrol','diesel','lubricant') NOT NULL,
    \`retail_price\` decimal(10,2) NOT NULL,
    \`latest_cost_price\` decimal(10,2) NOT NULL,
    \`evaporation_rate_pct\` decimal(6,4) DEFAULT '0.1000',
    \`tank_capacity_litres\` decimal(10,2) DEFAULT '20000.00',
    \`updated_by\` varchar(100),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`fuel_config_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`fuel_config_fuel_type_unique\` UNIQUE(\`fuel_type\`)
  )
`);
console.log("✓ fuel_config table created");

// Seed default fuel config (IOC retail prices as of Apr 2026, Hyderabad)
// Petrol: retail ₹103.41, cost ₹99.46 → margin ₹3.95/L
// Diesel: retail ₹89.14, cost ₹86.65 → margin ₹2.49/L
// Evaporation: industry standard 0.1% per day for underground tanks
await conn.execute(`
  INSERT INTO fuel_config (fuel_type, retail_price, latest_cost_price, evaporation_rate_pct, tank_capacity_litres)
  VALUES
    ('petrol',    103.41, 99.46, 0.1000, 20000.00),
    ('diesel',     89.14, 86.65, 0.0800, 25000.00),
    ('lubricant',   0.00,  0.00, 0.0000,  1000.00)
  ON DUPLICATE KEY UPDATE
    retail_price = VALUES(retail_price),
    latest_cost_price = VALUES(latest_cost_price)
`);
console.log("✓ fuel_config seeded (petrol + diesel + lubricant)");

await conn.end();
console.log("✅ Migration complete");
