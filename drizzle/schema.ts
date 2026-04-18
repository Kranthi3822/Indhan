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
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["owner", "incharge", "accountant", "user", "admin", "pump_attendant"]).default("user").notNull(),
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
  outstandingBalance: decimal("outstandingBalance", { precision: 15, scale: 2 }).default("0.00"),
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
  paymentSource: mysqlEnum("payment_source", ["bank", "cash_nozzle", "cash_general"]).default("bank"),
  nozzleId: int("nozzle_id"),  // FK → nozzles.id — set when paymentSource = 'cash_nozzle'
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

// ─── Employees ────────────────────────────────────────────────────────────────
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }).notNull().default("Staff"),
  department: mysqlEnum("department", ["Operations", "Finance", "Management", "Security", "Maintenance"]).default("Operations"),
  joinDate: varchar("joinDate", { length: 10 }).notNull(),
  exitDate: varchar("exitDate", { length: 10 }),
  // Salary structure
  basicSalary: decimal("basicSalary", { precision: 10, scale: 2 }).notNull().default("0.00"),
  hra: decimal("hra", { precision: 10, scale: 2 }).default("0.00"),
  otherAllowances: decimal("otherAllowances", { precision: 10, scale: 2 }).default("0.00"),
  // Statutory compliance
  pfApplicable: boolean("pfApplicable").default(true),
  esiApplicable: boolean("esiApplicable").default(true),
  ptApplicable: boolean("ptApplicable").default(true),
  // Working days config
  monthlyWorkingDays: int("monthlyWorkingDays").default(26),
  // Status
  isActive: boolean("isActive").default(true),
  phone: varchar("phone", { length: 20 }),
  bankAccount: varchar("bankAccount", { length: 50 }),
  ifscCode: varchar("ifscCode", { length: 20 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

// ─── Attendance ───────────────────────────────────────────────────────────────
export const attendance = mysqlTable("attendance", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  attendanceDate: varchar("attendanceDate", { length: 10 }).notNull(),
  status: mysqlEnum("status", ["present", "absent", "half_day", "leave", "holiday"]).notNull().default("present"),
  checkIn: varchar("checkIn", { length: 8 }),   // HH:MM:SS
  checkOut: varchar("checkOut", { length: 8 }),
  overtimeHours: decimal("overtimeHours", { precision: 4, scale: 2 }).default("0.00"),
  notes: text("notes"),
  markedBy: varchar("markedBy", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;

// ─── Payroll Runs ─────────────────────────────────────────────────────────────
export const payrollRuns = mysqlTable("payroll_runs", {
  id: int("id").autoincrement().primaryKey(),
  month: int("month").notNull(),   // 1–12
  year: int("year").notNull(),
  status: mysqlEnum("status", ["draft", "processed", "approved", "paid"]).default("draft"),
  totalGross: decimal("totalGross", { precision: 15, scale: 2 }).default("0.00"),
  totalPfEmployee: decimal("totalPfEmployee", { precision: 15, scale: 2 }).default("0.00"),
  totalPfEmployer: decimal("totalPfEmployer", { precision: 15, scale: 2 }).default("0.00"),
  totalEsiEmployee: decimal("totalEsiEmployee", { precision: 15, scale: 2 }).default("0.00"),
  totalEsiEmployer: decimal("totalEsiEmployer", { precision: 15, scale: 2 }).default("0.00"),
  totalPt: decimal("totalPt", { precision: 15, scale: 2 }).default("0.00"),
  totalNetPay: decimal("totalNetPay", { precision: 15, scale: 2 }).default("0.00"),
  processedAt: timestamp("processedAt"),
  approvedBy: varchar("approvedBy", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PayrollRun = typeof payrollRuns.$inferSelect;
export type InsertPayrollRun = typeof payrollRuns.$inferInsert;

// ─── Payslips ─────────────────────────────────────────────────────────────────
export const payslips = mysqlTable("payslips", {
  id: int("id").autoincrement().primaryKey(),
  runId: int("runId").notNull(),
  employeeId: int("employeeId").notNull(),
  month: int("month").notNull(),
  year: int("year").notNull(),
  // Attendance
  workingDays: int("workingDays").notNull().default(26),
  daysPresent: decimal("daysPresent", { precision: 4, scale: 1 }).notNull().default("0.0"),
  // Earnings
  basicSalary: decimal("basicSalary", { precision: 10, scale: 2 }).notNull(),
  hra: decimal("hra", { precision: 10, scale: 2 }).default("0.00"),
  otherAllowances: decimal("otherAllowances", { precision: 10, scale: 2 }).default("0.00"),
  grossEarned: decimal("grossEarned", { precision: 10, scale: 2 }).notNull(),
  // Deductions
  pfEmployee: decimal("pfEmployee", { precision: 10, scale: 2 }).default("0.00"),
  esiEmployee: decimal("esiEmployee", { precision: 10, scale: 2 }).default("0.00"),
  professionalTax: decimal("professionalTax", { precision: 10, scale: 2 }).default("0.00"),
  otherDeductions: decimal("otherDeductions", { precision: 10, scale: 2 }).default("0.00"),
  totalDeductions: decimal("totalDeductions", { precision: 10, scale: 2 }).notNull(),
  // Employer contributions (not deducted from employee, shown for cost tracking)
  pfEmployer: decimal("pfEmployer", { precision: 10, scale: 2 }).default("0.00"),
  esiEmployer: decimal("esiEmployer", { precision: 10, scale: 2 }).default("0.00"),
  // Net
  netPay: decimal("netPay", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid"]).default("pending"),
  paymentDate: varchar("paymentDate", { length: 10 }),
  paymentMode: mysqlEnum("paymentMode", ["bank", "cash"]).default("bank"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payslip = typeof payslips.$inferSelect;
export type InsertPayslip = typeof payslips.$inferInsert;

// ─── Assets ───────────────────────────────────────────────────────────────────
export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: mysqlEnum("category", [
    "fuel_dispenser", "underground_tank", "generator", "compressor",
    "weighbridge", "fire_safety", "cctv_security", "vehicle",
    "electrical", "civil", "tools_equipment", "it_equipment", "other"
  ]).notNull(),
  make: varchar("make", { length: 100 }),
  model: varchar("model", { length: 100 }),
  serialNo: varchar("serialNo", { length: 100 }),
  assetTag: varchar("assetTag", { length: 50 }),
  location: varchar("location", { length: 255 }),
  purchaseDate: varchar("purchaseDate", { length: 10 }),
  purchaseCost: decimal("purchaseCost", { precision: 15, scale: 2 }).default("0.00"),
  currentValue: decimal("currentValue", { precision: 15, scale: 2 }).default("0.00"),
  warrantyExpiry: varchar("warrantyExpiry", { length: 10 }),
  insuranceExpiry: varchar("insuranceExpiry", { length: 10 }),
  status: mysqlEnum("status", ["operational", "under_maintenance", "faulty", "decommissioned", "standby"]).default("operational"),
  healthScore: int("healthScore").default(100),  // 0–100
  notes: text("notes"),
  isPreloaded: boolean("isPreloaded").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;

// ─── Maintenance Schedules ────────────────────────────────────────────────────
export const maintenanceSchedules = mysqlTable("maintenance_schedules", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("assetId").notNull(),
  maintenanceType: varchar("maintenanceType", { length: 100 }).notNull(),
  description: text("description"),
  frequency: mysqlEnum("frequency", ["daily", "weekly", "monthly", "quarterly", "half_yearly", "annual", "as_needed"]).notNull(),
  lastDoneDate: varchar("lastDoneDate", { length: 10 }),
  nextDueDate: varchar("nextDueDate", { length: 10 }),
  estimatedCost: decimal("estimatedCost", { precision: 10, scale: 2 }).default("0.00"),
  assignedTo: varchar("assignedTo", { length: 255 }),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaintenanceSchedule = typeof maintenanceSchedules.$inferSelect;
export type InsertMaintenanceSchedule = typeof maintenanceSchedules.$inferInsert;

// ─── Maintenance Logs ─────────────────────────────────────────────────────────
export const maintenanceLogs = mysqlTable("maintenance_logs", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("assetId").notNull(),
  scheduleId: int("scheduleId"),
  doneDate: varchar("doneDate", { length: 10 }).notNull(),
  maintenanceType: varchar("maintenanceType", { length: 100 }).notNull(),
  description: text("description"),
  cost: decimal("cost", { precision: 10, scale: 2 }).default("0.00"),
  technician: varchar("technician", { length: 255 }),
  vendor: varchar("vendor", { length: 255 }),
  invoiceNo: varchar("invoiceNo", { length: 100 }),
  status: mysqlEnum("status", ["completed", "partial", "pending"]).default("completed"),
  nextServiceDate: varchar("nextServiceDate", { length: 10 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaintenanceLog = typeof maintenanceLogs.$inferSelect;
export type InsertMaintenanceLog = typeof maintenanceLogs.$inferInsert;

// ─── Maintenance Evidence ─────────────────────────────────────────────────────
export const maintenanceEvidence = mysqlTable("maintenance_evidence", {
  id: int("id").autoincrement().primaryKey(),
  logId: int("logId").notNull(),
  assetId: int("assetId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: mysqlEnum("fileType", ["image", "pdf", "document"]).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileSizeBytes: bigint("fileSizeBytes", { mode: "number" }),
  uploadedBy: varchar("uploadedBy", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MaintenanceEvidence = typeof maintenanceEvidence.$inferSelect;
export type InsertMaintenanceEvidence = typeof maintenanceEvidence.$inferInsert;

// ─── Maintenance Notifications ────────────────────────────────────────────────
export const maintenanceNotifications = mysqlTable("maintenance_notifications", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("assetId").notNull(),
  scheduleId: int("scheduleId"),
  type: mysqlEnum("type", ["upcoming", "overdue", "completed", "critical"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  dueDate: varchar("dueDate", { length: 10 }),
  isRead: boolean("isRead").default(false),
  isDismissed: boolean("isDismissed").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MaintenanceNotification = typeof maintenanceNotifications.$inferSelect;
export type InsertMaintenanceNotification = typeof maintenanceNotifications.$inferInsert;

// ─── Employee Auth (PIN-based) ────────────────────────────────────────────────
export const employeeAuth = mysqlTable("employee_auth", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull().unique(),
  pinHash: varchar("pinHash", { length: 255 }).notNull(),  // bcrypt hash of 6-digit PIN
  faceEnrolled: boolean("faceEnrolled").default(false),
  faceDescriptor: text("faceDescriptor"),  // JSON array of 128-float face embedding
  faceEnrolledAt: timestamp("faceEnrolledAt"),
  lastLoginAt: timestamp("lastLoginAt"),
  failedAttempts: int("failedAttempts").default(0),
  lockedUntil: timestamp("lockedUntil"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmployeeAuth = typeof employeeAuth.$inferSelect;
export type InsertEmployeeAuth = typeof employeeAuth.$inferInsert;

// ─── Attendance Check-in Slots (randomised hourly) ────────────────────────────
// One slot per hour per employee per day, with a random minute offset
export const checkinSlots = mysqlTable("checkin_slots", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  slotDate: varchar("slotDate", { length: 10 }).notNull(),   // YYYY-MM-DD
  slotHour: int("slotHour").notNull(),                        // 6–21 (6AM–9PM)
  scheduledAt: timestamp("scheduledAt").notNull(),            // exact randomised time
  windowEndsAt: timestamp("windowEndsAt").notNull(),          // scheduledAt + 15 min
  status: mysqlEnum("status", ["pending", "verified", "missed", "excused"]).default("pending"),
  verifiedAt: timestamp("verifiedAt"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  distanceMetres: decimal("distanceMetres", { precision: 8, scale: 2 }),
  faceMatchScore: decimal("faceMatchScore", { precision: 5, scale: 4 }),  // 0.0–1.0
  verificationMethod: mysqlEnum("verificationMethod", ["face_geo", "face_only", "manual"]),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CheckinSlot = typeof checkinSlots.$inferSelect;
export type InsertCheckinSlot = typeof checkinSlots.$inferInsert;

// ─── Attendance Score (daily summary) ────────────────────────────────────────
export const attendanceScore = mysqlTable("attendance_score", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  scoreDate: varchar("scoreDate", { length: 10 }).notNull(),  // YYYY-MM-DD
  totalSlots: int("totalSlots").default(0),
  verifiedSlots: int("verifiedSlots").default(0),
  missedSlots: int("missedSlots").default(0),
  excusedSlots: int("excusedSlots").default(0),
  scorePercent: decimal("scorePercent", { precision: 5, scale: 2 }).default("0.00"),
  dayStatus: mysqlEnum("dayStatus", ["present", "absent", "partial", "off_day"]).default("present"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AttendanceScore = typeof attendanceScore.$inferSelect;
export type InsertAttendanceScore = typeof attendanceScore.$inferInsert;

// ─── Payroll Requests (employee self-service) ─────────────────────────────────
export const payrollRequests = mysqlTable("payroll_requests", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  requestType: mysqlEnum("requestType", ["weekly", "monthly"]).notNull(),
  periodStart: varchar("periodStart", { length: 10 }).notNull(),  // YYYY-MM-DD
  periodEnd: varchar("periodEnd", { length: 10 }).notNull(),
  attendanceScore: decimal("attendanceScore", { precision: 5, scale: 2 }),  // % at time of request
  eligibleDays: decimal("eligibleDays", { precision: 4, scale: 1 }),
  grossAmount: decimal("grossAmount", { precision: 10, scale: 2 }),
  deductions: decimal("deductions", { precision: 10, scale: 2 }).default("0.00"),
  netAmount: decimal("netAmount", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "paid"]).default("pending"),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  reviewedBy: varchar("reviewedBy", { length: 100 }),
  reviewedAt: timestamp("reviewedAt"),
  reviewNotes: text("reviewNotes"),
  paidAt: timestamp("paidAt"),
  paymentMode: mysqlEnum("paymentMode", ["bank", "cash"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PayrollRequest = typeof payrollRequests.$inferSelect;
export type InsertPayrollRequest = typeof payrollRequests.$inferInsert;

// ─── Pumps ────────────────────────────────────────────────────────────────────
export const pumps = mysqlTable("pumps", {
  id: int("id").autoincrement().primaryKey(),
  pumpNumber: int("pump_number").notNull().unique(),
  label: varchar("label", { length: 50 }).notNull(),          // e.g. "Pump 1"
  location: varchar("location", { length: 100 }),             // e.g. "Island A"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Pump = typeof pumps.$inferSelect;

// ─── Nozzles ──────────────────────────────────────────────────────────────────
export const nozzles = mysqlTable("nozzles", {
  id: int("id").autoincrement().primaryKey(),
  pumpId: int("pump_id").notNull(),
  nozzleNumber: int("nozzle_number").notNull(),               // 1-4 globally
  label: varchar("label", { length: 50 }).notNull(),          // e.g. "Nozzle 1 – Petrol"
  fuelType: mysqlEnum("fuel_type", ["petrol", "diesel"]).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Nozzle = typeof nozzles.$inferSelect;

// ─── Shift Sessions ───────────────────────────────────────────────────────────
// One session per staff member per day (or per shift if multiple shifts/day)
export const shiftSessions = mysqlTable("shift_sessions", {
  id: int("id").autoincrement().primaryKey(),
  shiftDate: varchar("shift_date", { length: 10 }).notNull(),  // YYYY-MM-DD
  employeeId: int("employee_id").notNull(),
  staffName: varchar("staff_name", { length: 100 }).notNull(),
  shiftLabel: mysqlEnum("shift_label", ["morning", "evening", "full_day"]).default("full_day"),
  startedAt: timestamp("started_at"),
  closedAt: timestamp("closed_at"),
  status: mysqlEnum("status", ["open", "closed", "reconciled"]).default("open"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ShiftSession = typeof shiftSessions.$inferSelect;

// ─── Nozzle Readings ──────────────────────────────────────────────────────────
// Meter readings captured at opening and closing of each shift per nozzle
export const nozzleReadings = mysqlTable("nozzle_readings", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("session_id").notNull(),
  nozzleId: int("nozzle_id").notNull(),
  readingType: mysqlEnum("reading_type", ["opening", "closing"]).notNull(),
  meterReading: decimal("meter_reading", { precision: 12, scale: 2 }).notNull(), // cumulative meter in litres
  testingQty: decimal("testing_qty", { precision: 8, scale: 2 }).default("0"),   // daily testing/calibration qty in litres
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  recordedBy: varchar("recorded_by", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type NozzleReading = typeof nozzleReadings.$inferSelect;

// ─── Cash Collections ─────────────────────────────────────────────────────────
// Staff log cash received throughout the day (multiple entries allowed)
export const cashCollections = mysqlTable("cash_collections", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("session_id").notNull(),
  nozzleId: int("nozzle_id"),                                  // null = general / all nozzles
  collectionTime: timestamp("collection_time").defaultNow().notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMode: mysqlEnum("payment_mode", ["cash", "digital", "credit"]).default("cash"),
  digitalSubType: varchar("digital_sub_type", { length: 20 }),  // upi|phonepe|card|bank_transfer|bhim
  customerId: int("customer_id"),                              // for credit sales
  customerName: varchar("customer_name", { length: 255 }),
  notes: text("notes"),
  recordedBy: varchar("recorded_by", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CashCollection = typeof cashCollections.$inferSelect;

// ─── Day Reconciliation ───────────────────────────────────────────────────────
// Admin-level daily summary computed from all sessions
export const dayReconciliations = mysqlTable("day_reconciliations", {
  id: int("id").autoincrement().primaryKey(),
  reconcileDate: varchar("reconcile_date", { length: 10 }).notNull().unique(), // YYYY-MM-DD
  totalPetrolLitres: decimal("total_petrol_litres", { precision: 12, scale: 2 }).default("0.00"),
  totalDieselLitres: decimal("total_diesel_litres", { precision: 12, scale: 2 }).default("0.00"),
  totalSalesValue: decimal("total_sales_value", { precision: 15, scale: 2 }).default("0.00"),
  totalCashCollected: decimal("total_cash_collected", { precision: 15, scale: 2 }).default("0.00"),
  totalCardCollected: decimal("total_card_collected", { precision: 15, scale: 2 }).default("0.00"),
  totalOnlineCollected: decimal("total_online_collected", { precision: 15, scale: 2 }).default("0.00"),
  totalCreditSales: decimal("total_credit_sales", { precision: 15, scale: 2 }).default("0.00"),
  variance: decimal("variance", { precision: 15, scale: 2 }).default("0.00"),
  status: mysqlEnum("status", ["pending", "balanced", "discrepancy"]).default("pending"),
  reconciledBy: varchar("reconciled_by", { length: 100 }),
  reconciledAt: timestamp("reconciled_at"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DayReconciliation = typeof dayReconciliations.$inferSelect;

// ─── Dip Readings ─────────────────────────────────────────────────────────────
// Physical tank dip measurements (actual stock in litres) — taken daily by staff.
// This is the ground truth for stock, not meter readings (which measure dispensed volume).
export const dipReadings = mysqlTable("dip_readings", {
  id: int("id").autoincrement().primaryKey(),
  readingDate: varchar("reading_date", { length: 10 }).notNull(),  // YYYY-MM-DD
  fuelType: mysqlEnum("fuel_type", ["petrol", "diesel"]).notNull(),
  tankId: varchar("tank_id", { length: 20 }).notNull().default("T1"), // T1, T2 etc.
  dipLitres: decimal("dip_litres", { precision: 12, scale: 3 }).notNull(), // actual litres from dip stick (Manual Dip Reading column)
  dipStickReading: decimal("dip_stick_reading", { precision: 10, scale: 3 }), // raw dip stick number (Dip column, unitless)
  readingTime: varchar("reading_time", { length: 8 }).default("08:00"),   // HH:MM
  recordedBy: varchar("recorded_by", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DipReading = typeof dipReadings.$inferSelect;
export type InsertDipReading = typeof dipReadings.$inferInsert;

// ─── Fuel Configuration ───────────────────────────────────────────────────────
// Per-fuel-type configuration: current retail price, cost price, evaporation rate.
// Updated by admin when IOC revises prices or when a new purchase batch arrives.
export const fuelConfig = mysqlTable("fuel_config", {
  id: int("id").autoincrement().primaryKey(),
  fuelType: mysqlEnum("fuel_type", ["petrol", "diesel", "lubricant"]).notNull().unique(),
  retailPrice: decimal("retail_price", { precision: 10, scale: 2 }).notNull(),   // ₹/L selling price
  latestCostPrice: decimal("latest_cost_price", { precision: 10, scale: 2 }).notNull(), // ₹/L last purchase cost
  evaporationRatePct: decimal("evaporation_rate_pct", { precision: 6, scale: 4 }).default("0.1000"), // % per day (0.1% default)
  tankCapacityLitres: decimal("tank_capacity_litres", { precision: 10, scale: 2 }).default("20000.00"),
  updatedBy: varchar("updated_by", { length: 100 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FuelConfig = typeof fuelConfig.$inferSelect;
export type InsertFuelConfig = typeof fuelConfig.$inferInsert;

// ─── Daily Fuel Prices ────────────────────────────────────────────────────────
// Staff log the retail selling price and cost price each day.
// These override the static products table in Fuel Intelligence calculations.
export const dailyFuelPrices = mysqlTable("daily_fuel_prices", {
  id: int("id").autoincrement().primaryKey(),
  priceDate: varchar("price_date", { length: 10 }).notNull(),  // YYYY-MM-DD
  fuelType: mysqlEnum("fuel_type", ["petrol", "diesel"]).notNull(),
  retailPrice: decimal("retail_price", { precision: 10, scale: 2 }).notNull(),   // ₹/L selling price
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),                 // ₹/L purchase cost (optional)
  source: mysqlEnum("source", ["manual", "receipt_scan"]).default("manual").notNull(),
  notes: text("notes"),
  recordedBy: varchar("recorded_by", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DailyFuelPrice = typeof dailyFuelPrices.$inferSelect;
export type InsertDailyFuelPrice = typeof dailyFuelPrices.$inferInsert;

// ─── Scanned Purchase Receipts ────────────────────────────────────────────────
// AI-extracted data from uploaded fuel purchase receipts (HPCL/BPCL/IOC invoices).
// Confirmed receipts auto-create purchase orders.
export const scannedReceipts = mysqlTable("scanned_receipts", {
  id: int("id").autoincrement().primaryKey(),
  imageUrl: text("image_url").notNull(),                          // S3 URL of uploaded receipt image
  status: mysqlEnum("status", ["pending", "extracted", "confirmed", "failed"]).default("pending").notNull(),
  // AI-extracted fields
  supplierName: varchar("supplier_name", { length: 200 }),        // e.g. HPCL, BPCL, IOC
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  invoiceDate: varchar("invoice_date", { length: 10 }),           // YYYY-MM-DD
  fuelType: mysqlEnum("fuel_type", ["petrol", "diesel", "lubricant"]),
  quantityLitres: decimal("quantity_litres", { precision: 12, scale: 3 }),  // KL × 1000
  unitPrice: decimal("unit_price", { precision: 10, scale: 4 }),            // ₹/L
  totalAmount: decimal("total_amount", { precision: 14, scale: 2 }),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }),
  rawExtractedJson: text("raw_extracted_json"),                   // full AI response for audit
  confidenceScore: decimal("confidence_score", { precision: 4, scale: 2 }), // 0-100
  // After confirmation
  purchaseOrderId: int("purchase_order_id"),                      // FK to purchase_orders
  confirmedBy: varchar("confirmed_by", { length: 100 }),
  confirmedAt: timestamp("confirmedAt"),
  uploadedBy: varchar("uploaded_by", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ScannedReceipt = typeof scannedReceipts.$inferSelect;
export type InsertScannedReceipt = typeof scannedReceipts.$inferInsert;

// ─── Cash Handover Sessions ───────────────────────────────────────────────────
// Tracks per-nozzle cash collection confirmed by the manager at end of day.
// net_cash = cash_collected (from nozzle sales) − cash_expenses (petty cash drawn from nozzle)
export const cashHandoverSessions = mysqlTable("cash_handover_sessions", {
  id: int("id").autoincrement().primaryKey(),
  handoverDate: varchar("handover_date", { length: 10 }).notNull(),  // YYYY-MM-DD
  nozzleId: int("nozzle_id").notNull(),                              // FK → nozzles.id
  cashCollected: decimal("cash_collected", { precision: 14, scale: 2 }).notNull().default("0"),  // from nozzle sales
  cashExpenses: decimal("cash_expenses", { precision: 14, scale: 2 }).notNull().default("0"),    // petty cash drawn
  netCash: decimal("net_cash", { precision: 14, scale: 2 }).notNull().default("0"),              // collected − expenses
  actualAmount: decimal("actual_amount", { precision: 14, scale: 2 }),  // physically counted by manager
  variance: decimal("variance", { precision: 14, scale: 2 }),           // actual − net_cash
  confirmedAt: timestamp("confirmedAt"),
  confirmedBy: varchar("confirmed_by", { length: 100 }),
  depositVoucherId: int("deposit_voucher_id"),                          // FK → cash_deposit_vouchers.id (set after voucher created)
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CashHandoverSession = typeof cashHandoverSessions.$inferSelect;
export type InsertCashHandoverSession = typeof cashHandoverSessions.$inferInsert;

// ─── Cash Deposit Vouchers ────────────────────────────────────────────────────
// Generated after manager confirms all nozzle collections.
// Voucher is taken to the bank; matched against bank statement on receipt.
export const cashDepositVouchers = mysqlTable("cash_deposit_vouchers", {
  id: int("id").autoincrement().primaryKey(),
  voucherNumber: varchar("voucher_number", { length: 30 }).notNull().unique(), // CDV-YYYYMMDD-NNN
  voucherDate: varchar("voucher_date", { length: 10 }).notNull(),              // YYYY-MM-DD
  totalCashCollected: decimal("total_cash_collected", { precision: 14, scale: 2 }).notNull(),
  totalCashExpenses: decimal("total_cash_expenses", { precision: 14, scale: 2 }).notNull().default("0"),
  floatRetained: decimal("float_retained", { precision: 14, scale: 2 }).notNull().default("0"),
  depositAmount: decimal("deposit_amount", { precision: 14, scale: 2 }).notNull(), // = collected − expenses − float
  bankAccount: varchar("bank_account", { length: 200 }),                       // bank name + account number
  depositInstructions: text("deposit_instructions"),                            // printed on voucher
  status: mysqlEnum("status", ["draft", "finalised", "deposited", "reconciled"]).default("draft").notNull(),
  // Bank reconciliation link
  bankTransactionId: int("bank_transaction_id"),                               // FK → bank_transactions.id (set when matched)
  reconciledAt: timestamp("reconciledAt"),
  reconciledBy: varchar("reconciled_by", { length: 100 }),
  generatedBy: varchar("generated_by", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CashDepositVoucher = typeof cashDepositVouchers.$inferSelect;
export type InsertCashDepositVoucher = typeof cashDepositVouchers.$inferInsert;

// ─── Bank Statement Uploads ───────────────────────────────────────────────────
// Tracks uploaded bank statement files (PDF/Excel).
// Each upload triggers LLM parsing → bank_transactions rows are created.
export const bankStatementUploads = mysqlTable("bank_statement_uploads", {
  id: int("id").autoincrement().primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  s3Key: varchar("s3_key", { length: 500 }).notNull(),
  s3Url: text("s3_url").notNull(),
  fileType: varchar("file_type", { length: 20 }).notNull(),           // pdf | xlsx | csv
  status: mysqlEnum("status", ["uploading", "parsing", "done", "error"]).default("uploading").notNull(),
  parsedCount: int("parsed_count").default(0),                        // transactions parsed
  matchedCount: int("matched_count").default(0),                      // matched to daily_reports
  errorMessage: text("error_message"),
  uploadedBy: varchar("uploaded_by", { length: 100 }),
  statementFrom: varchar("statement_from", { length: 10 }),           // YYYY-MM-DD
  statementTo: varchar("statement_to", { length: 10 }),               // YYYY-MM-DD
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BankStatementUpload = typeof bankStatementUploads.$inferSelect;
export type InsertBankStatementUpload = typeof bankStatementUploads.$inferInsert;

// ─── User Invitations ─────────────────────────────────────────────────────────
// Admin can invite new users by email. Token is sent via email notification.
export const userInvitations = mysqlTable("user_invitations", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["owner", "incharge", "accountant", "user", "admin", "pump_attendant"]).default("user").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  invitedBy: int("invitedBy").notNull(),                              // users.id of admin who invited
  invitedByName: varchar("invitedByName", { length: 255 }),
  status: mysqlEnum("status", ["pending", "accepted", "revoked", "expired"]).default("pending").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type UserInvitation = typeof userInvitations.$inferSelect;
export type InsertUserInvitation = typeof userInvitations.$inferInsert;

// ─── Audit Logs ───────────────────────────────────────────────────────────────
// Tracks all create/update/delete actions by admin and accountant roles.
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),                                    // users.id
  userName: varchar("userName", { length: 255 }),
  userRole: varchar("userRole", { length: 64 }),
  action: varchar("action", { length: 64 }).notNull(),               // e.g. "create", "update", "delete", "approve"
  module: varchar("module", { length: 64 }).notNull(),               // e.g. "expenses", "bank", "customers"
  resourceId: varchar("resourceId", { length: 64 }),                 // ID of the affected record
  details: text("details"),                                           // JSON string with before/after or summary
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ─── E70 Testing ──────────────────────────────────────────────────────────────
export const e70Tests = mysqlTable("e70_tests", {
  id: int("id").autoincrement().primaryKey(),
  testDate: varchar("testDate", { length: 10 }).notNull(),
  nozzleId: int("nozzleId").notNull(),
  nozzleLabel: varchar("nozzleLabel", { length: 64 }),
  fuelType: mysqlEnum("fuelType", ["petrol", "diesel"]).notNull(),
  pumpId: int("pumpId"),
  pumpLabel: varchar("pumpLabel", { length: 64 }),
  meterReadingBefore: decimal("meterReadingBefore", { precision: 15, scale: 2 }),
  meterReadingAfter: decimal("meterReadingAfter", { precision: 15, scale: 2 }),
  drawnQty: decimal("drawnQty", { precision: 10, scale: 2 }).default("5.00"),
  returnedQty: decimal("returnedQty", { precision: 10, scale: 2 }),
  colourCheck: mysqlEnum("colourCheck", ["clear", "yellow", "amber", "contaminated"]),
  colourPass: boolean("colourPass"),
  densityReading: decimal("densityReading", { precision: 10, scale: 2 }),
  densityPass: boolean("densityPass"),
  waterContent: boolean("waterContent"),
  flashPoint: decimal("flashPoint", { precision: 10, scale: 2 }),
  flashPointPass: boolean("flashPointPass"),
  testResult: mysqlEnum("testResult", ["pass", "fail"]).notNull(),
  remarks: text("remarks"),
  testedBy: int("testedBy"),
  testedByName: varchar("testedByName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type E70Test = typeof e70Tests.$inferSelect;
export type InsertE70Test = typeof e70Tests.$inferInsert;

// ─── Fuel Deliveries ──────────────────────────────────────────────────────────
export const fuelDeliveries = mysqlTable("fuel_deliveries", {
  id: int("id").autoincrement().primaryKey(),
  deliveryDate: varchar("deliveryDate", { length: 10 }).notNull(),
  deliveryTime: varchar("deliveryTime", { length: 8 }),
  supplierName: varchar("supplierName", { length: 255 }),
  vehicleNumber: varchar("vehicleNumber", { length: 20 }),
  driverName: varchar("driverName", { length: 100 }),
  fuelType: mysqlEnum("fuelType", ["petrol", "diesel", "lubricant"]).notNull(),
  orderedQty: decimal("orderedQty", { precision: 15, scale: 3 }),
  deliveredQty: decimal("deliveredQty", { precision: 15, scale: 3 }),
  unloadedQty: decimal("unloadedQty", { precision: 15, scale: 3 }),
  invoiceNumber: varchar("invoiceNumber", { length: 100 }),
  invoiceRate: decimal("invoiceRate", { precision: 10, scale: 2 }),
  invoiceAmount: decimal("invoiceAmount", { precision: 15, scale: 2 }),
  status: mysqlEnum("status", ["pending_qc", "qc_passed", "qc_failed", "unloaded", "rejected"]).default("pending_qc").notNull(),
  qcResult: mysqlEnum("qcResult", ["pass", "fail", "conditional"]),
  qcRemarks: text("qcRemarks"),
  decisionRemarks: text("decisionRemarks"),
  notes: text("notes"),
  recordedBy: int("recordedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FuelDelivery = typeof fuelDeliveries.$inferSelect;
export type InsertFuelDelivery = typeof fuelDeliveries.$inferInsert;

// ─── Fuel Delivery Quality Checks ─────────────────────────────────────────────
export const fuelDeliveryQualityChecks = mysqlTable("fuel_delivery_quality_checks", {
  id: int("id").autoincrement().primaryKey(),
  deliveryId: int("deliveryId").notNull(),
  checkedBy: int("checkedBy"),
  checkedByName: varchar("checkedByName", { length: 255 }),
  checkedAt: timestamp("checkedAt"),
  densityReading: decimal("densityReading", { precision: 10, scale: 2 }),
  densityPass: boolean("densityPass"),
  colourCheck: mysqlEnum("colourCheck", ["clear", "yellow", "amber", "contaminated"]),
  colourPass: boolean("colourPass"),
  waterContamination: boolean("waterContamination"),
  sedimentCheck: boolean("sedimentCheck"),
  sealIntact: boolean("sealIntact"),
  documentMatch: boolean("documentMatch"),
  dipstickReading: decimal("dipstickReading", { precision: 10, scale: 2 }),
  overallResult: mysqlEnum("overallResult", ["pass", "fail", "conditional"]),
  remarks: text("remarks"),
  decision: mysqlEnum("decision", ["pending", "approve_unload", "reject_tanker"]).default("pending"),
  decisionAt: timestamp("decisionAt"),
  decisionRemarks: text("decisionRemarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FuelDeliveryQualityCheck = typeof fuelDeliveryQualityChecks.$inferSelect;
export type InsertFuelDeliveryQualityCheck = typeof fuelDeliveryQualityChecks.$inferInsert;
