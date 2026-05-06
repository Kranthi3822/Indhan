import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { invokeLLM, type Message } from "../_core/llm";
import { storagePut } from "../storage";

// ─── DB helper (same pattern as cashHandoverRouter) ───────────────────────────
async function getDb() {
  const { createPool } = await import("mysql2/promise");
  return createPool(process.env.DATABASE_URL!);
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface ParsedTransaction {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number | null;
  referenceNo: string | null;
  transactionType: "NEFT" | "RTGS" | "IMPS" | "Cash" | "Credit Card" | "UPI";
}

function inferTransactionType(description: string): ParsedTransaction["transactionType"] {
  const d = description.toUpperCase();
  if (d.includes("NEFT")) return "NEFT";
  if (d.includes("RTGS")) return "RTGS";
  if (d.includes("IMPS")) return "IMPS";
  if (d.includes("UPI") || d.includes("PHONEPE") || d.includes("GPAY") || d.includes("PAYTM")) return "UPI";
  if (d.includes("CARD") || d.includes("POS")) return "Credit Card";
  return "Cash";
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const bankStatementRouter = router({

  // Upload + parse a bank statement file (base64 encoded)
  upload: adminProcedure.input(z.object({
    filename: z.string().min(1).max(255),
    fileType: z.enum(["pdf", "xlsx", "csv"]),
    fileBase64: z.string().min(1),
    uploadedBy: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const pool = await getDb();

    // 1. Decode base64 → Buffer → S3
    const fileBuffer = Buffer.from(input.fileBase64, "base64");
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const s3Key = `bank-statements/${Date.now()}-${randomSuffix}.${input.fileType}`;
    const mimeType = input.fileType === "pdf" ? "application/pdf"
      : input.fileType === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : "text/csv";

    const { url: s3Url } = await storagePut(s3Key, fileBuffer, mimeType);

    // 2. Create upload record
    const [insertResult] = await pool.execute(
      `INSERT INTO bank_statement_uploads (filename, s3_key, s3_url, file_type, status, uploaded_by) VALUES (?, ?, ?, ?, 'parsing', ?)`,
      [input.filename, s3Key, s3Url, input.fileType, input.uploadedBy ?? (ctx.user as any)?.name ?? "unknown"]
    );
    const uploadId = (insertResult as any).insertId;

    // 3. Parse with LLM
    try {
      const systemPrompt = `You are a bank statement parser for Indian banks. Extract ALL transactions from the provided bank statement.
Return ONLY a JSON object with this structure:
{"transactions": [{"date": "YYYY-MM-DD", "description": "string", "debit": 0.00, "credit": 0.00, "balance": 0.00, "referenceNo": "string or null"}]}
Rules:
- Convert all dates to YYYY-MM-DD format (handle DD/MM/YYYY, DD-MM-YYYY, DD MMM YYYY)
- debit = money going OUT (withdrawal/Dr), credit = money coming IN (deposit/Cr)
- Use 0 for missing debit/credit, not null
- balance can be null if not in statement
- referenceNo can be null if not present
- Include ALL rows, even zero-amount entries`;

      const messages: Message[] = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "file_url" as const,
              file_url: {
                url: s3Url,
                mime_type: "application/pdf" as const,
              }
            }
          ]
        }
      ];

      const llmResponse = await invokeLLM({
        messages,
        response_format: { type: "json_object" },
      });

      const rawContent = llmResponse.choices?.[0]?.message?.content ?? "{}";
      let transactions: ParsedTransaction[] = [];

      try {
        const parsed = typeof rawContent === "string" ? JSON.parse(rawContent) : rawContent;
        const arr = Array.isArray(parsed) ? parsed : (parsed.transactions ?? parsed.data ?? []);
        transactions = (arr as any[]).map((t: any) => ({
          date: String(t.date ?? "").slice(0, 10),
          description: String(t.description ?? "").slice(0, 500),
          debit: Math.abs(Number(t.debit ?? 0)),
          credit: Math.abs(Number(t.credit ?? 0)),
          balance: t.balance != null ? Number(t.balance) : null,
          referenceNo: t.referenceNo ? String(t.referenceNo).slice(0, 100) : null,
          transactionType: inferTransactionType(String(t.description ?? "")),
        })).filter((t: ParsedTransaction) => /^\d{4}-\d{2}-\d{2}$/.test(t.date));
      } catch {
        transactions = [];
      }

      // 4. Determine date range
      const dates = transactions.map(t => t.date).sort();
      const statementFrom = dates[0] ?? null;
      const statementTo = dates[dates.length - 1] ?? null;

      // 5. Insert parsed transactions into bank_transactions
      let insertedCount = 0;
      for (const tx of transactions) {
        try {
          await pool.execute(
            `INSERT INTO bank_transactions (transactionDate, description, transactionType, withdrawal, deposit, balance, referenceNo, reconciliationStatus)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [tx.date, tx.description, tx.transactionType, tx.debit, tx.credit, tx.balance, tx.referenceNo]
          );
          insertedCount++;
        } catch {
          // Skip duplicates or invalid rows
        }
      }

      // 6. Count how many match existing daily_reports
      let matchedCount = 0;
      for (const tx of transactions) {
        const [rows] = await pool.execute(
          `SELECT id FROM daily_reports WHERE report_date = ? LIMIT 1`,
          [tx.date]
        );
        if ((rows as any[]).length > 0) matchedCount++;
      }

      // 7. Update upload record to done
      await pool.execute(
        `UPDATE bank_statement_uploads SET status='done', parsed_count=?, matched_count=?, statement_from=?, statement_to=? WHERE id=?`,
        [insertedCount, matchedCount, statementFrom, statementTo, uploadId]
      );

      await pool.end();

      return {
        uploadId,
        parsedCount: insertedCount,
        matchedCount,
        statementFrom,
        statementTo,
        transactions: transactions.slice(0, 300),
      };

    } catch (err: any) {
      await pool.execute(
        `UPDATE bank_statement_uploads SET status='error', error_message=? WHERE id=?`,
        [String(err?.message ?? "Unknown error").slice(0, 500), uploadId]
      );
      await pool.end();
      throw new Error(`Parsing failed: ${err?.message ?? "Unknown error"}`);
    }
  }),

  // List all uploads
  listUploads: protectedProcedure.query(async () => {
    const pool = await getDb();
    const [rows] = await pool.execute(
      `SELECT * FROM bank_statement_uploads ORDER BY createdAt DESC LIMIT 50`
    );
    await pool.end();
    return rows as any[];
  }),

  // Get bank transactions for a date range with daily_report match info
  getTransactions: protectedProcedure.input(z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })).query(async ({ input }) => {
    const pool = await getDb();
    const [rows] = await pool.execute(
      `SELECT bt.*,
        CASE WHEN dr.id IS NOT NULL THEN 'matched' ELSE 'unmatched' END as matchStatus,
        dr.totalSalesValue as reportSalesValue,
        dr.cashCollected as reportCashCollected
       FROM bank_transactions bt
       LEFT JOIN daily_reports dr ON dr.report_date = bt.transactionDate
       WHERE bt.transactionDate BETWEEN ? AND ?
       ORDER BY bt.transactionDate DESC`,
      [input.startDate, input.endDate]
    );
    await pool.end();
    return rows as any[];
  }),

  // Days with bank transactions but daily_report still pending — catch-up list
  getUnreconciledDays: protectedProcedure.query(async () => {
    const pool = await getDb();
    const [rows] = await pool.execute(
      `SELECT DISTINCT bt.transactionDate as date,
        COUNT(bt.id) as txCount,
        SUM(bt.deposit) as totalDeposit,
        SUM(bt.withdrawal) as totalWithdrawal,
        COALESCE(dr.reconciliationStatus, 'no_report') as reportStatus,
        dr.totalSalesValue
       FROM bank_transactions bt
       LEFT JOIN daily_reports dr ON dr.report_date = bt.transactionDate
       WHERE (dr.reconciliationStatus IS NULL OR dr.reconciliationStatus = 'pending')
         AND bt.transactionDate >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
       GROUP BY bt.transactionDate, dr.reconciliationStatus, dr.totalSalesValue
       ORDER BY bt.transactionDate DESC
       LIMIT 30`
    );
    await pool.end();
    return rows as any[];
  }),

  // Mark a date as reconciled (bank tx + daily report)
  markDateReconciled: adminProcedure.input(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })).mutation(async ({ input }) => {
    const pool = await getDb();
    await pool.execute(
      `UPDATE bank_transactions SET reconciliationStatus='matched' WHERE transactionDate=?`,
      [input.date]
    );
    await pool.execute(
      `UPDATE daily_reports SET reconciliationStatus='reconciled' WHERE report_date=?`,
      [input.date]
    );
    await pool.end();
    return { success: true };
  }),

  // Alias for frontend compatibility (BankStatement.tsx)
  list: protectedProcedure.input(z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })).query(async ({ input }) => {
    const pool = await getDb();
    const [rows] = await pool.execute(
      `SELECT bt.* FROM bank_transactions bt
       WHERE bt.transactionDate BETWEEN ? AND ?
       ORDER BY bt.transactionDate DESC`,
      [input.startDate, input.endDate]
    );
    await pool.end();
    return rows as any[];
  }),

  summary: protectedProcedure.input(z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })).query(async ({ input }) => {
    const pool = await getDb();
    const [rows] = await pool.execute<any[]>(
      `SELECT 
         COUNT(*) as count,
         SUM(deposit) as totalDeposits,
         SUM(withdrawal) as totalWithdrawals
       FROM bank_transactions
       WHERE transactionDate BETWEEN ? AND ?`,
      [input.startDate, input.endDate]
    );
    await pool.end();
    const summary = (rows as any[])[0] as any;
    return {
      count: Number(summary?.count ?? 0),
      totalDeposits: Number(summary?.totalDeposits ?? 0),
      totalWithdrawals: Number(summary?.totalWithdrawals ?? 0),
      netChange: Number(summary?.totalDeposits ?? 0) - Number(summary?.totalWithdrawals ?? 0),
    };
  }),
});
