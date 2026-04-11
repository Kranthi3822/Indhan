import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  bigint,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["owner", "incharge", "accountant", "user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Customers ───────────────────────────────────────────────────────────────
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contactPerson: varchar("contactPerson", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  creditLimit: decimal("creditLimit", { precision: 15, scale: 2 }).default("0.00"),
  paymentTermsDays: int("paymentTermsDays").default(30),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

// ─── Products / Inventory ─────────────────────────────────────────────────────
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["fuel", "lubricant", "other"]).notNull(),
  unit: varchar("unit", { length: 20 }).notNull().default("liter"),
  currentStock: decimal("currentStock", { precision: 15, scale: 3 }).default("0.000"),
  reorderLevel: decimal("reorderLevel", { precision: 15, scale: 3 }).default("0.000"),
  purchasePrice: decimal("purchasePrice", { precision: 10, scale: 2 }).default("0.00"),
  sellingPrice: decimal("sellingPrice", { precision: 10, scale: 2 }).default("0.00"),
  margin: decimal("margin", { precision: 10, scale: 2 }).default("0.00"),
  supplier: varchar("supplier", { length: 255 }).default("Indian Oil Corporation"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ─── Sales Transactions ───────────────────────────────────────────────────────
export const salesTransactions = mysqlTable("sales_transactions", {
  id: int("id").autoincrement().primaryKey(),
  transactionDate: varchar("transactionDate", { length: 10 }).notNull(),
  customerId: int("customerId"),
  productId: int("productId").notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 3 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("totalAmount", { precision: 15, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "credit_card", "online", "credit", "fuel"]).notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["paid", "payable", "due_payable", "due_paid", "received"]).default("paid"),
  pumpNo: varchar("pumpNo", { length: 10 }),
  paidBy: varchar("paidBy", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SalesTransaction = typeof salesTransactions.$inferSelect;
export type InsertSalesTransaction = typeof salesTransactions.$inferInsert;

// ─── Expenses ─────────────────────────────────────────────────────────────────
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  expenseDate: varchar("expenseDate", { length: 10 }).notNull(),
  headAccount: mysqlEnum("headAccount", [
    "Operating Activities",
    "Financing Activities",
    "Investing Activities",
    "Acquisition",
    "Establishment",
    "REPO",
  ]).notNull(),
  subHeadAccount: mysqlEnum("subHeadAccount", [
    "Wages",
    "Admin",
    "Electricity",
    "Hospitality",
    "Maintenance",
    "Performance Bonus",
    "Fuel",
    "Transport",
    "POS Charges",
    "Bank Charges",
    "Purchase",
    "Interest",
    "Principal",
    "Charges",
  ]).notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  transactionStatus: mysqlEnum("transactionStatus", ["Paid", "Payable", "DuePayable", "DuePaid"]).default("Paid"),
  modeOfPayment: mysqlEnum("modeOfPayment", ["Bank", "Cash", "Fuel", "Online"]).default("Bank"),
  paidBy: varchar("paidBy", { length: 100 }),
  approvedBy: varchar("approvedBy", { length: 100 }),
  approvalStatus: mysqlEnum("approvalStatus", ["pending", "approved", "rejected"]).default("approved"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

// ─── Bank Transactions ────────────────────────────────────────────────────────
export const bankTransactions = mysqlTable("bank_transactions", {
  id: int("id").autoincrement().primaryKey(),
  transactionDate: varchar("transactionDate", { length: 10 }).notNull(),
  description: text("description").notNull(),
  transactionType: mysqlEnum("transactionType", ["NEFT", "RTGS", "IMPS", "Cash", "Credit Card", "UPI"]).notNull(),
  withdrawal: decimal("withdrawal", { precision: 15, scale: 2 }).default("0.00"),
  deposit: decimal("deposit", { precision: 15, scale: 2 }).default("0.00"),
  balance: decimal("balance", { precision: 15, scale: 2 }),
  reconciliationStatus: mysqlEnum("reconciliationStatus", ["matched", "unmatched", "pending"]).default("pending"),
  referenceNo: varchar("referenceNo", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BankTransaction = typeof bankTransactions.$inferSelect;
export type InsertBankTransaction = typeof bankTransactions.$inferInsert;

// ─── Weigh Bridge ─────────────────────────────────────────────────────────────
export const weighBridge = mysqlTable("weigh_bridge", {
  id: int("id").autoincrement().primaryKey(),
  ticketDate: varchar("ticketDate", { length: 10 }).notNull(),
  ticketNo: int("ticketNo"),
  vehicleNo: varchar("vehicleNo", { length: 20 }),
  noOfVehicles: int("noOfVehicles").default(1),
  weight: decimal("weight", { precision: 10, scale: 2 }),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  cumulativeAmount: decimal("cumulativeAmount", { precision: 15, scale: 2 }),
  remarks: text("remarks"),
  bankDeposit: decimal("bankDeposit", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WeighBridge = typeof weighBridge.$inferSelect;
export type InsertWeighBridge = typeof weighBridge.$inferInsert;

// ─── Daily Reports ────────────────────────────────────────────────────────────
export const dailyReports = mysqlTable("daily_reports", {
  id: int("id").autoincrement().primaryKey(),
  reportDate: varchar("reportDate", { length: 10 }).notNull().unique(),
  // Stock
  openingStockPetrol: decimal("openingStockPetrol", { precision: 15, scale: 3 }).default("0.000"),
  openingStockDiesel: decimal("openingStockDiesel", { precision: 15, scale: 3 }).default("0.000"),
  closingStockPetrol: decimal("closingStockPetrol", { precision: 15, scale: 3 }).default("0.000"),
  closingStockDiesel: decimal("closingStockDiesel", { precision: 15, scale: 3 }).default("0.000"),
  // Sales
  petrolSalesQty: decimal("petrolSalesQty", { precision: 15, scale: 3 }).default("0.000"),
  dieselSalesQty: decimal("dieselSalesQty", { precision: 15, scale: 3 }).default("0.000"),
  totalSalesValue: decimal("totalSalesValue", { precision: 15, scale: 2 }).default("0.00"),
  // Collections
  cashCollected: decimal("cashCollected", { precision: 15, scale: 2 }).default("0.00"),
  cardCollected: decimal("cardCollected", { precision: 15, scale: 2 }).default("0.00"),
  onlineCollected: decimal("onlineCollected", { precision: 15, scale: 2 }).default("0.00"),
  creditSales: decimal("creditSales", { precision: 15, scale: 2 }).default("0.00"),
  totalCollected: decimal("totalCollected", { precision: 15, scale: 2 }).default("0.00"),
  // Expenses
  totalExpenses: decimal("totalExpenses", { precision: 15, scale: 2 }).default("0.00"),
  // Bank
  bankDeposit: decimal("bankDeposit", { precision: 15, scale: 2 }).default("0.00"),
  cashBalance: decimal("cashBalance", { precision: 15, scale: 2 }).default("0.00"),
  // P&L
  grossProfit: decimal("grossProfit", { precision: 15, scale: 2 }).default("0.00"),
  netProfit: decimal("netProfit", { precision: 15, scale: 2 }).default("0.00"),
  reconciliationStatus: mysqlEnum("reconciliationStatus", ["pending", "reconciled", "discrepancy"]).default("pending"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyReport = typeof dailyReports.$inferSelect;
export type InsertDailyReport = typeof dailyReports.$inferInsert;

// ─── Purchase Orders ──────────────────────────────────────────────────────────
export const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderDate: varchar("orderDate", { length: 10 }).notNull(),
  deliveryDate: varchar("deliveryDate", { length: 10 }),
  supplier: varchar("supplier", { length: 255 }).default("Indian Oil Corporation"),
  productId: int("productId").notNull(),
  quantityOrdered: decimal("quantityOrdered", { precision: 15, scale: 3 }).notNull(),
  quantityReceived: decimal("quantityReceived", { precision: 15, scale: 3 }).default("0.000"),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("totalAmount", { precision: 15, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "delivered", "partial", "cancelled"]).default("pending"),
  invoiceNo: varchar("invoiceNo", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

// ─── Customer Payments ────────────────────────────────────────────────────────
export const customerPayments = mysqlTable("customer_payments", {
  id: int("id").autoincrement().primaryKey(),
  paymentDate: varchar("paymentDate", { length: 10 }).notNull(),
  customerId: int("customerId").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "bank", "online"]).notNull(),
  referenceNo: varchar("referenceNo", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CustomerPayment = typeof customerPayments.$inferSelect;
export type InsertCustomerPayment = typeof customerPayments.$inferInsert;
