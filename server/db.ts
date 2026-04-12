import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  customers, InsertCustomer,
  products, InsertProduct,
  salesTransactions, InsertSalesTransaction,
  expenses, InsertExpense,
  bankTransactions, InsertBankTransaction,
  weighBridge, InsertWeighBridge,
  dailyReports, InsertDailyReport,
  purchaseOrders, InsertPurchaseOrder,
  customerPayments, InsertCustomerPayment,
  fuelConfig,
  dipReadings,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Dashboard KPIs ────────────────────────────────────────────────────────────────
export async function getDashboardKPIs(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return null;

  // Sales & fuel metrics from daily_reports
  const salesRows = await db.select({
    totalSales: sql<number>`COALESCE(SUM(totalSalesValue), 0)`,
    totalCollected: sql<number>`COALESCE(SUM(totalCollected), 0)`,
    totalBankDeposit: sql<number>`COALESCE(SUM(bankDeposit), 0)`,
    // Cash balance = last day's closing balance (MAX by date, not SUM)
    cashBalance: sql<number>`COALESCE((SELECT cashBalance FROM daily_reports WHERE reportDate <= ${endDate} ORDER BY reportDate DESC LIMIT 1), 0)`,
    grossProfit: sql<number>`COALESCE(SUM(grossProfit), 0)`,
    petrolQty: sql<number>`COALESCE(SUM(petrolSalesQty), 0)`,
    dieselQty: sql<number>`COALESCE(SUM(dieselSalesQty), 0)`,
  }).from(dailyReports).where(
    sql`${dailyReports.reportDate} >= ${startDate} AND ${dailyReports.reportDate} <= ${endDate}`
  );

  // Operating expenses from expenses ledger (approved only)
  // True Net Profit = Gross Profit − Operating Expenses
  const expRows = await db.select({
    totalExpenses: sql<number>`COALESCE(SUM(amount), 0)`,
  }).from(expenses).where(
    sql`${expenses.expenseDate} >= ${startDate} AND ${expenses.expenseDate} <= ${endDate} AND ${expenses.approvalStatus} = 'approved'`
  );

  // Outstanding receivables (all-time, not date-filtered — it's a balance sheet item)
  const recRows = await db.select({
    totalReceivables: sql<number>`COALESCE(SUM(outstandingBalance), 0)`,
  }).from(customers).where(sql`outstandingBalance > 0`);
  // Purchase totals by product category for the selected date range
  const purchaseRows = await db.execute(
    sql`SELECT
      p.category,
      p.name as productName,
      COALESCE(SUM(po.quantityOrdered), 0) as totalQty,
      COALESCE(SUM(po.totalAmount), 0) as totalAmount
    FROM purchase_orders po
    JOIN products p ON p.id = po.productId
    WHERE po.orderDate >= ${startDate} AND po.orderDate <= ${endDate}
    GROUP BY p.category, p.name
    ORDER BY p.category, totalAmount DESC`
  ) as any;
  const purchaseByProduct: Array<{ category: string; productName: string; totalQty: number; totalAmount: number }> =
    (purchaseRows[0] as any[]).map((r: any) => ({
      category: r.category,
      productName: r.productName,
      totalQty: Number(r.totalQty),
      totalAmount: Number(r.totalAmount),
    }));
  // Aggregate by category
  const purchasePetrol = purchaseByProduct.filter(r => r.category === 'fuel' && r.productName.toLowerCase().includes('petrol'));
  const purchaseDiesel = purchaseByProduct.filter(r => r.category === 'fuel' && r.productName.toLowerCase().includes('diesel'));
  const purchaseLubricants = purchaseByProduct.filter(r => r.category === 'lubricant');
  const totalPurchasePetrol = purchasePetrol.reduce((s, r) => s + r.totalAmount, 0);
  const totalPurchaseDiesel = purchaseDiesel.reduce((s, r) => s + r.totalAmount, 0);
  const totalPurchaseLubricants = purchaseLubricants.reduce((s, r) => s + r.totalAmount, 0);
  const totalPurchasePetrolQty = purchasePetrol.reduce((s, r) => s + r.totalQty, 0);
  const totalPurchaseDieselQty = purchaseDiesel.reduce((s, r) => s + r.totalQty, 0);
  const totalPurchaseLubricantsQty = purchaseLubricants.reduce((s, r) => s + r.totalQty, 0);

  const salesResult = salesRows[0];
  const totalExpenses = Number(expRows[0]?.totalExpenses ?? 0);
  const grossProfit = Number(salesResult?.grossProfit ?? 0);
  // True net profit = gross profit from fuel sales minus all operating expenses
  const netProfit = grossProfit - totalExpenses;

  return {
    ...salesResult,
    totalExpenses,
    netProfit,
    totalReceivables: recRows[0]?.totalReceivables ?? 0,
    // Purchase by product
    purchaseByProduct,
    totalPurchasePetrol,
    totalPurchaseDiesel,
    totalPurchaseLubricants,
    totalPurchasePetrolQty,
    totalPurchaseDieselQty,
    totalPurchaseLubricantsQty,
    totalPurchase: totalPurchasePetrol + totalPurchaseDiesel + totalPurchaseLubricants,
  };
}

