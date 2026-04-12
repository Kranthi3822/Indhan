/**
 * Fix purchase_orders table to match Excel Purchase-Fuel sheet exactly.
 * Replaces all Petrol (MS) and Diesel (HSD) purchase records with exact Excel data.
 */
import mysql from 'mysql2/promise';
import XLSX from 'xlsx';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
console.log('Connected to DB');

// Read Excel
const wb = XLSX.readFile('/home/ubuntu/upload/BEES-Accounting31stMar-26(1).xlsx');
const ws = wb.Sheets['Purchase-Fuel'];
const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

// Parse rows (skip first 2 header rows)
// Columns: Date(0), MS-Qty(1), MS-CumQty(2), MS-Amt(3), MS-CumAmt(4), MS-Price(5),
//          HSD-Qty(6), HSD-CumQty(7), HSD-Amt(8), HSD-CumAmt(9), HSD-Price(10), ...
const petrolOrders = [];
const dieselOrders = [];

for (let i = 2; i < rawRows.length; i++) {
  const row = rawRows[i];
  if (!row[0] || row[0] === 'EOD') continue;
  
  // Parse date - XLSX returns date as string when raw:false
  let dateStr;
  const rawWs = wb.Sheets['Purchase-Fuel'];
  const cellAddr = XLSX.utils.encode_cell({ r: i, c: 0 });
  const cell = rawWs[cellAddr];
  if (!cell) continue;
  
  if (cell.t === 'n' && cell.v && cell.z && cell.z.includes('d')) {
    // Excel date serial with date format
    const d = XLSX.SSF.parse_date_code(cell.v);
    if (!d || !d.y) continue;
    dateStr = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  } else if (cell.t === 'n' && cell.v && cell.v > 40000 && cell.v < 50000) {
    // Likely an Excel date serial (dates between 2009 and 2036)
    const d = XLSX.SSF.parse_date_code(cell.v);
    if (!d || !d.y) continue;
    dateStr = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  } else if (cell.t === 's') {
    if (cell.v === 'EOD') continue;
    continue;
  } else {
    continue;
  }
  
  const msQty = parseFloat(row[1] || 0);
  const msAmt = parseFloat(row[3] || 0);
  const msPrice = parseFloat(row[5] || 0);
  const hsdQty = parseFloat(row[6] || 0);
  const hsdAmt = parseFloat(row[8] || 0);
  const hsdPrice = parseFloat(row[10] || 0);
  
  if (msQty > 0) petrolOrders.push({ date: dateStr, qty: msQty, amt: msAmt, price: msPrice });
  if (hsdQty > 0) dieselOrders.push({ date: dateStr, qty: hsdQty, amt: hsdAmt, price: hsdPrice });
}

console.log(`\nExcel Petrol: ${petrolOrders.length} rows, ${petrolOrders.reduce((s,r)=>s+r.qty,0)}L, ₹${petrolOrders.reduce((s,r)=>s+r.amt,0).toFixed(2)}`);
console.log(`Excel Diesel: ${dieselOrders.length} rows, ${dieselOrders.reduce((s,r)=>s+r.qty,0)}L, ₹${dieselOrders.reduce((s,r)=>s+r.amt,0).toFixed(2)}`);

// Delete existing fuel purchase orders
const [del] = await conn.execute('DELETE FROM purchase_orders WHERE productId IN (1, 2)');
console.log(`\nDeleted ${del.affectedRows} existing fuel purchase orders`);

// Insert Petrol (productId=1)
for (const o of petrolOrders) {
  await conn.execute(
    `INSERT INTO purchase_orders (productId, supplier, orderDate, quantityOrdered, quantityReceived, unitPrice, totalAmount, status, notes, createdAt) 
     VALUES (1, 'HPCL', ?, ?, ?, ?, ?, 'delivered', 'Excel import', NOW())`,
    [o.date, o.qty, o.qty, o.price.toFixed(4), o.amt.toFixed(2)]
  );
}
console.log(`Inserted ${petrolOrders.length} Petrol orders`);

// Insert Diesel (productId=2)
for (const o of dieselOrders) {
  await conn.execute(
    `INSERT INTO purchase_orders (productId, supplier, orderDate, quantityOrdered, quantityReceived, unitPrice, totalAmount, status, notes, createdAt) 
     VALUES (2, 'HPCL', ?, ?, ?, ?, ?, 'delivered', 'Excel import', NOW())`,
    [o.date, o.qty, o.qty, o.price.toFixed(4), o.amt.toFixed(2)]
  );
}
console.log(`Inserted ${dieselOrders.length} Diesel orders`);

// Verify
const [verify] = await conn.execute(`
  SELECT p.name, COUNT(po.id) as cnt, SUM(po.quantityOrdered) as qty, SUM(po.totalAmount) as amt
  FROM purchase_orders po JOIN products p ON po.productId = p.id
  WHERE po.productId IN (1,2)
  GROUP BY p.id, p.name
`);
console.log('\n=== VERIFICATION ===');
verify.forEach(r => console.log(`  ${r.name}: ${r.cnt} orders, ${Number(r.qty)}L, ₹${Number(r.amt).toFixed(2)}`));

// Also fix Diesel closing stock to match Excel (13,146.20L)
await conn.execute('UPDATE products SET currentStock = 13146.20 WHERE id = 2');
console.log('\nFixed Diesel closing stock to 13,146.20L (from Excel Daily Stock Statement)');

await conn.end();
console.log('\nDone!');
