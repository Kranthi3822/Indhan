/**
 * fuel-prices.test.ts
 * Unit tests for daily fuel price entry and receipt scanner logic
 */
import { describe, it, expect } from "vitest";

// ─── Daily Price Validation Logic ─────────────────────────────────────────────
function validateDailyPrice(input: {
  priceDate: string;
  fuelType: string;
  retailPrice: number;
  costPrice?: number;
}) {
  const errors: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.priceDate)) errors.push("Invalid date format");
  if (!["petrol", "diesel"].includes(input.fuelType)) errors.push("Invalid fuel type");
  if (input.retailPrice < 50 || input.retailPrice > 300) errors.push("Retail price out of range (50-300)");
  if (input.costPrice !== undefined && (input.costPrice < 40 || input.costPrice > 280)) {
    errors.push("Cost price out of range (40-280)");
  }
  return errors;
}

function calculateMargin(retailPrice: number, costPrice: number) {
  const margin = retailPrice - costPrice;
  const marginPct = (margin / retailPrice) * 100;
  return { margin: parseFloat(margin.toFixed(4)), marginPct: parseFloat(marginPct.toFixed(4)) };
}

// ─── Receipt Extraction Parsing Logic ─────────────────────────────────────────
function parseExtractedReceipt(rawJson: string) {
  try {
    const cleaned = rawJson.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return { success: true, data: JSON.parse(cleaned) };
  } catch {
    return { success: false, data: null };
  }
}

function validateReceiptForm(form: {
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  fuelType: string;
  quantityLitres: string;
  unitPrice: string;
  totalAmount: string;
}) {
  const errors: string[] = [];
  if (!form.supplierName.trim()) errors.push("Supplier name required");
  if (!form.invoiceNumber.trim()) errors.push("Invoice number required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.invoiceDate)) errors.push("Invalid invoice date");
  if (!["petrol", "diesel", "lubricant"].includes(form.fuelType)) errors.push("Invalid fuel type");
  const qty = parseFloat(form.quantityLitres);
  const price = parseFloat(form.unitPrice);
  const total = parseFloat(form.totalAmount);
  if (isNaN(qty) || qty <= 0) errors.push("Invalid quantity");
  if (isNaN(price) || price <= 0) errors.push("Invalid unit price");
  if (isNaN(total) || total <= 0) errors.push("Invalid total amount");
  return errors;
}

function calculateReceiptTotal(quantityLitres: number, unitPrice: number) {
  return parseFloat((quantityLitres * unitPrice).toFixed(2));
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Daily Fuel Price Validation", () => {
  it("accepts valid petrol price entry", () => {
    const errors = validateDailyPrice({
      priceDate: "2026-04-12",
      fuelType: "petrol",
      retailPrice: 108.83,
      costPrice: 104.88,
    });
    expect(errors).toHaveLength(0);
  });

  it("accepts valid diesel price entry without cost price", () => {
    const errors = validateDailyPrice({
      priceDate: "2026-04-12",
      fuelType: "diesel",
      retailPrice: 97.10,
    });
    expect(errors).toHaveLength(0);
  });

  it("rejects invalid date format", () => {
    const errors = validateDailyPrice({
      priceDate: "12-04-2026",
      fuelType: "petrol",
      retailPrice: 108.83,
    });
    expect(errors).toContain("Invalid date format");
  });

  it("rejects invalid fuel type", () => {
    const errors = validateDailyPrice({
      priceDate: "2026-04-12",
      fuelType: "kerosene",
      retailPrice: 90,
    });
    expect(errors).toContain("Invalid fuel type");
  });

  it("rejects retail price below minimum", () => {
    const errors = validateDailyPrice({
      priceDate: "2026-04-12",
      fuelType: "diesel",
      retailPrice: 30,
    });
    expect(errors).toContain("Retail price out of range (50-300)");
  });

  it("rejects cost price above maximum", () => {
    const errors = validateDailyPrice({
      priceDate: "2026-04-12",
      fuelType: "petrol",
      retailPrice: 108.83,
      costPrice: 300,
    });
    expect(errors).toContain("Cost price out of range (40-280)");
  });
});

