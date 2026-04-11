/**
 * BEES Excel Data Import — Bulk INSERT version (fast)
 */
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const EXCEL_FILE = '/home/ubuntu/upload/BEES-Accounting31stMar-26.xlsx';

const dbUrl = process.env.DATABASE_URL.split('?')[0];
const m = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
const [, user, password, host, port, database] = m;

console.log(`Connecting to ${host}:${port}/${database}...`);
const conn = await mysql.createConnection({
  host, port: parseInt(port), user, password, database,
  ssl: { rejectUnauthorized: false },
  connectTimeout: 30000,
  multipleStatements: false,
});
console.log('Connected.\n');

// ── Helpers ────────────────────────────────────────────────────────────────────
function toDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  const s = String(val).trim().split(' ')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}
function toDec(val, def = 0) {
  if (val === null || val === undefined || String(val).trim() === '' || String(val).trim() === '-') return def;
  const n = parseFloat(String(val).replace(/,/g, ''));
  return isNaN(n) ? def : parseFloat(n.toFixed(2));
}
function toStr(val, max = 255) {
  if (val === null || val === undefined) return null;
  return String(val).trim().substring(0, max) || null;
}

// Bulk insert helper — splits into chunks of 500 rows
async function bulkInsert(table, columns, rows, chunkSize = 500) {
  if (!rows.length) return 0;
  let total = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => `(${columns.map(() => '?').join(',')})`).join(',');
    const values = chunk.flat();
    try {
      const [res] = await conn.execute(
        `INSERT IGNORE INTO ${table} (${columns.join(',')}) VALUES ${placeholders}`,
        values
      );
      total += res.affectedRows;
    } catch(e) {
      console.log(`  Chunk error: ${e.message.substring(0, 100)}`);
    }
  }
  return total;
}

let totalImported = 0;

// ── Load Excel ─────────────────────────────────────────────────────────────────
console.log('Loading Excel...');
const wb = XLSX.readFile(EXCEL_FILE, { cellDates: true });
console.log('Sheets:', wb.SheetNames.join(', '), '\n');

// ── 1. CUSTOMERS ──────────────────────────────────────────────────────────────
console.log('1. Customers...');
const customerNames = new Set();
const recData = XLSX.utils.sheet_to_json(wb.Sheets['Receivables-Mar'], { header: 1, defval: null });
for (const row of recData.slice(3)) {
  const n = toStr(row[1]);
  if (n && n.length > 1 && !['total','name','party name','customer','sl no','s.no'].includes(n.toLowerCase())) customerNames.add(n);
}
const dcaData = XLSX.utils.sheet_to_json(wb.Sheets['Daily Credit Accounts'], { header: 1, defval: null });
for (const row of dcaData.slice(3)) {
  const n = toStr(row[1]);
  if (n && n.length > 1 && !['total','name','party name'].includes(n.toLowerCase())) customerNames.add(n);
}
const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
const custRows = [...customerNames].map(name => [name, 500000.00, 30, 1, now, now]);
const custCount = await bulkInsert('customers', ['name','creditLimit','paymentTermsDays','isActive','createdAt','updatedAt'], custRows);
totalImported += custCount;
console.log(`  ${custCount} customers imported`);

// Build customer map
const [custList] = await conn.execute('SELECT id, name FROM customers');
const customerMap = {};
for (const r of custList) customerMap[r.name] = r.id;

// ── 2. PRODUCTS ───────────────────────────────────────────────────────────────
console.log('\n2. Products...');
const prodDefs = [
  ['Petrol (MS)', 'fuel', 'L', 11382.31, 2000, 104.88, 108.83, 3.95, 'Indian Oil Corporation'],
  ['Diesel (HSD)', 'fuel', 'L', 21774.66, 2000, 94.61, 97.10, 2.49, 'Indian Oil Corporation'],
  ['ADON-Oil', 'lubricant', 'L', 50.00, 10, 350.00, 400.00, 50.00, 'Indian Oil Corporation'],
  ['Servo 2T', 'lubricant', 'L', 30.00, 10, 280.00, 320.00, 40.00, 'Indian Oil Corporation'],
  ['Servo 4T', 'lubricant', 'L', 30.00, 10, 320.00, 365.00, 45.00, 'Indian Oil Corporation'],
];
for (const [name, cat, unit, stock, reorder, purchase, selling, margin, supplier] of prodDefs) {
  await conn.execute(
    `INSERT INTO products (name,category,unit,currentStock,reorderLevel,purchasePrice,sellingPrice,margin,supplier,isActive,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,1,NOW(),NOW()) ON DUPLICATE KEY UPDATE currentStock=VALUES(currentStock)`,
    [name, cat, unit, stock, reorder, purchase, selling, margin, supplier]
  );
}
const [prodList] = await conn.execute('SELECT id, name FROM products');
const productMap = {};
for (const r of prodList) productMap[r.name] = r.id;
console.log(`  Products: ${Object.keys(productMap).join(', ')}`);

