import express from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { getDb } from "./db";
import {
  customers, expenses, bankTransactions, dailyReports, products, salesTransactions,
} from "../drizzle/schema";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export const importRouter = express.Router();

function parseNum(v: unknown): string {
  if (v === null || v === undefined || v === "") return "0";
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? "0" : String(n);
}

function parseDate(v: unknown): string {
  if (!v) return new Date().toISOString().slice(0, 10);
  if (typeof v === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  // Try DD-MM-YYYY or DD/MM/YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const year = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function sheetToRows(wb: XLSX.WorkBook, sheetName: string): Record<string, unknown>[] {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, unknown>[];
}

importRouter.post("/api/import/excel", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const wb = XLSX.read(req.file.buffer, { type: "buffer", cellDates: false });
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const results: Record<string, number> = {};

    // ── 1. Customers / Receivables ─────────────────────────────────────────────
    const customerSheets = wb.SheetNames.filter(n =>
      /receivable|customer|credit account/i.test(n)
    );
    const customerMap: Record<string, number> = {};
    // Pre-populate customerMap from existing DB records to prevent duplicates on re-import
    const existingCustomers = await db.select({ id: customers.id, name: customers.name }).from(customers);
    for (const ec of existingCustomers) customerMap[ec.name] = ec.id;
    for (const sn of customerSheets) {
      const rows = sheetToRows(wb, sn);
      let imported = 0;
      for (const row of rows) {
        const name = String(row["Customer Name"] ?? row["Name"] ?? row["CUSTOMER"] ?? "").trim();
        if (!name || name.toLowerCase() === "total" || name.toLowerCase() === "name") continue;
        // If customer already exists, reuse existing ID — never create duplicates
        if (customerMap[name]) { imported++; continue; }
        try {
          const [result] = await db.insert(customers).values({
            name,
            phone: String(row["Phone"] ?? row["Mobile"] ?? "").trim() || null,
            creditLimit: parseNum(row["Credit Limit"] ?? row["CREDIT LIMIT"] ?? "100000"),
          }).onDuplicateKeyUpdate({ set: { name } });
          const insertId = (result as any).insertId;
          if (insertId) customerMap[name] = insertId;
          imported++;
        } catch { /* skip */ }
      }
      results[`Customers (${sn})`] = imported;
    }

    // ── 2. Daily Reports / Accounting ─────────────────────────────────────────
    const dailySheets = wb.SheetNames.filter(n =>
      /daily|accounting|report|summary/i.test(n)
    );
    for (const sn of dailySheets) {
      const rows = sheetToRows(wb, sn);
      let imported = 0;
      for (const row of rows) {
        const dateVal = row["Date"] ?? row["DATE"] ?? row["Report Date"] ?? row["REPORT DATE"];
        if (!dateVal) continue;
        const reportDate = parseDate(dateVal);
        if (reportDate === "Invalid Date") continue;
        try {
          await db.insert(dailyReports).values({
            reportDate,
            openingStockPetrol: parseNum(row["Opening Stock Petrol"] ?? row["OPENING PETROL"] ?? "0"),
            openingStockDiesel: parseNum(row["Opening Stock Diesel"] ?? row["OPENING DIESEL"] ?? "0"),
            closingStockPetrol: parseNum(row["Closing Stock Petrol"] ?? row["CLOSING PETROL"] ?? "0"),
            closingStockDiesel: parseNum(row["Closing Stock Diesel"] ?? row["CLOSING DIESEL"] ?? "0"),
            petrolSalesQty: parseNum(row["Petrol Qty"] ?? row["PETROL QTY"] ?? row["Petrol Sales Qty"] ?? "0"),
            dieselSalesQty: parseNum(row["Diesel Qty"] ?? row["DIESEL QTY"] ?? row["Diesel Sales Qty"] ?? "0"),
            totalSalesValue: parseNum(row["Total Sales"] ?? row["TOTAL SALES"] ?? row["Sales Value"] ?? "0"),
            cashCollected: parseNum(row["Cash"] ?? row["CASH"] ?? row["Cash Collected"] ?? "0"),
            cardCollected: parseNum(row["Card"] ?? row["CARD"] ?? row["Card Collected"] ?? "0"),
            onlineCollected: parseNum(row["Online"] ?? row["ONLINE"] ?? "0"),
            creditSales: parseNum(row["Credit"] ?? row["CREDIT"] ?? row["Credit Sales"] ?? "0"),
            totalCollected: parseNum(row["Total Collected"] ?? row["TOTAL COLLECTED"] ?? "0"),
            totalExpenses: parseNum(row["Total Expenses"] ?? row["TOTAL EXPENSES"] ?? row["Expenses"] ?? "0"),
            bankDeposit: parseNum(row["Bank Deposit"] ?? row["BANK DEPOSIT"] ?? "0"),
            cashBalance: parseNum(row["Cash Balance"] ?? row["CASH BALANCE"] ?? row["Closing Cash"] ?? "0"),
            grossProfit: parseNum(row["Gross Profit"] ?? row["GROSS PROFIT"] ?? "0"),
            netProfit: parseNum(row["Net Profit"] ?? row["NET PROFIT"] ?? "0"),
            reconciliationStatus: "reconciled",
          }).onDuplicateKeyUpdate({ set: { reportDate } });
          imported++;
        } catch { /* skip */ }
      }
      results[`Daily Reports (${sn})`] = imported;
    }

    // ── 3. Expenses ────────────────────────────────────────────────────────────
    const expenseSheets = wb.SheetNames.filter(n => /expense/i.test(n));
    const validCategories = ["Wages", "Admin", "Electricity", "Hospitality", "Maintenance", "Performance Bonus", "Other"];
    for (const sn of expenseSheets) {
      const rows = sheetToRows(wb, sn);
      let imported = 0;
      for (const row of rows) {
        const dateVal = row["Date"] ?? row["DATE"];
        const amount = parseNum(row["Amount"] ?? row["AMOUNT"] ?? row["Total"] ?? "0");
        if (!dateVal || amount === "0") continue;
        const rawCat = String(row["Category"] ?? row["CATEGORY"] ?? row["Type"] ?? "Wages").trim();
        const subHead = ["Wages","Admin","Electricity","Hospitality","Maintenance","Performance Bonus","Fuel","Transport","POS Charges","Bank Charges","Purchase","Interest","Principal","Charges"].find(c => rawCat.toLowerCase().includes(c.toLowerCase())) ?? "Admin";
        try {
          await db.insert(expenses).values({
            expenseDate: parseDate(dateVal),
            headAccount: "Operating Activities",
            subHeadAccount: subHead as any,
            description: String(row["Description"] ?? row["DESCRIPTION"] ?? row["Particulars"] ?? "").trim() || subHead,
            amount,
            modeOfPayment: "Cash",
            approvalStatus: "approved",
          });
          imported++;
        } catch { /* skip */ }
      }
      results[`Expenses (${sn})`] = imported;
    }

    // ── 4. Bank Transactions ───────────────────────────────────────────────────
    const bankSheets = wb.SheetNames.filter(n => /bank/i.test(n));
    for (const sn of bankSheets) {
      const rows = sheetToRows(wb, sn);
      let imported = 0;
      for (const row of rows) {
        const dateVal = row["Date"] ?? row["DATE"] ?? row["Value Date"] ?? row["VALUE DATE"];
        const amount = parseNum(row["Amount"] ?? row["AMOUNT"] ?? row["Debit"] ?? row["Credit"] ?? "0");
        if (!dateVal || amount === "0") continue;
        const desc = String(row["Description"] ?? row["DESCRIPTION"] ?? row["Particulars"] ?? row["Narration"] ?? "Import").trim();
        const typeRaw = String(row["Type"] ?? row["TYPE"] ?? row["Mode"] ?? "").toUpperCase();
        const txnType = ["NEFT", "RTGS", "IMPS", "UPI", "Cash", "Credit Card"].find(t =>
          typeRaw.includes(t.toUpperCase())
        ) ?? "NEFT";
        const debit = parseNum(row["Debit"] ?? row["DEBIT"] ?? "0");
        const credit = parseNum(row["Credit"] ?? row["CREDIT"] ?? "0");
        try {
          await db.insert(bankTransactions).values({
            transactionDate: parseDate(dateVal),
            description: desc.slice(0, 255),
            transactionType: txnType as any,
            withdrawal: parseFloat(debit) > 0 ? debit : "0",
            deposit: parseFloat(credit) > 0 ? credit : "0",
            balance: parseNum(row["Balance"] ?? row["BALANCE"] ?? row["Running Balance"] ?? "0"),
            reconciliationStatus: "matched",
          });
          imported++;
        } catch { /* skip */ }
      }
      results[`Bank Transactions (${sn})`] = imported;
    }

    // ── 5. Sales Transactions ─────────────────────────────────────────────────
    const salesSheets = wb.SheetNames.filter(n => /sales|nozzle|daily credit/i.test(n));
    for (const sn of salesSheets) {
      const rows = sheetToRows(wb, sn);
      let imported = 0;
      for (const row of rows) {
        const dateVal = row["Date"] ?? row["DATE"];
        const qty = parseNum(row["Qty"] ?? row["QTY"] ?? row["Quantity"] ?? row["QUANTITY"] ?? "0");
        if (!dateVal || qty === "0") continue;
        const productName = String(row["Product"] ?? row["PRODUCT"] ?? row["Fuel"] ?? "Petrol").trim();
        const productType = productName.toLowerCase().includes("diesel") ? "diesel" : "petrol";
        const unitPrice = productType === "petrol" ? "94.72" : "87.62";
        const totalAmount = parseNum(row["Amount"] ?? row["AMOUNT"] ?? row["Total"] ?? String(parseFloat(qty) * parseFloat(unitPrice)));
        const custName = String(row["Customer"] ?? row["CUSTOMER"] ?? row["Party"] ?? "").trim();
        const custId = custName && customerMap[custName] ? customerMap[custName] : null;
        const payMode = String(row["Mode"] ?? row["Payment Mode"] ?? row["TYPE"] ?? "cash").toLowerCase();
        const paymentMode = payMode.includes("credit") ? "credit" : payMode.includes("card") ? "card" : payMode.includes("online") || payMode.includes("upi") ? "online" : "cash";
        // Map to a default productId (1=Petrol, 2=Diesel)
        const productId = productType === "diesel" ? 2 : 1;
        const payMethod = paymentMode === "card" ? "credit_card" : paymentMode === "online" ? "online" : paymentMode === "credit" ? "credit" : "cash";
        try {
          await db.insert(salesTransactions).values({
            transactionDate: parseDate(dateVal),
            productId,
            quantity: qty,
            unitPrice,
            totalAmount,
            paymentMethod: payMethod as any,
            customerId: custId,
          });
          imported++;
        } catch { /* skip */ }
      }
      results[`Sales (${sn})`] = imported;
    }

    const totalImported = Object.values(results).reduce((a, b) => a + b, 0);
    return res.json({
      success: true,
      totalImported,
      breakdown: results,
      sheetsFound: wb.SheetNames,
    });
  } catch (err: any) {
    console.error("[Import] Error:", err);
    return res.status(500).json({ error: err.message ?? "Import failed" });
  }
});
