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
  getStats: protectedProcedure.input(dateRangeInput).query(async ({ input }) => {
    return getDashboardKPIs(input.startDate, input.endDate);
  }),
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
    status: z.enum(["Approved", "Rejected"]),
  })).mutation(async ({ input, ctx }) => {
    await updateExpenseApproval(input.id, input.status, ctx.user.name);
    return { success: true };
  }),
});

// ─── Bank Router ──────────────────────────────────────────────────────────────
const bankRouter = router({
  list: protectedProcedure.input(dateRangeInput).query(async ({ input }) => {
    return getBankTransactions(input.startDate, input.endDate);
  }),
  summary: protectedProcedure.input(dateRangeInput).query(async ({ input }) => {
    return getBankSummary(input.startDate, input.endDate);
  }),
  create: adminProcedure.input(z.object({
    transactionDate: safeDate,
    description: z.string().min(1),
    transactionType: z.string().default("Other"),
    deposit: z.number().optional(),
    withdrawal: z.number().optional(),
    referenceNo: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    await createBankTransaction({ 
      ...input, 
      deposit: input.deposit ? String(input.deposit) : "0",
      withdrawal: input.withdrawal ? String(input.withdrawal) : "0"
    });
    return { success: true };
  }),
  reconcile: adminProcedure.input(z.object({
    id: z.number(),
    status: z.string(),
  })).mutation(async ({ input }) => {
    await updateBankTransactionStatus(input.id, input.status);
    return { success: true };
  }),
});

// ─── Reconciliation Router ────────────────────────────────────────────────────
const reconciliationRouter = router({
  dailyReports: protectedProcedure.input(dateRangeInput).query(async ({ input }) => {
    return getDailyReports(input.startDate, input.endDate);
  }),
  report: protectedProcedure.input(z.object({ date: safeDate })).query(async ({ input }) => {
    return getDailyReport(input.date);
  }),
  // Alias for frontend compatibility
  byDate: protectedProcedure.input(z.object({ reportDate: safeDate })).query(async ({ input }) => {
    return getDailyReport(input.reportDate);
  }),
  saveReport: protectedProcedure.input(z.object({
    reportDate: safeDate,
    openingStockPetrol: z.number().optional(),
    openingStockDiesel: z.number().optional(),
    purchasePetrol: z.number().optional(),
    purchaseDiesel: z.number().optional(),
    salesPetrol: z.number().optional(),
    salesDiesel: z.number().optional(),
    closingStockPetrol: z.number().optional(),
    closingStockDiesel: z.number().optional(),
    testingPetrol: z.number().optional(),
    testingDiesel: z.number().optional(),
    totalCashCollected: z.number().optional(),
    totalDigitalCollected: z.number().optional(),
    totalCreditSales: z.number().optional(),
    totalExpenses: z.number().optional(),
    netCashInHand: z.number().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const data: any = { ...input };
    ["openingStockPetrol", "openingStockDiesel", "purchasePetrol", "purchaseDiesel", "salesPetrol", "salesDiesel", "closingStockPetrol", "closingStockDiesel", "testingPetrol", "testingDiesel", "totalCashCollected", "totalDigitalCollected", "totalCreditSales", "totalExpenses", "netCashInHand"].forEach(key => {
      if (data[key] !== undefined) data[key] = String(data[key]);
    });
    await upsertDailyReport(data);
    return { success: true };
  }),
  // Alias for frontend compatibility
  upsert: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const data: any = { ...input };
    // Handle string conversions if numbers are passed
    const fields = ["openingStockPetrol", "openingStockDiesel", "purchasePetrol", "purchaseDiesel", "salesPetrol", "salesDiesel", "closingStockPetrol", "closingStockDiesel", "testingPetrol", "testingDiesel", "totalCashCollected", "totalDigitalCollected", "totalCreditSales", "totalExpenses", "netCashInHand", "cashSales", "cardSales", "onlineCollected", "bankDeposit", "closingCash"];
    fields.forEach(key => {
      if (data[key] !== undefined && typeof data[key] === 'number') data[key] = String(data[key]);
    });
    await upsertDailyReport(data);
    return { success: true };
  }),
  syncStock: adminProcedure.input(z.object({ reportDate: safeDate })).mutation(async ({ input }) => {
    await syncFuelStockFromLatestReport(input.reportDate);
    return { success: true };
  }),
  saveClosingStock: protectedProcedure.input(z.object({
    reportDate: safeDate,
    closingStockPetrol: z.number(),
    closingStockDiesel: z.number(),
  })).mutation(async ({ input }) => {
    await saveClosingStock(input.reportDate, String(input.closingStockPetrol), String(input.closingStockDiesel));
    return { success: true };
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
  list: protectedProcedure.input(dateRangeInput).query(async ({ input }) => {
    return getSalesTransactions(input.startDate, input.endDate);
  }),
  create: protectedProcedure.input(z.object({
    saleDate: safeDate,
    productId: z.number(),
    quantity: z.number(),
    rate: z.number(),
    amount: z.number(),
    paymentMode: z.enum(["cash", "digital", "credit"]),
    customerId: z.number().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    await createSalesTransaction({ ...input, quantity: String(input.quantity), rate: String(input.rate), amount: String(input.amount) });
    return { success: true };
  }),
});

// ─── Sathi Agent Router (AI) ──────────────────────────────────────────────────
const sathiRouter = router({
  ask: protectedProcedure.input(z.object({
    question: z.string(),
    history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).optional(),
  })).mutation(async ({ input, ctx }) => {
    const systemPrompt = `You are "Sathi", the intelligent operations assistant for Indhan Fuel Station OS. 
    The user is ${ctx.user.name} (Role: ${ctx.user.role}).
    Station: BEES Fuel Station, Velgatoor.
    Provide helpful, data-driven advice on fuel station management, inventory, staff, and financial reconciliation. 
    Be professional, concise, and context-aware.`;
    
    const response = await invokeLLM({
      systemPrompt,
      userPrompt: input.question,
      history: input.history,
    });
    
    return { answer: response };
  }),
});

// ─── Root Router ──────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: protectedProcedure.query(({ ctx }) => {
      return {
        id: ctx.user.id,
        openId: ctx.user.openId,
        name: ctx.user.name,
        email: ctx.user.email,
        role: ctx.user.role,
      };
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
    needsSetup: publicProcedure.query(async () => {
      const count = await getUserCount();
      return count === 0;
    }),
  }),
  dashboard: dashboardRouter,
  customers: customersRouter,
  inventory: inventoryRouter,
  expenses: expensesRouter,
  bank: bankRouter,
  bankStatement: bankStatementRouter,

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

});

export type AppRouter = typeof appRouter;
