/**
 * db-fuel-intelligence.ts
 *
 * Dynamic Fuel Margin & Stock Intelligence
 * ─────────────────────────────────────────
 * 1. ACTUAL MARGIN per litre = Retail Price − Weighted Average Cost Price
 *    (WACP computed from all delivered purchase orders for the period)
 *
 * 2. STOCK VALUE from dip readings (not meter readings)
 *    Stock Value = Latest Dip Litres × Weighted Average Cost Price
 *
 * 3. EVAPORATION LOSS
 *    Daily evaporation = Opening Dip × evaporation_rate_pct / 100
 *    Accumulated over the period from dip_readings table.
 *    If no dip readings: estimated from purchase_orders received qty.
 *
 * 4. EFFECTIVE MARGIN (after evaporation)
 *    Effective Margin = (Total Revenue − Total Cost − Evaporation Value) / Total Litres Sold
 */

import { sql } from "drizzle-orm";
import { drizzle, MySql2Database } from "drizzle-orm/mysql2";
import { dipReadings, fuelConfig, purchaseOrders, products, salesTransactions } from "../drizzle/schema";

let _db: MySql2Database<Record<string, never>> | null = null;
async function getDb() {
  if (!_db) {
    const mysql = await import("mysql2/promise");
    const pool = mysql.createPool(process.env.DATABASE_URL!);
    _db = drizzle(pool) as unknown as MySql2Database<Record<string, never>>;
  }
  return _db;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface FuelMarginData {
  fuelType: "petrol" | "diesel" | "lubricant";
  retailPrice: number;
  latestCostPrice: number;       // from fuel_config (last updated)
  wacpCostPrice: number;         // weighted average cost from purchase orders
  grossMarginPerL: number;       // retailPrice − wacpCostPrice
  effectiveMarginPerL: number;   // after deducting evaporation loss per litre
  grossMarginPct: number;        // (grossMarginPerL / retailPrice) × 100
  effectiveMarginPct: number;
  totalLitresSold: number;
  totalRevenue: number;
  totalCost: number;             // totalLitresSold × wacpCostPrice
  grossProfit: number;           // totalRevenue − totalCost
  evaporationLitres: number;     // litres lost to evaporation in period
  evaporationValue: number;      // evaporationLitres × wacpCostPrice
  effectiveProfit: number;       // grossProfit − evaporationValue
  evaporationRatePct: number;
  // Stock
  latestDipLitres: number | null;  // from dip_readings (null if not recorded)
  latestDipDate: string | null;
  stockValue: number;              // latestDipLitres × wacpCostPrice
  tankCapacityLitres: number;
  stockPct: number;                // latestDipLitres / tankCapacityLitres × 100
}

export interface FuelIntelligenceResult {
  petrol: FuelMarginData;
  diesel: FuelMarginData;
  lubricant: Partial<FuelMarginData> & { fuelType: "lubricant" };
  periodStart: string;
  periodEnd: string;
  totalGrossProfit: number;
  totalEffectiveProfit: number;
  totalEvaporationValue: number;
  totalStockValue: number;
  dataQuality: {
    hasDipReadings: boolean;
    hasActualPurchaseCost: boolean;
    dipReadingCount: number;
  };
}

// ─── Main function ────────────────────────────────────────────────────────────
export async function getFuelIntelligence(
  startDate: string,
  endDate: string
): Promise<FuelIntelligenceResult> {
  const db = await getDb();

  // 1. Load fuel config (evaporation rates, tank capacities) + products table (actual prices)
  const configs = await db.select().from(fuelConfig);
  const configMap = Object.fromEntries(configs.map((c: typeof configs[0]) => [c.fuelType, c]));

  // Also pull actual retail/purchase prices from products table as the authoritative source
  const productPriceRows = await db.execute(sql`
    SELECT name, purchasePrice, sellingPrice, margin
    FROM products WHERE category = 'fuel'
  `) as any;
  const productPrices = (productPriceRows[0] as any[]).reduce((acc: any, r: any) => {
    const name = String(r.name).toLowerCase();
    if (name.includes('petrol')) acc.petrol = { retail: Number(r.sellingPrice), cost: Number(r.purchasePrice), margin: Number(r.margin) };
    if (name.includes('diesel')) acc.diesel = { retail: Number(r.sellingPrice), cost: Number(r.purchasePrice), margin: Number(r.margin) };
    return acc;
  }, {} as Record<string, { retail: number; cost: number; margin: number }>);

  // 2. Weighted Average Cost Price from purchase orders (delivered only)
  //    WACP = SUM(qty × unitPrice) / SUM(qty) for all delivered POs in period
  const purchaseRows = await db.execute(sql`
    SELECT
      p.name AS productName,
      p.category,
      COALESCE(SUM(po.quantityReceived), 0) AS totalQtyReceived,
      COALESCE(SUM(po.quantityReceived * po.unitPrice), 0) AS totalCostValue,
      COALESCE(AVG(po.unitPrice), 0) AS avgUnitPrice,
      MIN(po.unitPrice) AS minPrice,
      MAX(po.unitPrice) AS maxPrice
    FROM purchase_orders po
    JOIN products p ON p.id = po.productId
    WHERE po.orderDate >= ${startDate}
      AND po.orderDate <= ${endDate}
      AND po.status IN ('delivered', 'partial')
    GROUP BY p.name, p.category
  `) as any;

  const purchaseData = (purchaseRows[0] as any[]).map((r: any) => ({
    productName: String(r.productName).toLowerCase(),
    category: r.category,
    totalQtyReceived: Number(r.totalQtyReceived),
    totalCostValue: Number(r.totalCostValue),
    avgUnitPrice: Number(r.avgUnitPrice),
    minPrice: Number(r.minPrice),
    maxPrice: Number(r.maxPrice),
  }));

  const petrolPurchase = purchaseData.find(r => r.productName.includes("petrol"));
  const dieselPurchase = purchaseData.find(r => r.productName.includes("diesel"));

  // 3. Sales volumes and revenue for the period
  const salesRows = await db.execute(sql`
    SELECT
      p.name AS productName,
      p.category,
      COALESCE(SUM(st.quantity), 0) AS totalQtySold,
      COALESCE(SUM(st.totalAmount), 0) AS totalRevenue,
      COALESCE(AVG(st.unitPrice), 0) AS avgSalePrice
    FROM sales_transactions st
    JOIN products p ON p.id = st.productId
    WHERE st.transactionDate >= ${startDate}
      AND st.transactionDate <= ${endDate}
    GROUP BY p.name, p.category
  `) as any;

  const salesData = (salesRows[0] as any[]).map((r: any) => ({
    productName: String(r.productName).toLowerCase(),
    category: r.category,
    totalQtySold: Number(r.totalQtySold),
    totalRevenue: Number(r.totalRevenue),
    avgSalePrice: Number(r.avgSalePrice),
  }));

  const petrolSales = salesData.find(r => r.productName.includes("petrol"));
  const dieselSales = salesData.find(r => r.productName.includes("diesel"));

  // 4. Latest dip readings (most recent before or on endDate)
  const latestDipRows = await db.execute(sql`
    SELECT fuel_type, dip_litres, reading_date
    FROM dip_readings
    WHERE reading_date <= ${endDate}
    ORDER BY reading_date DESC, id DESC
    LIMIT 10
  `) as any;

  const dipData = (latestDipRows[0] as any[]);
  const latestPetrolDip = dipData.find((r: any) => r.fuel_type === "petrol");
  const latestDieselDip = dipData.find((r: any) => r.fuel_type === "diesel");

  // 5. Dip readings count for data quality
  const dipCountRows = await db.execute(sql`
    SELECT COUNT(*) AS cnt FROM dip_readings
    WHERE reading_date >= ${startDate} AND reading_date <= ${endDate}
  `) as any;
  const dipReadingCount = Number((dipCountRows[0] as any[])[0]?.cnt ?? 0);

  // 6. Evaporation calculation
  //    Method A (preferred): Use dip readings — sum daily opening × rate
  //    Method B (fallback): Use purchase received qty as proxy for average stock
  const evapRows = await db.execute(sql`
    SELECT
      fuel_type,
      reading_date,
      dip_litres,
      LAG(dip_litres) OVER (PARTITION BY fuel_type ORDER BY reading_date) AS prev_dip
    FROM dip_readings
    WHERE reading_date >= ${startDate} AND reading_date <= ${endDate}
    ORDER BY fuel_type, reading_date
  `) as any;

  // Compute evaporation from dip readings where available
  const evapByFuel: Record<string, number> = { petrol: 0, diesel: 0 };
  const evapDays: Record<string, number> = { petrol: 0, diesel: 0 };

  for (const row of (evapRows[0] as any[])) {
    const ft = row.fuel_type as string;
    const dip = Number(row.dip_litres);
    if (dip > 0) {
      const cfg = configMap[ft];
      const rate = Number(cfg?.evaporationRatePct ?? 0.1) / 100;
      evapByFuel[ft] = (evapByFuel[ft] ?? 0) + dip * rate;
      evapDays[ft] = (evapDays[ft] ?? 0) + 1;
    }
  }

  // Fallback: if no dip readings, estimate from avg stock (purchase qty / 2 as proxy)
  if (evapDays.petrol === 0 && petrolPurchase && petrolPurchase.totalQtyReceived > 0) {
    const cfg = configMap["petrol"];
    const rate = Number(cfg?.evaporationRatePct ?? 0.1) / 100;
    const days = daysBetween(startDate, endDate);
    const avgStock = petrolPurchase.totalQtyReceived / 2;
    evapByFuel.petrol = avgStock * rate * days;
  }
  if (evapDays.diesel === 0 && dieselPurchase && dieselPurchase.totalQtyReceived > 0) {
    const cfg = configMap["diesel"];
    const rate = Number(cfg?.evaporationRatePct ?? 0.08) / 100;
    const days = daysBetween(startDate, endDate);
    const avgStock = dieselPurchase.totalQtyReceived / 2;
    evapByFuel.diesel = avgStock * rate * days;
  }

  // 7. Build per-fuel margin data
  const petrolData = buildFuelMarginData(
    "petrol",
    configMap["petrol"],
    petrolPurchase,
    petrolSales,
    latestPetrolDip,
    evapByFuel.petrol ?? 0,
    productPrices.petrol
  );

  const dieselData = buildFuelMarginData(
    "diesel",
    configMap["diesel"],
    dieselPurchase,
    dieselSales,
    latestDieselDip,
    evapByFuel.diesel ?? 0,
    productPrices.diesel
  );

  // Lubricant — simpler: use config prices only, no evaporation
  const lubConfig = configMap["lubricant"];
  const lubricantData: Partial<FuelMarginData> & { fuelType: "lubricant" } = {
    fuelType: "lubricant",
    retailPrice: Number(lubConfig?.retailPrice ?? 0),
    latestCostPrice: Number(lubConfig?.latestCostPrice ?? 0),
    grossMarginPerL: Number(lubConfig?.retailPrice ?? 0) - Number(lubConfig?.latestCostPrice ?? 0),
    evaporationRatePct: 0,
    evaporationLitres: 0,
    evaporationValue: 0,
    stockValue: 0,
    latestDipLitres: null,
    latestDipDate: null,
  };

  const totalGrossProfit = petrolData.grossProfit + dieselData.grossProfit;
  const totalEffectiveProfit = petrolData.effectiveProfit + dieselData.effectiveProfit;
  const totalEvaporationValue = petrolData.evaporationValue + dieselData.evaporationValue;
  const totalStockValue = petrolData.stockValue + dieselData.stockValue;

  return {
    petrol: petrolData,
    diesel: dieselData,
    lubricant: lubricantData,
    periodStart: startDate,
    periodEnd: endDate,
    totalGrossProfit,
    totalEffectiveProfit,
    totalEvaporationValue,
    totalStockValue,
    dataQuality: {
      hasDipReadings: dipReadingCount > 0,
      hasActualPurchaseCost: (petrolPurchase?.totalQtyReceived ?? 0) > 0 || (dieselPurchase?.totalQtyReceived ?? 0) > 0,
      dipReadingCount,
    },
  };
}

// ─── Helper: build FuelMarginData for one fuel type ──────────────────────────
function buildFuelMarginData(
  fuelType: "petrol" | "diesel",
  cfg: any,
  purchase: any,
  sales: any,
  latestDip: any,
  evaporationLitres: number,
  productPrice?: { retail: number; cost: number; margin: number }
): FuelMarginData {
  // Use products table prices as authoritative source; fall back to fuel_config, then hardcoded defaults
  const retailPrice = productPrice?.retail ?? Number(cfg?.retailPrice ?? (fuelType === "petrol" ? 108.83 : 97.10));
  const configCostPrice = productPrice?.cost ?? Number(cfg?.latestCostPrice ?? (fuelType === "petrol" ? 104.88 : 94.61));
  const evaporationRatePct = Number(cfg?.evaporationRatePct ?? 0.1);
  const tankCapacity = Number(cfg?.tankCapacityLitres ?? 20000);

  // WACP: if purchase data exists, use it; else fall back to config cost price
  const totalQtyReceived = Number(purchase?.totalQtyReceived ?? 0);
  const totalCostValue = Number(purchase?.totalCostValue ?? 0);
  const wacpCostPrice = totalQtyReceived > 0
    ? totalCostValue / totalQtyReceived
    : configCostPrice;

  const totalLitresSold = Number(sales?.totalQtySold ?? 0);
  const totalRevenue = Number(sales?.totalRevenue ?? 0);

  // Use actual avg sale price if available, else retail price from config
  const effectiveRetailPrice = totalLitresSold > 0 && totalRevenue > 0
    ? totalRevenue / totalLitresSold
    : retailPrice;

  const totalCost = totalLitresSold * wacpCostPrice;
  const grossProfit = totalRevenue - totalCost;
  const grossMarginPerL = effectiveRetailPrice - wacpCostPrice;
  const grossMarginPct = effectiveRetailPrice > 0 ? (grossMarginPerL / effectiveRetailPrice) * 100 : 0;

  // Evaporation
  const evaporationValue = evaporationLitres * wacpCostPrice;
  const effectiveProfit = grossProfit - evaporationValue;
  const effectiveMarginPerL = totalLitresSold > 0
    ? effectiveProfit / totalLitresSold
    : grossMarginPerL - (evaporationLitres > 0 ? evaporationValue / Math.max(totalLitresSold, 1) : 0);
  const effectiveMarginPct = effectiveRetailPrice > 0 ? (effectiveMarginPerL / effectiveRetailPrice) * 100 : 0;

  // Stock from dip reading
  const latestDipLitres = latestDip ? Number(latestDip.dip_litres) : null;
  const latestDipDate = latestDip ? String(latestDip.reading_date).slice(0, 10) : null;
  const stockValue = latestDipLitres !== null ? latestDipLitres * wacpCostPrice : 0;
  const stockPct = latestDipLitres !== null && tankCapacity > 0
    ? Math.min(100, (latestDipLitres / tankCapacity) * 100)
    : 0;

  return {
    fuelType,
    retailPrice,
    latestCostPrice: configCostPrice,
    wacpCostPrice,
    grossMarginPerL,
    effectiveMarginPerL,
    grossMarginPct,
    effectiveMarginPct,
    totalLitresSold,
    totalRevenue,
    totalCost,
    grossProfit,
    evaporationLitres,
    evaporationValue,
    effectiveProfit,
    evaporationRatePct,
    latestDipLitres,
    latestDipDate,
    stockValue,
    tankCapacityLitres: tankCapacity,
    stockPct,
  };
}

// ─── Dip Reading CRUD ─────────────────────────────────────────────────────────
export async function getDipReadings(fuelType?: "petrol" | "diesel", limit = 30) {
  const db = await getDb();
  const rows = await db.execute(sql`
    SELECT * FROM dip_readings
    ${fuelType ? sql`WHERE fuel_type = ${fuelType}` : sql``}
    ORDER BY reading_date DESC, id DESC
    LIMIT ${limit}
  `) as any;
  return (rows[0] as any[]).map((r: any) => ({
    ...r,
    reading_date: String(r.reading_date).slice(0, 10),
    dip_litres: Number(r.dip_litres),
  }));
}

export async function upsertDipReading(data: {
  readingDate: string;
  fuelType: "petrol" | "diesel";
  tankId?: string;
  dipLitres: number;
  readingTime?: string;
  recordedBy?: string;
  notes?: string;
}) {
  const db = await getDb();
  // Check if a reading already exists for this date + fuelType + tankId
  const existing = await db.execute(sql`
    SELECT id FROM dip_readings
    WHERE reading_date = ${data.readingDate}
      AND fuel_type = ${data.fuelType}
      AND tank_id = ${data.tankId ?? "T1"}
    LIMIT 1
  `) as any;

  const row = (existing[0] as any[])[0];
  if (row) {
    await db.execute(sql`
      UPDATE dip_readings SET
        dip_litres = ${data.dipLitres},
        reading_time = ${data.readingTime ?? "08:00"},
        recorded_by = ${data.recordedBy ?? null},
        notes = ${data.notes ?? null}
      WHERE id = ${row.id}
    `);
    return { id: row.id, updated: true };
  } else {
    const result = await db.execute(sql`
      INSERT INTO dip_readings (reading_date, fuel_type, tank_id, dip_litres, reading_time, recorded_by, notes)
      VALUES (${data.readingDate}, ${data.fuelType}, ${data.tankId ?? "T1"}, ${data.dipLitres}, ${data.readingTime ?? "08:00"}, ${data.recordedBy ?? null}, ${data.notes ?? null})
    `) as any;
    return { id: (result[0] as any).insertId, updated: false };
  }
}

// ─── Fuel Config CRUD ─────────────────────────────────────────────────────────
export async function getFuelConfigs() {
  const db = await getDb();
  const rows = await db.select().from(fuelConfig);
  return rows.map((r: any) => ({
    ...r,
    retailPrice: Number(r.retailPrice),
    latestCostPrice: Number(r.latestCostPrice),
    evaporationRatePct: Number(r.evaporationRatePct),
    tankCapacityLitres: Number(r.tankCapacityLitres),
  }));
}

export async function updateFuelConfig(data: {
  fuelType: "petrol" | "diesel" | "lubricant";
  retailPrice?: number;
  latestCostPrice?: number;
  evaporationRatePct?: number;
  tankCapacityLitres?: number;
  updatedBy?: string;
}) {
  const db = await getDb();
  const updates: string[] = [];
  if (data.retailPrice !== undefined) updates.push(`retail_price = ${data.retailPrice}`);
  if (data.latestCostPrice !== undefined) updates.push(`latest_cost_price = ${data.latestCostPrice}`);
  if (data.evaporationRatePct !== undefined) updates.push(`evaporation_rate_pct = ${data.evaporationRatePct}`);
  if (data.tankCapacityLitres !== undefined) updates.push(`tank_capacity_litres = ${data.tankCapacityLitres}`);
  if (data.updatedBy) updates.push(`updated_by = '${data.updatedBy}'`);

  if (updates.length === 0) return null;

  await db.execute(sql`
    UPDATE fuel_config SET ${sql.raw(updates.join(", "))}
    WHERE fuel_type = ${data.fuelType}
  `);
  return getFuelConfigs();
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function daysBetween(start: string, end: string): number {
  const s = new Date(start + "T00:00:00Z");
  const e = new Date(end + "T00:00:00Z");
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
}
