import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart2, TrendingUp, TrendingDown, IndianRupee, Calendar } from "lucide-react";
import { format, startOfMonth, subMonths } from "date-fns";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

// Quick period presets — all relative to latest data date
const PRESETS = [
  { label: "Mar 2026", start: "2026-03-01", end: "2026-03-31" },
  { label: "Feb 2026", start: "2026-02-01", end: "2026-02-28" },
  { label: "Jan 2026", start: "2026-01-01", end: "2026-01-31" },
  { label: "Q1 2026",  start: "2026-01-01", end: "2026-03-31" },
  { label: "Custom",   start: "",           end: "" },
];

export default function Reports() {
  const [activePreset, setActivePreset] = useState(0);
  const [startDate, setStartDate] = useState("2026-03-01");
  const [endDate, setEndDate] = useState("2026-03-31");

  // Use the dedicated P&L report endpoint — it respects the date range for BOTH revenue and expenses
  const { data: plReport, isLoading } = trpc.pl.report.useQuery({ startDate, endDate });
  const { data: dailyTrend } = trpc.reconciliation.dailyReports.useQuery({ startDate, endDate });

  const totalRevenue = Number(plReport?.totalRevenue ?? 0);
  const totalExpenses = Number(plReport?.totalExpenses ?? 0);
  const grossProfit = Number(plReport?.grossProfit ?? 0);
  const netProfit = Number(plReport?.netProfit ?? 0);
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0";

  // Build daily revenue chart from reconciliation records (daily_reports table)
  const chartData = dailyTrend
    ? [...dailyTrend]
        .sort((a: any, b: any) => String(a.reportDate).localeCompare(String(b.reportDate)))
        .map((d: any) => ({
          date: d.reportDate ? format(new Date(String(d.reportDate).slice(0, 10) + "T00:00:00"), "dd MMM") : "",
          revenue: Number(d.totalSalesValue ?? 0),
          expenses: Number(d.totalExpenses ?? 0),
        }))
        .filter((d: any) => d.date !== "")
    : [];

  const expChartData = (plReport?.expenseBreakdown ?? []).map((e: any) => ({
    category: String(e.subHeadAccount ?? "").split(" ")[0],
    amount: Number(e.total ?? 0),
  }));

  function applyPreset(idx: number) {
    setActivePreset(idx);
    if (idx < PRESETS.length - 1) {
      setStartDate(PRESETS[idx].start);
      setEndDate(PRESETS[idx].end);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header + Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-tight">P&L Reports</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Profit & loss analysis for any date range</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.slice(0, -1).map((p, i) => (
            <Button
              key={p.label}
              variant={activePreset === i ? "default" : "outline"}
              size="sm"
              className="text-xs h-8"
              onClick={() => applyPreset(i)}
            >
              {p.label}
            </Button>
          ))}
          <Button
            variant={activePreset === PRESETS.length - 1 ? "default" : "outline"}
            size="sm"
            className="text-xs h-8 gap-1"
            onClick={() => setActivePreset(PRESETS.length - 1)}
          >
            <Calendar className="w-3 h-3" /> Custom
          </Button>
        </div>
      </div>

      {/* Custom date inputs — shown when Custom is selected */}
      {activePreset === PRESETS.length - 1 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input type="date" className="bg-secondary border-border/50 h-8 text-xs w-36" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input type="date" className="bg-secondary border-border/50 h-8 text-xs w-36" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50"><CardContent className="p-5">
          <div className="w-9 h-9 rounded-lg border border-green-500/20 bg-green-500/10 flex items-center justify-center mb-3"><TrendingUp className="w-4 h-4 text-green-400" /></div>
          <p className="text-lg font-bold tabular-nums text-green-400">{isLoading ? "—" : fmt(totalRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Revenue</p>
        </CardContent></Card>
        <Card className="bg-card border-border/50"><CardContent className="p-5">
          <div className="w-9 h-9 rounded-lg border border-red-500/20 bg-red-500/10 flex items-center justify-center mb-3"><TrendingDown className="w-4 h-4 text-red-400" /></div>
          <p className="text-lg font-bold tabular-nums text-red-400">{isLoading ? "—" : fmt(totalExpenses)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Expenses</p>
        </CardContent></Card>
        <Card className="bg-card border-border/50"><CardContent className="p-5">
          <div className="w-9 h-9 rounded-lg border border-primary/20 bg-primary/10 flex items-center justify-center mb-3"><IndianRupee className="w-4 h-4 text-primary" /></div>
          <p className={`text-xl font-bold tabular-nums ${grossProfit >= 0 ? "text-primary" : "text-red-400"}`}>{isLoading ? "—" : fmt(grossProfit)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Gross Profit</p>
        </CardContent></Card>
        <Card className="bg-card border-border/50"><CardContent className="p-5">
          <div className="w-9 h-9 rounded-lg border border-teal-500/20 bg-teal-500/10 flex items-center justify-center mb-3"><BarChart2 className="w-4 h-4 text-teal-400" /></div>
          <p className={`text-xl font-bold tabular-nums ${Number(profitMargin) >= 0 ? "text-teal-400" : "text-red-400"}`}>{isLoading ? "—" : profitMargin + "%"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Net Margin</p>
        </CardContent></Card>
      </div>

      {/* Fuel Margins */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold">Fuel Margins</CardTitle></CardHeader>
        <CardContent className="px-5 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-secondary/40 border border-border/40">
              <p className="text-xs text-muted-foreground mb-1">Petrol Margin</p>
              <p className="text-xl font-bold text-primary">₹3.95<span className="text-sm font-normal text-muted-foreground">/L</span></p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/40 border border-border/40">
              <p className="text-xs text-muted-foreground mb-1">Diesel Margin</p>
              <p className="text-xl font-bold text-primary">₹2.49<span className="text-sm font-normal text-muted-foreground">/L</span></p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Revenue + Expenses Trend Chart */}
      {chartData.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold">Daily Revenue vs Expenses</CardTitle></CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.016 240)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.60 0.012 240)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.60 0.012 240)" }} axisLine={false} tickLine={false} tickFormatter={v => "₹" + (v/1000).toFixed(0) + "K"} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "oklch(0.17 0.014 240)", border: "1px solid oklch(0.26 0.016 240)", borderRadius: "8px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="revenue" stroke="oklch(0.78 0.15 65)" strokeWidth={2} dot={false} name="Revenue" />
                <Line type="monotone" dataKey="expenses" stroke="oklch(0.65 0.18 25)" strokeWidth={2} dot={false} name="Expenses" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Expense Breakdown Chart */}
      {expChartData.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold">Expense Breakdown by Category</CardTitle></CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={expChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.016 240)" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 10, fill: "oklch(0.60 0.012 240)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.60 0.012 240)" }} axisLine={false} tickLine={false} tickFormatter={v => "₹" + (v/1000).toFixed(0) + "K"} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "oklch(0.17 0.014 240)", border: "1px solid oklch(0.26 0.016 240)", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="amount" fill="oklch(0.65 0.18 25)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* P&L Summary Table */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3 pt-4 px-5"><CardTitle className="text-sm font-semibold">P&L Summary</CardTitle></CardHeader>
        <CardContent className="px-5 pb-4">
          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Gross Revenue</span>
              <span className="text-sm font-semibold text-green-400 tabular-nums">{fmt(totalRevenue)}</span>
            </div>
            {(plReport?.expenseBreakdown ?? []).map((e: any) => (
              <div key={e.subHeadAccount} className="flex justify-between py-1.5">
                <span className="text-sm text-muted-foreground pl-4">{e.subHeadAccount}</span>
                <span className="text-sm tabular-nums text-red-400">-{fmt(Number(e.total ?? 0))}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 border-t border-border/50 mt-2">
              <span className="text-sm font-semibold">Net Profit</span>
              <span className={`text-sm font-bold tabular-nums ${netProfit >= 0 ? "text-primary" : "text-red-400"}`}>{fmt(netProfit)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
