import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, operationalProcedure, adminProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getDashboardKPIs, getDailyTrend, getDailyTrendByRange,
  getAllCustomers, getCustomerById, createCustomer, updateCustomer, getCustomerReceivables, recordCustomerPayment,
  getAllProducts, createProduct, updateProductStock, updateProduct, getLowStockProducts,
  getPurchaseOrders, createPurchaseOrder, updatePurchaseOrderStatus, getDailyStockStatement,
  getExpenses, createExpense, updateExpenseApproval, getExpenseSummaryByCategory,
  getBankTransactions, createBankTransaction, updateBankReconciliation, getBankSummary,
  getWeighBridgeRecords, createWeighBridgeRecord, getWeighBridgeSummary,
  getDailyReports, getDailyReport, upsertDailyReport, syncFuelStockFromLatestReport,
  saveClosingStock,
  getPLReport,
  getSalesTransactions, createSalesTransaction,
  getUserByEmail, getUserCount, upsertUser,
} from "./db";

import { sdk } from "./_core/sdk";
import { invokeLLM } from "./_core/llm";
import { hrRouter, assetsRouter } from "./routers-hr";
import { attendanceRouter } from "./routers/attendanceRouter";
import { nozzleRouter } from "./routers/nozzleRouter";
import { fuelIntelligenceRouter } from "./routers/fuelIntelligenceRouter";
import { fuelPricesRouter } from "./routers/fuelPricesRouter";
import { cashHandoverRouter } from "./routers/cashHandoverRouter";
import { usersRouter } from "./routers/usersRouter";
import { invitationsRouter } from "./routers/invitationsRouter";
import { auditLogRouter } from "./routers/auditLogRouter";
import { logAudit } from "./routers/auditLogRouter";
import { bankStatementRouter } from "./routers/bankStatementRouter";
import { fuelDeliveryRouter } from "./routers/fuelDeliveryRouter";
import { e70Router } from "./routers/e70Router";

// ─── Shared date range input ──────────────────────────────────────────────────
// Enforce YYYY-MM-DD format to prevent SQL injection via date parameters
const safeDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format');
const dateRangeInput = z.object({
  startDate: safeDate,
  endDate: safeDate,
});

// ─── Dashboard Router ─────────────────────────────────────────────────────────
const dashboardRouter = router({
  kpis: protectedProcedure.input(dateRangeInput).query(async ({ input }) => {
    return getDashboardKPIs(input.startDate, input.endDate);
  }),
  trend: protectedProcedure.input(z.object({ days: z.number().min(1).max(365).default(30) })).query(async ({ input }) => {
    return getDailyTrend(input.days);
  }),
  dailySalesTrend: protectedProcedure.input(z.object({ days: z.number().min(1).max(365).default(30) })).query(async ({ input }) => {
    return getDailyTrend(input.days);
  }),
  trendByRange: protectedProcedure.input(dateRangeInput).query(async ({ input }) => {
    return getDailyTrendByRange(input.startDate, input.endDate);
  }),
  expenseBreakdown: protectedProcedure.input(dateRangeInput).query(async ({ input }) => {
    return getExpenseSummaryByCategory(input.startDate, input.endDate);
  }),
});

// ─── Customers Router ─────────────────────────────────────────────────────────
const customersRouter = router({
  list: protectedProcedure.query(async () => getAllCustomers()),
  receivables: protectedProcedure.query(async () => getCustomerReceivables()),
  topByOutstanding: protectedProcedure.query(async () => getCustomerReceivables()),
  byId: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => getCustomerById(input.id)),
  create: protectedProcedure.input(z.object({
    name: z.string().min(1),
    contactPerson: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    creditLimit: z.number().default(0),
    paymentTermsDays: z.number().default(30),
  })).mutation(async ({ input }) => {
    await createCustomer({ ...input, creditLimit: String(input.creditLimit) });
    return { success: true };
  }),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    contactPerson: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    creditLimit: z.number().optional(),
    paymentTermsDays: z.number().optional(),
    isActive: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    const { id, creditLimit, ...rest } = input;
    const data: Record<string, unknown> = { ...rest };
    if (creditLimit !== undefined) data.creditLimit = String(creditLimit);
    await updateCustomer(id, data);
    return { success: true };
  }),
  recordPayment: protectedProcedure.input(z.object({
    customerId: z.number().int().positive(),
    paymentDate: safeDate,
    amount: z.number().positive().max(10_000_000),
    paymentMethod: z.enum(["cash", "bank", "online"]),
    referenceNo: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
  })).mutation(async ({ input }) => {
    await recordCustomerPayment({ ...input, amount: String(input.amount) });
    return { success: true };
  }),
});