async function getFuelPrices(db: ReturnType<typeof drizzle>) {
  const configs = await db.select({
    fuelType: fuelConfig.fuelType,
    retailPrice: fuelConfig.retailPrice,
  }).from(fuelConfig);
  const petrolCfg = configs.find(c => c.fuelType === 'petrol');
  const dieselCfg = configs.find(c => c.fuelType === 'diesel');
  return {
    petrolPrice: petrolCfg ? Number(petrolCfg.retailPrice) : 108.83,
    dieselPrice: dieselCfg ? Number(dieselCfg.retailPrice) : 97.10,
  };
}

export async function getDailyTrend(days: number) {
  const db = await getDb();
  if (!db) return [];
  const { petrolPrice, dieselPrice } = await getFuelPrices(db);
  const rows = await db.select({
    reportDate: dailyReports.reportDate,
    totalSalesValue: dailyReports.totalSalesValue,
    netProfit: dailyReports.netProfit,
    totalExpenses: dailyReports.totalExpenses,
    cashBalance: dailyReports.cashBalance,
    petrolSalesQty: dailyReports.petrolSalesQty,
    dieselSalesQty: dailyReports.dieselSalesQty,
    cashCollected: dailyReports.cashCollected,
    cardCollected: dailyReports.cardCollected,
    onlineCollected: dailyReports.onlineCollected,
    creditSales: dailyReports.creditSales,
    reconciliationStatus: dailyReports.reconciliationStatus,
  }).from(dailyReports).orderBy(desc(dailyReports.reportDate)).limit(days);
  // Normalize reportDate: TiDB may return full ISO timestamps for varchar date fields
  return rows.map(r => ({
    ...r,
    reportDate: r.reportDate ? String(r.reportDate).slice(0, 10) : null,
    petrolSalesAmount: Number(r.petrolSalesQty ?? 0) * petrolPrice,
    dieselSalesAmount: Number(r.dieselSalesQty ?? 0) * dieselPrice,
  }));
}

// Date-range based trend (for FY views)
export async function getDailyTrendByRange(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  const { petrolPrice, dieselPrice } = await getFuelPrices(db);
  const rows = await db.select({
    reportDate: dailyReports.reportDate,
    totalSalesValue: dailyReports.totalSalesValue,
    netProfit: dailyReports.netProfit,
    totalExpenses: dailyReports.totalExpenses,
    cashBalance: dailyReports.cashBalance,
    petrolSalesQty: dailyReports.petrolSalesQty,
    dieselSalesQty: dailyReports.dieselSalesQty,
    cashCollected: dailyReports.cashCollected,
    cardCollected: dailyReports.cardCollected,
    onlineCollected: dailyReports.onlineCollected,
    creditSales: dailyReports.creditSales,
    reconciliationStatus: dailyReports.reconciliationStatus,
  }).from(dailyReports).where(
    sql`${dailyReports.reportDate} >= ${startDate} AND ${dailyReports.reportDate} <= ${endDate}`
  ).orderBy(dailyReports.reportDate);
  return rows.map(r => ({
    ...r,
    reportDate: r.reportDate ? String(r.reportDate).slice(0, 10) : null,
    petrolSalesAmount: Number(r.petrolSalesQty ?? 0) * petrolPrice,
    dieselSalesAmount: Number(r.dieselSalesQty ?? 0) * dieselPrice,
  }));
}

// ─── Customers ────────────────────────────────────────────────────────────────
export async function getAllCustomers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customers).where(eq(customers.isActive, true)).orderBy(customers.name);
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createCustomer(data: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(customers).values(data);
}

