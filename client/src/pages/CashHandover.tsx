import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Banknote, CheckCircle2, Clock, AlertTriangle, Fuel,
  FileText, RefreshCw, ChevronRight, Building2, Wallet,
  TrendingDown, TrendingUp, Printer
} from "lucide-react";
import { fmtCurrency as fmtINR } from "@/lib/format";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Nozzle Confirm Card ──────────────────────────────────────────────────────
function NozzleHandoverCard({
  nozzle,
  onConfirm,
  isConfirming,
}: {
  nozzle: any;
  onConfirm: (nozzleId: number, actualAmount: number) => void;
  isConfirming: boolean;
}) {
  const [actualAmount, setActualAmount] = useState(
    nozzle.confirmed ? String(nozzle.actualAmount ?? nozzle.netCash) : String(nozzle.netCash.toFixed(2))
  );

  const fuelColor = nozzle.fuelType === "petrol"
    ? "from-teal-50 to-teal-50 border-teal-200"
    : "from-blue-50 to-sky-50 border-blue-200";
  const fuelBadge = nozzle.fuelType === "petrol"
    ? "bg-teal-100 text-teal-700"
    : "bg-blue-100 text-blue-700";

  const variance = Number(actualAmount || 0) - nozzle.netCash;
  const varianceColor = Math.abs(variance) < 1 ? "text-green-600" : variance > 0 ? "text-blue-600" : "text-red-600";

  return (
    <Card className={`border bg-gradient-to-br ${fuelColor} transition-all ${nozzle.confirmed ? "opacity-80" : ""}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">{nozzle.pumpLabel}</span>
            <Badge className={`text-xs ${fuelBadge}`}>{nozzle.fuelType.toUpperCase()}</Badge>
          </div>
          {nozzle.confirmed ? (
            <Badge className="bg-green-100 text-green-700 gap-1">
              <CheckCircle2 className="h-3 w-3" /> Confirmed
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-teal-600 border-teal-300">
              <Clock className="h-3 w-3" /> Pending
            </Badge>
          )}
        </div>

        {/* Nozzle label */}
        <p className="text-xs text-muted-foreground mb-3">{nozzle.nozzleLabel}</p>

        {/* Breakdown */}
        <div className="space-y-1.5 mb-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" /> Cash Sales
            </span>
            <span className="font-medium text-green-700">{fmtINR(nozzle.cashCollected)}</span>
          </div>
          {nozzle.cashExpenses > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-red-500" /> Cash Expenses
              </span>
              <span className="font-medium text-red-600">− {fmtINR(nozzle.cashExpenses)}</span>
            </div>
          )}
          <Separator className="my-1" />
          <div className="flex justify-between text-sm font-semibold">
            <span>Expected Handover</span>
            <span className="text-foreground">{fmtINR(nozzle.netCash)}</span>
          </div>
        </div>

        {/* Actual amount input */}
        {!nozzle.confirmed ? (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Actual Cash Counted (₹)</label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={actualAmount}
                onChange={e => setActualAmount(e.target.value)}
                className="h-9 text-sm font-medium"
                placeholder="Enter amount"
                min={0}
                step={0.01}
              />
              <Button
                size="sm"
                onClick={() => onConfirm(nozzle.nozzleId, Number(actualAmount))}
                disabled={isConfirming || !actualAmount}
                className="h-9 px-4 whitespace-nowrap"
              >
                {isConfirming ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                <span className="ml-1">Confirm</span>
              </Button>
            </div>
            {Number(actualAmount) > 0 && Math.abs(variance) >= 1 && (
              <p className={`text-xs ${varianceColor} flex items-center gap-1`}>
                <AlertTriangle className="h-3 w-3" />
                Variance: {variance > 0 ? "+" : ""}{fmtINR(variance)} vs expected
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white/60 rounded-lg p-2.5 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Actual Collected</span>
              <span className="font-semibold">{fmtINR(nozzle.actualAmount)}</span>
            </div>
            {nozzle.variance !== null && Math.abs(nozzle.variance) >= 0.01 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Variance</span>
                <span className={nozzle.variance > 0 ? "text-blue-600" : "text-red-600"}>
                  {nozzle.variance > 0 ? "+" : ""}{fmtINR(nozzle.variance)}
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Confirmed by {nozzle.confirmedBy} at {nozzle.confirmedAt ? new Date(nozzle.confirmedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CashHandover() {
  const [selectedDate, setSelectedDate] = useState(today());
  const [floatRetained, setFloatRetained] = useState("0");
  const [confirmingNozzle, setConfirmingNozzle] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showVoucher, setShowVoucher] = useState(false);

  const utils = trpc.useUtils();

  const { data: summary, isLoading } = trpc.cashHandover.getSummary.useQuery(
    { date: selectedDate },
    { refetchInterval: 30_000 }
  );

  const confirmMutation = trpc.cashHandover.confirmNozzle.useMutation({
    onSuccess: () => {
      utils.cashHandover.getSummary.invalidate();
      toast.success("Nozzle cash confirmed");
    },
    onError: (e) => toast.error(e.message),
  });

  const finaliseMutation = trpc.cashHandover.finaliseAndGenerateVoucher.useMutation({
    onSuccess: (data) => {
      utils.cashHandover.getSummary.invalidate();
      toast.success(`Voucher ${data.voucherNumber} generated — ₹${data.depositAmount.toLocaleString("en-IN")} to deposit`);
      setShowVoucher(true);
    },
    onError: (e) => toast.error(e.message),
  });

  const autoMatchMutation = trpc.cashHandover.autoMatch.useMutation({
    onSuccess: (data) => {
      utils.cashHandover.getSummary.invalidate();
      toast.success(data.message);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleConfirm = async (nozzleId: number, actualAmount: number) => {
    setConfirmingNozzle(nozzleId);
    try {
      await confirmMutation.mutateAsync({ date: selectedDate, nozzleId, actualAmount });
    } finally {
      setConfirmingNozzle(null);
    }
  };

  const handleGenerateVoucher = async () => {
    setIsGenerating(true);
    try {
      await finaliseMutation.mutateAsync({
        date: selectedDate,
        floatRetained: Number(floatRetained) || 0,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const depositAmount = summary
    ? (summary.totalConfirmed || summary.totalNetCash) - (Number(floatRetained) || 0)
    : 0;

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold flex items-center gap-2">
            <Banknote className="h-6 w-6 text-green-600" />
            Cash Handover
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Collect and confirm cash from each nozzle, then generate the bank deposit voucher.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="w-40 h-9"
          />
          {summary?.existingVoucher && (
            <Button variant="outline" size="sm" onClick={() => setShowVoucher(true)}>
              <FileText className="h-4 w-4 mr-1" /> View Voucher
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : summary ? (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-0 bg-green-50">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Total Cash Sales</p>
                <p className="text-lg font-bold text-green-700">{fmtINR(summary.totalCashCollected)}</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-red-50">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Cash Expenses</p>
                <p className="text-lg font-bold text-red-600">− {fmtINR(summary.totalCashExpenses)}</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-blue-50">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Net to Collect</p>
                <p className="text-lg font-bold text-blue-700">{fmtINR(summary.totalNetCash)}</p>
              </CardContent>
            </Card>
            <Card className={`border-0 ${summary.allConfirmed ? "bg-emerald-50" : "bg-teal-50"}`}>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Confirmed</p>
                <p className={`text-lg font-bold ${summary.allConfirmed ? "text-emerald-700" : "text-teal-600"}`}>
                  {summary.nozzles.filter((n: any) => n.confirmed).length} / {summary.nozzles.length} nozzles
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Per-nozzle cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {summary.nozzles.map((nozzle: any) => (
              <NozzleHandoverCard
                key={nozzle.nozzleId}
                nozzle={nozzle}
                onConfirm={handleConfirm}
                isConfirming={confirmingNozzle === nozzle.nozzleId}
              />
            ))}
          </div>

          {/* Deposit summary & voucher generation */}
          {!summary.existingVoucher ? (
            <Card className="border-2 border-dashed border-green-300 bg-green-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-green-600" />
                  Bank Deposit Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Cash Confirmed</span>
                      <span className="font-semibold">{fmtINR(summary.totalConfirmed || summary.totalNetCash)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-muted-foreground whitespace-nowrap">Float to Retain (₹)</label>
                      <Input
                        type="number"
                        value={floatRetained}
                        onChange={e => setFloatRetained(e.target.value)}
                        className="h-8 w-32 text-sm"
                        min={0}
                        placeholder="0"
                      />
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                      <span>Amount to Deposit</span>
                      <span className="text-green-700">{fmtINR(Math.max(0, depositAmount))}</span>
                    </div>
                  </div>
                  <div className="flex flex-col justify-end">
                    <Button
                      onClick={handleGenerateVoucher}
                      disabled={isGenerating || !summary.allConfirmed}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isGenerating ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      Generate Voucher
                    </Button>
                    {!summary.allConfirmed && (
                      <p className="text-xs text-muted-foreground mt-1.5 text-center">
                        Confirm all nozzles first
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-green-300 bg-green-50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-800">
                      Voucher {summary.existingVoucher.voucherNumber} Generated
                    </p>
                    <p className="text-sm text-green-700">
                      Deposit Amount: {fmtINR(summary.existingVoucher.depositAmount)} ·{" "}
                      <Badge className={
                        summary.existingVoucher.status === "reconciled"
                          ? "bg-emerald-100 text-emerald-700"
                          : summary.existingVoucher.status === "deposited"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-teal-100 text-teal-700"
                      }>
                        {summary.existingVoucher.status.charAt(0).toUpperCase() + summary.existingVoucher.status.slice(1)}
                      </Badge>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {summary.existingVoucher.status !== "reconciled" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => autoMatchMutation.mutate({ date: selectedDate })}
                      disabled={autoMatchMutation.isPending}
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${autoMatchMutation.isPending ? "animate-spin" : ""}`} />
                      Auto-Match Bank
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setShowVoucher(true)}>
                    <FileText className="h-3 w-3 mr-1" /> View Voucher
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Banknote className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No nozzle data available for {selectedDate}.</p>
            <p className="text-sm mt-1">Ensure nozzle sessions have been recorded for this date.</p>
          </CardContent>
        </Card>
      )}

      {/* Voucher Modal */}
      {showVoucher && summary?.existingVoucher && (
        <VoucherModal
          voucherId={summary.existingVoucher.id}
          onClose={() => setShowVoucher(false)}
        />
      )}
    </div>
  );
}