// ─── Inventory Router ─────────────────────────────────────────────────────────
const inventoryRouter = router({
  products: protectedProcedure.query(async () => getAllProducts()),
  list: protectedProcedure.query(async () => getAllProducts()),
  lowStock: protectedProcedure.query(async () => getLowStockProducts()),
  addProduct: protectedProcedure.input(z.object({
    name: z.string().min(1),
    category: z.enum(["fuel", "lubricant", "other"]).default("fuel"),
    unit: z.string().default("L"),
    currentStock: z.string().default("0"),
    minStockLevel: z.string().default("0"),
    maxStockLevel: z.string().default("10000"),
    costPrice: z.string().default("0"),
    sellingPrice: z.string().default("0"),
  })).mutation(async ({ input }) => {
    await createProduct({
      name: input.name,
      category: input.category,
      unit: input.unit,
      currentStock: input.currentStock,
      purchasePrice: input.costPrice,
      sellingPrice: input.sellingPrice,
      margin: "0",
      reorderLevel: input.minStockLevel,
    });
    return { success: true };
  }),
  updateStock: protectedProcedure.input(z.object({
    id: z.number(),
    newStock: z.number(),
  })).mutation(async ({ input }) => {
    await updateProductStock(input.id, input.newStock);
    return { success: true };
  }),
  updateProduct: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    purchasePrice: z.number().optional(),
    sellingPrice: z.number().optional(),
    margin: z.number().optional(),
    reorderLevel: z.number().optional(),
  })).mutation(async ({ input }) => {
    const { id, purchasePrice, sellingPrice, margin, reorderLevel, ...rest } = input;
    const data: Record<string, unknown> = { ...rest };
    if (purchasePrice !== undefined) data.purchasePrice = String(purchasePrice);
    if (sellingPrice !== undefined) data.sellingPrice = String(sellingPrice);
    if (margin !== undefined) data.margin = String(margin);
    if (reorderLevel !== undefined) data.reorderLevel = String(reorderLevel);
    await updateProduct(id, data);
    return { success: true };
  }),
  purchaseOrders: protectedProcedure.query(async () => getPurchaseOrders()),
  createPurchaseOrder: protectedProcedure.input(z.object({
    orderDate: z.string(),
    deliveryDate: z.string().optional(),
    supplier: z.string().default("Indian Oil Corporation"),
    productId: z.number(),
    quantityOrdered: z.union([z.string(), z.number()]).transform(v => String(v)),
    unitPrice: z.union([z.string(), z.number()]).transform(v => String(v)),
    totalAmount: z.union([z.string(), z.number()]).transform(v => String(v)),
    invoiceNo: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    await createPurchaseOrder({ ...input });
    return { success: true };
  }),
  updatePurchaseOrder: protectedProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["pending", "delivered", "partial", "cancelled"]),
    quantityReceived: z.number().optional(),
  })).mutation(async ({ input }) => {
    await updatePurchaseOrderStatus(input.id, input.status, input.quantityReceived);
    return { success: true };
  }),
  dailyStockStatement: protectedProcedure.input(z.object({
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    days: z.number().min(1).max(90).default(30),
  })).query(async ({ input }) => {
    return getDailyStockStatement(input.fromDate, input.toDate, input.days);
  }),
});

