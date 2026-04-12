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
import { format, subDays } from "date-fns";
import { Input } from "@/components/ui/input";
import { CalendarRange } from "lucide-react";
import { trpc } from "@/lib/trpc";

const EXPENSE_COLORS = [
  "oklch(0.60 0.22 25)",
  "oklch(0.65 0.18 250)",
  "oklch(0.78 0.15 65)",
  "oklch(0.72 0.18 145)",
  "oklch(0.68 0.20 310)",
  "oklch(0.70 0.18 190)",
  "oklch(0.75 0.15 35)",
  "oklch(0.62 0.20 280)",
];

const fmtCompact = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function KpiCard({ title, value, rawValue, sub, icon: Icon, trend, trendVal, colorClass }: {
  title: string; value: string; rawValue?: number; sub?: string; icon: React.ElementType;
  trend?: "up" | "down"; trendVal?: string; colorClass: string;
}) {
  const fullAmt = rawValue !== undefined
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(rawValue)
    : null;
  return (
    <Card className="group bg-card border-border/50 cursor-default" title={fullAmt ?? undefined}>
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
        {fullAmt && (
          <p className="text-[11px] tabular-nums text-muted-foreground/40 group-hover:text-muted-foreground transition-colors duration-150 mt-0.5">{fullAmt}</p>
        )}
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
  // Data period: Apr 2025 – Mar 2026 (uploaded historical data)
  // The latest date with data is 31 Mar 2026; system date (Apr 2026) has no data
  const latestDataDate = "2026-03-31";
  const latestDataMonthStart = "2026-03-01";
  const dataYearStart = "2025-04-01"; // Full financial year start
  const effectiveToday = latestDataDate; // Always use latest data date, not system clock
  const [period, setPeriod] = useState<"today" | "week" | "mtd" | "ytd" | "custom">("mtd");
  // Custom date range state
  const [customFrom, setCustomFrom] = useState(dataYearStart);
  const [customTo, setCustomTo] = useState(latestDataDate);
  const [appliedFrom, setAppliedFrom] = useState(dataYearStart);
  const [appliedTo, setAppliedTo] = useState(latestDataDate);

  const startDate =
    period === "today" ? latestDataDate
    : period === "week" ? format(subDays(new Date(latestDataDate), 6), "yyyy-MM-dd")
    : period === "ytd" ? dataYearStart
    : period === "custom" ? appliedFrom
    : latestDataMonthStart;
  const endDate =
    period === "custom" ? appliedTo : effectiveToday;

  const { data: kpis, isLoading } = trpc.dashboard.kpis.useQuery({ startDate, endDate });
  // For FY/custom view use date-range query, for other periods use last 30 days
  const useRangeQuery = period === "ytd" || period === "custom";
  const rangeStart = period === "custom" ? appliedFrom : dataYearStart;
  const rangeEnd = period === "custom" ? appliedTo : effectiveToday;
  const { data: dailySales } = trpc.dashboard.dailySalesTrend.useQuery({ days: 30 }, { enabled: !useRangeQuery });
  const { data: rangeSales } = trpc.dashboard.trendByRange.useQuery({ startDate: rangeStart, endDate: rangeEnd }, { enabled: useRangeQuery });
  const activeSalesData = useRangeQuery ? rangeSales : dailySales;

  function applyCustomRange() {
    if (customFrom && customTo && customFrom <= customTo) {
      setAppliedFrom(customFrom);
      setAppliedTo(customTo);
      setPeriod("custom");
    }
  }
  const { data: lowStock } = trpc.inventory.lowStock.useQuery();
  const { data: topCustomers } = trpc.customers.topByOutstanding.useQuery();
  const { data: expenseBreakdown } = trpc.dashboard.expenseBreakdown.useQuery({ startDate, endDate });

  const expensePieData = useMemo(() => {
    if (!expenseBreakdown || expenseBreakdown.length === 0) return [];
    const totalExp = expenseBreakdown.reduce((s: number, e: any) => s + Number(e.total ?? 0), 0);
    return expenseBreakdown.map((e: any, i: number) => ({
      name: e.subHeadAccount ?? "Other",
      value: Number(e.total ?? 0),
      pct: totalExp > 0 ? Math.round((Number(e.total ?? 0) / totalExp) * 100) : 0,
      color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
    }));
  }, [expenseBreakdown]);

  const chartData = useMemo(() => {
    if (activeSalesData && activeSalesData.length > 0) {
      return [...activeSalesData]
        .reverse()
        .filter((d: any) => {
          // Filter chart data to match the selected period
          const raw = d.reportDate ? String(d.reportDate).slice(0, 10) : null;
          if (!raw) return false;
          return raw >= startDate && raw <= effectiveToday;
        })
        .map((d: any) => {
          let dateLabel = '';
          try {
            const raw = String(d.reportDate).slice(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
              dateLabel = format(new Date(raw + 'T00:00:00'), 'dd MMM');
            }
          } catch { dateLabel = ''; }
          return {
            date: dateLabel,
            Sales: Number(d.totalSalesValue ?? 0),
            Expenses: Number(d.totalExpenses ?? 0),
          };
        })
        .filter((d: any) => d.date !== '');
    }
    return Array.from({ length: 14 }, (_, i) => ({
      date: format(subDays(new Date(latestDataDate + 'T00:00:00'), 13 - i), 'dd MMM'),
      Sales: 0,
      Expenses: 0,
    }));
  }, [activeSalesData, startDate, effectiveToday]);

  const salesBreakdown = [
    { name: "Petrol", value: 58, color: "oklch(0.78 0.15 65)" },
    { name: "Diesel", value: 35, color: "oklch(0.65 0.15 220)" },
    { name: "Lubricants", value: 7, color: "oklch(0.65 0.18 145)" },
  ];

  const totalSales = Number(kpis?.totalSales ?? 0);
  const netProfit = Number(kpis?.netProfit ?? 0);
  const totalExpenses = Number(kpis?.totalExpenses ?? 0);
  const grossProfit = Number(kpis?.grossProfit ?? 0);
  const cashBalance = Number(kpis?.cashBalance ?? 0);
  const totalReceivables = Number(kpis?.totalReceivables ?? 0);
  const totalCollected = Number(kpis?.totalCollected ?? 0);
  const collectionRate = totalSales > 0 ? ((totalCollected / totalSales) * 100).toFixed(1) : "0";
  const netMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : "0";
  const totalPurchasePetrol = Number(kpis?.totalPurchasePetrol ?? 0);
  const totalPurchaseDiesel = Number(kpis?.totalPurchaseDiesel ?? 0);
  const totalPurchaseLubricants = Number(kpis?.totalPurchaseLubricants ?? 0);
  const totalPurchasePetrolQty = Number(kpis?.totalPurchasePetrolQty ?? 0);
  const totalPurchaseDieselQty = Number(kpis?.totalPurchaseDieselQty ?? 0);
  const totalPurchaseLubricantsQty = Number(kpis?.totalPurchaseLubricantsQty ?? 0);
  const totalPurchase = Number(kpis?.totalPurchase ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Good morning, Kranthi</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-muted-foreground">{format(new Date(latestDataDate + 'T00:00:00'), "EEEE, d MMMM yyyy")} · BEES Fuel Station</p>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Data: Apr 2025 – Mar 2026</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {(["today", "week", "mtd", "ytd"] as const).map(p => (
              <Button key={p} variant={period === p ? "default" : "outline"} size="sm" onClick={() => setPeriod(p)} className="text-xs h-8">
                {p === "today" ? "31 Mar" : p === "week" ? "7 Days" : p === "mtd" ? "MTD" : "FY 25-26"}
              </Button>
            ))}
            <Button
              variant={period === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod("custom")}
              className="text-xs h-8 gap-1.5"
            >
              <CalendarRange className="w-3.5 h-3.5" />
              Custom
            </Button>
          </div>
          {/* Custom date range inputs — shown when Custom is selected */}
          {period === "custom" && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">From</span>
                <Input
                  type="date"
                  value={customFrom}
                  min="2025-04-01"
                  max={customTo || "2026-03-31"}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="h-7 text-xs w-36 px-2"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">To</span>
                <Input
                  type="date"
                  value={customTo}
                  min={customFrom || "2025-04-01"}
                  max="2026-03-31"
                  onChange={e => setCustomTo(e.target.value)}
                  className="h-7 text-xs w-36 px-2"
                />
              </div>
              <Button
                size="sm"
                onClick={applyCustomRange}
                disabled={!customFrom || !customTo || customFrom > customTo}
                className="h-7 text-xs px-3"
              >
                Apply
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard title="Total Sales" value={isLoading ? "—" : fmtCompact(totalSales)} rawValue={isLoading ? undefined : totalSales} sub={period === "today" ? "31 Mar 2026" : period === "week" ? "25–31 Mar 2026" : period === "ytd" ? "Apr 2025 – Mar 2026" : period === "custom" ? `${appliedFrom} – ${appliedTo}` : "Mar 2026"} icon={IndianRupee} trend="up" trendVal="+8.2%" colorClass="text-primary bg-primary/10 border-primary/20" />
        <KpiCard title="Gross Profit" value={isLoading ? "—" : fmtCompact(grossProfit)} rawValue={isLoading ? undefined : grossProfit} sub={`Fuel margin earned`} icon={TrendingUp} colorClass="text-amber-400 bg-amber-500/10 border-amber-500/20" />
        <KpiCard title="Expenses" value={isLoading ? "—" : fmtCompact(totalExpenses)} rawValue={isLoading ? undefined : totalExpenses} sub="Operating costs" icon={Package} trend={totalExpenses > grossProfit * 0.5 ? "down" : undefined} colorClass="text-red-400 bg-red-500/10 border-red-500/20" />
        <KpiCard title="Net Profit" value={isLoading ? "—" : fmtCompact(netProfit)} rawValue={isLoading ? undefined : netProfit} sub={`Margin: ${netMargin}% • Gross − Expenses`} icon={TrendingUp} trend={netProfit >= 0 ? "up" : "down"} trendVal={`${netMargin}%`} colorClass={netProfit >= 0 ? "text-green-400 bg-green-500/10 border-green-500/20" : "text-red-400 bg-red-500/10 border-red-500/20"} />
        <KpiCard title="Outstanding" value={isLoading ? "—" : fmtCompact(totalReceivables)} rawValue={isLoading ? undefined : totalReceivables} sub={`Collection: ${collectionRate}%`} icon={CreditCard} trend={totalReceivables > 500000 ? "down" : "up"} trendVal={`${collectionRate}%`} colorClass={totalReceivables > 500000 ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-green-400 bg-green-500/10 border-green-500/20"} />
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

      {/* Total Purchase by Products */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> Total Purchase by Products
            </CardTitle>
            {!isLoading && totalPurchase > 0 && (
              <span className="text-xs font-bold text-foreground tabular-nums" title={new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(totalPurchase)}>
                Total: {fmtCompact(totalPurchase)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[0,1,2].map(i => <div key={i} className="h-24 rounded-lg bg-muted/30 animate-pulse" />)}
            </div>
          ) : totalPurchase === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No purchase data for selected period</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Petrol */}
              <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-2"
                title={new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(totalPurchasePetrol)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Fuel className="w-4 h-4" />
                    <span className="text-sm font-semibold">Petrol (MS)</span>
                  </div>
                  {totalPurchasePetrolQty > 0 && (
                    <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                      {(totalPurchasePetrolQty/1000).toFixed(1)}KL
                    </span>
                  )}
                </div>
                <p className="text-xl font-bold tabular-nums text-amber-400">{fmtCompact(totalPurchasePetrol)}</p>
                <div className="w-full bg-muted/30 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-amber-400/70" style={{ width: `${Math.min(100,(totalPurchasePetrol/totalPurchase)*100).toFixed(1)}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground">{((totalPurchasePetrol/totalPurchase)*100).toFixed(1)}% of total</p>
              </div>
              {/* Diesel */}
              <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-2"
                title={new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(totalPurchaseDiesel)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Fuel className="w-4 h-4" />
                    <span className="text-sm font-semibold">Diesel (HSD)</span>
                  </div>
                  {totalPurchaseDieselQty > 0 && (
                    <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                      {(totalPurchaseDieselQty/1000).toFixed(1)}KL
                    </span>
                  )}
                </div>
                <p className="text-xl font-bold tabular-nums text-blue-400">{fmtCompact(totalPurchaseDiesel)}</p>
                <div className="w-full bg-muted/30 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-blue-400/70" style={{ width: `${Math.min(100,(totalPurchaseDiesel/totalPurchase)*100).toFixed(1)}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground">{((totalPurchaseDiesel/totalPurchase)*100).toFixed(1)}% of total</p>
              </div>
              {/* Lubricants */}
              <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5 space-y-2"
                title={new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(totalPurchaseLubricants)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-400">
                    <Fuel className="w-4 h-4" />
                    <span className="text-sm font-semibold">Lubricants</span>
                  </div>
                  {totalPurchaseLubricantsQty > 0 && (
                    <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                      {totalPurchaseLubricantsQty.toFixed(0)}L
                    </span>
                  )}
                </div>
                <p className="text-xl font-bold tabular-nums text-green-400">{totalPurchaseLubricants > 0 ? fmtCompact(totalPurchaseLubricants) : '₹0'}</p>
                <div className="w-full bg-muted/30 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-green-400/70" style={{ width: `${Math.min(100,(totalPurchaseLubricants/totalPurchase)*100).toFixed(1)}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground">{((totalPurchaseLubricants/totalPurchase)*100).toFixed(1)}% of total</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-card border-border/50">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                {period === "today" ? "Sales vs Expenses — 31 Mar 2026"
                  : period === "week" ? "Sales vs Expenses — Last 7 Days"
                  : period === "ytd" ? "Sales vs Expenses — FY 2025-26"
                  : period === "custom" ? `Sales vs Expenses — ${appliedFrom} to ${appliedTo}`
                  : "Sales vs Expenses — Mar 2026"}
              </CardTitle>
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
            <CardTitle className="text-sm font-semibold">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {expensePieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {expensePieData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                      formatter={(v: any, name: any, props: any) => [`${props.payload.pct}% (${fmtCompact(v)})`, name]}
                      contentStyle={{ background: "oklch(0.17 0.014 240)", border: "1px solid oklch(0.26 0.016 240)", borderRadius: "8px", fontSize: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2 max-h-[120px] overflow-y-auto">
                  {expensePieData.map((item: any) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                        <span className="text-muted-foreground truncate max-w-[80px]">{item.name}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-semibold tabular-nums">{item.pct}%</span>
                        <span className="text-muted-foreground ml-1">({fmtCompact(item.value)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">
                No expense data
              </div>
            )}
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
