/**
 * tRPC procedures for Fuel Delivery Quality Check workflow.
 * Steps: Log Tanker → Quality Check → Approve/Reject → Confirm Unload
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { logAudit } from "./auditLogRouter";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const fuelDeliveryRouter = router({
  // ── List deliveries ──────────────────────────────────────────────────────
  list: protectedProcedure
    .input(z.object({
      startDate: z.string().regex(dateRegex).optional(),
      endDate: z.string().regex(dateRegex).optional(),
      status: z.enum(["pending_qc", "qc_passed", "qc_failed", "unloaded", "rejected", "all"]).default("all"),
      fuelType: z.enum(["petrol", "diesel", "lubricant", "all"]).default("all"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { startDate, endDate, status, fuelType } = input;
      const rows = await db.execute(sql`
        SELECT fd.*,
               fdqc.id AS qcId,
               fdqc.overallResult AS qcResult,
               fdqc.decision AS qcDecision,
               fdqc.checkedByName AS qcCheckedBy,
               fdqc.checkedAt AS qcCheckedAt,
               fdqc.densityReading,
               fdqc.colourCheck,
               fdqc.waterContamination,
               fdqc.sealIntact,
               fdqc.documentMatch,
               fdqc.dipstickReading,
               fdqc.remarks AS qcRemarks,
               fdqc.decisionRemarks
        FROM fuel_deliveries fd
        LEFT JOIN fuel_delivery_quality_checks fdqc ON fdqc.deliveryId = fd.id
        WHERE 1=1
          ${startDate ? sql`AND fd.deliveryDate >= ${startDate}` : sql``}
          ${endDate ? sql`AND fd.deliveryDate <= ${endDate}` : sql``}
          ${status !== "all" ? sql`AND fd.status = ${status}` : sql``}
          ${fuelType !== "all" ? sql`AND fd.fuelType = ${fuelType}` : sql``}
        ORDER BY fd.deliveryDate DESC, fd.createdAt DESC
        LIMIT 200
      `);
      return (rows as unknown as any[][])[0] ?? [];
    }),

  // ── Get single delivery ───────────────────────────────────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.execute(sql`
        SELECT fd.*,
               fdqc.id AS qcId,
               fdqc.overallResult AS qcResult,
               fdqc.decision AS qcDecision,
               fdqc.checkedByName,
               fdqc.checkedAt,
               fdqc.densityReading,
               fdqc.colourCheck,
               fdqc.colourPass,
               fdqc.waterContamination,
               fdqc.sedimentCheck,
               fdqc.sealIntact,
               fdqc.documentMatch,
               fdqc.dipstickReading,
               fdqc.remarks AS qcRemarks,
               fdqc.decisionRemarks,
               fdqc.densityPass
        FROM fuel_deliveries fd
        LEFT JOIN fuel_delivery_quality_checks fdqc ON fdqc.deliveryId = fd.id
        WHERE fd.id = ${input.id}
        LIMIT 1
      `);
      const arr = (rows as unknown as any[][])[0] ?? [];
      return arr[0] ?? null;
    }),

  // ── Step 1: Log tanker arrival ────────────────────────────────────────────
  logDelivery: protectedProcedure
    .input(z.object({
      deliveryDate: z.string().regex(dateRegex),
      deliveryTime: z.string().optional(),
      invoiceNumber: z.string().max(128).optional(),
      supplierName: z.string().max(255).optional(),
      vehicleNumber: z.string().max(32).optional(),
      driverName: z.string().max(255).optional(),
      fuelType: z.enum(["petrol", "diesel", "lubricant"]),
      orderedQty: z.number().positive().optional(),
      deliveredQty: z.number().positive().optional(),
      invoiceRate: z.number().positive().optional(),
      invoiceAmount: z.number().positive().optional(),
      notes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const result = await db.execute(sql`
        INSERT INTO fuel_deliveries (
          deliveryDate, deliveryTime, invoiceNumber, supplierName,
          vehicleNumber, driverName, fuelType, orderedQty, deliveredQty,
          invoiceRate, invoiceAmount, status, loggedBy, loggedByName, notes
        ) VALUES (
          ${input.deliveryDate}, ${input.deliveryTime ?? null}, ${input.invoiceNumber ?? null},
          ${input.supplierName ?? null}, ${input.vehicleNumber ?? null}, ${input.driverName ?? null},
          ${input.fuelType}, ${input.orderedQty ?? null}, ${input.deliveredQty ?? null},
          ${input.invoiceRate ?? null}, ${input.invoiceAmount ?? null},
          'pending_qc', ${ctx.user?.id ?? null}, ${ctx.user?.name ?? null}, ${input.notes ?? null}
        )
      `);
      const insertId = (result as unknown as any).insertId ?? (result as unknown as any[])[0]?.insertId ?? 0;
      await logAudit({
        userId: ctx.user?.id ?? 0,
        userName: ctx.user?.name ?? "Unknown",
        userRole: ctx.user?.role ?? "user",
        action: "create",
        module: "fuel_delivery",
        resourceId: String(insertId),
        details: JSON.stringify({ fuelType: input.fuelType, deliveryDate: input.deliveryDate, deliveredQty: input.deliveredQty }),
      });
      return { success: true, id: insertId };
    }),

  // ── Step 2: Record quality check ─────────────────────────────────────────
  recordQualityCheck: protectedProcedure
    .input(z.object({
      deliveryId: z.number().int().positive(),
      densityReading: z.number().optional(),
      densityPass: z.boolean().optional(),
      colourCheck: z.enum(["clear", "yellow", "amber", "contaminated"]).optional(),
      colourPass: z.boolean().optional(),
      waterContamination: z.boolean().optional(),
      sedimentCheck: z.boolean().optional(),
      sealIntact: z.boolean().optional(),
      documentMatch: z.boolean().optional(),
      dipstickReading: z.number().optional(),
      overallResult: z.enum(["pass", "fail", "conditional"]),
      remarks: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const existing = await db.execute(sql`SELECT id FROM fuel_delivery_quality_checks WHERE deliveryId = ${input.deliveryId} LIMIT 1`);
      const arr = (existing as unknown as any[][])[0] ?? [];

      if (arr.length > 0) {
        await db.execute(sql`
          UPDATE fuel_delivery_quality_checks SET
            checkedBy = ${ctx.user?.id ?? null},
            checkedByName = ${ctx.user?.name ?? null},
            densityReading = ${input.densityReading ?? null},
            densityPass = ${input.densityPass != null ? (input.densityPass ? 1 : 0) : null},
            colourCheck = ${input.colourCheck ?? null},
            colourPass = ${input.colourPass != null ? (input.colourPass ? 1 : 0) : null},
            waterContamination = ${input.waterContamination != null ? (input.waterContamination ? 1 : 0) : null},
            sedimentCheck = ${input.sedimentCheck != null ? (input.sedimentCheck ? 1 : 0) : null},
            sealIntact = ${input.sealIntact != null ? (input.sealIntact ? 1 : 0) : null},
            documentMatch = ${input.documentMatch != null ? (input.documentMatch ? 1 : 0) : null},
            dipstickReading = ${input.dipstickReading ?? null},
            overallResult = ${input.overallResult},
            remarks = ${input.remarks ?? null},
            checkedAt = NOW()
          WHERE deliveryId = ${input.deliveryId}
        `);
      } else {
        await db.execute(sql`
          INSERT INTO fuel_delivery_quality_checks (
            deliveryId, checkedBy, checkedByName, densityReading, densityPass,
            colourCheck, colourPass, waterContamination, sedimentCheck,
            sealIntact, documentMatch, dipstickReading, overallResult, remarks, decision
          ) VALUES (
            ${input.deliveryId}, ${ctx.user?.id ?? null}, ${ctx.user?.name ?? null},
            ${input.densityReading ?? null},
            ${input.densityPass != null ? (input.densityPass ? 1 : 0) : null},
            ${input.colourCheck ?? null},
            ${input.colourPass != null ? (input.colourPass ? 1 : 0) : null},
            ${input.waterContamination != null ? (input.waterContamination ? 1 : 0) : null},
            ${input.sedimentCheck != null ? (input.sedimentCheck ? 1 : 0) : null},
            ${input.sealIntact != null ? (input.sealIntact ? 1 : 0) : null},
            ${input.documentMatch != null ? (input.documentMatch ? 1 : 0) : null},
            ${input.dipstickReading ?? null},
            ${input.overallResult}, ${input.remarks ?? null}, 'pending'
          )
        `);
      }

      const newStatus = input.overallResult === "pass" || input.overallResult === "conditional" ? "qc_passed" : "qc_failed";
      await db.execute(sql`UPDATE fuel_deliveries SET status = ${newStatus} WHERE id = ${input.deliveryId}`);

      await logAudit({
        userId: ctx.user?.id ?? 0,
        userName: ctx.user?.name ?? "Unknown",
        userRole: ctx.user?.role ?? "user",
        action: "update",
        module: "fuel_delivery",
        resourceId: String(input.deliveryId),
        details: JSON.stringify({ step: "quality_check", overallResult: input.overallResult }),
      });
      return { success: true, newStatus };
    }),

  // ── Step 3: Incharge decision — approve unload or reject tanker ───────────
  makeDecision: protectedProcedure
    .input(z.object({
      deliveryId: z.number().int().positive(),
      decision: z.enum(["approve_unload", "reject_tanker"]),
      unloadedQty: z.number().positive().optional(),
      decisionRemarks: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.execute(sql`
        UPDATE fuel_delivery_quality_checks SET
          decision = ${input.decision},
          decisionAt = NOW(),
          decisionRemarks = ${input.decisionRemarks ?? null}
        WHERE deliveryId = ${input.deliveryId}
      `);

      const newStatus = input.decision === "approve_unload" ? "unloaded" : "rejected";
      await db.execute(sql`
        UPDATE fuel_deliveries SET
          status = ${newStatus},
          unloadedQty = ${input.unloadedQty ?? null}
        WHERE id = ${input.deliveryId}
      `);

      await logAudit({
        userId: ctx.user?.id ?? 0,
        userName: ctx.user?.name ?? "Unknown",
        userRole: ctx.user?.role ?? "user",
        action: input.decision === "approve_unload" ? "approve" : "reject",
        module: "fuel_delivery",
        resourceId: String(input.deliveryId),
        details: JSON.stringify({ decision: input.decision, unloadedQty: input.unloadedQty }),
      });
      return { success: true, newStatus };
    }),

  // ── Stats summary ─────────────────────────────────────────────────────────
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
          COUNT(*) AS totalDeliveries,
          SUM(CASE WHEN status = 'unloaded' THEN 1 ELSE 0 END) AS unloaded,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
          SUM(CASE WHEN status = 'pending_qc' THEN 1 ELSE 0 END) AS pendingQc,
          SUM(CASE WHEN fuelType = 'petrol' AND status = 'unloaded' THEN COALESCE(unloadedQty, deliveredQty) ELSE 0 END) AS petrolUnloaded,
          SUM(CASE WHEN fuelType = 'diesel' AND status = 'unloaded' THEN COALESCE(unloadedQty, deliveredQty) ELSE 0 END) AS dieselUnloaded,
          SUM(CASE WHEN status = 'unloaded' THEN COALESCE(invoiceAmount, 0) ELSE 0 END) AS totalValue
        FROM fuel_deliveries
        WHERE 1=1
          ${input.startDate ? sql`AND deliveryDate >= ${input.startDate}` : sql``}
          ${input.endDate ? sql`AND deliveryDate <= ${input.endDate}` : sql``}
      `);
      return ((rows as unknown as any[][])[0] ?? [])[0] ?? {};
    }),
});