export async function updateCustomer(id: number, data: Partial<InsertCustomer>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(customers).set(data).where(eq(customers.id, id));
}

export async function getCustomerReceivables() {
  const db = await getDb();
  if (!db) return [];

  // Use outstandingBalance stored on the customers table (sourced from Excel Receivables-Mar).
  // Only manual UI payments (notes = 'Payment received via UI') further reduce this balance.
  const uiPayments = await db.select({
    customerId: customerPayments.customerId,
    totalPaid: sql<number>`COALESCE(SUM(amount), 0)`,
  }).from(customerPayments)
    .where(sql`notes = 'Payment received via UI'`)
    .groupBy(customerPayments.customerId);

  const allCustomers = await getAllCustomers();

  return allCustomers.map(c => {
    const uiPay = uiPayments.find(p => p.customerId === c.id);
    const uiPaid = Number(uiPay?.totalPaid ?? 0);
    // outstandingBalance already reflects Excel data; subtract any additional UI payments
    const outstanding = Math.max(0, Number(c.outstandingBalance) - uiPaid);
    const creditLimit = Number(c.creditLimit ?? 0);
    return {
      ...c,
      outstanding,
      collectionRate: creditLimit > 0 ? Math.min(100, ((creditLimit - outstanding) / creditLimit) * 100) : 0,
    };
  });
}

export async function recordCustomerPayment(data: InsertCustomerPayment) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Tag UI-recorded payments so they can be distinguished from imported data
  const paymentData = { ...data, notes: 'Payment received via UI' };
  await db.insert(customerPayments).values(paymentData);
  // Reduce the customer's outstanding balance directly
  await db.execute(
    sql`UPDATE customers SET outstandingBalance = GREATEST(0, outstandingBalance - ${data.amount}) WHERE id = ${data.customerId}`
  );
}

// ─── Products / Inventory ─────────────────────────────────────────────────────
export async function getAllProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.isActive, true)).orderBy(products.category, products.name);
}

export async function createProduct(data: Omit<InsertProduct, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(products).values({ ...data, isActive: true });
}
export async function updateProductStock(id: number, newStock: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(products).set({ currentStock: String(newStock) }).where(eq(products.id, id));
}

export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(products).set(data).where(eq(products.id, id));
}

export async function getLowStockProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(
    and(eq(products.isActive, true), sql`${products.currentStock} <= ${products.reorderLevel}`)
  );
}

/**
 * Syncs products.currentStock for Petrol (MS) and Diesel (HSD) from the
 * closing stock values of the most-recently-saved daily_reports row.
 * Called automatically after every reconciliation.upsert save.
 */
export async function syncFuelStockFromLatestReport(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Get the latest report's closing stocks
  const rows = await db.execute(sql`
    SELECT closingStockPetrol, closingStockDiesel
    FROM daily_reports
    ORDER BY reportDate DESC
    LIMIT 1
  `) as any;
  const row = (rows[0] as any[])[0];
  if (!row) return;
  const petrolStock = Number(row.closingStockPetrol ?? 0);
  const dieselStock = Number(row.closingStockDiesel ?? 0);
  // Only update if the value is non-zero (avoid overwriting with 0 from incomplete entries)
  if (petrolStock > 0) {
    await db.execute(sql`UPDATE products SET currentStock = ${String(petrolStock.toFixed(3))}, updatedAt = NOW() WHERE name = 'Petrol (MS)'`);
  }
  if (dieselStock > 0) {
    await db.execute(sql`UPDATE products SET currentStock = ${String(dieselStock.toFixed(3))}, updatedAt = NOW() WHERE name = 'Diesel (HSD)'`);
  }
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────
export async function getPurchaseOrders(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: purchaseOrders.id,
      productId: purchaseOrders.productId,
      productName: products.name,
      productUnit: products.unit,
      supplier: purchaseOrders.supplier,
      orderDate: purchaseOrders.orderDate,
      quantityOrdered: purchaseOrders.quantityOrdered,
      quantityReceived: purchaseOrders.quantityReceived,
      unitPrice: purchaseOrders.unitPrice,
      totalAmount: purchaseOrders.totalAmount,
      status: purchaseOrders.status,
      notes: purchaseOrders.notes,
      createdAt: purchaseOrders.createdAt,
    })
    .from(purchaseOrders)
    .leftJoin(products, eq(purchaseOrders.productId, products.id))
    .orderBy(desc(purchaseOrders.orderDate))
    .limit(limit);
}

