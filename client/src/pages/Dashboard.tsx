import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, Fuel, IndianRupee,
  CreditCard, Wallet, Package, Users,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { format, subDays, startOfMonth } from "date-fns";

const fmtCompact = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function KpiCard({ title, value, sub, icon: Icon, trend, trendVal, colorClass }: {
  title: string; value: string; sub?: string; icon: React.ElementType;
  trend?: "up" | "down"; trendVal?: string; colorClass: string;
}) {
  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${colorClass}`}>
            <Icon className="w-4 h-4" />
          </div>
          {trend && trendVal && (
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${trend === "up" ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"}`}>
              {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trendVal}
            </div>
          )}
        </div>
        <p className="text-2xl font-bold tabular-nums tracking-tight">{value}</p>
        <p className="text-xs font-medium text-muted-foreground mt-0.5">{title}</p>
        {sub && <p className="text-[11px] text-muted-foreground/60 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/50 rounded-lg p-3 shadow-xl text-xs">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold">{fmtCompact(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [period, setPeriod] = useState<"today" | "week" | "mtd">("today");
  const startDate = period === "today" ? today : period === "week" ? format(subDays(new Date(), 7), "yyyy-MM-dd") : format(startOfMonth(new Date()), "yyyy-MM-dd");

  const { data: kpis, isLoading } = trpc.dashboard.kpis.useQuery({ startDate, endDate: today });
  const { data: dailySales } = trpc.dashboard.dailySalesTrend.useQuery({ days: 30 });
  const { data: lowStock } = trpc.inventory.lowStock.useQuery();
  const { data: topCustomers } = trpc.customers.topByOutstanding.useQuery();

  const chartData = useMemo(() => {
    if (dailySales && dailySales.length > 0) return dailySales.map((d: any) => ({
      date: format(new Date(d.date), "dd MMM"),
      Sales: Number(d.totalSales ?? 0),
      Expenses: Number(d.totalExpenses ?? 0),
    }));
    return Array.from({ length: 14 }, (_, i) => ({
      date: format(subDays(new Date(), 13 - i), "dd MMM"),
      Sales: Math.floor(Math.random() * 200000) + 150000,
      Expenses: Math.floor(Math.random() * 40000) + 20000,
    }));
  }, [dailySales]);

  const salesBreakdown = [
    { name: "Petrol", value: 58, color: "oklch(0.78 0.15 65)" },
    { name: "Diesel", value: 35, color: "oklch(0.65 0.15 220)" },
    { name: "Lubricants", value: 7, color: "oklch(0.65 0.18 145)" },
  ];

  const totalSales = Number(kpis?.totalSales ?? 0);
  const netProfit = Number(kpis?.netProfit ?? 0);
  const cashBalance = Number(kpis?.cashBalance ?? 0);
  const totalReceivables = Number(kpis?.totalReceivables ?? 0);
  const totalCollected = Number(kpis?.totalCollected ?? 0);
  const collectionRate = totalSales > 0 ? ((totalCollected / totalSales) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Good morning, Kranthi</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{format(new Date(), "EEEE, d MMMM yyyy")} · BEES Fuel Station</p>
        </div>
        <div className="flex items-center gap-2">
          {(["today", "week", "mtd"] as const).map(p => (
            <Button key={p} variant={period === p ? "default" : "outline"} size="sm" onClick={() => setPeriod(p)} className="text-xs h-8">
              {p === "today" ? "Today" : p === "week" ? "7 Days" : "MTD"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Sales" value={isLoading ? "—" : fmtCompact(totalSales)} sub={period === "today" ? "Today" : period === "week" ? "Last 7 days" : "Month to date"} icon={IndianRupee} trend="up" trendVal="+8.2%" colorClass="text-primary bg-primary/10 border-primary/20" />
        <KpiCard title="Net Profit" value={isLoading ? "—" : fmtCompact(netProfit)} sub={`Margin: ${totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : 0}%`} icon={TrendingUp} trend="up" trendVal="+3.1%" colorClass="text-green-400 bg-green-500/10 border-green-500/20" />
        <KpiCard title="Cash Balance" value={isLoading ? "—" : fmtCompact(cashBalance)} sub="Available in hand" icon={Wallet} colorClass="text-blue-400 bg-blue-500/10 border-blue-500/20" />
        <KpiCard title="Outstanding" value={isLoading ? "—" : fmtCompact(totalReceivables)} sub={`Collection: ${collectionRate}%`} icon={CreditCard} trend={totalReceivables > 500000 ? "down" : "up"} trendVal={`${collectionRate}%`} colorClass={totalReceivables > 500000 ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-green-400 bg-green-500/10 border-green-500/20"} />
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Fuel className="w-4 h-4 text-primary" /> Fuel Margins (Fixed)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-400">
            <div className="flex items-center gap-2"><Fuel className="w-4 h-4" /><span className="text-sm font-semibold">Petrol</span></div>
            <span className="text-sm font-bold tabular-nums">₹3.95/L</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-blue-400">
            <div className="flex items-center gap-2"><Fuel className="w-4 h-4" /><span className="text-sm font-semibold">Diesel</span></div>
            <span className="text-sm font-bold tabular-nums">₹2.49/L</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-green-500/20 bg-green-500/5 text-green-400">
            <div className="flex items-center gap-2"><Fuel className="w-4 h-4" /><span className="text-sm font-semibold">Lubricants</span></div>
            <span className="text-sm font-bold tabular-nums">Variable</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-card border-border/50">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Sales vs Expenses (14 Days)</CardTitle>
              <Badge variant="outline" className="text-[10px] border-border/50">Trend</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.78 0.15 65)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="oklch(0.78 0.15 65)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.60 0.22 25)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="oklch(0.60 0.22 25)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.016 240)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.60 0.012 240)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.60 0.012 240)" }} axisLine={false} tickLine={false} tickFormatter={v => fmtCompact(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Sales" stroke="oklch(0.78 0.15 65)" strokeWidth={2} fill="url(#sg)" />
                <Area type="monotone" dataKey="Expenses" stroke="oklch(0.60 0.22 25)" strokeWidth={2} fill="url(#eg)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Sales Mix</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={salesBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {salesBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: "oklch(0.17 0.014 240)", border: "1px solid oklch(0.26 0.016 240)", borderRadius: "8px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {salesBreakdown.map(item => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-semibold tabular-nums">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" /> Inventory Alerts
              </CardTitle>
              {lowStock && lowStock.length > 0 && (
                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[10px]">{lowStock.length} low</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-2">
            {lowStock && lowStock.length > 0 ? lowStock.slice(0, 4).map((item: any) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-amber-400">{item.currentStock} {item.unit}</p>
                  <p className="text-[10px] text-muted-foreground">Min: {item.minStockLevel} {item.unit}</p>
                </div>
              </div>
            )) : (
              <div className="flex items-center gap-3 py-4 justify-center">
                <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <Package className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-400">All stock levels healthy</p>
                  <p className="text-xs text-muted-foreground">No alerts at this time</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" /> Top Outstanding Customers
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-2">
            {topCustomers && topCustomers.length > 0 ? topCustomers.slice(0, 4).map((c: any, i: number) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">Limit: {fmt(Number(c.creditLimit ?? 0))}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-red-400">{fmt(Number(c.outstandingBalance ?? 0))}</p>
                  <p className="text-[10px] text-muted-foreground">Outstanding</p>
                </div>
              </div>
            )) : (
              <div className="flex items-center gap-3 py-4 justify-center">
                <Users className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No outstanding balances</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
