import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Landmark, Plus, ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const txTypeColors: Record<string, string> = {
  "NEFT": "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "RTGS": "text-purple-400 bg-purple-500/10 border-purple-500/20",
  "IMPS": "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  "Cash": "text-green-400 bg-green-500/10 border-green-500/20",
  "Credit Card": "text-amber-400 bg-amber-500/10 border-amber-500/20",
  "UPI": "text-pink-400 bg-pink-500/10 border-pink-500/20",
};

export default function BankStatement() {
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    transactionDate: format(new Date(), "yyyy-MM-dd"),
    description: "",
    transactionType: "NEFT",
    withdrawal: "",
    deposit: "",
    referenceNo: "",
  });

  // Default to latest data month (March 2026) since current month has no data yet
  const today = "2026-03-31";
  const monthStart = "2026-03-01";

  const { data: transactions, refetch } = trpc.bank.list.useQuery({ startDate: monthStart, endDate: today });
  const { data: summary } = trpc.bank.summary.useQuery({ startDate: monthStart, endDate: today });

  const createTx = trpc.bank.create.useMutation({
    onSuccess: () => { toast.success("Transaction recorded"); setAddOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const reconcile = trpc.bank.reconcile.useMutation({
    onSuccess: () => { toast.success("Marked as reconciled"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const totalDeposits = Number(summary?.totalDeposits ?? 0);
  const totalWithdrawals = Number(summary?.totalWithdrawals ?? 0);
  const netFlow = totalDeposits - totalWithdrawals;
  const pendingCount = transactions?.filter((t: any) => t.reconciliationStatus === "pending").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bank Statement</h2>
          <p className="text-sm text-muted-foreground mt-0.5">NEFT, RTGS, IMPS, Cash and UPI transaction log with reconciliation</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Transaction</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border/50">
            <DialogHeader><DialogTitle>Record Bank Transaction</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" className="bg-secondary border-border/50" value={form.transactionDate} onChange={e => setForm(f => ({ ...f, transactionDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select defaultValue="NEFT" onValueChange={v => setForm(f => ({ ...f, transactionType: v }))}>
                    <SelectTrigger className="bg-secondary border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["NEFT", "RTGS", "IMPS", "Cash", "Credit Card", "UPI"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Description *</Label>
                  <Input placeholder="Transaction description" className="bg-secondary border-border/50" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Deposit (Rs)</Label>
                  <Input placeholder="0.00" className="bg-secondary border-border/50" value={form.deposit} onChange={e => setForm(f => ({ ...f, deposit: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Withdrawal (Rs)</Label>
                  <Input placeholder="0.00" className="bg-secondary border-border/50" value={form.withdrawal} onChange={e => setForm(f => ({ ...f, withdrawal: e.target.value }))} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Reference No.</Label>
                  <Input placeholder="UTR / Cheque / Reference" className="bg-secondary border-border/50" value={form.referenceNo} onChange={e => setForm(f => ({ ...f, referenceNo: e.target.value }))} />
                </div>
              </div>
              <Button className="w-full" onClick={() => {
                if (!form.description) { toast.error("Description required"); return; }
                createTx.mutate({
                  transactionDate: form.transactionDate,
                  description: form.description,
                  transactionType: form.transactionType as any,
                  withdrawal: parseFloat(form.withdrawal || "0"),
                  deposit: parseFloat(form.deposit || "0"),
                  referenceNo: form.referenceNo || undefined,
                });
              }} disabled={createTx.isPending}>
                {createTx.isPending ? "Recording..." : "Record Transaction"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2"><ArrowDownLeft className="w-4 h-4 text-green-400" /><span className="text-xs text-muted-foreground">Total Deposits</span></div>
          <p className="text-xl font-bold tabular-nums text-green-400">{fmt(totalDeposits)}</p>
        </CardContent></Card>
        <Card className="bg-card border-border/50"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2"><ArrowUpRight className="w-4 h-4 text-red-400" /><span className="text-xs text-muted-foreground">Total Withdrawals</span></div>
          <p className="text-xl font-bold tabular-nums text-red-400">{fmt(totalWithdrawals)}</p>
        </CardContent></Card>
        <Card className="bg-card border-border/50"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2"><Landmark className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Net Flow</span></div>
          <p className={`text-xl font-bold tabular-nums ${netFlow >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(netFlow)}</p>
        </CardContent></Card>
        <Card className="bg-card border-border/50"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-amber-400" /><span className="text-xs text-muted-foreground">Pending Recon.</span></div>
          <p className="text-xl font-bold tabular-nums text-amber-400">{pendingCount}</p>
        </CardContent></Card>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Landmark className="w-4 h-4 text-primary" /> Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {transactions && transactions.length > 0 ? (
            <div className="space-y-0">
              {transactions.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between py-3 border-b border-border/30 last:border-0 group">
                  <div className="flex items-center gap-3">
                    <Badge className={`text-[10px] shrink-0 ${txTypeColors[t.transactionType] ?? "text-muted-foreground bg-secondary"}`}>{t.transactionType}</Badge>
                    <div>
                      <p className="text-sm font-medium">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{t.transactionDate}{t.referenceNo ? " - " + t.referenceNo : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      {Number(t.deposit ?? 0) > 0 && <p className="text-sm font-semibold text-green-400 tabular-nums">+{fmt(Number(t.deposit))}</p>}
                      {Number(t.withdrawal ?? 0) > 0 && <p className="text-sm font-semibold text-red-400 tabular-nums">-{fmt(Number(t.withdrawal))}</p>}
                    </div>
                    {t.reconciliationStatus === "matched" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    ) : (
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-green-400" onClick={() => reconcile.mutate({ id: t.id, status: "matched" })}>
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Landmark className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No transactions recorded this month</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
