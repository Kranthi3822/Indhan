import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GitMerge, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function Reconciliation() {
  // Default to latest data date (March 31, 2026) since current month has no data yet
  const [selectedDate, setSelectedDate] = useState("2026-03-31");
  const [cashSalesInput, setCashSalesInput] = useState("");
  const [cardSalesInput, setCardSalesInput] = useState("");
  const [creditSalesInput, setCreditSalesInput] = useState("");
  const [bankDepositInput, setBankDepositInput] = useState("");
  const [closingCashInput, setClosingCashInput] = useState("");
  const [openingStockInput, setOpeningStockInput] = useState("");
  const [closingStockInput, setClosingStockInput] = useState("");

  const { data: recon, refetch } = trpc.reconciliation.byDate.useQuery({ reportDate: selectedDate });

  const upsertRecon = trpc.reconciliation.upsert.useMutation({
    onSuccess: () => { toast.success("Reconciliation saved"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const r = recon as any;

  const cashSales = parseFloat(cashSalesInput || String(r?.cashSales ?? 0)) || 0;
  const cardSales = parseFloat(cardSalesInput || String(r?.cardSales ?? 0)) || 0;
  const creditSales = parseFloat(creditSalesInput || String(r?.creditSales ?? 0)) || 0;
  const totalSales = cashSales + cardSales + creditSales;
  const bankDeposit = parseFloat(bankDepositInput || String(r?.bankDeposit ?? 0)) || 0;
  const closingCash = parseFloat(closingCashInput || String(r?.closingCash ?? 0)) || 0;
  const difference = cashSales - bankDeposit - closingCash;
  const isBalanced = Math.abs(difference) < 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Daily Reconciliation</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Automated matching of cash, card, and bank transactions</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Date</Label>
          <Input type="date" className="bg-secondary border-border/50 h-8 text-xs w-36" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        </div>
      </div>

      <div className={`p-4 rounded-xl border flex items-center gap-3 ${isBalanced && r ? "bg-green-500/10 border-green-500/20" : r ? "bg-red-500/10 border-red-500/20" : "bg-secondary border-border/40"}`}>
        {r ? (
          isBalanced ? (
            <><CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" /><div><p className="text-sm font-semibold text-green-400">Reconciliation Balanced</p><p className="text-xs text-muted-foreground">All transactions match for {selectedDate}</p></div></>
          ) : (
            <><AlertCircle className="w-5 h-5 text-red-400 shrink-0" /><div><p className="text-sm font-semibold text-red-400">Discrepancy Detected</p><p className="text-xs text-muted-foreground">Difference of {fmt(Math.abs(difference))} needs investigation</p></div></>
          )
        ) : (
          <><Clock className="w-5 h-5 text-muted-foreground shrink-0" /><div><p className="text-sm font-semibold">No Reconciliation Data</p><p className="text-xs text-muted-foreground">Enter figures below to reconcile {selectedDate}</p></div></>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3 pt-4 px-5"><CardTitle className="text-sm font-semibold">Sales Figures</CardTitle></CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Cash Sales (Rs)</Label>
              <Input type="number" placeholder="0.00" className="bg-secondary border-border/50" value={cashSalesInput || (r?.cashSales ?? "")} onChange={e => setCashSalesInput(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Card / POS Sales (Rs)</Label>
              <Input type="number" placeholder="0.00" className="bg-secondary border-border/50" value={cardSalesInput || (r?.cardSales ?? "")} onChange={e => setCardSalesInput(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Credit Sales (Rs)</Label>
              <Input type="number" placeholder="0.00" className="bg-secondary border-border/50" value={creditSalesInput || (r?.creditSales ?? "")} onChange={e => setCreditSalesInput(e.target.value)} />
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 border border-border/40 flex justify-between">
              <span className="text-xs text-muted-foreground">Total Sales</span>
              <span className="text-sm font-bold text-primary tabular-nums">{fmt(totalSales)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3 pt-4 px-5"><CardTitle className="text-sm font-semibold">Cash and Bank Position</CardTitle></CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Bank Deposit (Rs)</Label>
              <Input type="number" placeholder="0.00" className="bg-secondary border-border/50" value={bankDepositInput || (r?.bankDeposit ?? "")} onChange={e => setBankDepositInput(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Closing Cash in Hand (Rs)</Label>
              <Input type="number" placeholder="0.00" className="bg-secondary border-border/50" value={closingCashInput || (r?.closingCash ?? "")} onChange={e => setClosingCashInput(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Opening Stock (Litres)</Label>
              <Input type="number" placeholder="0.000" className="bg-secondary border-border/50" value={openingStockInput || (r?.openingStock ?? "")} onChange={e => setOpeningStockInput(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Closing Stock (Litres)</Label>
              <Input type="number" placeholder="0.000" className="bg-secondary border-border/50" value={closingStockInput || (r?.closingStock ?? "")} onChange={e => setClosingStockInput(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={`border ${isBalanced && (cashSales > 0 || bankDeposit > 0) ? "bg-green-500/5 border-green-500/20" : cashSales > 0 || bankDeposit > 0 ? "bg-red-500/5 border-red-500/20" : "bg-card border-border/50"}`}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Cash Reconciliation Difference</p>
              <p className="text-xs text-muted-foreground mt-0.5">Cash Sales minus Bank Deposit minus Closing Cash</p>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${isBalanced ? "text-green-400" : "text-red-400"}`}>
              {difference >= 0 ? "+" : ""}{fmt(difference)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full sm:w-auto" onClick={() => {
        upsertRecon.mutate({
          reportDate: selectedDate,
          cashCollected: cashSales,
          cardCollected: cardSales,
          creditSales,
          totalSalesValue: totalSales,
          totalCollected: cashSales + cardSales,
          bankDeposit,
          cashBalance: closingCash,
          openingStockPetrol: parseFloat(openingStockInput || "0") || 0,
          closingStockPetrol: parseFloat(closingStockInput || "0") || 0,
          reconciliationStatus: isBalanced ? "reconciled" : "discrepancy",
        });
      }} disabled={upsertRecon.isPending}>
        <GitMerge className="w-4 h-4 mr-2" />
        {upsertRecon.isPending ? "Saving..." : "Save Reconciliation"}
      </Button>
    </div>
  );
}
