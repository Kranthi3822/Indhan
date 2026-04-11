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

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────
export async function getDashboardKPIs(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return null;

  const salesRows = await db.select({
    totalSales: sql<number>`COALESCE(SUM(totalSalesValue), 0)`,
    totalExpenses: sql<number>`COALESCE(SUM(totalExpenses), 0)`,
    totalCollected: sql<number>`COALESCE(SUM(totalCollected), 0)`,
    totalBankDeposit: sql<number>`COALESCE(SUM(bankDeposit), 0)`,
    cashBalance: sql<number>`COALESCE(SUM(cashBalance), 0)`,
    grossProfit: sql<number>`COALESCE(SUM(grossProfit), 0)`,
    netProfit: sql<number>`COALESCE(SUM(netProfit), 0)`,
    petrolQty: sql<number>`COALESCE(SUM(petrolSalesQty), 0)`,
    dieselQty: sql<number>`COALESCE(SUM(dieselSalesQty), 0)`,
  }).from(dailyReports).where(
    sql`${dailyReports.reportDate} >= ${startDate} AND ${dailyReports.reportDate} <= ${endDate}`
  );

   const recRows = await db.select({
    totalReceivables: sql<number>`COALESCE(SUM(outstandingBalance), 0)`,
  }).from(customers).where(sql`outstandingBalance > 0`);
  const salesResult = salesRows[0];
  const recResult = recRows[0];
  return { ...salesResult, totalReceivables: recResult?.totalReceivables ?? 0 };
}

export async function getDailyTrend(days: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    reportDate: dailyReports.reportDate,
    totalSalesValue: dailyReports.totalSalesValue,
    netProfit: dailyReports.netProfit,
    totalExpenses: dailyReports.totalExpenses,
    cashBalance: dailyReports.cashBalance,
  }).from(dailyReports).orderBy(desc(dailyReports.reportDate)).limit(days);
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

  const sales = await db.select({
    customerId: salesTransactions.customerId,
    totalSales: sql<number>`COALESCE(SUM(totalAmount), 0)`,
  }).from(salesTransactions).where(eq(salesTransactions.paymentMethod, 'credit')).groupBy(salesTransactions.customerId);

  const payments = await db.select({
    customerId: customerPayments.customerId,
    totalPaid: sql<number>`COALESCE(SUM(amount), 0)`,
  }).from(customerPayments).groupBy(customerPayments.customerId);

  const allCustomers = await getAllCustomers();

  return allCustomers.map(c => {
    const sale = sales.find(s => s.customerId === c.id);
    const payment = payments.find(p => p.customerId === c.id);
    const totalSales = Number(sale?.totalSales ?? 0);
    const totalPaid = Number(payment?.totalPaid ?? 0);
    const outstanding = totalSales - totalPaid;
    return {
      ...c,
      totalSales,
      totalPaid,
      outstanding,
      collectionRate: totalSales > 0 ? (totalPaid / totalSales) * 100 : 0,
    };
  });
}

export async function recordCustomerPayment(data: InsertCustomerPayment) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(customerPayments).values(data);
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

// ─── Purchase Orders ──────────────────────────────────────────────────────────
export async function getPurchaseOrders(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.orderDate)).limit(limit);
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
  return db.select().from(expenses).where(
    sql`${expenses.expenseDate} >= ${startDate} AND ${expenses.expenseDate} <= ${endDate}`
  ).orderBy(desc(expenses.expenseDate));
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
  return db.select().from(bankTransactions).where(
    sql`${bankTransactions.transactionDate} >= ${startDate} AND ${bankTransactions.transactionDate} <= ${endDate}`
  ).orderBy(desc(bankTransactions.transactionDate));
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
  return db.select().from(dailyReports).where(
    sql`${dailyReports.reportDate} >= ${startDate} AND ${dailyReports.reportDate} <= ${endDate}`
  ).orderBy(desc(dailyReports.reportDate));
}

export async function getDailyReport(reportDate: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(dailyReports).where(sql`${dailyReports.reportDate} = ${reportDate}`).limit(1);
  return result[0] ?? null;
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
  return db.select().from(salesTransactions).where(condition).orderBy(desc(salesTransactions.transactionDate)).limit(200);
}

export async function createSalesTransaction(data: InsertSalesTransaction) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(salesTransactions).values(data);
}