export async function createPurchaseOrder(data: InsertPurchaseOrder) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(purchaseOrders).values(data);
}

export async function updatePurchaseOrderStatus(id: number, status: string, quantityReceived?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: Record<string, unknown> = { status };
  if (quantityReceived !== undefined) updateData.quantityReceived = String(quantityReceived);
  await db.update(purchaseOrders).set(updateData).where(eq(purchaseOrders.id, id));
}

// ─── Expenses ─────────────────────────────────────────────────────────────────
export async function getExpenses(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(expenses).where(
    sql`${expenses.expenseDate} >= ${startDate} AND ${expenses.expenseDate} <= ${endDate}`
  ).orderBy(desc(expenses.expenseDate));
  return rows.map(r => ({ ...r, expenseDate: r.expenseDate ? String(r.expenseDate).slice(0, 10) : null }));
}

export async function createExpense(data: InsertExpense) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(expenses).values(data);
}

export async function updateExpenseApproval(id: number, status: 'approved' | 'rejected', approvedBy: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(expenses).set({ approvalStatus: status, approvedBy }).where(eq(expenses.id, id));
}

export async function getExpenseSummaryByCategory(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    subHeadAccount: expenses.subHeadAccount,
    total: sql<number>`COALESCE(SUM(amount), 0)`,
    txCount: sql<number>`COUNT(*)`,
  }).from(expenses).where(
    sql`${expenses.expenseDate} >= ${startDate} AND ${expenses.expenseDate} <= ${endDate} AND ${expenses.approvalStatus} = 'approved'`
  ).groupBy(expenses.subHeadAccount).orderBy(sql`SUM(amount) DESC`);
}

// ─── Bank Transactions ────────────────────────────────────────────────────────
export async function getBankTransactions(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(bankTransactions).where(
    sql`${bankTransactions.transactionDate} >= ${startDate} AND ${bankTransactions.transactionDate} <= ${endDate}`
  ).orderBy(desc(bankTransactions.transactionDate));
  return rows.map(r => ({ ...r, transactionDate: r.transactionDate ? String(r.transactionDate).slice(0, 10) : null }));
}

export async function createBankTransaction(data: InsertBankTransaction) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(bankTransactions).values(data);
}

export async function updateBankReconciliation(id: number, status: 'matched' | 'unmatched' | 'pending') {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(bankTransactions).set({ reconciliationStatus: status }).where(eq(bankTransactions.id, id));
}

export async function getBankSummary(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({
    totalDeposits: sql<number>`COALESCE(SUM(deposit), 0)`,
    totalWithdrawals: sql<number>`COALESCE(SUM(withdrawal), 0)`,
    matchedCount: sql<number>`SUM(CASE WHEN reconciliationStatus = 'matched' THEN 1 ELSE 0 END)`,
    unmatchedCount: sql<number>`SUM(CASE WHEN reconciliationStatus = 'unmatched' THEN 1 ELSE 0 END)`,
    pendingCount: sql<number>`SUM(CASE WHEN reconciliationStatus = 'pending' THEN 1 ELSE 0 END)`,
    totalCount: sql<number>`COUNT(*)`,
  }).from(bankTransactions).where(
    sql`${bankTransactions.transactionDate} >= ${startDate} AND ${bankTransactions.transactionDate} <= ${endDate}`
  );
  return rows[0] ?? null;
}

// ─── Weigh Bridge ─────────────────────────────────────────────────────────────
export async function getWeighBridgeRecords(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(weighBridge).where(
    sql`${weighBridge.ticketDate} >= ${startDate} AND ${weighBridge.ticketDate} <= ${endDate}`
  ).orderBy(desc(weighBridge.ticketDate));
}

export async function createWeighBridgeRecord(data: InsertWeighBridge) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(weighBridge).values(data);
}

export async function getWeighBridgeSummary(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({
    totalVehicles: sql<number>`COALESCE(SUM(noOfVehicles), 0)`,
    totalAmount: sql<number>`COALESCE(SUM(amount), 0)`,
    totalBankDeposit: sql<number>`COALESCE(SUM(bankDeposit), 0)`,
    recordCount: sql<number>`COUNT(*)`,
  }).from(weighBridge).where(
    sql`${weighBridge.ticketDate} >= ${startDate} AND ${weighBridge.ticketDate} <= ${endDate}`
  );
  return rows[0] ?? null;
}

