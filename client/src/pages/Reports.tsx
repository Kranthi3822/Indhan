import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart2, TrendingUp, TrendingDown, IndianRupee } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function Reports() {
  // Default to latest data month (March 2026) since current month has no data yet
  const [startDate, setStartDate] = useState("2026-03-01");
  const [endDate, setEndDate] = useState("2026-03-31");

  const { data: trend } = trpc.dashboard.trend.useQuery({ days: 30 });
  const { data: expSummary } = trpc.expenses.summary.useQuery({ startDate, endDate });

  const totalRevenue = trend?.reduce((s: number, d: any) => s + Number(d.totalSales ?? 0), 0) ?? 0;
  const totalExpenses = expSummary?.reduce((s: number, e: any) => s + Number(e.totalAmount ?? 0), 0) ?? 0;
  const grossProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : "0";

  const chartData = trend?.map((d: any) => ({
    date: d.date ?? "",
    revenue: Number(d.totalSalesValue ?? d.totalSales ?? 0),
  })) ?? [];

  const expChartData = expSummary?.map((e: any) => ({
    category: (e.category ?? "").split(" ")[0],
    amount: Number(e.totalAmount ?? 0),
  })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">P&L Reports</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Daily, monthly and period-based profit and loss analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input type="date" className="bg-secondary border-border/50 h-8 text-xs w-36" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input type="date" className="bg-secondary border-border/50 h-8 text-xs w-36" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50"><CardContent className="p-5">
          <div className="w-9 h-9 rounded-lg border border-green-500/20 bg-green-500/10 flex items-center justify-center mb-3"><TrendingUp className="w-4 h-4 text-green-400" /></div>
          <p className="text-xl font-bold tabular-nums text-green-400">{fmt(totalRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Revenue</p>
        </CardContent></Card>
        <Card className="bg-card border-border/50"><CardContent className="p-5">
          <div className="w-9 h-9 rounded-lg border border-red-500/20 bg-red-500/10 flex items-center justify-center mb-3"><TrendingDown className="w-4 h-4 text-red-400" /></div>
          <p className="text-xl font-bold tabular-nums text-red-400">{fmt(totalExpenses)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Expenses</p>
        </CardContent></Card>
        <Card className="bg-card border-border/50"><CardContent className="p-5">
          <div className="w-9 h-9 rounded-lg border border-primary/20 bg-primary/10 flex items-center justify-center mb-3"><IndianRupee className="w-4 h-4 text-primary" /></div>
          <p className={`text-xl font-bold tabular-nums ${grossProfit >= 0 ? "text-primary" : "text-red-400"}`}>{fmt(grossProfit)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Gross Profit</p>
        </CardContent></Card>
        <Card className="bg-card border-border/50"><CardContent className="p-5">
          <div className="w-9 h-9 rounded-lg border border-amber-500/20 bg-amber-500/10 flex items-center justify-center mb-3"><BarChart2 className="w-4 h-4 text-amber-400" /></div>
          <p className={`text-xl font-bold tabular-nums ${Number(profitMargin) >= 0 ? "text-amber-400" : "text-red-400"}`}>{profitMargin}%</p>
          <p className="text-xs text-muted-foreground mt-0.5">Profit Margin</p>
        </CardContent></Card>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold">Fuel Margins</CardTitle></CardHeader>
        <CardContent className="px-5 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-secondary/40 border border-border/40">
              <p className="text-xs text-muted-foreground mb-1">Petrol Margin</p>
              <p className="text-2xl font-bold text-primary">₹3.95<span className="text-sm font-normal text-muted-foreground">/L</span></p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/40 border border-border/40">
              <p className="text-xs text-muted-foreground mb-1">Diesel Margin</p>
              <p className="text-2xl font-bold text-primary">₹2.49<span className="text-sm font-normal text-muted-foreground">/L</span></p>
            </div>
          </div>
        </CardContent>
      </Card>

      {chartData.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold">Daily Revenue Trend</CardTitle></CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.016 240)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.60 0.012 240)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.60 0.012 240)" }} axisLine={false} tickLine={false} tickFormatter={v => "Rs " + (v/1000).toFixed(0) + "K"} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "oklch(0.17 0.014 240)", border: "1px solid oklch(0.26 0.016 240)", borderRadius: "8px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="revenue" stroke="oklch(0.78 0.15 65)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {expChartData.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold">Expense Breakdown by Category</CardTitle></CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={expChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.016 240)" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 10, fill: "oklch(0.60 0.012 240)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.60 0.012 240)" }} axisLine={false} tickLine={false} tickFormatter={v => "Rs " + (v/1000).toFixed(0) + "K"} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "oklch(0.17 0.014 240)", border: "1px solid oklch(0.26 0.016 240)", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="amount" fill="oklch(0.65 0.18 25)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3 pt-4 px-5"><CardTitle className="text-sm font-semibold">P&L Summary</CardTitle></CardHeader>
        <CardContent className="px-5 pb-4">
          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Gross Revenue</span>
              <span className="text-sm font-semibold text-green-400 tabular-nums">{fmt(totalRevenue)}</span>
            </div>
            {expSummary?.map((e: any) => (
              <div key={e.category} className="flex justify-between py-1.5">
                <span className="text-sm text-muted-foreground pl-4">{e.category}</span>
                <span className="text-sm tabular-nums text-red-400">-{fmt(Number(e.totalAmount ?? 0))}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 border-t border-border/50 mt-2">
              <span className="text-sm font-semibold">Net Profit</span>
              <span className={`text-sm font-bold tabular-nums ${grossProfit >= 0 ? "text-primary" : "text-red-400"}`}>{fmt(grossProfit)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
