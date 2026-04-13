/**
 * ReceiptScanner.tsx
 * Purchase Receipt Scanner — upload/photograph a fuel purchase receipt,
 * AI extracts invoice data, staff reviews and confirms to create a purchase order.
 */
import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Camera, Scan, CheckCircle2, XCircle, AlertTriangle,
  FileText, Fuel, IndianRupee, Calendar, Hash, Building2,
  RotateCcw, History, Loader2, ChevronRight, RefreshCw,
  TrendingUp, TrendingDown,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { fmtCompact } from "@/lib/format";
import { toast } from "sonner";

type ScanStep = "upload" | "scanning" | "review" | "confirmed";

interface ExtractedData {
  supplierName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  fuelType: "petrol" | "diesel" | "lubricant" | null;
  quantityLitres: number | null;
  unitPrice: number | null;
  totalAmount: number | null;
  taxAmount: number | null;
  confidenceScore: number | null;
  fieldConfidence?: Record<string, number>;
  notes: string | null;
}

interface ConfirmResult {
  purchaseOrderId: number;
  costDelta: number | null;
  oldCostPrice: number | null;
  newCostPrice: number;
  oldMargin: number | null;
  newMargin: number | null;
  message: string;
}

export default function ReceiptScanner() {
  const [step, setStep] = useState<ScanStep>("upload");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<number | null>(null);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [confirmedPoId, setConfirmedPoId] = useState<number | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null);
  const [currentCostPrice, setCurrentCostPrice] = useState<number | null>(null);
  const [fieldConfidence, setFieldConfidence] = useState<Record<string, number> | null>(null);

  // Editable form state (pre-filled from AI, editable by staff)
  const [form, setForm] = useState({
    supplierName: "",
    invoiceNumber: "",
    invoiceDate: "",
    fuelType: "diesel" as "petrol" | "diesel" | "lubricant",
    quantityLitres: "",
    unitPrice: "",
    totalAmount: "",
    taxAmount: "0",
    notes: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const applyExtracted = (data: { extracted: any; currentCostPrice?: number | null; fieldConfidence?: Record<string, number> | null }) => {
    if (data.currentCostPrice != null) setCurrentCostPrice(data.currentCostPrice);
    if (data.fieldConfidence) setFieldConfidence(data.fieldConfidence);
    if (data.extracted) {
      const e = data.extracted as ExtractedData;
      setExtracted(e);
      if (e.fieldConfidence) setFieldConfidence(e.fieldConfidence);
      setForm({
        supplierName: e.supplierName ?? "",
        invoiceNumber: e.invoiceNumber ?? "",
        invoiceDate: e.invoiceDate ?? new Date().toISOString().slice(0, 10),
        fuelType: (e.fuelType as any) ?? "diesel",
        quantityLitres: e.quantityLitres ? String(e.quantityLitres) : "",
        unitPrice: e.unitPrice ? String(e.unitPrice) : "",
        totalAmount: e.totalAmount ? String(e.totalAmount) : "",
        taxAmount: e.taxAmount ? String(e.taxAmount) : "0",
        notes: e.notes ?? "",
      });
    }
  };

  const scanMutation = trpc.fuelPrices.uploadAndScanReceipt.useMutation({
    onSuccess: (data) => {
      setReceiptId(data.receiptId);
      applyExtracted(data as any);
      if (data.extracted) {
        setStep("review");
        const score = (data.extracted as any).confidenceScore ?? 0;
        toast.success(`Receipt scanned — ${score}% AI confidence`);
      } else {
        toast.error("Could not extract data from receipt. Please fill in manually.");
        setStep("review");
      }
    },
    onError: (err) => {
      toast.error(`Scan failed: ${err.message}`);
      setStep("upload");
    },
  });

  const rescanMutation = trpc.fuelPrices.rescanReceipt.useMutation({
    onSuccess: (data) => {
      applyExtracted(data as any);
      const score = (data.extracted as any)?.confidenceScore ?? 0;
      toast.success(`Re-scanned — ${score}% AI confidence`);
    },
    onError: (err) => toast.error(`Re-scan failed: ${err.message}`),
  });

  const confirmMutation = trpc.fuelPrices.confirmReceipt.useMutation({
    onSuccess: (data) => {
      setConfirmedPoId(data.purchaseOrderId);
      setConfirmResult(data as unknown as ConfirmResult);
      setStep("confirmed");
      utils.fuelPrices.getReceipts.invalidate();
      utils.fuelIntelligence.getIntelligence.invalidate();
      toast.success(data.message);
    },
    onError: (err) => {
      toast.error(`Confirmation failed: ${err.message}`);
    },
  });

  const { data: recentReceipts } = trpc.fuelPrices.getReceipts.useQuery({ limit: 10 });

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPG, PNG, WEBP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image too large. Maximum 10MB allowed.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreviewUrl(dataUrl);
      // Extract base64 (strip data:image/...;base64, prefix)
      const base64 = dataUrl.split(",")[1];
      const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp";
      setStep("scanning");
      scanMutation.mutate({
        imageBase64: base64,
        mimeType,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleConfirm = () => {
    if (!receiptId) return;
    const qty = parseFloat(form.quantityLitres);
    const price = parseFloat(form.unitPrice);
    const total = parseFloat(form.totalAmount);
    if (!form.supplierName || !form.invoiceNumber || !form.invoiceDate || isNaN(qty) || isNaN(price) || isNaN(total)) {
      toast.error("Please fill in all required fields before confirming.");
      return;
    }
    confirmMutation.mutate({
      receiptId,
      supplierName: form.supplierName,
      invoiceNumber: form.invoiceNumber,
      invoiceDate: form.invoiceDate,
      fuelType: form.fuelType,
      quantityLitres: qty,
      unitPrice: price,
      totalAmount: total,
      taxAmount: parseFloat(form.taxAmount) || 0,
      notes: form.notes || undefined,
    });
  };

  const reset = () => {
    setStep("upload");
    setPreviewUrl(null);
    setReceiptId(null);
    setExtracted(null);
    setConfirmedPoId(null);
    setConfirmResult(null);
    setCurrentCostPrice(null);
    setFieldConfidence(null);
    setForm({ supplierName: "", invoiceNumber: "", invoiceDate: "", fuelType: "diesel", quantityLitres: "", unitPrice: "", totalAmount: "", taxAmount: "0", notes: "" });
  };

  // Per-field confidence helper
  const fc = (field: string) => fieldConfidence?.[field];
  const fcBadge = (field: string) => {
    const s = fc(field);
    if (s == null) return null;
    const cls = s >= 85 ? "text-green-400" : s >= 65 ? "text-teal-400" : "text-red-400";
    return <span className={`text-[10px] font-medium ml-1 ${cls}`}>{s}%</span>;
  };

  // Cost delta preview
  const newCostInput = parseFloat(form.unitPrice) || null;
  const costDeltaPreview = newCostInput != null && currentCostPrice != null ? newCostInput - currentCostPrice : null;

  const confidenceColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-teal-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold tracking-tight">Purchase Receipt Scanner</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload or photograph a fuel delivery receipt. AI extracts the invoice data automatically — review and confirm to create a purchase order.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs">
        {(["upload", "scanning", "review", "confirmed"] as ScanStep[]).map((s, i) => {
          const labels = { upload: "Upload", scanning: "Scanning", review: "Review", confirmed: "Confirmed" };
          const isActive = step === s;
          const isPast = ["upload", "scanning", "review", "confirmed"].indexOf(step) > i;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors ${
                isActive ? "border-primary bg-primary/10 text-primary font-semibold"
                : isPast ? "border-green-500/30 bg-green-500/10 text-green-400"
                : "border-border/30 text-muted-foreground"
              }`}>
                {isPast ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-3 h-3 flex items-center justify-center font-bold">{i + 1}</span>}
                {labels[s]}
              </div>
              {i < 3 && <ChevronRight className="w-3 h-3 text-muted-foreground/40" />}
            </div>
          );
        })}
      </div>

      {/* ─── STEP 1: Upload ─────────────────────────────────────────────────── */}
      {step === "upload" && (
        <Card className="bg-card border-border/50">
          <CardContent className="px-5 py-8">
            <div
              className="border-2 border-dashed border-border/50 rounded-xl p-10 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Scan className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-base font-semibold">Upload Receipt Image</p>
                  <p className="text-sm text-muted-foreground mt-1">Drag & drop or click to select</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG, WEBP — max 10MB</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="default" size="sm" className="gap-2" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    <Upload className="w-4 h-4" /> Choose File
                  </Button>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Works with HPCL, BPCL, IOC, Essar, Shell delivery challans and invoices
            </p>
          </CardContent>
        </Card>
      )}

      {/* ─── STEP 2: Scanning ───────────────────────────────────────────────── */}
      {step === "scanning" && (
        <Card className="bg-card border-border/50">
          <CardContent className="px-5 py-12 flex flex-col items-center gap-6">
            {previewUrl && (
              <img src={previewUrl} alt="Receipt" className="max-h-48 rounded-lg border border-border/30 object-contain" />
            )}
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <div className="text-center">
                <p className="font-semibold">Scanning Receipt...</p>
                <p className="text-sm text-muted-foreground mt-1">AI is reading the invoice details. This takes 5–15 seconds.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── STEP 3: Review & Edit ──────────────────────────────────────────── */}
      {step === "review" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Receipt preview */}
          {previewUrl && (
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Receipt Image
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <img src={previewUrl} alt="Receipt" className="w-full rounded-lg border border-border/30 object-contain max-h-80" />
                {extracted?.confidenceScore !== null && extracted?.confidenceScore !== undefined && (
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">AI Confidence</span>
                    <span className={`font-bold ${confidenceColor(extracted.confidenceScore)}`}>
                      {extracted.confidenceScore.toFixed(0)}%
                      {extracted.confidenceScore >= 80 ? " — High" : extracted.confidenceScore >= 60 ? " — Medium" : " — Low"}
                    </span>
                  </div>
                )}
                {extracted?.confidenceScore !== null && extracted?.confidenceScore !== undefined && extracted.confidenceScore < 70 && (
                  <div className="mt-2 flex items-start gap-2 p-2.5 rounded-lg border border-teal-500/20 bg-teal-500/5">
                    <AlertTriangle className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-teal-400/80">Low confidence extraction. Please carefully verify all fields before confirming.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Editable form */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-2 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Scan className="w-4 h-4 text-primary" /> Extracted Data — Review & Edit
                </CardTitle>
                <div className="flex items-center gap-2">
                  {extracted?.confidenceScore != null && (
                    <span className={`text-xs font-semibold ${confidenceColor(extracted.confidenceScore)}`}>
                      {extracted.confidenceScore.toFixed(0)}% confidence
                    </span>
                  )}
                  {receiptId && (
                    <button
                      onClick={() => rescanMutation.mutate({ receiptId })}
                      disabled={rescanMutation.isPending}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground border border-border/40 rounded px-2 py-0.5 transition-colors"
                    >
                      <RefreshCw className={`w-3 h-3 ${rescanMutation.isPending ? "animate-spin" : ""}`} />
                      Re-scan
                    </button>
                  )}
                </div>
              </div>
              {extracted?.notes && (
                <p className="text-[11px] text-teal-400/80 mt-1 flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" /> {extracted.notes}
                </p>
              )}
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" /> Supplier <span className="text-red-400">*</span>{fcBadge("supplierName")}</Label>
                  <Input value={form.supplierName} onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))} placeholder="e.g. HPCL" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Hash className="w-3 h-3" /> Invoice No. <span className="text-red-400">*</span>{fcBadge("invoiceNumber")}</Label>
                  <Input value={form.invoiceNumber} onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))} placeholder="Invoice number" className="h-9 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Invoice Date <span className="text-red-400">*</span>{fcBadge("invoiceDate")}</Label>
                  <Input type="date" value={form.invoiceDate} onChange={e => setForm(f => ({ ...f, invoiceDate: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Fuel className="w-3 h-3" /> Fuel Type <span className="text-red-400">*</span>{fcBadge("fuelType")}</Label>
                  <select
                    value={form.fuelType}
                    onChange={e => setForm(f => ({ ...f, fuelType: e.target.value as any }))}
                    className="w-full h-9 text-sm rounded-md border border-input bg-background px-3 py-1 text-foreground"
                  >
                    <option value="petrol">Petrol (MS)</option>
                    <option value="diesel">Diesel (HSD)</option>
                    <option value="lubricant">Lubricant</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Quantity (L) <span className="text-red-400">*</span>{fcBadge("quantityLitres")}</Label>
                  <Input type="number" step="0.001" min="0" value={form.quantityLitres} onChange={e => setForm(f => ({ ...f, quantityLitres: e.target.value }))} placeholder="e.g. 9460" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Unit Price ₹/L <span className="text-red-400">*</span>{fcBadge("unitPrice")}</Label>
                  <Input type="number" step="0.0001" min="0" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} placeholder="e.g. 94.61" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Total Amount ₹ <span className="text-red-400">*</span>{fcBadge("totalAmount")}</Label>
                  <Input type="number" step="0.01" min="0" value={form.totalAmount} onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))} placeholder="e.g. 895012" className="h-9 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tax / GST Amount ₹</Label>
                  <Input type="number" step="0.01" min="0" value={form.taxAmount} onChange={e => setForm(f => ({ ...f, taxAmount: e.target.value }))} placeholder="0" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" className="h-9 text-sm" />
                </div>
              </div>

              {/* Cost impact preview */}
              {costDeltaPreview !== null && form.fuelType !== "lubricant" && (
                <div className={`p-3 rounded-lg border ${Math.abs(costDeltaPreview) < 0.01 ? "border-border/30 bg-muted/10" : costDeltaPreview > 0 ? "border-red-500/20 bg-red-500/5" : "border-green-500/20 bg-green-500/5"}`}>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Cost Impact Preview</p>
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">Current Cost</p>
                      <p className="text-sm font-bold tabular-nums">₹{currentCostPrice?.toFixed(2) ?? "—"}/L</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {costDeltaPreview > 0.01 ? <TrendingUp className="w-4 h-4 text-red-400" /> : costDeltaPreview < -0.01 ? <TrendingDown className="w-4 h-4 text-green-400" /> : <span className="text-xs text-muted-foreground">→</span>}
                      <span className={`text-xs font-semibold tabular-nums ${costDeltaPreview > 0.01 ? "text-red-400" : costDeltaPreview < -0.01 ? "text-green-400" : "text-muted-foreground"}`}>
                        {costDeltaPreview >= 0 ? "+" : ""}₹{costDeltaPreview.toFixed(2)}/L
                      </span>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">New Cost</p>
                      <p className="text-sm font-bold tabular-nums">₹{newCostInput?.toFixed(2) ?? "—"}/L</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Confirming will update Fuel Intelligence margins automatically</p>
                </div>
              )}

              {/* Calculated summary */}
              {form.quantityLitres && form.unitPrice && (
                <div className="p-3 rounded-lg border border-border/30 bg-muted/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Quantity</p>
                    <p className="text-sm font-bold tabular-nums">{parseFloat(form.quantityLitres).toLocaleString("en-IN")} L</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Unit Price</p>
                    <p className="text-sm font-bold tabular-nums">₹{parseFloat(form.unitPrice).toFixed(4)}/L</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Calc. Total</p>
                    <p className="text-sm font-bold tabular-nums text-primary">
                      {fmtCompact(parseFloat(form.quantityLitres) * parseFloat(form.unitPrice))}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={reset}>
                  <RotateCcw className="w-3.5 h-3.5" /> Scan Again
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                  disabled={confirmMutation.isPending || !form.supplierName || !form.invoiceNumber || !form.invoiceDate || !form.quantityLitres || !form.unitPrice || !form.totalAmount}
                  onClick={handleConfirm}
                >
                  {confirmMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating PO...</>
                    : <><CheckCircle2 className="w-3.5 h-3.5" /> Confirm & Create Purchase Order</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── STEP 4: Confirmed ──────────────────────────────────────────────── */}
      {step === "confirmed" && (
        <Card className="bg-card border-green-500/20 bg-green-500/5">
          <CardContent className="px-5 py-8 flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-400">Purchase Order Created!</p>
              <p className="text-sm text-muted-foreground mt-1">{confirmResult?.message ?? `PO #${confirmedPoId} created`}</p>
            </div>
            {confirmResult && (
              <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-2.5 rounded-lg bg-muted/20 text-center">
                  <p className="text-[10px] text-muted-foreground">Old Cost</p>
                  <p className="text-sm font-bold tabular-nums">₹{confirmResult.oldCostPrice?.toFixed(2) ?? "—"}/L</p>
                </div>
                <div className={`p-2.5 rounded-lg text-center ${(confirmResult.costDelta ?? 0) > 0 ? "bg-red-500/10" : "bg-green-500/10"}`}>
                  <p className="text-[10px] text-muted-foreground">Change</p>
                  <p className={`text-sm font-bold tabular-nums ${(confirmResult.costDelta ?? 0) > 0 ? "text-red-400" : "text-green-400"}`}>
                    {confirmResult.costDelta != null ? `${confirmResult.costDelta >= 0 ? "+" : ""}₹${confirmResult.costDelta.toFixed(2)}/L` : "—"}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/20 text-center">
                  <p className="text-[10px] text-muted-foreground">New Cost</p>
                  <p className="text-sm font-bold tabular-nums">₹{confirmResult.newCostPrice.toFixed(2)}/L</p>
                </div>
              </div>
            )}
            {confirmResult?.newMargin != null && (
              <div className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-muted/20">
                <span className="text-xs text-muted-foreground">Updated Gross Margin</span>
                <span className={`text-sm font-bold tabular-nums ${confirmResult.newMargin >= 0 ? "text-green-400" : "text-red-400"}`}>
                  ₹{confirmResult.newMargin.toFixed(2)}/L
                  {confirmResult.oldMargin != null && (
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">(was ₹{confirmResult.oldMargin.toFixed(2)}/L)</span>
                  )}
                </span>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={reset} className="gap-2">
                <Scan className="w-3.5 h-3.5" /> Scan Another Receipt
              </Button>
              <Button size="sm" onClick={() => window.location.href = "/fuel-prices"} className="gap-2">
                <Fuel className="w-3.5 h-3.5" /> View Fuel Prices
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Recent Receipts History ─────────────────────────────────────────── */}
      {recentReceipts && recentReceipts.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> Recent Scanned Receipts
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="space-y-2">
              {recentReceipts.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/20 hover:bg-muted/10 transition-colors">
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-border/30 shrink-0 bg-muted/20 flex items-center justify-center">
                    {r.imageUrl
                      ? <img src={r.imageUrl} alt="" className="w-full h-full object-cover" />
                      : <FileText className="w-5 h-5 text-muted-foreground" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{r.supplierName ?? "Unknown Supplier"}</span>
                      {r.invoiceNumber && <span className="text-xs text-muted-foreground">#{r.invoiceNumber}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {r.fuelType && (
                        <span className={`text-[10px] font-medium capitalize ${r.fuelType === "petrol" ? "text-teal-400" : "text-blue-400"}`}>
                          {r.fuelType}
                        </span>
                      )}
                      {r.quantityLitres && <span className="text-[10px] text-muted-foreground">{r.quantityLitres.toLocaleString("en-IN")}L</span>}
                      {r.unitPrice && <span className="text-[10px] text-muted-foreground">@ ₹{r.unitPrice.toFixed(2)}/L</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {r.totalAmount && <p className="text-sm font-bold tabular-nums">{fmtCompact(r.totalAmount)}</p>}
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      {r.status === "confirmed" && <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-green-500/30 text-green-400">PO #{r.purchaseOrderId}</Badge>}
                      {r.status === "extracted" && <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-teal-500/30 text-teal-400">Pending</Badge>}
                      {r.status === "failed" && <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-red-500/30 text-red-400">Failed</Badge>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