// ── 3. BANK TRANSACTIONS ──────────────────────────────────────────────────────
console.log('\n3. Bank transactions...');
const bankData = XLSX.utils.sheet_to_json(wb.Sheets['Bank Statement Mar-26'], { header: 1, defval: null });
const bankRows = [];
for (const row of bankData.slice(3)) {
  const d = toDate(row[0]);
  if (!d) continue;
  const desc = (toStr(row[1]) || 'Bank Transaction').substring(0, 255);
  const withdrawal = toDec(row[2]);
  const deposit = toDec(row[3]);
  const balance = toDec(row[4]);
  const txnType = deposit > 0 ? 'credit' : 'debit';
  bankRows.push([d, desc, txnType, withdrawal, deposit, balance, 'unreconciled', now]);
}
const bankCount = await bulkInsert('bank_transactions',
  ['transactionDate','description','transactionType','withdrawal','deposit','balance','reconciliationStatus','createdAt'],
  bankRows);
totalImported += bankCount;
console.log(`  ${bankCount} / ${bankRows.length} bank transactions imported`);

// ── 4. EXPENSES ───────────────────────────────────────────────────────────────
console.log('\n4. Expenses...');
const expData = XLSX.utils.sheet_to_json(wb.Sheets['Daily Expenses'], { header: 1, defval: null });
const expRows = [];
for (const row of expData.slice(1)) {
  const d = toDate(row[0]);
  if (!d) continue;
  const head = (toStr(row[1]) || 'Operating Activities').substring(0, 100);
  const subHead = (toStr(row[2]) || 'Admin').substring(0, 100);
  const desc = (toStr(row[3]) || 'Expense').substring(0, 255);
  const status = (toStr(row[4]) || 'Paid').substring(0, 50);
  const credit = toDec(row[5]);
  const debit = toDec(row[6]);
  const mode = (toStr(row[7]) || 'Cash').substring(0, 50);
  const paidBy = (toStr(row[8]) || 'Incharge').substring(0, 100);
  const amount = debit > 0 ? debit : credit;
  if (amount === 0) continue;
  const approval = status.toLowerCase() === 'paid' ? 'approved' : 'pending';
  expRows.push([d, head, subHead, desc, amount, status, mode, paidBy, approval, now, now]);
}
const expCount = await bulkInsert('expenses',
  ['expenseDate','headAccount','subHeadAccount','description','amount','transactionStatus','modeOfPayment','paidBy','approvalStatus','createdAt','updatedAt'],
  expRows);
totalImported += expCount;
console.log(`  ${expCount} / ${expRows.length} expenses imported`);

// ── 5. DAILY REPORTS ──────────────────────────────────────────────────────────
console.log('\n5. Daily reports...');
const daData = XLSX.utils.sheet_to_json(wb.Sheets['Daily Accounting'], { header: 1, defval: null });
const stockData = XLSX.utils.sheet_to_json(wb.Sheets['Daily Stock Statement'], { header: 1, defval: null });
const stockMap = {};
for (const row of stockData.slice(3)) {
  const d = toDate(row[0]);
  if (!d) continue;
  stockMap[d] = {
    openPetrol: toDec(row[1]), closePetrol: toDec(row[7]), soldPetrol: toDec(row[6]),
    openDiesel: toDec(row[11]), closeDiesel: toDec(row[18]), soldDiesel: toDec(row[17]),
  };
}
const reportRows = [];
for (const row of daData.slice(3)) {
  const d = toDate(row[0]);
  if (!d) continue;
  const totalSales = toDec(row[1]);
  const cash = toDec(row[2]);
  const paytm = toDec(row[3]);
  const pos = toDec(row[4]);
  const qr = toDec(row[5]);
  const fleet = toDec(row[6]);
  const credit = toDec(row[7]);
  const totalReceipts = toDec(row[8]);
  if (totalSales === 0 && totalReceipts === 0) continue;
  const card = parseFloat((pos + paytm + qr + fleet).toFixed(2));
  const s = stockMap[d] || {};
  reportRows.push([
    d,
    s.openPetrol||0, s.openDiesel||0, s.closePetrol||0, s.closeDiesel||0,
    s.soldPetrol||0, s.soldDiesel||0,
    totalSales, cash, card, 0, credit, totalReceipts,
    'reconciled', now, now
  ]);
}
const reportCount = await bulkInsert('daily_reports',
  ['reportDate','openingStockPetrol','openingStockDiesel','closingStockPetrol','closingStockDiesel',
   'petrolSalesQty','dieselSalesQty','totalSalesValue','cashCollected','cardCollected','onlineCollected',
   'creditSales','totalCollected','reconciliationStatus','createdAt','updatedAt'],
  reportRows);
