/**
 * fuelIntelligenceRouter.ts
 * tRPC procedures for dynamic fuel margins, dip readings, and evaporation
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getFuelIntelligence,
  getDipReadings,
  upsertDipReading,
  getFuelConfigs,
  updateFuelConfig,
} from "../db-fuel-intelligence";

export const fuelIntelligenceRouter = router({
  // ─── Get full fuel intelligence for a date range ──────────────────────────
  getIntelligence: protectedProcedure
    .input(z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }))
    .query(async ({ input }) => {
      return getFuelIntelligence(input.startDate, input.endDate);
    }),

  // ─── Get dip readings (latest N, optionally filtered by fuel type) ────────
  getDipReadings: protectedProcedure
    .input(z.object({
      fuelType: z.enum(["petrol", "diesel"]).optional(),
      limit: z.number().min(1).max(365).default(30),
    }))
    .query(async ({ input }) => {
      return getDipReadings(input.fuelType, input.limit);
    }),

  // ─── Save / update a dip reading ─────────────────────────────────────────
  saveDipReading: protectedProcedure
    .input(z.object({
      readingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      fuelType: z.enum(["petrol", "diesel"]),
      tankId: z.string().default("T1"),
      dipLitres: z.number().min(0).max(50000),
      dipStickReading: z.number().optional().nullable(), // raw dip stick number (unitless)
      readingTime: z.string().optional(),
      recordedBy: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return upsertDipReading({
        ...input,
        recordedBy: input.recordedBy ?? ctx.user?.name ?? "Admin",
      });
    }),

  // ─── Get fuel config (retail prices, cost prices, evaporation rates) ─────
  getFuelConfig: protectedProcedure
    .query(async () => {
      return getFuelConfigs();
    }),

  // ─── Update fuel config ───────────────────────────────────────────────────
  updateFuelConfig: protectedProcedure
    .input(z.object({
      fuelType: z.enum(["petrol", "diesel", "lubricant"]),
      retailPrice: z.number().min(0).max(500).optional(),
      latestCostPrice: z.number().min(0).max(500).optional(),
      evaporationRatePct: z.number().min(0).max(5).optional(),  // max 5% per day
      tankCapacityLitres: z.number().min(0).max(100000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return updateFuelConfig({
        ...input,
        updatedBy: ctx.user?.name ?? "Admin",
      });
    }),
});
