/**
 * Backfill daily_reports: aggregate in JS, then single bulk CASE WHEN UPDATE
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
console.log('Connected.');

// Step 1: Get bank aggregates in JS
console.log('Fetching bank transaction aggregates...');
const [bankRows] = await conn.execute(
  `SELECT transactionDate, SUM(CASE WHEN creditAmount > 0 THEN creditAmount ELSE 0 END) AS totalDeposit
   FROM bank_transactions GROUP BY transactionDate`
);
console.log(`  → ${bankRows.length} bank dates fetched`);

// Build CASE WHEN SQL for bank deposits
if (bankRows.length > 0) {
  const cases = bankRows.map(r => {
    const d = typeof r.transactionDate === 'string'
      ? r.transactionDate.substring(0, 10)
      : new Date(r.transactionDate).toISOString().substring(0, 10);
    return `WHEN reportDate = '${d}' THEN ${parseFloat(r.totalDeposit || 0).toFixed(2)}`;
  }).join('\n    ');
  
  const sql = `UPDATE daily_reports SET bankDeposit = CASE ${cases} ELSE 0 END`;
  console.log('Updating bankDeposit...');
  const [r2] = await conn.execute(sql);
  console.log(`  → ${r2.affectedRows} rows updated`);
}

// Step 2: Compute profit/cash in single UPDATE
console.log('Computing grossProfit, netProfit, cashBalance...');
const [r3] = await conn.execute(`
  UPDATE daily_reports
  SET 
    grossProfit = ROUND(totalSalesValue * 0.028, 2),
    netProfit = GREATEST(0, ROUND(totalSalesValue * 0.028, 2) - totalExpenses),
    cashBalance = GREATEST(0, totalCollected - bankDeposit)
  WHERE totalSalesValue > 0
`);
console.log(`  → ${r3.affectedRows} rows updated`);

// Step 3: Verify
const [totals] = await conn.execute(`
  SELECT SUM(totalSalesValue) as s, SUM(totalExpenses) as e, SUM(netProfit) as n,
         SUM(cashBalance) as c, SUM(bankDeposit) as b, COUNT(*) as days
  FROM daily_reports
`);
const t = totals[0];
const fmt = n => '₹' + parseFloat(n||0).toLocaleString('en-IN', {maximumFractionDigits:0});
console.log('\n=== VERIFICATION ===');
console.log(`Total Sales:    ${fmt(t.s)}`);
console.log(`Total Expenses: ${fmt(t.e)}`);
console.log(`Net Profit:     ${fmt(t.n)}`);
console.log(`Cash Balance:   ${fmt(t.c)}`);
console.log(`Bank Deposits:  ${fmt(t.b)}`);
console.log(`Days:           ${t.days}`);

await conn.end();
console.log('\n✅ Done.');
