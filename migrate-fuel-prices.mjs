import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { config } from "dotenv";
config();

const sql = readFileSync("./drizzle/0007_greedy_namora.sql", "utf8");

async function migrate() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const statements = sql
    .split("--> statement-breakpoint")
    .map(s => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    const tableName = stmt.match(/CREATE TABLE `(\w+)`/)?.[1] ?? "unknown";
    try {
      await conn.execute(stmt);
      console.log(`✅ Created table: ${tableName}`);
    } catch (err) {
      if (err.code === "ER_TABLE_EXISTS_ERROR") {
        console.log(`⏭  Table already exists: ${tableName}`);
      } else {
        throw err;
      }
    }
  }

  // Seed today's prices from products table
  const today = new Date().toISOString().slice(0, 10);
  const [products] = await conn.execute(
    "SELECT name, purchasePrice, sellingPrice FROM products WHERE category = 'fuel'"
  );
  for (const p of products) {
    const name = String(p.name).toLowerCase();
    const fuelType = name.includes("petrol") ? "petrol" : name.includes("diesel") ? "diesel" : null;
    if (!fuelType) continue;
    const [existing] = await conn.execute(
      "SELECT id FROM daily_fuel_prices WHERE price_date = ? AND fuel_type = ?",
      [today, fuelType]
    );
    if (existing.length === 0) {
      await conn.execute(
        "INSERT INTO daily_fuel_prices (price_date, fuel_type, retail_price, cost_price, source, recorded_by) VALUES (?, ?, ?, ?, 'manual', 'System Seed')",
        [today, fuelType, p.sellingPrice, p.purchasePrice]
      );
      console.log(`🌱 Seeded ${fuelType} price for ${today}: retail ₹${p.sellingPrice}, cost ₹${p.purchasePrice}`);
    }
  }

  await conn.end();
  console.log("\n✅ Migration complete.");
}

migrate().catch(err => { console.error("Migration failed:", err); process.exit(1); });
