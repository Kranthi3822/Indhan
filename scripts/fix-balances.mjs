/**
 * Backfill customer outstanding balances from customer_payments data
 * Uses JOIN aggregation (fast, single query) instead of correlated subquery
 */
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL.split('?')[0];
const m = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
const [, user, password, host, port, database] = m;

const conn = await mysql.createConnection({
  host, port: parseInt(port), user, password, database,
  ssl: { rejectUnauthorized: false },
  connectTimeout: 30000,
});
console.log('Connected.\n');

// Step 1: Aggregate per customer — credit sales minus payments received
const [agg] = await conn.execute(`
  SELECT 
    customerId,
    SUM(CASE WHEN notes LIKE 'Credit sale%' THEN amount ELSE 0 END) AS totalSales,
    SUM(CASE WHEN notes LIKE 'Payment received%' THEN amount ELSE 0 END) AS totalPaid
  FROM customer_payments
  GROUP BY customerId
`);

console.log(`Aggregated data for ${agg.length} customers with transactions.`);

// Step 2: Update each customer's outstandingBalance
let updated = 0;
for (const row of agg) {
  const outstanding = Math.max(0, parseFloat((parseFloat(row.totalSales || 0) - parseFloat(row.totalPaid || 0)).toFixed(2)));
  await conn.execute(
    'UPDATE customers SET outstandingBalance = ? WHERE id = ?',
    [outstanding, row.customerId]
  );
  if (outstanding > 0) {
    updated++;
  }
}

console.log(`Updated ${updated} customers with non-zero outstanding balances.\n`);

// Step 3: Verify top customers
const [top] = await conn.execute(
  'SELECT name, outstandingBalance FROM customers WHERE outstandingBalance > 0 ORDER BY outstandingBalance DESC LIMIT 10'
);
console.log('Top customers by outstanding balance:');
top.forEach(r => {
  const bal = parseFloat(r.outstandingBalance).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  console.log(`  ${r.name}: ${bal}`);
});

const [total] = await conn.execute(
  'SELECT SUM(outstandingBalance) as total, COUNT(*) as count FROM customers WHERE outstandingBalance > 0'
);
const totalAmt = parseFloat(total[0].total || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
console.log(`\nTotal receivables: ${totalAmt} across ${total[0].count} customers`);

await conn.end();
console.log('\n✅ Outstanding balances backfilled successfully.');
