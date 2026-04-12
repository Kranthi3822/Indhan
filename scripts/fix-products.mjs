import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log('Connected to DB');

  // Canonical product IDs (originals seeded, IDs 1-5)
  // High-ID duplicates have the real data from Excel import
  // Mapping: canonical_id -> best_duplicate_id (the one with real stock/price/FK refs)
  const productMap = [
    // canonical, duplicate_with_real_data, name
    { canonical: 1, realId: 30006, name: 'Petrol (MS)' },     // 30006 has purchase orders
    { canonical: 2, realId: 30007, name: 'Diesel (HSD)' },    // 30007 has purchase orders
    { canonical: 3, realId: 30003, name: 'ADON-Oil' },        // 30003 has real price
    { canonical: 4, realId: 30004, name: 'Servo 2T' },        // 30004 has real price
    { canonical: 5, realId: 30005, name: 'Servo 4T' },        // 30005 has real price
  ];

  // All duplicate IDs to delete after migration
  const allDuplicateIds = [30001, 30002, 30003, 30004, 30005, 30006, 30007, 30008, 30009, 30010];

  for (const { canonical, realId, name } of productMap) {
    console.log(`\nProcessing ${name}: canonical=${canonical}, realId=${realId}`);

    // Copy stock, price data from realId to canonical
    const [realRows] = await conn.execute('SELECT * FROM products WHERE id = ?', [realId]);
    if (realRows.length === 0) { console.log(`  realId ${realId} not found, skipping`); continue; }
    const real = realRows[0];

    await conn.execute(`
      UPDATE products SET
        currentStock = ?,
        purchasePrice = ?,
        sellingPrice = ?,
        margin = ?,
        unit = ?,
        supplier = ?,
        reorderLevel = ?
      WHERE id = ?
    `, [real.currentStock, real.purchasePrice, real.sellingPrice, real.margin, 'liter', real.supplier, real.reorderLevel, canonical]);
    console.log(`  Updated canonical ${canonical} with stock=${real.currentStock}, sellPrice=${real.sellingPrice}`);

    // Migrate purchase_orders from realId -> canonical
    const [poResult] = await conn.execute('UPDATE purchase_orders SET productId = ? WHERE productId = ?', [canonical, realId]);
    console.log(`  Migrated ${poResult.affectedRows} purchase_orders from ${realId} -> ${canonical}`);

    // Migrate any other duplicate IDs for this product
    const otherDuplicates = allDuplicateIds.filter(id => {
      // Find other duplicates of same name (not the realId)
      return id !== realId;
    });
    // Actually: get all products with same name except canonical
    const [sameName] = await conn.execute('SELECT id FROM products WHERE name = ? AND id != ?', [name, canonical]);
    for (const dup of sameName) {
      const dupId = dup.id;
      const [po2] = await conn.execute('UPDATE purchase_orders SET productId = ? WHERE productId = ?', [canonical, dupId]);
      const [st2] = await conn.execute('UPDATE sales_transactions SET productId = ? WHERE productId = ?', [canonical, dupId]);
      console.log(`  Migrated refs from dup ${dupId}: po=${po2.affectedRows}, st=${st2.affectedRows}`);
    }
  }

  // Delete all duplicate products (IDs in 30000 range)
  const [deleteResult] = await conn.execute('DELETE FROM products WHERE id >= 30000');
  console.log(`\nDeleted ${deleteResult.affectedRows} duplicate product rows`);

  // Verify
  const [remaining] = await conn.execute('SELECT id, name, currentStock, purchasePrice, sellingPrice, unit FROM products ORDER BY name');
  console.log('\n=== REMAINING PRODUCTS ===');
  remaining.forEach(p => console.log(`  id=${p.id} ${p.name}: stock=${p.currentStock} unit=${p.unit} buyPrice=${p.purchasePrice} sellPrice=${p.sellingPrice}`));

  // Add UNIQUE constraint on name to prevent future duplicates
  try {
    await conn.execute('ALTER TABLE products ADD UNIQUE INDEX uq_product_name (name)');
    console.log('\nAdded UNIQUE constraint on products.name');
  } catch (e) {
    if (e.code === 'ER_DUP_KEYNAME') {
      console.log('\nUNIQUE constraint on products.name already exists');
    } else {
      console.log('\nFailed to add UNIQUE constraint:', e.message);
    }
  }

  await conn.end();
  console.log('\nDone!');
}

main().catch(console.error);
