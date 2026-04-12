/**
 * Reconciliation.tsx — Daily Reconciliation with Nozzle Data Integration
 *
 * When nozzle data exists for the selected date:
 *   - A banner shows nozzle data is available with a pre-fill button
 *   - Sales figures (cash/card/online/credit) are pre-filled from nozzle collections
 *   - Petrol/Diesel volumes are shown from meter readings
 *   - A drill-down section shows per-session nozzle details
 *
 * Incharge only needs to enter Bank Deposit + Closing Cash to complete reconciliation.
 */
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  GitMerge, CheckCircle2, AlertCircle, Clock, Fuel,
  ChevronDown, ChevronUp, Zap, RefreshCw, Info,
  IndianRupee, Gauge, BarChart3,
} from "lucide-react";
import { fmtCompact, fmtFull } from "@/lib/format";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const fmtL = (n: number) =>
  `${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;

export default function Reconciliation() {
  const [selectedDate, setSelectedDate] = useState("2026-03-31");
  const [cashSalesInput, setCashSalesInput] = useState("");
  const [cardSalesInput, setCardSalesInput] = useState("");
  const [creditSalesInput, setCreditSalesInput] = useState("");
  const [onlineSalesInput, setOnlineSalesInput] = useState("");
  const [bankDepositInput, setBankDepositInput] = useState("");
  const [closingCashInput, setClosingCashInput] = useState("");
  const [openingStockInput, setOpeningStockInput] = useState("");
  const [closingStockInput, setClosingStockInput] = useState("");
  const [showNozzleDrilldown, setShowNozzleDrilldown] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Existing reconciliation data
  const { data: recon, refetch } = trpc.reconciliation.byDate.useQuery({ reportDate: selectedDate });

  // Nozzle data for the selected date (integration point)
  const { data: nozzleData, isLoading: nozzleLoading } = trpc.nozzle.getNozzleDataForDate.useQuery(
    { shiftDate: selectedDate },
    { refetchOnWindowFocus: false }
  );

  const upsertRecon = trpc.reconciliation.upsert.useMutation({
    onSuccess: () => { toast.success("Reconciliation saved"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const r = recon as any;

  // Reset pre-fill state when date changes
  useEffect(() => {
    setPrefilled(false);
    setCashSalesInput("");
    setCardSalesInput("");
    setCreditSalesInput("");
    setOnlineSalesInput("");
  }, [selectedDate]);

  // Pre-fill from nozzle data
  const handlePrefillFromNozzle = () => {
    if (!nozzleData) return;
    setCashSalesInput(nozzleData.totalCash.toFixed(2));
    setCardSalesInput(nozzleData.totalCard.toFixed(2));
    setCreditSalesInput(nozzleData.totalCredit.toFixed(2));
    setOnlineSalesInput(nozzleData.totalOnline.toFixed(2));
    setPrefilled(true);
    toast.success("Sales figures pre-filled from nozzle data");
  };

  const cashSales   = parseFloat(cashSalesInput   || String(r?.cashSales   ?? 0)) || 0;
  const cardSales   = parseFloat(cardSalesInput   || String(r?.cardSales   ?? 0)) || 0;
  const creditSales = parseFloat(creditSalesInput || String(r?.creditSales ?? 0)) || 0;
  const onlineSales = parseFloat(onlineSalesInput || String(r?.onlineCollected ?? 0)) || 0;
  const totalSales  = cashSales + cardSales + creditSales + onlineSales;
  const bankDeposit = parseFloat(bankDepositInput || String(r?.bankDeposit ?? 0)) || 0;
  const closingCash = parseFloat(closingCashInput || String(r?.closingCash ?? 0)) || 0;
  const difference  = cashSales - bankDeposit - closingCash;
  const isBalanced  = Math.abs(difference) < 1;

  const hasNozzleData = !!nozzleData && (nozzleData.totalPetrolLitres > 0 || nozzleData.totalDieselLitres > 0 || nozzleData.totalCollected > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Daily Reconciliation</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Verify cash, card, and bank transactions for the day</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Date</Label>
          <Input
            type="date"
            className="bg-secondary border-border/50 h-8 text-xs w-36"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {/* ── Nozzle Data Banner ──────────────────────────────────────────────── */}
      {!nozzleLoading && hasNozzleData && (
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Fuel className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                  Nozzle Data Available
                  {nozzleData.hasOpenSessions && (
                    <Badge className="text-[9px] bg-teal-500/20 text-teal-400 border-teal-500/30 border">
                      Shift Still Open
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Staff have logged meter readings and collections for this date.
                  Pre-fill the sales figures automatically.
                </p>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Fuel className="w-3 h-3 text-teal-400" />
                    <span className="text-xs font-medium text-teal-400">{fmtL(nozzleData.totalPetrolLitres)} Petrol</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Fuel className="w-3 h-3 text-blue-400" />
                    <span className="text-xs font-medium text-blue-400">{fmtL(nozzleData.totalDieselLitres)} Diesel</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <IndianRupee className="w-3 h-3 text-green-400" />
                    <span className="text-xs font-medium text-green-400">{fmtCompact(nozzleData.totalCollected)} Collected</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 gap-1.5"
                onClick={() => setShowNozzleDrilldown(v => !v)}
              >
                <BarChart3 className="w-3 h-3" />
                {showNozzleDrilldown ? "Hide" : "View"} Details
                {showNozzleDrilldown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
              <Button
                size="sm"
                className="text-xs h-7 gap-1.5"
                onClick={handlePrefillFromNozzle}
                disabled={prefilled}
              >
                <Zap className="w-3 h-3" />
                {prefilled ? "Pre-filled ✓" : "Pre-fill Sales"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {!nozzleLoading && !hasNozzleData && (
        <div className="p-3 rounded-xl border border-border/40 bg-muted/20 flex items-center gap-2">
          <Info className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            No nozzle data recorded for this date. Staff can log meter readings and collections from the <strong>Nozzle Entry</strong> page.
          </p>
        </div>
      )}

      {/* ── Nozzle Drill-down ────────────────────────────────────────────────── */}
      {showNozzleDrilldown && nozzleData && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gauge className="w-4 h-4 text-primary" /> Nozzle Session Details — {selectedDate}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-4">
            {/* Per-session breakdown */}
            {nozzleData.sessions.map((session: any) => (
              <div key={session.sessionId} className="border border-border/40 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{session.staffName}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">{session.shiftLabel?.replace("_", " ")}</Badge>
                    <Badge
                      className={`text-[10px] ${session.status === "closed" || session.status === "reconciled" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-teal-500/20 text-teal-400 border-teal-500/30"} border`}
                    >
                      {session.status}
                    </Badge>
                  </div>
                  <span className="text-xs font-bold text-primary tabular-nums">{fmtCompact(session.totalCollected)}</span>
                </div>

                {/* Nozzle readings per session */}
                <div className="px-4 py-3 space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {session.nozzleSummaries.map((n: any) => (
                      <div key={n.nozzleId} className={`p-2.5 rounded-lg border text-center ${n.fuelType === "petrol" ? "bg-teal-500/5 border-teal-500/20" : "bg-blue-500/5 border-blue-500/20"}`}>
                        <p className="text-[10px] text-muted-foreground truncate">{n.label}</p>
                        <p className={`text-sm font-bold tabular-nums ${n.fuelType === "petrol" ? "text-teal-400" : "text-blue-400"}`}>
                          {n.dispensed !== null ? `${n.dispensed.toFixed(2)} L` : "—"}
                        </p>
                        {n.opening !== null && n.closing !== null && (
                          <p className="text-[9px] text-muted-foreground/60 tabular-nums">
                            {n.opening.toLocaleString("en-IN")} → {n.closing.toLocaleString("en-IN")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Collection breakdown per session */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {[
                      { label: "Cash", value: session.totalCash, color: "text-green-400" },
                      { label: "Card", value: session.totalCard, color: "text-blue-400" },
                      { label: "Online", value: session.totalOnline, color: "text-purple-400" },
                      { label: "Credit", value: session.totalCredit, color: "text-orange-400" },
                    ].map(item => (
                      <div key={item.label} className="text-center">
                        <p className="text-[10px] text-muted-foreground">{item.label}</p>
                        <p className={`text-xs font-semibold tabular-nums ${item.color}`}>{fmtCompact(item.value)}</p>
                        <p className="text-[9px] text-muted-foreground/50 tabular-nums">{fmtFull(item.value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Day totals */}
            <div className="p-3 rounded-xl bg-muted/20 border border-border/40">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground">Total Petrol</p>
                  <p className="text-sm font-bold text-teal-400 tabular-nums">{fmtL(nozzleData.totalPetrolLitres)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Total Diesel</p>
                  <p className="text-sm font-bold text-blue-400 tabular-nums">{fmtL(nozzleData.totalDieselLitres)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Expected Value</p>
                  <p className="text-sm font-bold tabular-nums">{fmtCompact(nozzleData.expectedSalesValue)}</p>
                  <p className="text-[9px] text-muted-foreground/50 tabular-nums">{fmtFull(nozzleData.expectedSalesValue)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Nozzle Variance</p>
                  <p className={`text-sm font-bold tabular-nums ${Math.abs(nozzleData.variance) < 500 ? "text-green-400" : "text-red-400"}`}>
                    {nozzleData.variance >= 0 ? "+" : ""}{fmtCompact(nozzleData.variance)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Status Banner ────────────────────────────────────────────────────── */}
      <div className={`p-4 rounded-xl border flex items-center gap-3 ${isBalanced && r ? "bg-green-500/10 border-green-500/20" : r ? "bg-red-500/10 border-red-500/20" : "bg-secondary border-border/40"}`}>
        {r ? (
          isBalanced ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-400">Reconciliation Balanced</p>
                <p className="text-xs text-muted-foreground">All transactions match for {selectedDate}</p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-400">Discrepancy Detected</p>
                <p className="text-xs text-muted-foreground">Difference of {fmt(Math.abs(difference))} needs investigation</p>
              </div>
            </>
          )
        ) : (
          <>
            <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-semibold">No Reconciliation Data</p>
              <p className="text-xs text-muted-foreground">
                {hasNozzleData ? "Nozzle data available — click Pre-fill Sales to auto-populate" : `Enter figures below to reconcile ${selectedDate}`}
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Sales Figures + Cash & Bank ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Sales Figures</CardTitle>
              {prefilled && (
                <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30 border gap-1">
                  <Zap className="w-2.5 h-2.5" /> From Nozzle Data
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            {[
              { label: "Cash Sales (₹)", value: cashSalesInput, setter: setCashSalesInput, fallback: r?.cashSales, color: "text-green-400" },
              { label: "Card / POS Sales (₹)", value: cardSalesInput, setter: setCardSalesInput, fallback: r?.cardSales, color: "text-blue-400" },
              { label: "Online / UPI Sales (₹)", value: onlineSalesInput, setter: setOnlineSalesInput, fallback: r?.onlineCollected, color: "text-purple-400" },
              { label: "Credit Sales (₹)", value: creditSalesInput, setter: setCreditSalesInput, fallback: r?.creditSales, color: "text-orange-400" },
            ].map(field => (
              <div key={field.label} className="space-y-1.5">
                <Label className="text-xs">{field.label}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="bg-secondary border-border/50 tabular-nums pr-20"
                    value={field.value || (field.fallback ?? "")}
                    onChange={e => field.setter(e.target.value)}
                  />
                  {(parseFloat(field.value || String(field.fallback ?? 0)) || 0) > 0 && (
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums ${field.color}`}>
                      {fmtCompact(parseFloat(field.value || String(field.fallback ?? 0)) || 0)}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div className="p-3 rounded-lg bg-secondary/50 border border-border/40 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Total Sales</span>
              <div className="text-right">
                <span className="text-sm font-bold text-primary tabular-nums">{fmtCompact(totalSales)}</span>
                <p className="text-[10px] text-muted-foreground/50 tabular-nums">{fmtFull(totalSales)}</p>
              </div>
            </div>

            {/* Nozzle volumes (read-only, from nozzle data) */}
            {hasNozzleData && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-lg bg-teal-500/5 border border-teal-500/20 text-center">
                  <Fuel className="w-3 h-3 text-teal-400 mx-auto mb-0.5" />
                  <p className="text-[10px] text-muted-foreground">Petrol Dispensed</p>
                  <p className="text-sm font-bold text-teal-400 tabular-nums">{fmtL(nozzleData!.totalPetrolLitres)}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-center">
                  <Fuel className="w-3 h-3 text-blue-400 mx-auto mb-0.5" />
                  <p className="text-[10px] text-muted-foreground">Diesel Dispensed</p>
                  <p className="text-sm font-bold text-blue-400 tabular-nums">{fmtL(nozzleData!.totalDieselLitres)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Cash & Bank Position</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Bank Deposit (₹)</Label>
              <Input
                type="number"
                placeholder="0.00"
                className="bg-secondary border-border/50 tabular-nums"
                value={bankDepositInput || (r?.bankDeposit ?? "")}
                onChange={e => setBankDepositInput(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Closing Cash in Hand (₹)</Label>
              <Input
                type="number"
                placeholder="0.00"
                className="bg-secondary border-border/50 tabular-nums"
                value={closingCashInput || (r?.closingCash ?? "")}
                onChange={e => setClosingCashInput(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Opening Stock — Petrol (Litres)</Label>
              <Input
                type="number"
                placeholder="0.000"
                className="bg-secondary border-border/50 tabular-nums"
                value={openingStockInput || (r?.openingStock ?? "")}
                onChange={e => setOpeningStockInput(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Closing Stock — Petrol (Litres)</Label>
              <Input
                type="number"
                placeholder="0.000"
                className="bg-secondary border-border/50 tabular-nums"
                value={closingStockInput || (r?.closingStock ?? "")}
                onChange={e => setClosingStockInput(e.target.value)}
              />
            </div>

            {/* Cash reconciliation formula */}
            <div className={`p-3 rounded-xl border mt-2 ${isBalanced && (cashSales > 0 || bankDeposit > 0) ? "bg-green-500/5 border-green-500/20" : cashSales > 0 || bankDeposit > 0 ? "bg-red-500/5 border-red-500/20" : "bg-muted/20 border-border/40"}`}>
              <p className="text-xs text-muted-foreground mb-1.5">Cash Reconciliation</p>
              <p className="text-[10px] text-muted-foreground/60 mb-2">Cash Sales − Bank Deposit − Closing Cash</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Difference</span>
                <div className="text-right">
                  <span className={`text-xl font-bold tabular-nums ${isBalanced ? "text-green-400" : "text-red-400"}`}>
                    {difference >= 0 ? "+" : ""}{fmt(difference)}
                  </span>
                  <p className="text-[10px] text-muted-foreground/50 tabular-nums">
                    {difference >= 0 ? "+" : ""}{fmtFull(Math.abs(difference))}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Save Button ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button
          className="sm:w-auto"
          onClick={() => {
            upsertRecon.mutate({
              reportDate: selectedDate,
              cashCollected: cashSales,
              cardCollected: cardSales,
              creditSales,
              totalSalesValue: totalSales,
              totalCollected: cashSales + cardSales + onlineSales,
              bankDeposit,
              cashBalance: closingCash,
              openingStockPetrol: parseFloat(openingStockInput || "0") || 0,
              closingStockPetrol: parseFloat(closingStockInput || "0") || 0,
              reconciliationStatus: isBalanced ? "reconciled" : "discrepancy",
            });
          }}
          disabled={upsertRecon.isPending}
        >
          <GitMerge className="w-4 h-4 mr-2" />
          {upsertRecon.isPending ? "Saving..." : "Save Reconciliation"}
        </Button>
        {r && (
          <Badge
            className={`text-xs ${r.reconciliationStatus === "reconciled" ? "bg-green-500/20 text-green-400 border-green-500/30" : r.reconciliationStatus === "discrepancy" ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-muted text-muted-foreground"} border`}
          >
            {r.reconciliationStatus ?? "pending"}
          </Badge>
        )}
      </div>
    </div>
  );
}
