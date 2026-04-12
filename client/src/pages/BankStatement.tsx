import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Landmark, Plus, ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock, Calendar,
  Wifi, CreditCard, Banknote, Building2, Smartphone, TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine
} from "recharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const fmtCompact = (n: number) => {
  if (Math.abs(n) >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (Math.abs(n) >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (Math.abs(n) >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
};

// Transaction type metadata — icon + colour
const TX_META: Record<string, { icon: any; color: string; bg: string; border: string; label: string }> = {
  "NEFT":        { icon: Building2,   color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30",   label: "NEFT" },
  "RTGS":        { icon: TrendingUp,  color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", label: "RTGS" },
  "IMPS":        { icon: Wifi,        color: "text-cyan-400",   bg: "bg-cyan-500/10",   border: "border-cyan-500/30",   label: "IMPS" },
  "Cash":        { icon: Banknote,    color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/30",  label: "Cash" },
  "Credit Card": { icon: CreditCard,  color: "text-teal-400",  bg: "bg-teal-500/10",  border: "border-teal-500/30",  label: "Card" },
  "UPI":         { icon: Smartphone,  color: "text-pink-400",   bg: "bg-pink-500/10",   border: "border-pink-500/30",   label: "UPI" },
};
const DEFAULT_TX: { icon: any; color: string; bg: string; border: string; label: string } = { icon: Landmark, color: "text-muted-foreground", bg: "bg-secondary", border: "border-border/50", label: "TXN" };

const PRESETS = [
  { label: "Mar 2026", start: "2026-03-01", end: "2026-03-31" },
  { label: "Feb 2026", start: "2026-02-01", end: "2026-02-28" },
  { label: "Jan 2026", start: "2026-01-01", end: "2026-01-31" },
  { label: "Q1 2026",  start: "2026-01-01", end: "2026-03-31" },
  { label: "Custom",   start: "",           end: "" },
];

export default function BankStatement() {
  const [addOpen, setAddOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(0);
  const [startDate, setStartDate] = useState("2026-03-01");
  const [endDate, setEndDate] = useState("2026-03-31");

  const [form, setForm] = useState({
    transactionDate: format(new Date(), "yyyy-MM-dd"),
    description: "",
    transactionType: "NEFT",
    withdrawal: "",
    deposit: "",
    referenceNo: "",
  });

  const { data: transactions, refetch } = trpc.bank.list.useQuery({ startDate, endDate });
  const { data: summary } = trpc.bank.summary.useQuery({ startDate, endDate });

  const createTx = trpc.bank.create.useMutation({
    onSuccess: () => { toast.success("Transaction recorded"); setAddOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const reconcile = trpc.bank.reconcile.useMutation({
    onSuccess: () => { toast.success("Marked as reconciled"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  function applyPreset(idx: number) {
    setActivePreset(idx);
    if (idx < PRESETS.length - 1) {
      setStartDate(PRESETS[idx].start);
      setEndDate(PRESETS[idx].end);
    }
  }

  const totalDeposits = Number(summary?.totalDeposits ?? 0);
  const totalWithdrawals = Number(summary?.totalWithdrawals ?? 0);
  const netFlow = totalDeposits - totalWithdrawals;
  const pendingCount = transactions?.filter((t: any) => t.reconciliationStatus === "pending").length ?? 0;

  // Build running balance chart data (sorted chronologically)
  const balanceChartData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    const sorted = [...transactions].sort((a: any, b: any) =>
      new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
    );
    let running = 0;
    // Group by date and compute end-of-day balance
    const byDate: Record<string, number> = {};
    for (const t of sorted) {
      running += Number(t.deposit ?? 0) - Number(t.withdrawal ?? 0);
      const dateKey = String(t.transactionDate ?? "");
      byDate[dateKey] = running;
    }
    return Object.entries(byDate).map(([date, balance]) => ({
      date: date.slice(5), // MM-DD
      balance,
    }));
  }, [transactions]);

  return (
    <div className="space-y-5">
      {/* Header + Add */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bank Statement</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Transaction history and reconciliation</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Transaction</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border/50">
            <DialogHeader><DialogTitle>Record Bank Transaction</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <Label>Deposit (₹)</Label>
                  <Input type="number" placeholder="0.00" className="bg-secondary border-border/50" value={form.deposit} onChange={e => setForm(f => ({ ...f, deposit: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Withdrawal (₹)</Label>
                  <Input type="number" placeholder="0.00" className="bg-secondary border-border/50" value={form.withdrawal} onChange={e => setForm(f => ({ ...f, withdrawal: e.target.value }))} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Reference No.</Label>
                  <Input placeholder="Optional" className="bg-secondary border-border/50" value={form.referenceNo} onChange={e => setForm(f => ({ ...f, referenceNo: e.target.value }))} />
                </div>
              </div>
              <Button className="w-full" onClick={() => {
                if (!form.description) { toast.error("Description is required"); return; }
                createTx.mutate({
                  transactionDate: form.transactionDate,
                  description: form.description,
                  transactionType: form.transactionType as any,
                  deposit: parseFloat(form.deposit || "0"),
                  withdrawal: parseFloat(form.withdrawal || "0"),
                  referenceNo: form.referenceNo || undefined,
                });
              }} disabled={createTx.isPending}>
                {createTx.isPending ? "Saving..." : "Record Transaction"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Period Filter */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.slice(0, -1).map((p, i) => (
          <Button key={p.label} variant={activePreset === i ? "default" : "outline"} size="sm" className="text-xs h-8" onClick={() => applyPreset(i)}>
            {p.label}
          </Button>
        ))}
        <Button variant={activePreset === PRESETS.length - 1 ? "default" : "outline"} size="sm" className="text-xs h-8 gap-1" onClick={() => setActivePreset(PRESETS.length - 1)}>
          <Calendar className="w-3 h-3" /> Custom
        </Button>
        {activePreset === PRESETS.length - 1 && (
          <>
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" className="bg-secondary border-border/50 h-8 text-xs w-36" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" className="bg-secondary border-border/50 h-8 text-xs w-36" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="w-9 h-9 rounded-lg border border-green-500/20 bg-green-500/10 flex items-center justify-center mb-3">
              <ArrowDownLeft className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-lg font-bold tabular-nums text-green-400">{fmtCompact(totalDeposits)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total Deposits</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="w-9 h-9 rounded-lg border border-red-500/20 bg-red-500/10 flex items-center justify-center mb-3">
              <ArrowUpRight className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-lg font-bold tabular-nums text-red-400">{fmtCompact(totalWithdrawals)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total Withdrawals</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="w-9 h-9 rounded-lg border border-primary/20 bg-primary/10 flex items-center justify-center mb-3">
              <Landmark className="w-4 h-4 text-primary" />
            </div>
            <p className={`text-lg font-bold tabular-nums ${netFlow >= 0 ? "text-primary" : "text-red-400"}`}>{fmtCompact(netFlow)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Net Flow</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="w-9 h-9 rounded-lg border border-teal-500/20 bg-teal-500/10 flex items-center justify-center mb-3">
              <Clock className="w-4 h-4 text-teal-400" />
            </div>
            <p className="text-lg font-bold tabular-nums text-teal-400">{pendingCount}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Pending Reconciliation</p>
          </CardContent>
        </Card>
      </div>

      {/* Running Balance Trend Chart */}
      {balanceChartData.length > 1 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Running Balance Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={balanceChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={v => fmtCompact(v)} width={55} />
                <Tooltip
                  formatter={(v: any) => [fmt(Number(v)), "Balance"]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="4 2" />
                <Area type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#balGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Transaction List */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold">Transactions ({transactions?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {transactions && transactions.length > 0 ? (
            <div className="space-y-1.5">
              {transactions.slice(0, 150).map((t: any) => {
                const isCredit = Number(t.deposit) > 0;
                const isDebit = Number(t.withdrawal) > 0;
                const meta = TX_META[t.transactionType] ?? DEFAULT_TX;
                const Icon = meta.icon;
                return (
                  <div
                    key={t.id}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border transition-colors ${
                      isCredit
                        ? "bg-green-500/5 border-green-500/15 hover:bg-green-500/10"
                        : isDebit
                        ? "bg-red-500/5 border-red-500/15 hover:bg-red-500/10"
                        : "bg-secondary/40 border-border/30"
                    }`}
                  >
                    {/* Type icon */}
                    <div className={`w-8 h-8 rounded-lg ${meta.bg} border ${meta.border} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                    </div>

                    {/* Direction indicator */}
                    <div className="shrink-0">
                      {isCredit ? (
                        <ArrowDownLeft className="w-3.5 h-3.5 text-green-400" />
                      ) : isDebit ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />
                      ) : null}
                    </div>

                    {/* Description */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{t.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">{t.transactionDate}</span>
                        {t.referenceNo && (
                          <>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{t.referenceNo}</span>
                          </>
                        )}
                        <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${meta.bg} ${meta.border} ${meta.color}`}>
                          {meta.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Amount + reconcile */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        {Number(t.deposit) > 0 && (
                          <p className="text-sm font-bold tabular-nums text-green-400">+{fmt(Number(t.deposit))}</p>
                        )}
                        {Number(t.withdrawal) > 0 && (
                          <p className="text-sm font-bold tabular-nums text-red-400">−{fmt(Number(t.withdrawal))}</p>
                        )}
                      </div>
                      {t.reconciliationStatus === "matched" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[10px] h-6 px-2 shrink-0"
                          onClick={() => reconcile.mutate({ id: t.id, status: "matched" })}
                          disabled={reconcile.isPending}
                        >
                          Reconcile
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No transactions found for this period.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
