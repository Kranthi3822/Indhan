import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const sql = readFileSync('/home/ubuntu/fix_purchases.sql', 'utf8');
const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));

let count = 0;
for (const stmt of statements) {
  await conn.execute(stmt);
  count++;
}
console.log('Executed', count, 'statements');

// Verify
const [pur] = await conn.execute('SELECT p.name, COUNT(po.id) as cnt, SUM(po.quantityOrdered) as qty, SUM(po.totalAmount) as amt FROM purchase_orders po JOIN products p ON po.productId = p.id WHERE po.productId IN (1,2) GROUP BY p.id, p.name');
console.log('VERIFICATION:');
pur.forEach(r => console.log(' ', r.name, ':', r.cnt, 'orders,', Number(r.qty).toFixed(0)+'L, Rs'+Number(r.amt).toFixed(2)));

const [inv] = await conn.execute('SELECT name, currentStock FROM products WHERE id IN (1,2)');
console.log('INVENTORY:');
inv.forEach(r => console.log(' ', r.name, ':', Number(r.currentStock).toFixed(2)+'L'));

await conn.end();
console.log('Done!');
