/**
 * Reset purchase_orders for Petrol and Diesel to exact Excel data.
 * Uses Python-parsed data (all 86 diesel rows, 57 petrol rows).
 */
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Step 1: Delete all existing Petrol and Diesel purchase orders
const [del] = await conn.execute('DELETE FROM purchase_orders WHERE productId IN (1, 2)');
console.log(`Deleted ${del.affectedRows} existing fuel purchase orders`);

// Step 2: Read the SQL inserts from the generated file (skip the DELETE line)
const sql = readFileSync('/home/ubuntu/fix_purchases.sql', 'utf8');
const statements = sql.split('\n')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && s.toUpperCase().startsWith('INSERT'));

console.log(`Executing ${statements.length} INSERT statements...`);
let count = 0;
for (const stmt of statements) {
  // Remove trailing semicolon if present
  const cleanStmt = stmt.endsWith(';') ? stmt.slice(0, -1) : stmt;
  await conn.execute(cleanStmt);
  count++;
}
console.log(`Inserted ${count} purchase orders`);

// Step 3: Fix closing stock
await conn.execute('UPDATE products SET currentStock = 13146.20 WHERE id = 2');
await conn.execute('UPDATE products SET currentStock = 11920.19 WHERE id = 1');
console.log('Fixed closing stock: Diesel=13146.20L, Petrol=11920.19L');

// Step 4: Verify
const [pur] = await conn.execute(`
  SELECT p.name, COUNT(po.id) as cnt, SUM(po.quantityOrdered) as qty, SUM(po.totalAmount) as amt
  FROM purchase_orders po JOIN products p ON po.productId = p.id
  WHERE po.productId IN (1,2)
  GROUP BY p.id, p.name
`);
console.log('\nVERIFICATION:');
pur.forEach(r => console.log(`  ${r.name}: ${r.cnt} orders, ${Number(r.qty).toFixed(0)}L, Rs${Number(r.amt).toFixed(2)}`));

await conn.end();
console.log('\nDone!');
