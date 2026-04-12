/**
 * fuelPricesRouter.ts
 * tRPC procedures for:
 *  1. Daily fuel retail price entry (staff logs today's selling price)
 *  2. Purchase receipt scanning (AI vision extracts invoice data → purchase order)
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";
import { drizzle, MySql2Database } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import { dailyFuelPrices, scannedReceipts, products, purchaseOrders } from "../../drizzle/schema";

let _db: MySql2Database<Record<string, never>> | null = null;
async function getDb(): Promise<MySql2Database<Record<string, never>>> {
  if (!_db) {
    const mysql = await import("mysql2/promise");
    const pool = mysql.createPool(process.env.DATABASE_URL!);
    _db = drizzle(pool) as unknown as MySql2Database<Record<string, never>>;
  }
  return _db!;
}

// ─── Daily Fuel Price Procedures ──────────────────────────────────────────────
const dailyPriceInput = z.object({
  priceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fuelType: z.enum(["petrol", "diesel"]),
  retailPrice: z.number().min(50).max(300),
  costPrice: z.number().min(40).max(280).optional(),
  notes: z.string().max(500).optional(),
});

export const fuelPricesRouter = router({
  // ─── Save / update today's price ────────────────────────────────────────
  saveDailyPrice: protectedProcedure
    .input(dailyPriceInput)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const recordedBy = ctx.user?.name ?? "Staff";

      // Upsert: delete existing entry for same date+fuelType, then insert
      await db.execute(sql`
        DELETE FROM daily_fuel_prices
        WHERE price_date = ${input.priceDate} AND fuel_type = ${input.fuelType}
      `);
      await db.insert(dailyFuelPrices).values({
        priceDate: input.priceDate,
        fuelType: input.fuelType,
        retailPrice: String(input.retailPrice),
        costPrice: input.costPrice ? String(input.costPrice) : null,
        source: "manual",
        notes: input.notes ?? null,
        recordedBy,
      });

      // Also update fuel_config and products table so Fuel Intelligence picks it up
      await db.execute(sql`
        UPDATE fuel_config
        SET retail_price = ${input.retailPrice},
            ${input.costPrice ? sql`latest_cost_price = ${input.costPrice},` : sql``}
            updated_by = ${recordedBy}
        WHERE fuel_type = ${input.fuelType}
      `);

      if (input.costPrice) {
        const productName = input.fuelType === "petrol" ? "Petrol (MS)" : "Diesel (HSD)";
        await db.execute(sql`
          UPDATE products
          SET sellingPrice = ${input.retailPrice},
              purchasePrice = ${input.costPrice},
              margin = ${input.retailPrice - input.costPrice}
          WHERE name = ${productName}
        `);
      }

      return { success: true, message: `${input.fuelType} price saved for ${input.priceDate}` };
    }),

  // ─── Get price history ───────────────────────────────────────────────────
  getDailyPrices: protectedProcedure
    .input(z.object({
      fuelType: z.enum(["petrol", "diesel"]).optional(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      limit: z.number().min(1).max(365).default(30),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const rows = await db.execute(sql`
        SELECT id, price_date, fuel_type, retail_price, cost_price, source, notes, recorded_by, createdAt
        FROM daily_fuel_prices
        WHERE 1=1
          ${input.fuelType ? sql`AND fuel_type = ${input.fuelType}` : sql``}
          ${input.startDate ? sql`AND price_date >= ${input.startDate}` : sql``}
          ${input.endDate ? sql`AND price_date <= ${input.endDate}` : sql``}
        ORDER BY price_date DESC, fuel_type ASC
        LIMIT ${input.limit}
      `) as any;
      return (rows[0] as any[]).map((r: any) => ({
        id: r.id,
        priceDate: String(r.price_date),
        fuelType: r.fuel_type as "petrol" | "diesel",
        retailPrice: Number(r.retail_price),
        costPrice: r.cost_price ? Number(r.cost_price) : null,
        margin: r.cost_price ? Number(r.retail_price) - Number(r.cost_price) : null,
        source: r.source as "manual" | "receipt_scan",
        notes: r.notes ?? null,
        recordedBy: r.recorded_by ?? null,
        createdAt: r.createdAt,
      }));
    }),

  // ─── Get latest price for a fuel type ───────────────────────────────────
  getLatestPrice: protectedProcedure
    .input(z.object({ fuelType: z.enum(["petrol", "diesel"]) }))
    .query(async ({ input }) => {
      const db = await getDb();
      const rows = await db.execute(sql`
        SELECT price_date, retail_price, cost_price, source
        FROM daily_fuel_prices
        WHERE fuel_type = ${input.fuelType}
        ORDER BY price_date DESC
        LIMIT 1
      `) as any;
      const r = (rows[0] as any[])[0];
      if (!r) return null;
      return {
        priceDate: String(r.price_date),
        retailPrice: Number(r.retail_price),
        costPrice: r.cost_price ? Number(r.cost_price) : null,
        source: r.source,
      };
    }),

  // ─── Upload receipt image and extract data via AI vision ─────────────────
  uploadAndScanReceipt: protectedProcedure
    .input(z.object({
      imageBase64: z.string().min(100),   // base64-encoded image
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic"]).default("image/jpeg"),
      fileName: z.string().default("receipt.jpg"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const uploadedBy = ctx.user?.name ?? "Staff";

      // 1. Upload image to S3
      const buffer = Buffer.from(input.imageBase64, "base64");
      const suffix = Date.now().toString(36);
      const fileKey = `receipts/${suffix}-${input.fileName}`;
      const { url: imageUrl } = await storagePut(fileKey, buffer, input.mimeType);

      // 2. Create pending receipt record
      const [insertResult] = await db.insert(scannedReceipts).values({
        imageUrl,
        status: "pending",
        uploadedBy,
      }) as any;
      const receiptId = insertResult.insertId;

      // 3. Call LLM vision to extract receipt data
      const extractionPrompt = `You are an expert at reading Indian fuel station purchase receipts from oil companies (HPCL, BPCL, IOC, Essar, Shell).

Analyse this receipt image and extract the following information in JSON format:
{
  "supplierName": "string — oil company name (e.g. HPCL, BPCL, IOC)",
  "invoiceNumber": "string — invoice/delivery challan number",
  "invoiceDate": "string — date in YYYY-MM-DD format",
  "fuelType": "petrol | diesel | lubricant",
  "quantityLitres": number — quantity in LITRES (convert from KL if needed: 1 KL = 1000 L),
  "unitPrice": number — price per litre in ₹,
  "totalAmount": number — total invoice amount in ₹,
  "taxAmount": number — GST/tax amount if shown (0 if not visible),
  "confidenceScore": number — your confidence 0-100 that the extraction is accurate,
  "notes": "string — any important notes or caveats about the extraction"
}

Rules:
- If a field is not visible or unclear, use null for that field
- quantityLitres must be in LITRES, not KL (multiply KL by 1000)
- unitPrice is ₹ per LITRE
- Return ONLY valid JSON, no markdown, no explanation`;

      let extractedData: any = null;
      let rawJson = "";
      let status: "extracted" | "failed" = "extracted";

      try {
        const llmResponse = await invokeLLM({
          messages: [
            {
              role: "user" as const,
              content: [
                { type: "text" as const, text: extractionPrompt },
                { type: "image_url" as const, image_url: { url: imageUrl, detail: "high" as const } },
              ],
            },
          ],
        } as any);

        const msgContent = llmResponse.choices?.[0]?.message?.content;
        rawJson = typeof msgContent === "string" ? msgContent : JSON.stringify(msgContent ?? "");
        // Strip markdown code blocks if present
        const cleaned = rawJson.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        extractedData = JSON.parse(cleaned);
      } catch (err) {
        console.error("Receipt extraction failed:", err);
        status = "failed";
      }

      // 4. Update receipt record with extracted data
      if (extractedData) {
        await db.execute(sql`
          UPDATE scanned_receipts SET
            status = 'extracted',
            supplier_name = ${extractedData.supplierName ?? null},
            invoice_number = ${extractedData.invoiceNumber ?? null},
            invoice_date = ${extractedData.invoiceDate ?? null},
            fuel_type = ${extractedData.fuelType ?? null},
            quantity_litres = ${extractedData.quantityLitres ?? null},
            unit_price = ${extractedData.unitPrice ?? null},
            total_amount = ${extractedData.totalAmount ?? null},
            tax_amount = ${extractedData.taxAmount ?? 0},
            confidence_score = ${extractedData.confidenceScore ?? 50},
            raw_extracted_json = ${rawJson}
          WHERE id = ${receiptId}
        `);
      } else {
        await db.execute(sql`
          UPDATE scanned_receipts SET status = 'failed', raw_extracted_json = ${rawJson}
          WHERE id = ${receiptId}
        `);
      }

      return {
        receiptId,
        imageUrl,
        status,
        extracted: extractedData,
      };
    }),

  // ─── Confirm scanned receipt and create purchase order ───────────────────
  confirmReceipt: protectedProcedure
    .input(z.object({
      receiptId: z.number().int().positive(),
      supplierName: z.string().min(1),
      invoiceNumber: z.string().min(1),
      invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      fuelType: z.enum(["petrol", "diesel", "lubricant"]),
      quantityLitres: z.number().positive(),
      unitPrice: z.number().positive(),
      totalAmount: z.number().positive(),
      taxAmount: z.number().min(0).default(0),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const confirmedBy = ctx.user?.name ?? "Staff";

      // Find the product ID for this fuel type
      const productName = input.fuelType === "petrol" ? "Petrol (MS)"
        : input.fuelType === "diesel" ? "Diesel (HSD)" : "Lubricants";
      const productRows = await db.execute(sql`
        SELECT id FROM products WHERE name = ${productName} LIMIT 1
      `) as any;
      const productId = (productRows[0] as any[])[0]?.id ?? 1;

      // Create purchase order
      const [poResult] = await db.insert(purchaseOrders).values({
        productId,
        supplier: input.supplierName,
        invoiceNo: input.invoiceNumber,
        orderDate: input.invoiceDate,
        deliveryDate: input.invoiceDate,
        quantityOrdered: String(input.quantityLitres),
        quantityReceived: String(input.quantityLitres),
        unitPrice: String(input.unitPrice),
        totalAmount: String(input.totalAmount),
        status: "delivered",
        notes: input.notes ?? `Auto-created from scanned receipt #${input.receiptId}`,
      }) as any;
      const purchaseOrderId = poResult.insertId;

      // Update receipt as confirmed
      await db.execute(sql`
        UPDATE scanned_receipts SET
          status = 'confirmed',
          purchase_order_id = ${purchaseOrderId},
          confirmed_by = ${confirmedBy},
          confirmedAt = NOW()
        WHERE id = ${input.receiptId}
      `);

      // Update daily fuel price with the cost price from this receipt
      const today = new Date().toISOString().slice(0, 10);
      if (input.fuelType !== "lubricant") {
        await db.execute(sql`
          INSERT INTO daily_fuel_prices (price_date, fuel_type, retail_price, cost_price, source, notes, recorded_by)
          VALUES (${input.invoiceDate}, ${input.fuelType},
            (SELECT retail_price FROM fuel_config WHERE fuel_type = ${input.fuelType} LIMIT 1),
            ${input.unitPrice}, 'receipt_scan',
            ${`Invoice ${input.invoiceNumber} from ${input.supplierName}`},
            ${confirmedBy})
          ON DUPLICATE KEY UPDATE cost_price = ${input.unitPrice}, source = 'receipt_scan'
        `);

        // Update fuel_config cost price
        await db.execute(sql`
          UPDATE fuel_config SET latest_cost_price = ${input.unitPrice}, updated_by = ${confirmedBy}
          WHERE fuel_type = ${input.fuelType}
        `);
      }

      return {
        success: true,
        purchaseOrderId,
        message: `Purchase order #${purchaseOrderId} created from receipt`,
      };
    }),

  // ─── Get scanned receipts history ────────────────────────────────────────
  getReceipts: protectedProcedure
    .input(z.object({
      status: z.enum(["pending", "extracted", "confirmed", "failed", "all"]).default("all"),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const rows = await db.execute(sql`
        SELECT id, image_url, status, supplier_name, invoice_number, invoice_date,
               fuel_type, quantity_litres, unit_price, total_amount, confidence_score,
               purchase_order_id, confirmed_by, uploaded_by, createdAt
        FROM scanned_receipts
        WHERE ${input.status === "all" ? sql`1=1` : sql`status = ${input.status}`}
        ORDER BY createdAt DESC
        LIMIT ${input.limit}
      `) as any;
      return (rows[0] as any[]).map((r: any) => ({
        id: r.id,
        imageUrl: r.image_url,
        status: r.status,
        supplierName: r.supplier_name,
        invoiceNumber: r.invoice_number,
        invoiceDate: r.invoice_date,
        fuelType: r.fuel_type,
        quantityLitres: r.quantity_litres ? Number(r.quantity_litres) : null,
        unitPrice: r.unit_price ? Number(r.unit_price) : null,
        totalAmount: r.total_amount ? Number(r.total_amount) : null,
        confidenceScore: r.confidence_score ? Number(r.confidence_score) : null,
        purchaseOrderId: r.purchase_order_id,
        confirmedBy: r.confirmed_by,
        uploadedBy: r.uploaded_by,
        createdAt: r.createdAt,
      }));
    }),
});
