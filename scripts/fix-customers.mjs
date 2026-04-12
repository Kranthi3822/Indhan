/**
 * Fix customer duplicates:
 * 1. Map each high-ID duplicate to its original low-ID canonical record
 * 2. Migrate customer_payments to point to the canonical IDs
 * 3. Copy outstanding balance from the "active" high-ID record to the canonical record
 * 4. Set correct credit limits based on actual transaction volumes from the data
 * 5. Delete all high-ID duplicates
 */
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Mapping: customer name → canonical ID (original seeded records)
const canonicalIds = {
  'Laxmi Infratech': 1,
  'Manikanta': 2,
  'BLG Infra Pvt Ltd': 3,
  'Brunda Infra Pvt.Ltd': 4,
  'Battapur': 5,
  'Dattu': 6,
  'Kodicherla': 7,
  'Mendora': 8,
  'Rockeira Engineering Pvt Ltd': 9,
  'Savel': 10,
  'Srinivas Sir': 11,
  'Velgatur': 12,
};

// The "active" high-ID records that have real payment data (highest ID per customer)
// These have the real outstanding balances
const activeHighIds = {
  'Battapur': 30060,
  'BLG Infra Pvt Ltd': 30059,
  'Brunda Infra Pvt.Ltd': 30049,
  'Dattu': 30050,
  'Kodicherla': 30051,
  'Laxmi Infratech': 30052,
  'Manikanta': 30053,
  'Mendora': 30054,
  'Rockeira Engineering Pvt Ltd': 30055,
  'Savel': 30056,
  'Srinivas Sir': 30057,
  'Velgatur': 30058,
};

// Credit limits based on actual business volume (from payment data analysis):
// Laxmi Infratech: ₹5.7 crore total paid → ₹50L limit
// Manikanta: ₹2.2 crore total paid → ₹20L limit
// BLG Infra: ₹94.8L total paid → ₹10L limit
// Brunda Infra: ₹41K total paid → ₹2L limit
// Battapur: ₹6K total paid → ₹50K limit
// Dattu: ₹5.2K total paid → ₹25K limit
// Kodicherla: ₹6K total paid → ₹25K limit
// Mendora: ₹9.8K total paid → ₹25K limit
// Rockeira: ₹11.3K total paid → ₹50K limit
// Savel: ₹2L total paid → ₹2L limit
// Srinivas Sir: ₹3.5L total paid → ₹3L limit
// Velgatur: ₹1.2L total paid → ₹1L limit
const creditLimits = {
  'Laxmi Infratech': 5000000,     // ₹50 lakhs
  'Manikanta': 2000000,           // ₹20 lakhs
  'BLG Infra Pvt Ltd': 1000000,   // ₹10 lakhs
  'Brunda Infra Pvt.Ltd': 200000, // ₹2 lakhs
  'Battapur': 50000,              // ₹50K
  'Dattu': 25000,                 // ₹25K
  'Kodicherla': 25000,            // ₹25K
  'Mendora': 25000,               // ₹25K
  'Rockeira Engineering Pvt Ltd': 50000, // ₹50K
  'Savel': 200000,                // ₹2 lakhs
  'Srinivas Sir': 300000,         // ₹3 lakhs
  'Velgatur': 100000,             // ₹1 lakh
};

console.log('Starting customer deduplication...\n');

for (const [name, canonicalId] of Object.entries(canonicalIds)) {
  const activeHighId = activeHighIds[name];
  const creditLimit = creditLimits[name];

  // 1. Get outstanding balance from the active high-ID record
  const [activeRows] = await conn.execute(
    'SELECT outstandingBalance FROM customers WHERE id = ?',
    [activeHighId]
  );
  const outstanding = activeRows[0]?.outstandingBalance ?? 0;

  // 2. Update canonical record with correct credit limit and outstanding balance
  await conn.execute(
    'UPDATE customers SET creditLimit = ?, outstandingBalance = ? WHERE id = ?',
    [creditLimit, outstanding, canonicalId]
  );
  console.log(`✓ Updated canonical ID ${canonicalId} (${name}): creditLimit=₹${creditLimit.toLocaleString('en-IN')}, outstanding=₹${outstanding}`);

  // 3. Migrate customer_payments from the active high-ID to canonical ID
  const [updateResult] = await conn.execute(
    'UPDATE customer_payments SET customerId = ? WHERE customerId = ?',
    [canonicalId, activeHighId]
  );
  console.log(`  Migrated ${updateResult.affectedRows} payment records from ID ${activeHighId} → ${canonicalId}`);

  // 4. Delete ALL high-ID duplicate records for this customer
  const [deleteResult] = await conn.execute(
    'DELETE FROM customers WHERE name = ? AND id > 100',
    [name]
  );
  console.log(`  Deleted ${deleteResult.affectedRows} duplicate records for ${name}\n`);
}

// Verify final state
const [finalRows] = await conn.execute('SELECT id, name, creditLimit, outstandingBalance FROM customers ORDER BY id');
console.log('\nFinal customer list:');
finalRows.forEach(r => {
  console.log(`  ID:${r.id} ${r.name} | creditLimit: ₹${Number(r.creditLimit).toLocaleString('en-IN')} | outstanding: ₹${Number(r.outstandingBalance).toLocaleString('en-IN')}`);
});

const [countRow] = await conn.execute('SELECT COUNT(*) as cnt FROM customers');
console.log(`\nTotal customers: ${countRow[0].cnt} (should be 12)`);

const [payCountRow] = await conn.execute('SELECT COUNT(*) as cnt FROM customer_payments WHERE customerId > 100');
console.log(`Orphaned payments (customerId > 100): ${payCountRow[0].cnt} (should be 0)`);

await conn.end();
console.log('\nDone!');
