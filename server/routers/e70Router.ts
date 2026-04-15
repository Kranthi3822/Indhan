/**
 * tRPC procedures for E70 (Pre-Shift Quality Testing) Module.
 * Workflow: Draw 5L per nozzle → test quality → return to tank → record result
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { logAudit } from "./auditLogRouter";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const e70Router = router({
  // ── List E70 tests ────────────────────────────────────────────────────────
  list: protectedProcedure
    .input(z.object({
      startDate: z.string().regex(dateRegex).optional(),
      endDate: z.string().regex(dateRegex).optional(),
      nozzleId: z.number().int().positive().optional(),
      result: z.enum(["pass", "fail", "all"]).default("all"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { startDate, endDate, nozzleId, result } = input;
      const rows = await db.execute(sql`
        SELECT * FROM e70_tests
        WHERE 1=1
          ${startDate ? sql`AND testDate >= ${startDate}` : sql``}
          ${endDate ? sql`AND testDate <= ${endDate}` : sql``}
          ${nozzleId ? sql`AND nozzleId = ${nozzleId}` : sql``}
          ${result !== "all" ? sql`AND testResult = ${result}` : sql``}
        ORDER BY testDate DESC, createdAt DESC
        LIMIT 500
      `);
      return (rows as unknown as any[][])[0] ?? [];
    }),

  // ── Get summary stats ─────────────────────────────────────────────────────
  getSummary: protectedProcedure
    .input(z.object({
      startDate: z.string().regex(dateRegex).optional(),
      endDate: z.string().regex(dateRegex).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return {};
      const rows = await db.execute(sql`
        SELECT
          COUNT(*) AS totalTests,
          SUM(CASE WHEN testResult = 'pass' THEN 1 ELSE 0 END) AS passed,
          SUM(CASE WHEN testResult = 'fail' THEN 1 ELSE 0 END) AS failed,
          SUM(COALESCE(drawnQty, 5)) AS totalDrawn,
          SUM(COALESCE(returnedQty, 0)) AS totalReturned,
          SUM(COALESCE(drawnQty, 5) - COALESCE(returnedQty, 0)) AS netLoss,
          SUM(CASE WHEN fuelType = 'petrol' THEN COALESCE(drawnQty, 5) - COALESCE(returnedQty, 0) ELSE 0 END) AS petrolLoss,
          SUM(CASE WHEN fuelType = 'diesel' THEN COALESCE(drawnQty, 5) - COALESCE(returnedQty, 0) ELSE 0 END) AS dieselLoss
        FROM e70_tests
        WHERE 1=1
          ${input.startDate ? sql`AND testDate >= ${input.startDate}` : sql``}
          ${input.endDate ? sql`AND testDate <= ${input.endDate}` : sql``}
      `);
      return ((rows as unknown as any[][])[0] ?? [])[0] ?? {};
    }),

  // ── Record a new E70 test ─────────────────────────────────────────────────
  record: protectedProcedure
    .input(z.object({
      testDate: z.string().regex(dateRegex),
      nozzleId: z.number().int().positive(),
      nozzleLabel: z.string().max(64).optional(),
      fuelType: z.enum(["petrol", "diesel"]),
      pumpId: z.number().int().positive().optional(),
      pumpLabel: z.string().max(64).optional(),
      // Meter readings
      meterReadingBefore: z.number().optional(),
      meterReadingAfter: z.number().optional(),
      // Quantities
      drawnQty: z.number().positive().default(5),
      returnedQty: z.number().min(0).optional(),
      // Quality checks
      colourCheck: z.enum(["clear", "yellow", "amber", "contaminated"]).optional(),
      colourPass: z.boolean().optional(),
      densityReading: z.number().optional(),
      densityPass: z.boolean().optional(),
      waterContent: z.boolean().optional(),
      flashPoint: z.number().optional(),
      flashPointPass: z.boolean().optional(),
      // Result
      testResult: z.enum(["pass", "fail"]),
      remarks: z.string().max(2000).optional(),
      testedByName: z.string().max(255).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const result = await db.execute(sql`
        INSERT INTO e70_tests (
          testDate, nozzleId, nozzleLabel, fuelType, pumpId, pumpLabel,
          meterReadingBefore, meterReadingAfter,
          drawnQty, returnedQty,
          colourCheck, colourPass, densityReading, densityPass,
          waterContent, flashPoint, flashPointPass,
          testResult, remarks, testedBy, testedByName
        ) VALUES (
          ${input.testDate}, ${input.nozzleId}, ${input.nozzleLabel ?? null},
          ${input.fuelType}, ${input.pumpId ?? null}, ${input.pumpLabel ?? null},
          ${input.meterReadingBefore ?? null}, ${input.meterReadingAfter ?? null},
          ${input.drawnQty}, ${input.returnedQty ?? null},
          ${input.colourCheck ?? null},
          ${input.colourPass != null ? (input.colourPass ? 1 : 0) : null},
          ${input.densityReading ?? null},
          ${input.densityPass != null ? (input.densityPass ? 1 : 0) : null},
          ${input.waterContent != null ? (input.waterContent ? 1 : 0) : null},
          ${input.flashPoint ?? null},
          ${input.flashPointPass != null ? (input.flashPointPass ? 1 : 0) : null},
          ${input.testResult},
          ${input.remarks ?? null},
          ${ctx.user?.id ?? null},
          ${input.testedByName ?? ctx.user?.name ?? null}
        )
      `);
      const insertId = (result as unknown as any).insertId ?? (result as unknown as any[])[0]?.insertId ?? 0;

      await logAudit({
        userId: ctx.user?.id ?? 0,
        userName: ctx.user?.name ?? "Unknown",
        userRole: ctx.user?.role ?? "user",
        action: "create",
        module: "e70_testing",
        resourceId: String(insertId),
        details: JSON.stringify({
          testDate: input.testDate,
          nozzleLabel: input.nozzleLabel,
          fuelType: input.fuelType,
          testResult: input.testResult,
          drawnQty: input.drawnQty,
          returnedQty: input.returnedQty,
        }),
      });
      return { success: true, id: insertId };
    }),

  // ── Bulk import from Excel data ───────────────────────────────────────────
  bulkImport: protectedProcedure
    .input(z.object({
      records: z.array(z.object({
        testDate: z.string().regex(dateRegex),
        nozzleId: z.number().int().positive(),
        nozzleLabel: z.string().max(64).optional(),
        fuelType: z.enum(["petrol", "diesel"]),
        drawnQty: z.number().positive().default(5),
        returnedQty: z.number().min(0).optional(),
        meterReadingBefore: z.number().optional(),
        meterReadingAfter: z.number().optional(),
        testResult: z.enum(["pass", "fail"]).default("pass"),
        remarks: z.string().max(2000).optional(),
      })).max(1000),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      let inserted = 0;
      let skipped = 0;

      for (const rec of input.records) {
        // Check for duplicate (same date + nozzle)
        const existing = await db.execute(sql`
          SELECT id FROM e70_tests WHERE testDate = ${rec.testDate} AND nozzleId = ${rec.nozzleId} LIMIT 1
        `);
        const arr = (existing as unknown as any[][])[0] ?? [];
        if (arr.length > 0) { skipped++; continue; }

        await db.execute(sql`
          INSERT INTO e70_tests (
            testDate, nozzleId, nozzleLabel, fuelType,
            drawnQty, returnedQty, meterReadingBefore, meterReadingAfter,
            testResult, remarks, testedBy, testedByName
          ) VALUES (
            ${rec.testDate}, ${rec.nozzleId}, ${rec.nozzleLabel ?? null}, ${rec.fuelType},
            ${rec.drawnQty}, ${rec.returnedQty ?? null},
            ${rec.meterReadingBefore ?? null}, ${rec.meterReadingAfter ?? null},
            ${rec.testResult}, ${rec.remarks ?? null},
            ${ctx.user?.id ?? null}, ${ctx.user?.name ?? null}
          )
        `);
        inserted++;
      }

      await logAudit({
        userId: ctx.user?.id ?? 0,
        userName: ctx.user?.name ?? "Unknown",
        userRole: ctx.user?.role ?? "user",
        action: "create",
        module: "e70_testing",
        resourceId: "bulk_import",
        details: JSON.stringify({ inserted, skipped, total: input.records.length }),
      });
      return { success: true, inserted, skipped };
    }),

  // ── Delete a test record ──────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.execute(sql`DELETE FROM e70_tests WHERE id = ${input.id}`);
      await logAudit({
        userId: ctx.user?.id ?? 0,
        userName: ctx.user?.name ?? "Unknown",
        userRole: ctx.user?.role ?? "user",
        action: "delete",
        module: "e70_testing",
        resourceId: String(input.id),
        details: "{}",
      });
      return { success: true };
    }),
});
