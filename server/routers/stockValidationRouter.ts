/**
 * stockValidationRouter.ts
 *
 * Automatically flags daily_reports rows where:
 *   ABS(openingStock - salesQty - closingStock) > tolerance
 *
 * Also supports auto-correcting closing stock to (opening - sold) for a given date.
 */

import { z } from "zod";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { protectedProcedure, router } from "../_core/trpc";

const TOLERANCE_LITRES = 5; // litres — differences below this are rounding noise

let _db: ReturnType<typeof drizzle> | null = null;
async function getDb() {
  if (!_db) {
    const pool = mysql.createPool(process.env.DATABASE_URL!);
    _db = drizzle(pool) as any;
  }
  return _db as ReturnType<typeof drizzle>;
}

export interface StockInconsistency {
  date: string;
  fuelType: "petrol" | "diesel";
  openingStock: number;
  salesQty: number;
  closingStock: number;
  expectedClosing: number;
  variance: number;
  /** positive = closing recorded too high (possible purchase not accounted), negative = closing recorded too low */
  direction: "over" | "under";
}

export async function getStockInconsistencies(
  startDate?: string,
  endDate?: string
): Promise<StockInconsistency[]> {
  const db = await getDb();
  const dateFilter =
    startDate && endDate
      ? sql`AND reportDate >= ${startDate} AND reportDate <= ${endDate}`
      : sql``;

  const rows = (await db.execute(sql`
    SELECT * FROM (
      SELECT
        DATE(reportDate) AS rdate,
        CAST(openingStockPetrol AS DECIMAL(12,2)) AS openP,
        CAST(petrolSalesQty    AS DECIMAL(12,2)) AS soldP,
        CAST(closingStockPetrol AS DECIMAL(12,2)) AS closeP,
        ROUND(openingStockPetrol - petrolSalesQty, 2) AS expectedP,
        ROUND(openingStockPetrol - petrolSalesQty - closingStockPetrol, 2) AS rawVarP,
        CAST(openingStockDiesel AS DECIMAL(12,2)) AS openD,
        CAST(dieselSalesQty    AS DECIMAL(12,2)) AS soldD,
        CAST(closingStockDiesel AS DECIMAL(12,2)) AS closeD,
        ROUND(openingStockDiesel - dieselSalesQty, 2) AS expectedD,
        ROUND(openingStockDiesel - dieselSalesQty - closingStockDiesel, 2) AS rawVarD
      FROM daily_reports
      WHERE 1=1 ${dateFilter}
    ) t
    WHERE ABS(rawVarP) > ${TOLERANCE_LITRES} OR ABS(rawVarD) > ${TOLERANCE_LITRES}
    ORDER BY rdate DESC
  `)) as any;

  const data = (rows[0] as any[]) ?? [];
  const result: StockInconsistency[] = [];

  for (const r of data) {
    const date = String(r.rdate).slice(0, 10);
    const varP = Number(r.rawVarP);
    const varD = Number(r.rawVarD);

    if (Math.abs(varP) > TOLERANCE_LITRES) {
      result.push({
        date,
        fuelType: "petrol",
        openingStock: Number(r.openP),
        salesQty: Number(r.soldP),
        closingStock: Number(r.closeP),
        expectedClosing: Number(r.expectedP),
        variance: Math.abs(varP),
        direction: varP > 0 ? "under" : "over",
      });
    }
    if (Math.abs(varD) > TOLERANCE_LITRES) {
      result.push({
        date,
        fuelType: "diesel",
        openingStock: Number(r.openD),
        salesQty: Number(r.soldD),
        closingStock: Number(r.closeD),
        expectedClosing: Number(r.expectedD),
        variance: Math.abs(varD),
        direction: varD > 0 ? "under" : "over",
      });
    }
  }

  return result;
}

export const stockValidationRouter = router({
  /** Return all flagged inconsistencies, optionally filtered by date range */
  getInconsistencies: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return getStockInconsistencies(input.startDate, input.endDate);
    }),

  /** Return just the count — used by Dashboard alert badge */
  getCount: protectedProcedure.query(async () => {
    const rows = await getStockInconsistencies();
    return { count: rows.length };
  }),

  /** Auto-correct closing stock to (opening - sold) for a specific date + fuel type */
  fixInconsistency: protectedProcedure
    .input(
      z.object({
        date: z.string(), // YYYY-MM-DD
        fuelType: z.enum(["petrol", "diesel"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (input.fuelType === "diesel") {
        await db.execute(sql`
          UPDATE daily_reports
          SET closingStockDiesel = ROUND(openingStockDiesel - dieselSalesQty, 2)
          WHERE DATE(reportDate) = ${input.date}
        `);
      } else {
        await db.execute(sql`
          UPDATE daily_reports
          SET closingStockPetrol = ROUND(openingStockPetrol - petrolSalesQty, 2)
          WHERE DATE(reportDate) = ${input.date}
        `);
      }
      return { success: true };
    }),

  /** Fix ALL inconsistencies at once — use with caution */
  fixAll: protectedProcedure
    .input(z.object({ fuelType: z.enum(["petrol", "diesel", "both"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      let fixedCount = 0;

      if (input.fuelType === "diesel" || input.fuelType === "both") {
        const result = await db.execute(sql`
          UPDATE daily_reports
          SET closingStockDiesel = ROUND(openingStockDiesel - dieselSalesQty, 2)
          WHERE ABS(openingStockDiesel - dieselSalesQty - closingStockDiesel) > ${TOLERANCE_LITRES}
        `) as any;
        fixedCount += Number((result[0] as any)?.affectedRows ?? 0);
      }

      if (input.fuelType === "petrol" || input.fuelType === "both") {
        const result = await db.execute(sql`
          UPDATE daily_reports
          SET closingStockPetrol = ROUND(openingStockPetrol - petrolSalesQty, 2)
          WHERE ABS(openingStockPetrol - petrolSalesQty - closingStockPetrol) > ${TOLERANCE_LITRES}
        `) as any;
        fixedCount += Number((result[0] as any)?.affectedRows ?? 0);
      }

      return { success: true, fixedCount };
    }),
});
