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
  Plus, CheckCircle, Clock, XCircle, Calendar,
  Wallet, Users, Zap, Coffee, Wrench, Award, ShoppingCart, MoreHorizontal, Fuel
} from "lucide-react";
import { format } from "date-fns";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const fmtCompact = (n: number) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
};

const CATEGORY_META: Record<string, { icon: any; color: string; bg: string; bar: string }> = {
  "Wages":            { icon: Users,        color: "#60a5fa", bg: "bg-blue-500/10",    bar: "#60a5fa" },
  "Admin":            { icon: Wallet,       color: "#a78bfa", bg: "bg-purple-500/10",  bar: "#a78bfa" },
  "Electricity":      { icon: Zap,          color: "#17897e", bg: "bg-yellow-500/10",  bar: "#17897e" },
  "Hospitality":      { icon: Coffee,       color: "#f472b6", bg: "bg-pink-500/10",    bar: "#f472b6" },
  "Maintenance":      { icon: Wrench,       color: "#fb923c", bg: "bg-orange-500/10",  bar: "#fb923c" },
  "Performance Bonus":{ icon: Award,        color: "#34d399", bg: "bg-green-500/10",   bar: "#34d399" },
  "Purchase":         { icon: ShoppingCart, color: "#38bdf8", bg: "bg-sky-500/10",     bar: "#38bdf8" },
};

const DEFAULT_META = { icon: MoreHorizontal, color: "#94a3b8", bg: "bg-slate-500/10", bar: "#94a3b8" };

const EXPENSE_CATEGORIES = Object.keys(CATEGORY_META);

const PRESETS = [
  { label: "Mar 2026", start: "2026-03-01", end: "2026-03-31" },
  { label: "Feb 2026", start: "2026-02-01", end: "2026-02-28" },
  { label: "Jan 2026", start: "2026-01-01", end: "2026-01-31" },
  { label: "Q1 2026",  start: "2026-01-01", end: "2026-03-31" },
  { label: "FY 25-26", start: "2025-04-01", end: "2026-03-31" },
  { label: "Custom",   start: "",           end: "" },
];

const STATUS_ICON: Record<string, any> = {
  approved: <CheckCircle className="w-3.5 h-3.5 text-green-400" />,
  rejected: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  pending:  <Clock className="w-3.5 h-3.5 text-teal-400" />,
};

// Payment source options
const PAYMENT_SOURCES = [
  { value: "bank",         label: "Bank Transfer",     desc: "Paid from bank account" },
  { value: "cash_general", label: "Cash (General)",    desc: "Petty cash / office cash" },
  { value: "cash_nozzle",  label: "Cash from Nozzle",  desc: "Deducted from nozzle float" },
];