// ─── Daily Reports ────────────────────────────────────────────────────────────
export async function getDailyReports(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(dailyReports).where(
    sql`${dailyReports.reportDate} >= ${startDate} AND ${dailyReports.reportDate} <= ${endDate}`
  ).orderBy(desc(dailyReports.reportDate));
  return rows.map(r => ({ ...r, reportDate: r.reportDate ? String(r.reportDate).slice(0, 10) : null }));
}

export async function getDailyReport(reportDate: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(dailyReports).where(sql`${dailyReports.reportDate} = ${reportDate}`).limit(1);
  const r = result[0] ?? null;
  if (!r) return null;
  return { ...r, reportDate: r.reportDate ? String(r.reportDate).slice(0, 10) : null };
}

export async function upsertDailyReport(data: InsertDailyReport) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(dailyReports).values(data).onDuplicateKeyUpdate({ set: data });
}

// ─── P&L Reporting ────────────────────────────────────────────────────────────
export async function getPLReport(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return null;

  const salesRows = await db.select({
    totalRevenue: sql<number>`COALESCE(SUM(totalSalesValue), 0)`,
    petrolQty: sql<number>`COALESCE(SUM(petrolSalesQty), 0)`,
    dieselQty: sql<number>`COALESCE(SUM(dieselSalesQty), 0)`,
    grossProfit: sql<number>`COALESCE(SUM(grossProfit), 0)`,
    netProfit: sql<number>`COALESCE(SUM(netProfit), 0)`,
    operatingDays: sql<number>`COUNT(*)`,
  }).from(dailyReports).where(
    sql`${dailyReports.reportDate} >= ${startDate} AND ${dailyReports.reportDate} <= ${endDate}`
  );

  const expenseData = await getExpenseSummaryByCategory(startDate, endDate);

  const totalExpRows = await db.select({
    totalExpenses: sql<number>`COALESCE(SUM(amount), 0)`,
  }).from(expenses).where(
    sql`${expenses.expenseDate} >= ${startDate} AND ${expenses.expenseDate} <= ${endDate} AND ${expenses.approvalStatus} = 'approved'`
  );

  return {
    ...salesRows[0],
    totalExpenses: totalExpRows[0]?.totalExpenses ?? 0,
    expenseBreakdown: expenseData,
    petrolMargin: 3.95,
    dieselMargin: 2.49,
  };
}

// ─── Sales Transactions ───────────────────────────────────────────────────────
export async function getSalesTransactions(startDate: string, endDate: string, customerId?: number) {
  const db = await getDb();
  if (!db) return [];
  const baseCondition = sql`${salesTransactions.transactionDate} >= ${startDate} AND ${salesTransactions.transactionDate} <= ${endDate}`;
  const condition = customerId
    ? and(baseCondition, eq(salesTransactions.customerId, customerId))
    : baseCondition;
  const rows = await db.select().from(salesTransactions).where(condition).orderBy(desc(salesTransactions.transactionDate)).limit(200);
  return rows.map(r => ({ ...r, transactionDate: r.transactionDate ? String(r.transactionDate).slice(0, 10) : null }));
}

export async function createSalesTransaction(data: InsertSalesTransaction) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(salesTransactions).values(data);
}

