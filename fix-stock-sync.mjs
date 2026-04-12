/**
 * fix-stock-sync.mjs
 * Syncs products.currentStock from the latest daily_reports closing stock values.
 * Run once: node fix-stock-sync.mjs
 */
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("❌  DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

// 1. Get the latest closing stocks from daily_reports
const [latestRow] = await conn.execute(`
  SELECT
    closingStockPetrol,
    closingStockDiesel,
    reportDate
  FROM daily_reports
  ORDER BY reportDate DESC
  LIMIT 1
`);

if (!latestRow || latestRow.length === 0) {
  console.error("❌  No daily_reports rows found");
  await conn.end();
  process.exit(1);
}

const { closingStockPetrol, closingStockDiesel, reportDate } = latestRow[0];
console.log(`\n📅  Latest report date: ${reportDate}`);
console.log(`   Petrol closing stock: ${closingStockPetrol} L`);
console.log(`   Diesel closing stock: ${closingStockDiesel} L`);

// 2. Update products table
const [petrolResult] = await conn.execute(
  "UPDATE products SET currentStock = ?, updatedAt = NOW() WHERE name = 'Petrol (MS)'",
  [closingStockPetrol]
);
const [dieselResult] = await conn.execute(
  "UPDATE products SET currentStock = ?, updatedAt = NOW() WHERE name = 'Diesel (HSD)'",
  [closingStockDiesel]
);

console.log(`\n✅  Petrol (MS) updated: ${petrolResult.affectedRows} row(s)`);
console.log(`✅  Diesel (HSD) updated: ${dieselResult.affectedRows} row(s)`);

// 3. Verify
const [verifyRows] = await conn.execute(
  "SELECT name, currentStock, reorderLevel FROM products WHERE category = 'fuel'"
);
console.log("\n📦  Current stock after update:");
for (const r of verifyRows) {
  const pct = ((Number(r.currentStock) / 20000) * 100).toFixed(1);
  const status = Number(r.currentStock) < Number(r.reorderLevel) ? "⚠️  BELOW MIN" : "✅  OK";
  console.log(`   ${r.name}: ${Number(r.currentStock).toLocaleString()} L (${pct}% of 20KL tank) ${status}`);
}

await conn.end();
console.log("\n🎉  Stock sync complete!");