// ─── Expenses Router ──────────────────────────────────────────────────────────
const expensesRouter = router({
  list: protectedProcedure.input(dateRangeInput).query(async ({ input }) => {
    return getExpenses(input.startDate, input.endDate);
  }),
  summary: protectedProcedure.input(dateRangeInput).query(async ({ input }) => {
    return getExpenseSummaryByCategory(input.startDate, input.endDate);
  }),
  create: operationalProcedure.input(z.object({
    expenseDate: safeDate,
    headAccount: z.enum(["Operating Activities", "Financing Activities", "Investing Activities", "Acquisition", "Establishment", "REPO"]),
    subHeadAccount: z.enum(["Wages", "Admin", "Electricity", "Hospitality", "Maintenance", "Performance Bonus", "Fuel", "Transport", "POS Charges", "Bank Charges", "Purchase", "Interest", "Principal", "Charges"]),
    description: z.string().min(1).max(500),
    amount: z.number().positive().max(10_000_000),
    transactionStatus: z.enum(["Paid", "Payable", "DuePayable", "DuePaid"]).default("Paid"),
    modeOfPayment: z.enum(["Bank", "Cash", "Fuel", "Online"]).default("Bank"),
    paidBy: z.string().max(100).optional(),
    paymentSource: z.enum(["bank", "cash_nozzle", "cash_general"]).default("bank"),
    nozzleId: z.number().int().positive().optional(),
  })).mutation(async ({ input, ctx }) => {
    if (input.paymentSource === "cash_nozzle" && !input.nozzleId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Nozzle must be selected for Cash from Nozzle expenses" });
    }
    await createExpense({ ...input, amount: String(input.amount) });
    await logAudit({ userId: ctx.user.id, userName: ctx.user.name, userRole: ctx.user.role, action: "create", module: "expenses", details: `${input.subHeadAccount}: ₹${input.amount} — ${input.description}` });
    return { success: true };
  }),
  approve: adminProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["approved", "rejected"]),
    approvedBy: z.string(),
  })).mutation(async ({ input, ctx }) => {
    await updateExpenseApproval(input.id, input.status, input.approvedBy);
    await logAudit({ userId: ctx.user.id, userName: ctx.user.name, userRole: ctx.user.role, action: "approve", module: "expenses", resourceId: input.id, details: `Status: ${input.status} by ${input.approvedBy}` });
    return { success: true };
  }),
});

// ─── Bank Transactions Router ─────────────────────────────────────────────────
const bankRouter = router({
  list: protectedProcedure.input(dateRangeInput).query(async ({ input }) => {
    return getBankTransactions(input.startDate, input.endDate);
  }),
  summary: protectedProcedure.input(dateRangeInput).query(async ({ input }) => {
    return getBankSummary(input.startDate, input.endDate);
  }),
  create: adminProcedure.input(z.object({
    transactionDate: safeDate,
    description: z.string().min(1).max(500),
    transactionType: z.enum(["NEFT", "RTGS", "IMPS", "Cash", "Credit Card", "UPI"]),
    withdrawal: z.number().min(0).max(100_000_000).default(0),
    deposit: z.number().min(0).max(100_000_000).default(0),
    balance: z.number().optional(),
    referenceNo: z.string().max(100).optional(),
  })).mutation(async ({ input, ctx }) => {
    await createBankTransaction({
      ...input,
      withdrawal: String(input.withdrawal),
      deposit: String(input.deposit),
      balance: input.balance !== undefined ? String(input.balance) : undefined,
    });
    await logAudit({ userId: ctx.user.id, userName: ctx.user.name, userRole: ctx.user.role, action: "create", module: "bank", details: `${input.transactionType}: ₹${input.deposit || input.withdrawal} — ${input.description}` });
    return { success: true };
  }),
  reconcile: adminProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["matched", "unmatched", "pending"]),
  })).mutation(async ({ input, ctx }) => {
    await updateBankReconciliation(input.id, input.status);
    await logAudit({ userId: ctx.user.id, userName: ctx.user.name, userRole: ctx.user.role, action: "update", module: "bank", resourceId: input.id, details: `Reconciliation status: ${input.status}` });
    return { success: true };
  }),
});