// ─── Daily Stock Statement ────────────────────────────────────────────────────
// Standard fuel station SOP: Opening Stock + Receipts − Meter Sales = Calculated Closing Stock
// Dip Reading is recorded separately as a cross-check; variance = Dip − Calculated
export async function getDailyStockStatement(fromDate?: string, toDate?: string, days = 30) {
  const db = await getDb();
  if (!db) return [];

  // Determine date range
  let endDate = toDate ?? "2026-03-31";
  let startDate = fromDate;
  if (!startDate) {
    // Go back `days` from endDate
    const end = new Date(endDate);
    const start = new Date(end);
    start.setDate(start.getDate() - days + 1);
    startDate = start.toISOString().slice(0, 10);
  }

  // 1. Get daily_reports rows (has opening, closing, sales qty per fuel type)
  const reportRows = await db.select({
    reportDate: dailyReports.reportDate,
    openingStockPetrol: dailyReports.openingStockPetrol,
    openingStockDiesel: dailyReports.openingStockDiesel,
    petrolSalesQty: dailyReports.petrolSalesQty,
    dieselSalesQty: dailyReports.dieselSalesQty,
    closingStockPetrol: dailyReports.closingStockPetrol,
    closingStockDiesel: dailyReports.closingStockDiesel,
  }).from(dailyReports).where(
    sql`${dailyReports.reportDate} >= ${startDate} AND ${dailyReports.reportDate} <= ${endDate}`
  ).orderBy(desc(dailyReports.reportDate));

  // 2. Get purchase orders (receipts) in the same period, grouped by date and product
  const poRows = await db.select({
    orderDate: purchaseOrders.orderDate,
    productId: purchaseOrders.productId,
    received: sql<number>`COALESCE(SUM(${purchaseOrders.quantityReceived}), 0)`,
  }).from(purchaseOrders).where(
    sql`${purchaseOrders.status} = 'delivered' AND ${purchaseOrders.orderDate} >= ${startDate} AND ${purchaseOrders.orderDate} <= ${endDate}`
  ).groupBy(purchaseOrders.orderDate, purchaseOrders.productId);

  // 3. Get dip readings in the same period
  const dipRows = await db.select({
    readingDate: dipReadings.readingDate,
    fuelType: dipReadings.fuelType,
    dipLitres: dipReadings.dipLitres,
  }).from(dipReadings).where(
    sql`${dipReadings.readingDate} >= ${startDate} AND ${dipReadings.readingDate} <= ${endDate}`
  ).orderBy(desc(dipReadings.readingDate));

  // Build lookup maps
  const poByDate: Record<string, { petrol: number; diesel: number }> = {};
  for (const po of poRows) {
    const d = String(po.orderDate).slice(0, 10);
    if (!poByDate[d]) poByDate[d] = { petrol: 0, diesel: 0 };
    if (po.productId === 1) poByDate[d].petrol += Number(po.received);
    if (po.productId === 2) poByDate[d].diesel += Number(po.received);
  }

  const dipByDate: Record<string, { petrol: number | null; diesel: number | null }> = {};
  for (const dip of dipRows) {
    const d = String(dip.readingDate).slice(0, 10);
    if (!dipByDate[d]) dipByDate[d] = { petrol: null, diesel: null };
    if (dip.fuelType === "petrol") dipByDate[d].petrol = Number(dip.dipLitres);
    if (dip.fuelType === "diesel") dipByDate[d].diesel = Number(dip.dipLitres);
  }

  // Build result rows
  return reportRows.map(r => {
    const date = String(r.reportDate).slice(0, 10);
    const poReceipts = poByDate[date] ?? { petrol: 0, diesel: 0 };
    const dip = dipByDate[date] ?? { petrol: null, diesel: null };

    const openP = Number(r.openingStockPetrol ?? 0);
    const openD = Number(r.openingStockDiesel ?? 0);
    const salesP = Number(r.petrolSalesQty ?? 0);
    const salesD = Number(r.dieselSalesQty ?? 0);
    // Reported closing is the authoritative figure (recorded by operator / imported from Excel)
    const reportedCloseP = Number(r.closingStockPetrol ?? 0);
    const reportedCloseD = Number(r.closingStockDiesel ?? 0);

    // Implied receipts = Reported Closing − Opening + Meter Sales
    // This back-calculates what tanker deliveries must have occurred to reconcile the stock
    const impliedReceiptsP = Math.max(0, reportedCloseP - openP + salesP);
    const impliedReceiptsD = Math.max(0, reportedCloseD - openD + salesD);

    // PO receipts are separately recorded; use as cross-check
    const poReceiptsP = poReceipts.petrol;
    const poReceiptsD = poReceipts.diesel;

    // Dip Variance = (Opening Stock + Purchased Receipts) − Manual Dip Reading
    // Positive = stock loss/shrinkage, Negative = stock gain
    const dipVarP = dip.petrol !== null ? (openP + poReceiptsP) - dip.petrol : null;
    const dipVarD = dip.diesel !== null ? (openD + poReceiptsD) - dip.diesel : null;

    return {
      date,
      petrol: {
        openingStock: openP,
        meterSales: salesP,
        impliedReceipts: impliedReceiptsP,
        poReceipts: poReceiptsP,
        reportedClosing: reportedCloseP,
        dipReading: dip.petrol,
        dipVariance: dipVarP,
      },
      diesel: {
        openingStock: openD,
        meterSales: salesD,
        impliedReceipts: impliedReceiptsD,
        poReceipts: poReceiptsD,
        reportedClosing: reportedCloseD,
        dipReading: dip.diesel,
        dipVariance: dipVarD,
      },
    };
  });
}
