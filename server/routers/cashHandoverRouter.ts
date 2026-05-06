import { z } from "zod";
import { protectedProcedure, operationalProcedure, adminProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

// ─── DB helper ────────────────────────────────────────────────────────────────
async function getDb() {
  const { createPool } = await import("mysql2/promise");
  return createPool(process.env.DATABASE_URL!);
}

// ─── Voucher number generator ─────────────────────────────────────────────────
function generateVoucherNumber(date: string, seq: number): string {
  const d = date.replace(/-/g, "");
  return `CDV-${d}-${String(seq).padStart(3, "0")}`;
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const cashHandoverRouter = router({

  // ── Get handover summary for a date ────────────────────────────────────────
  // Returns per-nozzle: cash sales (from nozzle collections), cash expenses drawn,
  // net cash to collect, and whether the manager has confirmed each nozzle.
  getSummary: protectedProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ input }) => {
      const pool = await getDb();
      const conn = await pool.getConnection();
      try {
        // Get all active nozzles
        const [nozzles] = await conn.execute<any[]>(
          `SELECT n.id, n.label, n.fuel_type as fuelType, p.label as pumpLabel
           FROM nozzles n JOIN pumps p ON p.id = n.pump_id
           WHERE n.is_active = 1 ORDER BY n.nozzle_number`
        );

        // Get cash collections per nozzle for the date (from shift sessions on that date)
        const [cashSales] = await conn.execute<any[]>(
          `SELECT cc.nozzle_id, SUM(cc.amount) as cashTotal
           FROM cash_collections cc
           JOIN shift_sessions ss ON ss.id = cc.session_id
           WHERE ss.shift_date = ? AND cc.payment_mode = 'cash' AND cc.nozzle_id IS NOT NULL
           GROUP BY cc.nozzle_id`,
          [input.date]
        );
        const cashSalesMap: Record<number, number> = {};
        for (const row of cashSales) {
          cashSalesMap[row.nozzle_id] = Number(row.cashTotal ?? 0);
        }

        // Get cash expenses drawn from each nozzle for the date
        const [cashExpenses] = await conn.execute<any[]>(
          `SELECT nozzle_id, SUM(amount) as expTotal
           FROM expenses
           WHERE expenseDate = ? AND payment_source = 'cash_nozzle' AND nozzle_id IS NOT NULL
           GROUP BY nozzle_id`,
          [input.date]
        );
        const cashExpMap: Record<number, number> = {};
        for (const row of cashExpenses) {
          cashExpMap[row.nozzle_id] = Number(row.expTotal ?? 0);
        }

        // Get existing handover confirmations for the date
        const [confirmations] = await conn.execute<any[]>(
          `SELECT * FROM cash_handover_sessions WHERE handover_date = ?`,
          [input.date]
        );
        const confirmMap: Record<number, any> = {};
        for (const row of confirmations) {
          confirmMap[row.nozzle_id] = row;
        }

        // Build per-nozzle summary
        const nozzleSummaries = nozzles.map((n: any) => {
          const cashCollected = cashSalesMap[n.id] ?? 0;
          const cashExpenses = cashExpMap[n.id] ?? 0;
          const netCash = cashCollected - cashExpenses;
          const confirmation = confirmMap[n.id];
          return {
            nozzleId: n.id,
            nozzleLabel: n.label,
            fuelType: n.fuelType,
            pumpLabel: n.pumpLabel,
            cashCollected,
            cashExpenses,
            netCash,
            confirmed: !!confirmation?.confirmedAt,
            actualAmount: confirmation?.actual_amount ? Number(confirmation.actual_amount) : null,
            variance: confirmation?.variance ? Number(confirmation.variance) : null,
            confirmedAt: confirmation?.confirmedAt ?? null,
            confirmedBy: confirmation?.confirmed_by ?? null,
            handoverSessionId: confirmation?.id ?? null,
          };
        });

        // Totals
        const totalCashCollected = nozzleSummaries.reduce((s, n) => s + n.cashCollected, 0);
        const totalCashExpenses = nozzleSummaries.reduce((s, n) => s + n.cashExpenses, 0);
        const totalNetCash = nozzleSummaries.reduce((s, n) => s + n.netCash, 0);
        const totalConfirmed = nozzleSummaries.filter(n => n.confirmed).reduce((s, n) => s + (n.actualAmount ?? 0), 0);
        const allConfirmed = nozzleSummaries.every(n => n.confirmed);

        // Check if voucher already generated for this date
        const [vouchers] = await conn.execute<any[]>(
          `SELECT * FROM cash_deposit_vouchers WHERE voucher_date = ? ORDER BY createdAt DESC LIMIT 1`,
          [input.date]
        );
        const existingVoucher = vouchers[0] ?? null;

        return {
          date: input.date,
          nozzles: nozzleSummaries,
          totalCashCollected,
          totalCashExpenses,
          totalNetCash,
          totalConfirmed,
          allConfirmed,
          existingVoucher: existingVoucher ? {
            id: existingVoucher.id,
            voucherNumber: existingVoucher.voucher_number,
            depositAmount: Number(existingVoucher.deposit_amount),
            floatRetained: Number(existingVoucher.float_retained),
            status: existingVoucher.status,
            bankAccount: existingVoucher.bank_account,
            bankTransactionId: existingVoucher.bank_transaction_id,
            reconciledAt: existingVoucher.reconciledAt,
          } : null,
        };
      } finally {
        conn.release();
        await pool.end();
      }
    }),

  // ── Confirm nozzle cash collection ─────────────────────────────────────────
  confirmNozzle: operationalProcedure
    .input(z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      nozzleId: z.number().int().positive(),
      actualAmount: z.number().min(0),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const pool = await getDb();
      const conn = await pool.getConnection();
      try {
        // Calculate expected net cash
        const [cashSales] = await conn.execute<any[]>(
          `SELECT COALESCE(SUM(cc.amount), 0) as cashTotal
           FROM cash_collections cc
           JOIN shift_sessions ss ON ss.id = cc.session_id
           WHERE ss.shift_date = ? AND cc.payment_mode = 'cash' AND cc.nozzle_id = ?`,
          [input.date, input.nozzleId]
        );
        const [cashExp] = await conn.execute<any[]>(
          `SELECT COALESCE(SUM(amount), 0) as expTotal
           FROM expenses
           WHERE expenseDate = ? AND payment_source = 'cash_nozzle' AND nozzle_id = ?`,
          [input.date, input.nozzleId]
        );
        const cashCollected = Number(cashSales[0]?.cashTotal ?? 0);
        const cashExpenses = Number(cashExp[0]?.expTotal ?? 0);
        const netCash = cashCollected - cashExpenses;
        const variance = input.actualAmount - netCash;
        const confirmedBy = ctx.user?.name ?? ctx.user?.openId ?? "manager";

        // Upsert handover session
        await conn.execute(
          `INSERT INTO cash_handover_sessions
             (handover_date, nozzle_id, cash_collected, cash_expenses, net_cash, actual_amount, variance, confirmedAt, confirmed_by, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)
           ON DUPLICATE KEY UPDATE
             cash_collected = VALUES(cash_collected),
             cash_expenses = VALUES(cash_expenses),
             net_cash = VALUES(net_cash),
             actual_amount = VALUES(actual_amount),
             variance = VALUES(variance),
             confirmedAt = NOW(),
             confirmed_by = VALUES(confirmed_by),
             notes = VALUES(notes)`,
          [input.date, input.nozzleId, cashCollected, cashExpenses, netCash,
           input.actualAmount, variance, confirmedBy, input.notes ?? null]
        );

        return { success: true, netCash, actualAmount: input.actualAmount, variance };
      } finally {
        conn.release();
        await pool.end();
      }
    }),

  // ── Finalise handover & generate deposit voucher ────────────────────────────
  finaliseAndGenerateVoucher: operationalProcedure
    .input(z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      floatRetained: z.number().min(0).default(0),
      bankAccount: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const pool = await getDb();
      const conn = await pool.getConnection();
      try {
        // Get all confirmed handover sessions for the date
        const [sessions] = await conn.execute<any[]>(
          `SELECT * FROM cash_handover_sessions WHERE handover_date = ? AND confirmedAt IS NOT NULL`,
          [input.date]
        );
        if (sessions.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No confirmed nozzle collections for this date. Please confirm all nozzles first." });
        }

        const totalCashCollected = sessions.reduce((s: number, r: any) => s + Number(r.cash_collected), 0);
        const totalCashExpenses = sessions.reduce((s: number, r: any) => s + Number(r.cash_expenses), 0);
        const totalActual = sessions.reduce((s: number, r: any) => s + Number(r.actual_amount ?? r.net_cash), 0);
        const depositAmount = totalActual - input.floatRetained;

        if (depositAmount < 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Float retained cannot exceed total cash collected." });
        }

        // Generate sequential voucher number
        const [existing] = await conn.execute<any[]>(
          `SELECT COUNT(*) as cnt FROM cash_deposit_vouchers WHERE voucher_date = ?`,
          [input.date]
        );
        const seq = Number(existing[0]?.cnt ?? 0) + 1;
        const voucherNumber = generateVoucherNumber(input.date, seq);
        const generatedBy = ctx.user?.name ?? ctx.user?.openId ?? "manager";

        const bankAccount = input.bankAccount ?? "State Bank of India — A/C: XXXX XXXX XXXX";
        const instructions = [
          `CASH DEPOSIT INSTRUCTIONS`,
          `Voucher No: ${voucherNumber}`,
          `Date: ${input.date}`,
          ``,
          `1. Count and verify the cash amount: ₹${depositAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
          `2. Fill in the bank deposit slip with the above amount.`,
          `3. Deposit to: ${bankAccount}`,
          `4. Retain the bank-stamped deposit slip and attach to this voucher.`,
          `5. Return the stamped voucher to the station manager.`,
          `6. The system will be updated once the bank statement is received.`,
        ].join("\n");

        // Insert voucher
        const [result] = await conn.execute<any>(
          `INSERT INTO cash_deposit_vouchers
             (voucher_number, voucher_date, total_cash_collected, total_cash_expenses, float_retained, deposit_amount, bank_account, deposit_instructions, status, generated_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'finalised', ?)`,
          [voucherNumber, input.date, totalCashCollected, totalCashExpenses,
           input.floatRetained, depositAmount, bankAccount, instructions, generatedBy]
        );
        const voucherId = result.insertId;

        // Link handover sessions to this voucher
        await conn.execute(
          `UPDATE cash_handover_sessions SET deposit_voucher_id = ? WHERE handover_date = ?`,
          [voucherId, input.date]
        );

        return {
          success: true,
          voucherId,
          voucherNumber,
          depositAmount,
          floatRetained: input.floatRetained,
          totalCashCollected,
          totalCashExpenses,
          bankAccount,
          instructions,
        };
      } finally {
        conn.release();
        await pool.end();
      }
    }),

  // ── Get voucher by ID ───────────────────────────────────────────────────────
  getVoucher: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const pool = await getDb();
      const conn = await pool.getConnection();
      try {
        const [vouchers] = await conn.execute<any[]>(
          `SELECT v.*, bt.description as bankTxnDescription, bt.amount as bankTxnAmount
           FROM cash_deposit_vouchers v
           LEFT JOIN bank_transactions bt ON bt.id = v.bank_transaction_id
           WHERE v.id = ?`,
          [input.id]
        );
        if (!vouchers[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Voucher not found" });

        const v = vouchers[0];
        // Get handover sessions for this voucher
        const [sessions] = await conn.execute<any[]>(
          `SELECT hs.*, n.label as nozzleLabel, n.fuel_type as fuelType
           FROM cash_handover_sessions hs
           JOIN nozzles n ON n.id = hs.nozzle_id
           WHERE hs.deposit_voucher_id = ?
           ORDER BY n.nozzle_number`,
          [input.id]
        );

        return {
          id: v.id,
          voucherNumber: v.voucher_number,
          voucherDate: v.voucher_date,
          totalCashCollected: Number(v.total_cash_collected),
          totalCashExpenses: Number(v.total_cash_expenses),
          floatRetained: Number(v.float_retained),
          depositAmount: Number(v.deposit_amount),
          bankAccount: v.bank_account,
          depositInstructions: v.deposit_instructions,
          status: v.status,
          bankTransactionId: v.bank_transaction_id,
          bankTxnDescription: v.bankTxnDescription,
          bankTxnAmount: v.bankTxnAmount ? Number(v.bankTxnAmount) : null,
          reconciledAt: v.reconciledAt,
          reconciledBy: v.reconciled_by,
          generatedBy: v.generated_by,
          createdAt: v.createdAt,
          nozzleSessions: sessions.map((s: any) => ({
            id: s.id,
            nozzleId: s.nozzle_id,
            nozzleLabel: s.nozzleLabel,
            fuelType: s.fuelType,
            cashCollected: Number(s.cash_collected),
            cashExpenses: Number(s.cash_expenses),
            netCash: Number(s.net_cash),
            actualAmount: s.actual_amount ? Number(s.actual_amount) : null,
            variance: s.variance ? Number(s.variance) : null,
            confirmedAt: s.confirmedAt,
            confirmedBy: s.confirmed_by,
          })),
        };
      } finally {
        conn.release();
        await pool.end();
      }
    }),

  // ── Get voucher history ─────────────────────────────────────────────────────
  getVoucherHistory: protectedProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(30),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const pool = await getDb();
      const conn = await pool.getConnection();
      try {
        const [vouchers] = await conn.execute<any[]>(
          `SELECT v.*, bt.description as bankTxnDescription
           FROM cash_deposit_vouchers v
           LEFT JOIN bank_transactions bt ON bt.id = v.bank_transaction_id
           ORDER BY v.voucher_date DESC, v.createdAt DESC
           LIMIT ? OFFSET ?`,
          [input.limit, input.offset]
        );
        return vouchers.map((v: any) => ({
          id: v.id,
          voucherNumber: v.voucher_number,
          voucherDate: v.voucher_date,
          depositAmount: Number(v.deposit_amount),
          floatRetained: Number(v.float_retained),
          status: v.status,
          bankAccount: v.bank_account,
          bankTransactionId: v.bank_transaction_id,
          bankTxnDescription: v.bankTxnDescription,
          reconciledAt: v.reconciledAt,
          generatedBy: v.generated_by,
          createdAt: v.createdAt,
        }));
      } finally {
        conn.release();
        await pool.end();
      }
    }),

  // ── Match voucher to bank transaction ──────────────────────────────────────
  matchToBankEntry: adminProcedure
    .input(z.object({
      voucherId: z.number().int().positive(),
      bankTransactionId: z.number().int().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      const pool = await getDb();
      const conn = await pool.getConnection();
      try {
        const reconciledBy = ctx.user?.name ?? ctx.user?.openId ?? "manager";
        await conn.execute(
          `UPDATE cash_deposit_vouchers
           SET bank_transaction_id = ?, status = 'reconciled', reconciledAt = NOW(), reconciled_by = ?
           WHERE id = ?`,
          [input.bankTransactionId, reconciledBy, input.voucherId]
        );
        // Also mark the bank transaction as reconciled
        await conn.execute(
          `UPDATE bank_transactions SET reconciliationStatus = 'Reconciled' WHERE id = ?`,
          [input.bankTransactionId]
        );
        return { success: true };
      } finally {
        conn.release();
        await pool.end();
      }
    }),

  // ── Auto-match vouchers to bank entries by amount + date ───────────────────
  autoMatch: adminProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .mutation(async ({ input, ctx }) => {
      const pool = await getDb();
      const conn = await pool.getConnection();
      try {
        // Get unreconciled vouchers for the date
        const [vouchers] = await conn.execute<any[]>(
          `SELECT * FROM cash_deposit_vouchers
           WHERE voucher_date = ? AND status IN ('finalised','deposited') AND bank_transaction_id IS NULL`,
          [input.date]
        );
        if (vouchers.length === 0) return { matched: 0, message: "No unreconciled vouchers for this date." };

        let matched = 0;
        const reconciledBy = ctx.user?.name ?? ctx.user?.openId ?? "manager";

        for (const voucher of vouchers) {
          const depositAmt = Number(voucher.deposit_amount);
          // Look for a bank cash deposit transaction within ±₹1 and ±1 day
          const [bankRows] = await conn.execute<any[]>(
            `SELECT id FROM bank_transactions
             WHERE ABS(amount - ?) < 1
               AND transactionDate BETWEEN DATE_SUB(?, INTERVAL 1 DAY) AND DATE_ADD(?, INTERVAL 1 DAY)
               AND transactionType IN ('Cash Deposit', 'Deposit', 'CR')
               AND reconciliationStatus != 'Reconciled'
             ORDER BY ABS(DATEDIFF(transactionDate, ?)) ASC
             LIMIT 1`,
            [depositAmt, input.date, input.date, input.date]
          );
          if (bankRows[0]) {
            await conn.execute(
              `UPDATE cash_deposit_vouchers
               SET bank_transaction_id = ?, status = 'reconciled', reconciledAt = NOW(), reconciled_by = ?
               WHERE id = ?`,
              [bankRows[0].id, reconciledBy, voucher.id]
            );
            await conn.execute(
              `UPDATE bank_transactions SET reconciliationStatus = 'Reconciled' WHERE id = ?`,
              [bankRows[0].id]
            );
            matched++;
          }
        }
        return { matched, message: matched > 0 ? `${matched} voucher(s) matched to bank entries.` : "No matching bank entries found. Manual matching required." };
      } finally {
        conn.release();
        await pool.end();
      }
    }),

  // ── Get unreconciled vouchers (for Bank Statement page) ────────────────────
  getUnreconciledVouchers: protectedProcedure
    .query(async () => {
      const pool = await getDb();
      const conn = await pool.getConnection();
      try {
        const [rows] = await conn.execute<any[]>(
          `SELECT * FROM cash_deposit_vouchers
           WHERE status IN ('finalised','deposited') AND bank_transaction_id IS NULL
           ORDER BY voucher_date DESC`
        );
        return rows.map((v: any) => ({
          id: v.id,
          voucherNumber: v.voucher_number,
          voucherDate: v.voucher_date,
          depositAmount: Number(v.deposit_amount),
          status: v.status,
          bankAccount: v.bank_account,
          generatedBy: v.generated_by,
          createdAt: v.createdAt,
        }));
      } finally {
        conn.release();
        await pool.end();
      }
    }),

  // ── Auto-match: automatically confirm all nozzles if net cash is zero or based on recorded values ─
  autoMatchNozzles: operationalProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .mutation(async ({ input, ctx }) => {
      const pool = await getDb();
      const conn = await pool.getConnection();
      try {
        // Get all active nozzles
        const [nozzles] = await conn.execute<any[]>(
          `SELECT id FROM nozzles WHERE is_active = 1`
        );

        // Get cash sales per nozzle for the date
        const [cashSales] = await conn.execute<any[]>(
          `SELECT cc.nozzle_id, SUM(cc.amount) as cashTotal
           FROM cash_collections cc
           JOIN shift_sessions ss ON ss.id = cc.session_id
           WHERE ss.shift_date = ? AND cc.payment_mode = 'cash' AND cc.nozzle_id IS NOT NULL
           GROUP BY cc.nozzle_id`,
          [input.date]
        );
        const cashSalesMap: Record<number, number> = {};
        for (const row of cashSales) {
          cashSalesMap[row.nozzle_id] = Number(row.cashTotal ?? 0);
        }

        // Get cash expenses per nozzle
        const [cashExpenses] = await conn.execute<any[]>(
          `SELECT nozzle_id, SUM(amount) as expTotal
           FROM expenses
           WHERE expenseDate = ? AND payment_source = 'cash_nozzle' AND nozzle_id IS NOT NULL
           GROUP BY nozzle_id`,
          [input.date]
        );
        const cashExpMap: Record<number, number> = {};
        for (const row of cashExpenses) {
          cashExpMap[row.nozzle_id] = Number(row.expTotal ?? 0);
        }

        const confirmedBy = ctx.user?.name ?? ctx.user?.openId ?? "manager";
        let matchCount = 0;

        for (const n of nozzles) {
          const cashCollected = cashSalesMap[n.id] ?? 0;
          const cashExpenses = cashExpMap[n.id] ?? 0;
          const netCash = cashCollected - cashExpenses;

          // Only auto-match if there's actual activity or we want to zero out pending ones
          await conn.execute(
            `INSERT INTO cash_handover_sessions
               (handover_date, nozzle_id, cash_collected, cash_expenses, net_cash, actual_amount, variance, confirmedAt, confirmed_by, notes)
             VALUES (?, ?, ?, ?, ?, ?, 0, NOW(), ?, 'Auto-matched')
             ON DUPLICATE KEY UPDATE
               cash_collected = VALUES(cash_collected),
               cash_expenses = VALUES(cash_expenses),
               net_cash = VALUES(net_cash),
               actual_amount = VALUES(actual_amount),
               variance = 0,
               confirmedAt = NOW(),
               confirmed_by = VALUES(confirmed_by),
               notes = VALUES(notes)`,
            [input.date, n.id, cashCollected, cashExpenses, netCash, netCash, confirmedBy]
          );
          matchCount++;
        }

        return { success: true, message: `Auto-matched ${matchCount} nozzles for ${input.date}` };
      } finally {
        conn.release();
        await pool.end();
      }
    }),
});