// ─── Weigh Bridge Router ──────────────────────────────────────────────────────
const weighBridgeRouter = router({
  list: protectedProcedure.input(dateRangeInput).query(async ({ input }) => {
    return getWeighBridgeRecords(input.startDate, input.endDate);
  }),
  summary: protectedProcedure.input(dateRangeInput).query(async ({ input }) => {
    return getWeighBridgeSummary(input.startDate, input.endDate);
  }),
  create: protectedProcedure.input(z.object({
    ticketDate: z.string(),
    ticketNo: z.number().optional(),
    vehicleNo: z.string().optional(),
    noOfVehicles: z.number().default(1),
    weight: z.number().optional(),
    amount: z.number().optional(),
    cumulativeAmount: z.number().optional(),
    remarks: z.string().optional(),
    bankDeposit: z.number().optional(),
  })).mutation(async ({ input }) => {
    await createWeighBridgeRecord({
      ...input,
      weight: input.weight !== undefined ? String(input.weight) : undefined,
      amount: input.amount !== undefined ? String(input.amount) : undefined,
      cumulativeAmount: input.cumulativeAmount !== undefined ? String(input.cumulativeAmount) : undefined,
      bankDeposit: input.bankDeposit !== undefined ? String(input.bankDeposit) : undefined,
    });
    return { success: true };
  }),
});

// ─── Daily Reports Router ─────────────────────────────────────────────────────
const reconciliationRouter = router({
  list: protectedProcedure.input(dateRangeInput).query(async ({ input }) => {
    return getDailyReports(input.startDate, input.endDate);
  }),
  byDate: protectedProcedure.input(z.object({ reportDate: z.string() })).query(async ({ input }) => {
    return getDailyReport(input.reportDate);
  }),
  upsert: protectedProcedure.input(z.object({
    reportDate: z.string(),
    openingStockPetrol: z.number().default(0),
    openingStockDiesel: z.number().default(0),
    closingStockPetrol: z.number().default(0),
    closingStockDiesel: z.number().default(0),
    petrolSalesQty: z.number().default(0),
    dieselSalesQty: z.number().default(0),
    totalSalesValue: z.number().default(0),
    cashCollected: z.number().default(0),
    cardCollected: z.number().default(0),
    onlineCollected: z.number().default(0),
    creditSales: z.number().default(0),
    totalCollected: z.number().default(0),
    totalExpenses: z.number().default(0),
    bankDeposit: z.number().default(0),
    cashBalance: z.number().default(0),
    grossProfit: z.number().default(0),
    netProfit: z.number().default(0),
    reconciliationStatus: z.enum(["pending", "reconciled", "discrepancy"]).default("pending"),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const { reportDate, reconciliationStatus, notes, ...nums } = input;
    const strData: Parameters<typeof upsertDailyReport>[0] = {
      reportDate,
      ...(reconciliationStatus ? { reconciliationStatus } : {}),
      ...(notes ? { notes } : {}),
      ...Object.fromEntries(Object.entries(nums).map(([k, v]) => [k, String(v)])),
    };
    await upsertDailyReport(strData);
    // Sync products.currentStock so Inventory page always shows the latest closing stock
    await syncFuelStockFromLatestReport().catch(() => {/* non-fatal */});
    return { success: true };
  }),

  // ─── Save closing stock (tank-dip based daily reconciliation) ──────────────
  // User enters today's closing stock; system auto-calculates opening (= yesterday's closing)
  // and sales (= opening + receipts − closing).
  saveClosingStock: protectedProcedure.input(z.object({
    reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    closingStockPetrol: z.number().min(0).max(100000),
    closingStockDiesel: z.number().min(0).max(100000),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    return saveClosingStock(input);
  }),
});

// ─── P&L Router ───────────────────────────────────────────────────────────────
const plRouter = router({
  report: protectedProcedure.input(dateRangeInput).query(async ({ input }) => {
    return getPLReport(input.startDate, input.endDate);
  }),
});

// ─── Sales Router ─────────────────────────────────────────────────────────────
const salesRouter = router({
  list: protectedProcedure.input(z.object({
    startDate: z.string(),
    endDate: z.string(),
    customerId: z.number().optional(),
  })).query(async ({ input }) => {
    return getSalesTransactions(input.startDate, input.endDate, input.customerId);
  }),
  create: protectedProcedure.input(z.object({
    transactionDate: z.string(),
    customerId: z.number().optional(),
    productId: z.number(),
    quantity: z.number(),
    unitPrice: z.number(),
    totalAmount: z.number(),
    paymentMethod: z.enum(["cash", "credit_card", "online", "credit", "fuel"]),
    paymentStatus: z.enum(["paid", "payable", "due_payable", "due_paid", "received"]).default("paid"),
    pumpNo: z.string().optional(),
    paidBy: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    await createSalesTransaction({
      ...input,
      quantity: String(input.quantity),
      unitPrice: String(input.unitPrice),
      totalAmount: String(input.totalAmount),
    });
    return { success: true };
  }),
});

// ─── Sathi AI Router ─────────────────────────────────────────────────────────
const sathiRouter = router({
  ask: protectedProcedure.input(z.object({ question: z.string().min(1).max(1000) })).mutation(async ({ input }) => {
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const kpis = await getDashboardKPIs(monthStart, today).catch(() => null);
    const lowStock = await getLowStockProducts().catch(() => []);
    const receivables = await getCustomerReceivables().catch(() => []);
    const expSummary = await getExpenseSummaryByCategory(monthStart, today).catch(() => []);

    const context = `
You are Sathi, the AI assistant for Indhan — a fuel station management platform used at BEES Fuel Station.
Today's date: ${today}

Current KPIs (this month):
- Total Sales: Rs ${kpis?.totalSales ?? 'N/A'}
- Total Expenses: Rs ${kpis?.totalExpenses ?? 'N/A'}
- Gross Profit: Rs ${kpis?.grossProfit ?? 'N/A'}
- Cash Balance: Rs ${kpis?.cashBalance ?? 'N/A'}
- Outstanding Receivables: Rs ${kpis?.totalReceivables ?? 'N/A'}
- Total Collected: Rs ${kpis?.totalCollected ?? 'N/A'}

Fuel Margins: Petrol Rs 3.95/litre, Diesel Rs 2.49/litre
Supplier: Indian Oil Corporation

Low Stock Items: ${lowStock.length > 0 ? lowStock.map((p: any) => p.name + ' (' + p.currentStock + ' ' + p.unit + ')').join(', ') : 'None'}

Top Customer Receivables:
${receivables.slice(0, 5).map((r: any) => `- ${r.name}: Rs ${r.outstandingBalance}`).join('\n')}

Expense Summary (this month):
${expSummary.map((e: any) => `- ${e.category}: Rs ${e.totalAmount}`).join('\n')}

Expense Categories: Wages, Admin, Electricity, Hospitality, Maintenance, Performance Bonus

Answer the user's question concisely and helpfully. Use Indian number formatting (lakhs, crores). Be direct and actionable.
`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: context },
        { role: "user", content: input.question },
      ],
    });

    const answer = (response.choices?.[0]?.message?.content as string) ?? "I could not process your query. Please try again.";
    return { answer };
  }),
});