// ─── Voucher Modal ────────────────────────────────────────────────────────────
function VoucherModal({ voucherId, onClose }: { voucherId: number; onClose: () => void }) {
  const { data: voucher, isLoading } = trpc.cashHandover.getVoucher.useQuery({ id: voucherId });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : voucher ? (
          <div id="voucher-print" className="p-8 space-y-6">
            {/* Voucher header */}
            <div className="text-center border-b pb-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Fuel className="h-5 w-5 text-green-600" />
                <span className="font-bold text-lg">BEES Fuel Station</span>
              </div>
              <p className="text-sm text-muted-foreground">Velgatoor, Nizamabad District, Telangana — 503 175</p>
              <div className="mt-3 inline-block bg-green-50 border border-green-200 rounded-lg px-4 py-1.5">
                <p className="font-bold text-green-800 text-base">CASH DEPOSIT VOUCHER</p>
                <p className="text-xs text-green-700">{voucher.voucherNumber}</p>
              </div>
            </div>

            {/* Status & date */}
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-muted-foreground">Voucher Date</p>
                <p className="font-semibold">{new Date(voucher.voucherDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
              <Badge className={
                voucher.status === "reconciled" ? "bg-emerald-100 text-emerald-700" :
                voucher.status === "deposited" ? "bg-blue-100 text-blue-700" :
                "bg-teal-100 text-teal-700"
              }>
                {voucher.status === "reconciled" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {voucher.status.charAt(0).toUpperCase() + voucher.status.slice(1)}
              </Badge>
            </div>

            {/* Per-nozzle breakdown */}
            <div>
              <p className="text-sm font-semibold mb-2">Nozzle Breakdown</p>
              <div className="rounded-lg border overflow-hidden overflow-x-auto">
                <table className="w-full text-sm min-w-[480px]">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2.5 font-medium">Nozzle</th>
                      <th className="text-right p-2.5 font-medium">Cash Sales</th>
                      <th className="text-right p-2.5 font-medium">Expenses</th>
                      <th className="text-right p-2.5 font-medium">Net</th>
                      <th className="text-right p-2.5 font-medium">Actual</th>
                      <th className="text-right p-2.5 font-medium">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voucher.nozzleSessions.map((s: any) => (
                      <tr key={s.id} className="border-t">
                        <td className="p-2.5">
                          <span className="font-medium">{s.nozzleLabel}</span>
                          <Badge className={`ml-2 text-xs ${s.fuelType === "petrol" ? "bg-teal-100 text-teal-700" : "bg-blue-100 text-blue-700"}`}>
                            {s.fuelType}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-right">{fmtINR(s.cashCollected)}</td>
                        <td className="p-2.5 text-right text-red-600">{s.cashExpenses > 0 ? `− ${fmtINR(s.cashExpenses)}` : "—"}</td>
                        <td className="p-2.5 text-right font-medium">{fmtINR(s.netCash)}</td>
                        <td className="p-2.5 text-right font-semibold">{s.actualAmount != null ? fmtINR(s.actualAmount) : "—"}</td>
                        <td className={`p-2.5 text-right text-xs ${s.variance && s.variance > 0 ? "text-blue-600" : s.variance && s.variance < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                          {s.variance != null ? (s.variance > 0 ? "+" : "") + fmtINR(s.variance) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 border-t-2">
                    <tr>
                      <td className="p-2.5 font-bold">Total</td>
                      <td className="p-2.5 text-right font-bold text-green-700">{fmtINR(voucher.totalCashCollected)}</td>
                      <td className="p-2.5 text-right font-bold text-red-600">− {fmtINR(voucher.totalCashExpenses)}</td>
                      <td className="p-2.5 text-right font-bold" colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Deposit summary */}
            <div className="bg-green-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Cash Collected</span>
                <span className="font-medium">{fmtINR(voucher.totalCashCollected)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cash Expenses Deducted</span>
                <span className="font-medium text-red-600">− {fmtINR(voucher.totalCashExpenses)}</span>
              </div>
              {voucher.floatRetained > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Float Retained at Station</span>
                  <span className="font-medium text-teal-600">− {fmtINR(voucher.floatRetained)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Amount to Deposit</span>
                <span className="text-green-700 text-lg">{fmtINR(voucher.depositAmount)}</span>
              </div>
            </div>

            {/* Bank instructions */}
            <div className="border rounded-xl p-4">
              <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-blue-600" /> Deposit Instructions
              </p>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                {voucher.depositInstructions}
              </pre>
            </div>

            {/* Reconciliation status */}
            {voucher.status === "reconciled" ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Reconciled with Bank Statement</p>
                  <p className="text-xs text-emerald-700">
                    Matched to: {voucher.bankTxnDescription} · {fmtINR(voucher.bankTxnAmount ?? 0)} ·
                    Reconciled by {voucher.reconciledBy} on {voucher.reconciledAt ? new Date(voucher.reconciledAt).toLocaleDateString("en-IN") : "—"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-teal-600" />
                <p className="text-sm text-teal-700">Awaiting bank statement reconciliation</p>
              </div>
            )}

            {/* Signature line */}
            <div className="grid grid-cols-2 gap-8 pt-4 border-t">
              <div className="text-center">
                <div className="h-12 border-b border-dashed border-gray-400 mb-1" />
                <p className="text-xs text-muted-foreground">Prepared by (Manager)</p>
              </div>
              <div className="text-center">
                <div className="h-12 border-b border-dashed border-gray-400 mb-1" />
                <p className="text-xs text-muted-foreground">Received by (Bank Staff)</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 print:hidden">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white">
                <Printer className="h-4 w-4 mr-2" /> Print Voucher
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">Voucher not found.</div>
        )}
      </div>
    </div>
  );
}
