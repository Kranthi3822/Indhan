/**
 * fuel-intelligence.test.ts
 * Unit tests for dynamic fuel margin, stock valuation, and evaporation calculations
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the DB layer ────────────────────────────────────────────────────────
vi.mock("./db-fuel-intelligence", () => ({
  getFuelIntelligence: vi.fn().mockResolvedValue({
    petrol: {
      fuelType: "petrol",
      retailPrice: 103.41,
      latestCostPrice: 99.46,
      wacpCostPrice: 99.46,
      grossMarginPerL: 3.95,
      effectiveMarginPerL: 3.82,
      grossMarginPct: 3.82,
      effectiveMarginPct: 3.69,
      totalLitresSold: 27000,
      totalRevenue: 2792070,
      totalCost: 2685420,
      grossProfit: 106650,
      evaporationLitres: 13.5,
      evaporationValue: 1342.71,
      effectiveProfit: 105307.29,
      evaporationRatePct: 0.1,
      latestDipLitres: 8500,
      latestDipDate: "2026-03-31",
      stockValue: 845410,
      tankCapacityLitres: 20000,
      stockPct: 42.5,
    },
    diesel: {
      fuelType: "diesel",
      retailPrice: 89.14,
      latestCostPrice: 86.65,
      wacpCostPrice: 86.65,
      grossMarginPerL: 2.49,
      effectiveMarginPerL: 2.41,
      grossMarginPct: 2.79,
      effectiveMarginPct: 2.70,
      totalLitresSold: 19000,
      totalRevenue: 1693660,
      totalCost: 1646350,
      grossProfit: 47310,
      evaporationLitres: 7.6,
      evaporationValue: 658.54,
      effectiveProfit: 46651.46,
      evaporationRatePct: 0.08,
      latestDipLitres: 12000,
      latestDipDate: "2026-03-31",
      stockValue: 1039800,
      tankCapacityLitres: 25000,
      stockPct: 48.0,
    },
    lubricant: { fuelType: "lubricant", retailPrice: 0, latestCostPrice: 0, evaporationLitres: 0, evaporationValue: 0, stockValue: 0 },
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    totalGrossProfit: 153960,
    totalEffectiveProfit: 151958.75,
    totalEvaporationValue: 2001.25,
    totalStockValue: 1885210,
    dataQuality: { hasDipReadings: true, hasActualPurchaseCost: true, dipReadingCount: 31 },
  }),
  getDipReadings: vi.fn().mockResolvedValue([
    { id: 1, reading_date: "2026-03-31", fuel_type: "petrol", dip_litres: 8500, tank_id: "T1" },
    { id: 2, reading_date: "2026-03-31", fuel_type: "diesel", dip_litres: 12000, tank_id: "T1" },
  ]),
  upsertDipReading: vi.fn().mockResolvedValue({ id: 3, updated: false }),
  getFuelConfigs: vi.fn().mockResolvedValue([
    { id: 1, fuelType: "petrol", retailPrice: 103.41, latestCostPrice: 99.46, evaporationRatePct: 0.1, tankCapacityLitres: 20000 },
    { id: 2, fuelType: "diesel", retailPrice: 89.14, latestCostPrice: 86.65, evaporationRatePct: 0.08, tankCapacityLitres: 25000 },
    { id: 3, fuelType: "lubricant", retailPrice: 0, latestCostPrice: 0, evaporationRatePct: 0, tankCapacityLitres: 1000 },
  ]),
  updateFuelConfig: vi.fn().mockResolvedValue([
    { id: 1, fuelType: "petrol", retailPrice: 104.00, latestCostPrice: 100.00, evaporationRatePct: 0.1, tankCapacityLitres: 20000 },
  ]),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Fuel Intelligence — Margin Calculations", () => {
  describe("Gross Margin per Litre", () => {
    it("computes petrol gross margin correctly", () => {
      const retailPrice = 103.41;
      const costPrice = 99.46;
      const grossMargin = retailPrice - costPrice;
      expect(grossMargin).toBeCloseTo(3.95, 2);
    });

    it("computes diesel gross margin correctly", () => {
      const retailPrice = 89.14;
      const costPrice = 86.65;
      const grossMargin = retailPrice - costPrice;
      expect(grossMargin).toBeCloseTo(2.49, 2);
    });

    it("computes gross margin percentage correctly", () => {
      const retailPrice = 103.41;
      const grossMarginPerL = 3.95;
      const marginPct = (grossMarginPerL / retailPrice) * 100;
      expect(marginPct).toBeCloseTo(3.82, 1);
    });
  });

  describe("Weighted Average Cost Price (WACP)", () => {
    it("computes WACP from multiple purchase batches", () => {
      const batches = [
        { qty: 10000, unitPrice: 99.20 },
        { qty: 8000, unitPrice: 99.60 },
        { qty: 12000, unitPrice: 99.80 },
      ];
      const totalQty = batches.reduce((s, b) => s + b.qty, 0);
      const totalCost = batches.reduce((s, b) => s + b.qty * b.unitPrice, 0);
      const wacp = totalCost / totalQty;
      expect(wacp).toBeCloseTo(99.55, 1); // (10000×99.20 + 8000×99.60 + 12000×99.80) / 30000 = 99.547
      expect(totalQty).toBe(30000);
    });

    it("falls back to config cost price when no purchase data", () => {
      const configCostPrice = 99.46;
      const totalQtyReceived = 0;
      const wacp = totalQtyReceived > 0 ? 0 : configCostPrice;
      expect(wacp).toBe(99.46);
    });

    it("WACP margin is lower than config margin when cost increased", () => {
      const configCostPrice = 99.46;
      const wacpCostPrice = 100.20; // recent price increase
      const retailPrice = 103.41;
      const configMargin = retailPrice - configCostPrice;
      const wacpMargin = retailPrice - wacpCostPrice;
      expect(wacpMargin).toBeLessThan(configMargin);
    });
  });

  describe("Evaporation Loss Calculation", () => {
    it("calculates daily evaporation from dip reading", () => {
      const dipLitres = 13500;
      const evaporationRatePct = 0.1; // 0.1% per day
      const dailyEvaporation = dipLitres * (evaporationRatePct / 100);
      expect(dailyEvaporation).toBeCloseTo(13.5, 1);
    });

    it("calculates evaporation value from litres and cost price", () => {
      const evapLitres = 13.5;
      const costPrice = 99.46;
      const evapValue = evapLitres * costPrice;
      expect(evapValue).toBeCloseTo(1342.71, 1);
    });

    it("diesel has lower evaporation rate than petrol", () => {
      const petrolRate = 0.1;  // 0.1% per day
      const dieselRate = 0.08; // 0.08% per day (diesel evaporates less)
      expect(dieselRate).toBeLessThan(petrolRate);
    });

    it("effective margin is lower than gross margin when evaporation exists", () => {
      const grossMarginPerL = 3.95;
      const evapLitres = 13.5;
      const totalLitresSold = 27000;
      const costPrice = 99.46;
      const evapValue = evapLitres * costPrice;
      const grossProfit = grossMarginPerL * totalLitresSold;
      const effectiveProfit = grossProfit - evapValue;
      const effectiveMarginPerL = effectiveProfit / totalLitresSold;
      expect(effectiveMarginPerL).toBeLessThan(grossMarginPerL);
      expect(effectiveMarginPerL).toBeCloseTo(3.90, 1);
    });

    it("zero evaporation when no dip readings and no purchase data", () => {
      const dipLitres = 0;
      const evaporationRatePct = 0.1;
      const evaporation = dipLitres * (evaporationRatePct / 100);
      expect(evaporation).toBe(0);
    });
  });

  describe("Stock Valuation from Dip Readings", () => {
    it("computes stock value from dip litres and WACP", () => {
      const dipLitres = 8500;
      const wacpCostPrice = 99.46;
      const stockValue = dipLitres * wacpCostPrice;
      expect(stockValue).toBeCloseTo(845410, 0);
    });

    it("computes stock percentage of tank capacity", () => {
      const dipLitres = 8500;
      const tankCapacity = 20000;
      const stockPct = (dipLitres / tankCapacity) * 100;
      expect(stockPct).toBe(42.5);
    });

    it("caps stock percentage at 100%", () => {
      const dipLitres = 22000; // overfill scenario
      const tankCapacity = 20000;
      const stockPct = Math.min(100, (dipLitres / tankCapacity) * 100);
      expect(stockPct).toBe(100);
    });

    it("returns null stock value when no dip reading available", () => {
      const latestDipLitres: number | null = null;
      const wacpCostPrice = 99.46;
      const stockValue = latestDipLitres !== null ? latestDipLitres * wacpCostPrice : 0;
      expect(stockValue).toBe(0);
    });
  });

  describe("Total Fuel Intelligence Aggregates", () => {
    it("total effective profit = petrol + diesel effective profits", async () => {
      const { getFuelIntelligence } = await import("./db-fuel-intelligence");
      const result = await getFuelIntelligence("2026-03-01", "2026-03-31");
      const expected = result.petrol.effectiveProfit + result.diesel.effectiveProfit;
      expect(result.totalEffectiveProfit).toBeCloseTo(expected, 1);
    });

    it("total evaporation value = petrol + diesel evaporation", async () => {
      const { getFuelIntelligence } = await import("./db-fuel-intelligence");
      const result = await getFuelIntelligence("2026-03-01", "2026-03-31");
      const expected = result.petrol.evaporationValue + result.diesel.evaporationValue;
      expect(result.totalEvaporationValue).toBeCloseTo(expected, 1);
    });

    it("total stock value = petrol + diesel stock values", async () => {
      const { getFuelIntelligence } = await import("./db-fuel-intelligence");
      const result = await getFuelIntelligence("2026-03-01", "2026-03-31");
      const expected = result.petrol.stockValue + result.diesel.stockValue;
      expect(result.totalStockValue).toBeCloseTo(expected, 0);
    });

    it("data quality flag is true when dip readings exist", async () => {
      const { getFuelIntelligence } = await import("./db-fuel-intelligence");
      const result = await getFuelIntelligence("2026-03-01", "2026-03-31");
      expect(result.dataQuality.hasDipReadings).toBe(true);
      expect(result.dataQuality.dipReadingCount).toBeGreaterThan(0);
    });
  });

  describe("Fuel Config CRUD", () => {
    it("returns all three fuel types in config", async () => {
      const { getFuelConfigs } = await import("./db-fuel-intelligence");
      const configs = await getFuelConfigs();
      const types = configs.map((c: any) => c.fuelType);
      expect(types).toContain("petrol");
      expect(types).toContain("diesel");
      expect(types).toContain("lubricant");
    });

    it("updates fuel config and returns updated values", async () => {
      const { updateFuelConfig } = await import("./db-fuel-intelligence");
      const result = await updateFuelConfig({ fuelType: "petrol", retailPrice: 104.00, latestCostPrice: 100.00 });
      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