// ─── App Router ────────────────────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    needsSetup: publicProcedure.query(async () => {
      const count = await getUserCount();
      return count === 0;
    }),
    login: publicProcedure.input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      const user = await getUserByEmail(input.email);
      if (!user || !user.passwordHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }
      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }
      const token = await sdk.createSessionToken(user.openId, { name: user.name || "" });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      await upsertUser({ openId: user.openId, lastSignedIn: new Date() });
      return { success: true } as const;
    }),
    setup: publicProcedure.input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(8),
    })).mutation(async ({ input, ctx }) => {
      const count = await getUserCount();
      if (count > 0) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Setup already complete" });
      }
      const passwordHash = await bcrypt.hash(input.password, 12);
      const openId = nanoid();
      await upsertUser({
        openId,
        name: input.name,
        email: input.email,
        passwordHash,
        loginMethod: "email",
        role: "admin",
        lastSignedIn: new Date(),
      });
      const token = await sdk.createSessionToken(openId, { name: input.name });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  dashboard: dashboardRouter,
  customers: customersRouter,
  inventory: inventoryRouter,
  expenses: expensesRouter,
  bank: bankRouter,
  bankStatement: bankStatementRouter,
  weighBridge: weighBridgeRouter,
  reconciliation: reconciliationRouter,
  pl: plRouter,
  sales: salesRouter,
  sathi: sathiRouter,
  hr: hrRouter,
  assets: assetsRouter,
  attendance: attendanceRouter,
  nozzle: nozzleRouter,
  fuelIntelligence: fuelIntelligenceRouter,
  fuelPrices: fuelPricesRouter,
  cashHandover: cashHandoverRouter,
  users: usersRouter,
  invitations: invitationsRouter,
  auditLog: auditLogRouter,
  fuelDelivery: fuelDeliveryRouter,
  e70: e70Router,
});

export type AppRouter = typeof appRouter;
