/**
 * nozzleRouter.ts — tRPC procedures for Nozzle Sales & Cash Collection module
 * Integrated with daily_reports: closing a shift auto-populates the daily report.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  getAllPumpsWithNozzles,
  getAllNozzles,
  getOrCreateShiftSession,
  getShiftSession,
  getSessionsForDate,
  closeShiftSession,
  getReadingsForSession,
  upsertNozzleReading,
  getCollectionsForSession,
  addCashCollection,
  deleteCashCollection,
  getSessionSummary,
  computeDayReconciliation,
  getDayReconciliation,
  getRecentDayReconciliations,
  getEmployeesForNozzle,
  autoPopulateDailyReport,
  getPreviousClosingReadings,
} from "../db-nozzle";

const safeDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const nozzleRouter = router({
  // ── Configuration ──────────────────────────────────────────────────────────
  getPumpsWithNozzles: protectedProcedure.query(async () => {
    return getAllPumpsWithNozzles();
  }),

  getNozzles: protectedProcedure.query(async () => {
    return getAllNozzles();
  }),

  getStaffList: protectedProcedure.query(async () => {
    return getEmployeesForNozzle();
  }),

  /** Get the most recent closing meter reading for each nozzle before the given shift date.
   *  Used to display previous shift closing on the Opening Readings screen. */
  getPreviousClosingReadings: protectedProcedure
    .input(z.object({ shiftDate: safeDate }))
    .query(async ({ input }) => {
      return getPreviousClosingReadings(input.shiftDate);
    }),

  // ── Shift Sessions ─────────────────────────────────────────────────────────
  startShift: protectedProcedure
    .input(z.object({
      shiftDate: safeDate,
      employeeId: z.number().int().positive(),
      staffName: z.string().min(1).max(100),
      shiftLabel: z.enum(["morning", "evening", "full_day"]).default("full_day"),
    }))
    .mutation(async ({ input }) => {
      return getOrCreateShiftSession(
        input.shiftDate,
        input.employeeId,
        input.staffName,
        input.shiftLabel
      );
    }),

  getSession: protectedProcedure
    .input(z.object({ sessionId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const session = await getShiftSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      return session;
    }),

  getSessionsForDate: protectedProcedure
    .input(z.object({ shiftDate: safeDate }))
    .query(async ({ input }) => {
      return getSessionsForDate(input.shiftDate);
    }),

  closeShift: protectedProcedure
    .input(z.object({
      sessionId: z.number().int().positive(),
      notes: z.string().max(500).optional(),
    }))
    .mutation(async ({ input }) => {
      const session = await getShiftSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      if (session.status === "reconciled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Session already reconciled" });
      }
      const closed = await closeShiftSession(input.sessionId, input.notes);
      // Auto-populate daily_reports with aggregated nozzle data
      await autoPopulateDailyReport(session.shiftDate);
      return closed;
    }),

  // ── Nozzle Readings ────────────────────────────────────────────────────────
  getReadings: protectedProcedure
    .input(z.object({ sessionId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return getReadingsForSession(input.sessionId);
    }),

  saveReading: protectedProcedure
    .input(z.object({
      sessionId: z.number().int().positive(),
      nozzleId: z.number().int().positive(),
      readingType: z.enum(["opening", "closing"]),
      meterReading: z.number().min(0).max(9999999),
      testingQty: z.number().min(0).max(9999).optional(),
      recordedBy: z.string().max(100).optional(),
      notes: z.string().max(500).optional(),
    }))
    .mutation(async ({ input }) => {
      const session = await getShiftSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      if (session.status === "reconciled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot modify a reconciled session" });
      }
      return upsertNozzleReading({
        sessionId: input.sessionId,
        nozzleId: input.nozzleId,
        readingType: input.readingType,
        meterReading: input.meterReading,
        testingQty: input.testingQty,
        recordedBy: input.recordedBy,
        notes: input.notes,
      });
    }),

  // ── Cash Collections ───────────────────────────────────────────────────────
  getCollections: protectedProcedure
    .input(z.object({ sessionId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return getCollectionsForSession(input.sessionId);
    }),

  addCollection: protectedProcedure
    .input(z.object({
      sessionId: z.number().int().positive(),
      nozzleId: z.number().int().positive().optional(),
      amount: z.number().positive().max(10000000),
      paymentMode: z.enum(["cash", "digital", "credit"]),
      digitalSubType: z.enum(["upi", "phonepe", "card", "bank_transfer", "bhim"]).optional(),
      customerId: z.number().int().positive().optional(),
      customerName: z.string().max(255).optional(),
      notes: z.string().max(500).optional(),
      recordedBy: z.string().max(100).optional(),
    }))
    .mutation(async ({ input }) => {
      const session = await getShiftSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      if (session.status === "reconciled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot modify a reconciled session" });
      }
      return addCashCollection({
        sessionId: input.sessionId,
        nozzleId: input.nozzleId,
        amount: input.amount,
        paymentMode: input.paymentMode,
        digitalSubType: input.digitalSubType,
        customerId: input.customerId,
        customerName: input.customerName,
        notes: input.notes,
        recordedBy: input.recordedBy,
      });
    }),

  deleteCollection: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await deleteCashCollection(input.id);
      return { success: true };
    }),

  // ── Session Summary (live) ─────────────────────────────────────────────────
  getSessionSummary: protectedProcedure
    .input(z.object({ sessionId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return getSessionSummary(input.sessionId);
    }),

  // ── Day Reconciliation ─────────────────────────────────────────────────────
  computeDayReconciliation: protectedProcedure
    .input(z.object({ shiftDate: safeDate }))
    .mutation(async ({ input }) => {
      return computeDayReconciliation(input.shiftDate);
    }),

  getDayReconciliation: protectedProcedure
    .input(z.object({ shiftDate: safeDate }))
    .query(async ({ input }) => {
      return getDayReconciliation(input.shiftDate);
    }),

  getRecentReconciliations: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(90).default(30) }))
    .query(async ({ input }) => {
      return getRecentDayReconciliations(input.limit);
    }),

  // ── Daily Activity Report — live data from nozzle sessions ─────────────────
  // Returns a full daily activity summary for a given date, aggregated from
  // all nozzle sessions. No manual entry needed — data flows automatically.
  getDailyActivityReport: protectedProcedure
    .input(z.object({ reportDate: safeDate }))
    .query(async ({ input }) => {
      const sessions = await getSessionsForDate(input.reportDate);

      let totalPetrol = 0, totalDiesel = 0;
      let totalCash = 0, totalDigital = 0, totalCredit = 0;
      const digitalBreakdown: Record<string, number> = { upi: 0, phonepe: 0, card: 0, bank_transfer: 0, bhim: 0 };
      const sessionDetails: any[] = [];

      for (const session of sessions) {
        const summary = await getSessionSummary(session.id);
        totalPetrol  += summary.totalPetrolLitres;
        totalDiesel  += summary.totalDieselLitres;
        totalCash    += summary.totalCash;
        totalDigital += summary.totalDigital;
        totalCredit  += summary.totalCredit;
        // Merge digital breakdown
        for (const [k, v] of Object.entries(summary.digitalBreakdown ?? {})) {
          if (k in digitalBreakdown) digitalBreakdown[k] += v as number;
        }
        sessionDetails.push({
          sessionId: session.id,
          staffName: session.staffName,
          shiftLabel: session.shiftLabel,
          status: session.status,
          nozzleSummaries: summary.nozzleSummaries,
          totalCash: summary.totalCash,
          totalDigital: summary.totalDigital,
          totalCredit: summary.totalCredit,
          totalCollected: summary.totalCollected,
          totalPetrolLitres: summary.totalPetrolLitres,
          totalDieselLitres: summary.totalDieselLitres,
        });
      }

      const totalCollected = totalCash + totalDigital + totalCredit;

      return {
        reportDate: input.reportDate,
        sessions: sessionDetails,
        sessionCount: sessions.length,
        openSessions: sessions.filter(s => s.status === "open").length,
        closedSessions: sessions.filter(s => s.status === "closed").length,
        // Volumes
        totalPetrolLitres: totalPetrol,
        totalDieselLitres: totalDiesel,
        totalLitres: totalPetrol + totalDiesel,
        // Collections
        totalCash,
        totalDigital,
        digitalBreakdown,
        totalCredit,
        totalCollected,
        // Computed from stored daily_reports (populated by autoPopulateDailyReport)
        hasDailyReport: sessions.length > 0,
      };
    }),

  // ── Get recent daily activity reports (last N days) ─────────────────────────
  getRecentDailyActivity: protectedProcedure
    .input(z.object({ days: z.number().int().min(1).max(90).default(30) }))
    .query(async ({ input }) => {
      const results = [];
      const today = new Date();
      for (let i = 0; i < input.days; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const sessions = await getSessionsForDate(dateStr);
        if (sessions.length === 0) continue;
        let totalPetrol = 0, totalDiesel = 0, totalCollected = 0;
        for (const session of sessions) {
          const summary = await getSessionSummary(session.id);
          totalPetrol  += summary.totalPetrolLitres;
          totalDiesel  += summary.totalDieselLitres;
          totalCollected += summary.totalCollected;
        }
        results.push({ date: dateStr, totalPetrol, totalDiesel, totalCollected, sessionCount: sessions.length });
      }
      return results.reverse(); // chronological order
    }),

  // ── Nozzle data for Reconciliation page integration ────────────────────────
  getNozzleDataForDate: protectedProcedure
    .input(z.object({ shiftDate: safeDate }))
    .query(async ({ input }) => {
      const sessions = await getSessionsForDate(input.shiftDate);
      if (sessions.length === 0) return null;

      let totalPetrolLitres = 0;
      let totalDieselLitres = 0;
      let totalCash = 0;
      let totalCard = 0;
      let totalOnline = 0;
      let totalCredit = 0;
      const sessionSummaries = [];

      for (const session of sessions) {
        const summary = await getSessionSummary(session.id);
        totalPetrolLitres += summary.totalPetrolLitres;
        totalDieselLitres += summary.totalDieselLitres;
        totalCash    += summary.totalCash;
        totalCard    += summary.totalCard;
        totalOnline  += summary.totalOnline;
        totalCredit  += summary.totalCredit;
        sessionSummaries.push({
          sessionId: session.id,
          staffName: session.staffName,
          shiftLabel: session.shiftLabel,
          status: session.status,
          nozzleSummaries: summary.nozzleSummaries,
          totalCash: summary.totalCash,
          totalCard: summary.totalCard,
          totalOnline: summary.totalOnline,
          totalCredit: summary.totalCredit,
          totalCollected: summary.totalCollected,
          totalPetrolLitres: summary.totalPetrolLitres,
          totalDieselLitres: summary.totalDieselLitres,
          variance: summary.variance,
        });
      }

      const PETROL_PRICE = 103.41;
      const DIESEL_PRICE = 89.14;
      const expectedSalesValue = totalPetrolLitres * PETROL_PRICE + totalDieselLitres * DIESEL_PRICE;
      const totalCollected = totalCash + totalCard + totalOnline + totalCredit;

      return {
        shiftDate: input.shiftDate,
        sessions: sessionSummaries,
        totalPetrolLitres,
        totalDieselLitres,
        totalCash,
        totalCard,
        totalOnline,
        totalCredit,
        totalCollected,
        expectedSalesValue,
        variance: totalCollected - expectedSalesValue,
        hasOpenSessions: sessions.some(s => s.status === "open"),
      };
    }),

  // ── End of Day: close all open sessions + generate comprehensive daily report ──
  endOfDay: protectedProcedure
    .input(z.object({ shiftDate: safeDate }))
    .mutation(async ({ input }) => {
      const sessions = await getSessionsForDate(input.shiftDate);
      if (sessions.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No sessions found for this date" });
      }
      const closedSessionIds: number[] = [];
      for (const session of sessions) {
        if (session.status === "open") {
          await closeShiftSession(session.id, "Closed via End of Day");
          closedSessionIds.push(session.id);
        }
      }
      let totalPetrolLitres = 0, totalDieselLitres = 0;
      let totalCash = 0, totalDigital = 0, totalCredit = 0;
      const digitalBreakdown: Record<string, number> = { upi: 0, phonepe: 0, card: 0, bank_transfer: 0, bhim: 0 };
      const sessionReports: any[] = [];
      const validationWarnings: string[] = [];
      for (const session of sessions) {
        const summary = await getSessionSummary(session.id);
        totalPetrolLitres += summary.totalPetrolLitres;
        totalDieselLitres += summary.totalDieselLitres;
        totalCash     += summary.totalCash;
        totalDigital  += summary.totalDigital;
        totalCredit   += summary.totalCredit;
        for (const [k, v] of Object.entries(summary.digitalBreakdown ?? {})) {
          if (k in digitalBreakdown) digitalBreakdown[k] += v as number;
        }
        for (const ns of summary.nozzleSummaries) {
          if (ns.opening !== null && ns.closing !== null && ns.closing < ns.opening) {
            validationWarnings.push(`Nozzle ${ns.nozzleNumber ?? ns.nozzleId} (${ns.fuelType}): closing meter (${ns.closing}) < opening meter (${ns.opening})`);
          }
          if (ns.opening === null || ns.closing === null) {
            validationWarnings.push(`Nozzle ${ns.nozzleNumber ?? ns.nozzleId} (${ns.fuelType}): missing ${ns.opening === null ? "opening" : "closing"} meter reading`);
          }
        }
        if (summary.expectedSalesValue > 0) {
          const variancePct = Math.abs(summary.variance) / summary.expectedSalesValue * 100;
          if (variancePct > 5) {
            validationWarnings.push(`Session #${session.id} (${session.staffName}): collection variance ${variancePct.toFixed(1)}% — collected ₹${summary.totalCollected.toFixed(0)}, expected ₹${summary.expectedSalesValue.toFixed(0)}`);
          }
        }
        sessionReports.push({
          sessionId: session.id,
          staffName: session.staffName,
          shiftLabel: session.shiftLabel,
          status: "closed",
          nozzleSummaries: summary.nozzleSummaries,
          totalCash: summary.totalCash,
          totalDigital: summary.totalDigital,
          totalCredit: summary.totalCredit,
          totalCollected: summary.totalCollected,
          totalPetrolLitres: summary.totalPetrolLitres,
          totalDieselLitres: summary.totalDieselLitres,
          expectedSalesValue: summary.expectedSalesValue,
          variance: summary.variance,
        });
      }
      await autoPopulateDailyReport(input.shiftDate);
      const totalCollected = totalCash + totalDigital + totalCredit;
      const PETROL_PRICE = 103.41;
      const DIESEL_PRICE = 89.14;
      const expectedSalesValue = totalPetrolLitres * PETROL_PRICE + totalDieselLitres * DIESEL_PRICE;
      return {
        shiftDate: input.shiftDate,
        closedSessionIds,
        sessionCount: sessions.length,
        sessions: sessionReports,
        totalPetrolLitres,
        totalDieselLitres,
        totalLitres: totalPetrolLitres + totalDieselLitres,
        totalCash,
        totalDigital,
        digitalBreakdown,
        totalCredit,
        totalCollected,
        expectedSalesValue,
        variance: totalCollected - expectedSalesValue,
        validationWarnings,
        hasWarnings: validationWarnings.length > 0,
      };
    }),

  // ── Real-time validation for a session meter readings ──────────────────────
  getSessionValidation: protectedProcedure
    .input(z.object({ sessionId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const summary = await getSessionSummary(input.sessionId);
      const warnings: { nozzleId: number; nozzleNumber: number | null; fuelType: string | undefined; type: string; message: string }[] = [];
      for (const ns of summary.nozzleSummaries) {
        if (ns.opening !== null && ns.closing !== null && ns.closing < ns.opening) {
          warnings.push({
            nozzleId: ns.nozzleId,
            nozzleNumber: ns.nozzleNumber ?? null,
            fuelType: ns.fuelType,
            type: "meter_reversal",
            message: `Closing meter (${ns.closing.toLocaleString()}) is less than opening meter (${ns.opening.toLocaleString()})`,
          });
        }
        if (ns.opening !== null && ns.closing !== null && ns.soldQty !== null && ns.soldQty > 10000) {
          warnings.push({
            nozzleId: ns.nozzleId,
            nozzleNumber: ns.nozzleNumber ?? null,
            fuelType: ns.fuelType,
            type: "unusually_high_volume",
            message: `Unusually high dispensed volume: ${ns.soldQty.toFixed(1)} L — please verify`,
          });
        }
      }
      if (summary.expectedSalesValue > 0) {
        const variancePct = Math.abs(summary.variance) / summary.expectedSalesValue * 100;
        if (variancePct > 5) {
          warnings.push({
            nozzleId: 0,
            nozzleNumber: null,
            fuelType: undefined,
            type: "collection_variance",
            message: `Collection variance ${variancePct.toFixed(1)}%: collected ₹${summary.totalCollected.toFixed(0)} vs expected ₹${summary.expectedSalesValue.toFixed(0)}`,
          });
        }
      }
      return {
        sessionId: input.sessionId,
        warnings,
        hasWarnings: warnings.length > 0,
        totalPetrolLitres: summary.totalPetrolLitres,
        totalDieselLitres: summary.totalDieselLitres,
        totalCollected: summary.totalCollected,
        expectedSalesValue: summary.expectedSalesValue,
        variance: summary.variance,
      };
    }),

  // ── Incharge: list sessions pending approval ─────────────────────────────
  listPendingApproval: protectedProcedure
    .input(z.object({ shiftDate: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.execute(sql`
        SELECT
          ss.id, ss.shift_date AS shiftDate, ss.staff_name AS staffName,
          ss.shift_label AS shiftLabel, ss.status,
          ss.incharge_approval_status AS approvalStatus,
          ss.approved_by_name AS approvedByName,
          ss.approved_at AS approvedAt,
          ss.approval_remarks AS approvalRemarks,
          COUNT(nr.id) AS readingCount
        FROM shift_sessions ss
        LEFT JOIN nozzle_readings nr ON nr.session_id = ss.id
        WHERE ss.status = 'closed'
          AND ss.incharge_approval_status = 'pending_approval'
        GROUP BY ss.id
        ORDER BY ss.shift_date DESC, ss.id DESC
        LIMIT 100
      `);
      return (rows as unknown as any[][])[0] ?? [];
    }),

  // ── Incharge: get session readings for review ────────────────────────────
  getSessionForApproval: protectedProcedure
    .input(z.object({ sessionId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const sessionRows = await db.execute(sql`
        SELECT ss.* FROM shift_sessions ss WHERE ss.id = ${input.sessionId} LIMIT 1
      `);
      const session = ((sessionRows as unknown as any[][])[0] ?? [])[0];
      if (!session) return null;
      const readingRows = await db.execute(sql`
        SELECT nr.*, n.nozzle_number AS nozzleNumber, n.fuel_type AS fuelType,
               n.pump_id AS pumpId, p.pump_number AS pumpNumber
        FROM nozzle_readings nr
        LEFT JOIN nozzles n ON n.id = nr.nozzle_id
        LEFT JOIN pumps p ON p.id = n.pump_id
        WHERE nr.session_id = ${input.sessionId}
        ORDER BY nr.nozzle_id, nr.reading_type
      `);
      const readings = (readingRows as unknown as any[][])[0] ?? [];
      const collectionRows = await db.execute(sql`
        SELECT * FROM cash_collections WHERE session_id = ${input.sessionId} ORDER BY collection_time
      `);
      const collections = (collectionRows as unknown as any[][])[0] ?? [];
      return { session, readings, collections };
    }),

  // ── Incharge: approve or reject a session ────────────────────────────────
  approveSession: protectedProcedure
    .input(z.object({
      sessionId: z.number().int().positive(),
      decision: z.enum(["approved", "rejected"]),
      remarks: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.execute(sql`
        UPDATE shift_sessions SET
          incharge_approval_status = ${input.decision},
          approved_by = ${ctx.user?.id ?? null},
          approved_by_name = ${ctx.user?.name ?? null},
          approved_at = NOW(),
          approval_remarks = ${input.remarks ?? null}
        WHERE id = ${input.sessionId}
      `);
      await db.execute(sql`
        UPDATE nozzle_readings SET
          incharge_approval_status = ${input.decision},
          approved_by = ${ctx.user?.id ?? null},
          approved_by_name = ${ctx.user?.name ?? null},
          approved_at = NOW()
        WHERE session_id = ${input.sessionId} AND reading_type = 'closing'
      `);
      return { success: true, decision: input.decision };
    }),

  // ── Incharge: get approval history ──────────────────────────────────────
  getApprovalHistory: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      status: z.enum(["approved", "rejected", "pending_approval", "all"]).default("all"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.execute(sql`
        SELECT
          ss.id, ss.shift_date AS shiftDate, ss.staff_name AS staffName,
          ss.shift_label AS shiftLabel, ss.status,
          ss.incharge_approval_status AS approvalStatus,
          ss.approved_by_name AS approvedByName,
          ss.approved_at AS approvedAt,
          ss.approval_remarks AS approvalRemarks
        FROM shift_sessions ss
        WHERE 1=1
          ${input.startDate ? sql`AND ss.shift_date >= ${input.startDate}` : sql``}
          ${input.endDate ? sql`AND ss.shift_date <= ${input.endDate}` : sql``}
          ${input.status !== "all" ? sql`AND ss.incharge_approval_status = ${input.status}` : sql``}
        ORDER BY ss.shift_date DESC, ss.id DESC
        LIMIT 200
      `);
      return (rows as unknown as any[][])[0] ?? [];
    }),
});