export default function Expenses() {
  const [addOpen, setAddOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(0);
  const [startDate, setStartDate] = useState("2026-03-01");
  const [endDate, setEndDate] = useState("2026-03-31");

  const [form, setForm] = useState({
    expenseDate: format(new Date("2026-03-31"), "yyyy-MM-dd"),
    category: "Wages",
    description: "",
    amount: "",
    paymentSource: "bank" as "bank" | "cash_nozzle" | "cash_general",
    nozzleId: "" as string,
    paidTo: "",
  });

  const { data: expenses, refetch } = trpc.expenses.list.useQuery({ startDate, endDate });
  const { data: summary } = trpc.expenses.summary.useQuery({ startDate, endDate });
  const { data: nozzles } = trpc.nozzle.getNozzles.useQuery();

  const createExpense = trpc.expenses.create.useMutation({
    onSuccess: () => { toast.success("Expense recorded"); setAddOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const approveExpense = trpc.expenses.approve.useMutation({
    onSuccess: () => { toast.success("Status updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  function applyPreset(idx: number) {
    setActivePreset(idx);
    if (idx < PRESETS.length - 1) {
      setStartDate(PRESETS[idx].start);
      setEndDate(PRESETS[idx].end);
    }
  }

  // Map modeOfPayment from paymentSource
  function getModeOfPayment(src: string): "Bank" | "Cash" | "Fuel" | "Online" {
    if (src === "bank") return "Bank";
    return "Cash";
  }

  const totalExpenses = expenses?.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0) ?? 0;
  const approvedTotal = expenses?.filter((e: any) => e.approvalStatus === "approved").reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0) ?? 0;
  const pendingCount = expenses?.filter((e: any) => e.approvalStatus === "pending").length ?? 0;

  // Build category breakdown from summary
  const categoryData = useMemo(() => {
    if (!summary || summary.length === 0) return [];
    const total = summary.reduce((s: number, c: any) => s + Number(c.total ?? c.totalAmount ?? 0), 0);
    return summary.map((c: any) => {
      const name = c.subHeadAccount ?? c.category ?? "Other";
      const amount = Number(c.total ?? c.totalAmount ?? 0);
      const meta = CATEGORY_META[name] ?? DEFAULT_META;
      return { name, amount, pct: total > 0 ? Math.round((amount / total) * 100) : 0, ...meta };
    }).sort((a: any, b: any) => b.amount - a.amount);
  }, [summary]);

  const maxCategoryAmount = categoryData[0]?.amount ?? 1;

  // Nozzle label helper
  function nozzleLabel(n: any) {
    return `Pump ${n.pumpNo} — ${n.fuelType === "petrol" ? "Petrol" : "Diesel"}`;
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.slice(0, -1).map((p, i) => (
            <Button key={p.label} variant={activePreset === i ? "default" : "outline"} size="sm" className="text-xs h-7 px-3" onClick={() => applyPreset(i)}>
              {p.label}
            </Button>
          ))}
          <Button variant={activePreset === PRESETS.length - 1 ? "default" : "outline"} size="sm" className="text-xs h-7 px-2 gap-1" onClick={() => setActivePreset(PRESETS.length - 1)}>
            <Calendar className="w-3 h-3" />
          </Button>
          {activePreset === PRESETS.length - 1 && (
            <>
              <Input type="date" className="bg-secondary border-border/50 h-7 text-xs w-34" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <Input type="date" className="bg-secondary border-border/50 h-7 text-xs w-34" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </>
          )}
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 h-8"><Plus className="w-3.5 h-3.5" /> Add</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border/50 max-w-md">
            <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" className="bg-secondary border-border/50 h-8 text-sm" value={form.expenseDate} onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <Select defaultValue="Wages" onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger className="bg-secondary border-border/50 h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Description</Label>
                  <Input placeholder="What was this for?" className="bg-secondary border-border/50 h-8 text-sm" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount (₹)</Label>
                  <Input placeholder="0" className="bg-secondary border-border/50 h-8 text-sm font-semibold" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Paid To</Label>
                  <Input placeholder="Vendor / Person" className="bg-secondary border-border/50 h-8 text-sm" value={form.paidTo} onChange={e => setForm(f => ({ ...f, paidTo: e.target.value }))} />
                </div>

                {/* Payment Source — 3 tap buttons */}
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Payment Source</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_SOURCES.map(ps => (
                      <button
                        key={ps.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, paymentSource: ps.value as any, nozzleId: "" }))}
                        className={`rounded-lg border px-2 py-2 text-left transition-all ${
                          form.paymentSource === ps.value
                            ? ps.value === "cash_nozzle"
                              ? "bg-orange-500/20 border-orange-500/50 text-orange-300"
                              : ps.value === "cash_general"
                              ? "bg-green-500/20 border-green-500/50 text-green-300"
                              : "bg-blue-500/20 border-blue-500/50 text-blue-300"
                            : "bg-secondary border-border/50 text-muted-foreground hover:border-border"
                        }`}
                      >
                        <p className="text-[11px] font-semibold leading-tight">{ps.label}</p>
                        <p className="text-[9px] mt-0.5 opacity-70 leading-tight">{ps.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nozzle selector — only when Cash from Nozzle */}
                {form.paymentSource === "cash_nozzle" && (
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs text-orange-400 font-semibold flex items-center gap-1">
                      <Fuel className="w-3 h-3" /> Select Nozzle <span className="text-red-400">*</span>
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(nozzles ?? []).map((n: any) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, nozzleId: String(n.id) }))}
                          className={`rounded-lg border px-3 py-2 text-left transition-all ${
                            form.nozzleId === String(n.id)
                              ? "bg-orange-500/20 border-orange-500/50 text-orange-300"
                              : "bg-secondary border-border/50 text-muted-foreground hover:border-orange-500/30"
                          }`}
                        >
                          <p className="text-xs font-semibold">{nozzleLabel(n)}</p>
                          <p className="text-[9px] opacity-60">Nozzle #{n.id}</p>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-orange-400/80">Cash will be deducted from this nozzle's float in Cash Handover</p>
                  </div>
                )}
              </div>
              <Button className="w-full" onClick={() => {
                if (!form.description || !form.amount) { toast.error("Fill required fields"); return; }
                if (form.paymentSource === "cash_nozzle" && !form.nozzleId) {
                  toast.error("Please select a nozzle for Cash from Nozzle expense");
                  return;
                }
                createExpense.mutate({
                  expenseDate: form.expenseDate,
                  headAccount: "Operating Activities",
                  subHeadAccount: form.category as any,
                  description: form.description,
                  amount: parseFloat(form.amount),
                  modeOfPayment: getModeOfPayment(form.paymentSource),
                  paidBy: form.paidTo || undefined,
                  paymentSource: form.paymentSource,
                  nozzleId: form.nozzleId ? parseInt(form.nozzleId) : undefined,
                });
              }} disabled={createExpense.isPending}>
                {createExpense.isPending ? "Saving..." : "Record"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums leading-tight">{fmtCompact(totalExpenses)}</p>
              <p className="text-[10px] text-muted-foreground">{PRESETS[activePreset]?.label ?? "Period"} · Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums leading-tight">{fmtCompact(approvedTotal)}</p>
              <p className="text-[10px] text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums leading-tight">{pendingCount}</p>
              <p className="text-[10px] text-muted-foreground">Pending Approval</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown + chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">By Category</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {categoryData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No data for period</p>
            ) : categoryData.map((c: any) => {
              const Icon = c.icon;
              return (
                <div key={c.name} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
                    <Icon className="w-3.5 h-3.5" style={{ color: c.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-xs font-medium truncate">{c.name}</span>
                      <span className="text-xs font-bold tabular-nums ml-2">{fmtCompact(c.amount)}</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(c.amount / maxCategoryAmount) * 100}%`, background: c.bar }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{c.pct}%</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Distribution</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {categoryData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No data for period</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={categoryData} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                    {categoryData.map((c: any, i: number) => <Cell key={i} fill={c.bar} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense list */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Transactions ({expenses?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {!expenses || expenses.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No expenses for this period</p>
          ) : (
            <div className="space-y-1.5">
              {expenses.map((e: any) => {
                const meta = CATEGORY_META[e.subHeadAccount] ?? DEFAULT_META;
                const Icon = meta.icon;
                const isNozzleCash = e.paymentSource === "cash_nozzle";
                const nozzle = isNozzleCash && nozzles ? nozzles.find((n: any) => n.id === e.nozzleId) : null;
                return (
                  <div key={e.id} className="flex items-center gap-3 rounded-lg bg-secondary/40 px-3 py-2.5">
                    <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                      <Icon className="w-4 h-4" style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{e.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">{e.expenseDate}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">{e.subHeadAccount}</span>
                        {isNozzleCash && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-orange-500/40 text-orange-400 bg-orange-500/10">
                            <Fuel className="w-2.5 h-2.5 mr-0.5" />
                            {nozzle ? nozzleLabel(nozzle) : `Nozzle #${e.nozzleId}`}
                          </Badge>
                        )}
                        {e.paymentSource === "cash_general" && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-green-500/40 text-green-400 bg-green-500/10">Cash</Badge>
                        )}
                        {e.paymentSource === "bank" && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-blue-500/40 text-blue-400 bg-blue-500/10">Bank</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold tabular-nums text-red-400">−{fmt(Number(e.amount))}</p>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        {STATUS_ICON[e.approvalStatus ?? "approved"]}
                        {e.approvalStatus === "pending" && (
                          <div className="flex gap-1">
                            <button onClick={() => approveExpense.mutate({ id: e.id, status: "approved", approvedBy: "Manager" })} className="text-[9px] text-green-400 hover:underline">✓</button>
                            <button onClick={() => approveExpense.mutate({ id: e.id, status: "rejected", approvedBy: "Manager" })} className="text-[9px] text-red-400 hover:underline">✗</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