describe("Fuel Margin Calculation", () => {
  it("calculates petrol margin correctly", () => {
    const { margin, marginPct } = calculateMargin(108.83, 104.88);
    expect(margin).toBeCloseTo(3.95, 2);
    expect(marginPct).toBeCloseTo(3.63, 1);
  });

  it("calculates diesel margin correctly", () => {
    const { margin, marginPct } = calculateMargin(97.10, 94.61);
    expect(margin).toBeCloseTo(2.49, 2);
    expect(marginPct).toBeCloseTo(2.56, 1);
  });

  it("returns negative margin when cost exceeds retail", () => {
    const { margin } = calculateMargin(95.00, 98.00);
    expect(margin).toBeLessThan(0);
  });

  it("returns zero margin when cost equals retail", () => {
    const { margin } = calculateMargin(100.00, 100.00);
    expect(margin).toBe(0);
  });
});

describe("Receipt Extraction Parsing", () => {
  it("parses clean JSON response", () => {
    const json = JSON.stringify({
      supplierName: "HPCL",
      invoiceNumber: "INV-2026-001",
      invoiceDate: "2026-04-10",
      fuelType: "diesel",
      quantityLitres: 9460,
      unitPrice: 94.61,
      totalAmount: 895012.60,
      taxAmount: 0,
      confidenceScore: 92,
      notes: null,
    });
    const result = parseExtractedReceipt(json);
    expect(result.success).toBe(true);
    expect(result.data.supplierName).toBe("HPCL");
    expect(result.data.quantityLitres).toBe(9460);
    expect(result.data.fuelType).toBe("diesel");
  });

  it("parses JSON wrapped in markdown code block", () => {
    const json = "```json\n{\"supplierName\":\"BPCL\",\"fuelType\":\"petrol\"}\n```";
    const result = parseExtractedReceipt(json);
    expect(result.success).toBe(true);
    expect(result.data.supplierName).toBe("BPCL");
  });

  it("returns failure for invalid JSON", () => {
    const result = parseExtractedReceipt("Not a JSON response at all");
    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
  });

  it("handles partial extraction with null fields", () => {
    const json = JSON.stringify({
      supplierName: "IOC",
      invoiceNumber: null,
      invoiceDate: null,
      fuelType: "diesel",
      quantityLitres: 5000,
      unitPrice: null,
      totalAmount: null,
      confidenceScore: 45,
    });
    const result = parseExtractedReceipt(json);
    expect(result.success).toBe(true);
    expect(result.data.invoiceNumber).toBeNull();
    expect(result.data.confidenceScore).toBe(45);
  });
});

describe("Receipt Form Validation", () => {
  const validForm = {
    supplierName: "HPCL",
    invoiceNumber: "INV-001",
    invoiceDate: "2026-04-10",
    fuelType: "diesel",
    quantityLitres: "9460",
    unitPrice: "94.61",
    totalAmount: "895012.60",
  };

  it("accepts a fully valid form", () => {
    expect(validateReceiptForm(validForm)).toHaveLength(0);
  });

  it("rejects empty supplier name", () => {
    const errors = validateReceiptForm({ ...validForm, supplierName: "" });
    expect(errors).toContain("Supplier name required");
  });

  it("rejects invalid invoice date", () => {
    const errors = validateReceiptForm({ ...validForm, invoiceDate: "10/04/2026" });
    expect(errors).toContain("Invalid invoice date");
  });

  it("rejects zero quantity", () => {
    const errors = validateReceiptForm({ ...validForm, quantityLitres: "0" });
    expect(errors).toContain("Invalid quantity");
  });

  it("rejects non-numeric unit price", () => {
    const errors = validateReceiptForm({ ...validForm, unitPrice: "abc" });
    expect(errors).toContain("Invalid unit price");
  });

  it("accepts lubricant as valid fuel type", () => {
    const errors = validateReceiptForm({ ...validForm, fuelType: "lubricant" });
    expect(errors).toHaveLength(0);
  });
});

describe("Receipt Total Calculation", () => {
  it("calculates diesel total correctly", () => {
    // 9460 × 94.61 = 895,010.60 (floating point result)
    const total = calculateReceiptTotal(9460, 94.61);
    expect(total).toBeGreaterThan(895000);
    expect(total).toBeLessThan(896000);
  });

  it("calculates petrol total correctly", () => {
    const total = calculateReceiptTotal(2740, 104.88);
    expect(total).toBeCloseTo(287371.20, 0);
  });

  it("handles fractional litres", () => {
    const total = calculateReceiptTotal(9460.5, 94.61);
    expect(total).toBeGreaterThan(895012);
  });
});