totalImported += reportCount;
console.log(`  ${reportCount} / ${reportRows.length} daily reports imported`);

// ── 6. PURCHASE ORDERS ────────────────────────────────────────────────────────
console.log('\n6. Purchase orders...');
const poData = XLSX.utils.sheet_to_json(wb.Sheets['Purchase-Fuel'], { header: 1, defval: null });
const petrolId = productMap['Petrol (MS)'];
const dieselId = productMap['Diesel (HSD)'];
const poRows = [];
for (const row of poData.slice(3)) {
  const d = toDate(row[0]);
  if (!d) continue;
  const petrolQty = toDec(row[1]);
  const petrolAmt = toDec(row[3]);
  const petrolRate = toDec(row[5]);
  const dieselQty = toDec(row[6]);
  const dieselAmt = toDec(row[8]);
  const dieselRate = toDec(row[10]);
  if (petrolQty > 0) poRows.push([d, 'Indian Oil Corporation', petrolId, petrolQty, petrolQty, petrolRate, petrolAmt, 'received', now, now]);
  if (dieselQty > 0) poRows.push([d, 'Indian Oil Corporation', dieselId, dieselQty, dieselQty, dieselRate, dieselAmt, 'received', now, now]);
}
const poCount = await bulkInsert('purchase_orders',
  ['orderDate','supplier','productId','quantityOrdered','quantityReceived','unitPrice','totalAmount','status','createdAt','updatedAt'],
  poRows);
totalImported += poCount;
console.log(`  ${poCount} / ${poRows.length} purchase orders imported`);

// ── 7. CUSTOMER PAYMENTS ──────────────────────────────────────────────────────
console.log('\n7. Customer credit transactions...');
const payRows = [];
for (const row of dcaData.slice(3)) {
  const d = toDate(row[0]);
  if (!d) continue;
  const custName = toStr(row[1]);
  if (!custName) continue;
  const totalAmt = toDec(row[9]);
  const totalRcvd = toDec(row[10]);
  const hsdLtr = toDec(row[3]);
  const msLtr = toDec(row[6]);
  let custId = customerMap[custName];
  if (!custId) {
    for (const [n, id] of Object.entries(customerMap)) {
      if (custName.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(custName.toLowerCase())) {
        custId = id; break;
      }
    }
  }
  if (!custId) continue;
  if (totalAmt > 0) payRows.push([d, custId, totalAmt, 'credit', null, `Credit sale — HSD:${hsdLtr}L MS:${msLtr}L`, now]);
  if (totalRcvd > 0) payRows.push([d, custId, totalRcvd, 'bank_transfer', null, 'Payment received', now]);
}
const payCount = await bulkInsert('customer_payments',
  ['paymentDate','customerId','amount','paymentMethod','referenceNo','notes','createdAt'],
  payRows);
totalImported += payCount;
console.log(`  ${payCount} / ${payRows.length} customer transactions imported`);

// ── 8. UPDATE CLOSING STOCK ───────────────────────────────────────────────────
console.log('\n8. Updating closing stock...');
let lastPetrol = 0, lastDiesel = 0;
for (const row of stockData.slice(3)) {
  if (!toDate(row[0])) continue;
  if (row[7] != null) lastPetrol = toDec(row[7]);
  if (row[18] != null) lastDiesel = toDec(row[18]);
}
await conn.execute("UPDATE products SET currentStock=? WHERE name='Petrol (MS)'", [lastPetrol]);
await conn.execute("UPDATE products SET currentStock=? WHERE name='Diesel (HSD)'", [lastDiesel]);
console.log(`  Petrol: ${lastPetrol}L | Diesel: ${lastDiesel}L`);

await conn.end();
console.log('\n' + '='.repeat(60));
console.log('✅  IMPORT COMPLETE');
console.log(`Total records imported: ${totalImported.toLocaleString()}`);
console.log('='.repeat(60));
