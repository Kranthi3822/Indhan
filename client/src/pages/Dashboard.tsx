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
  Droplets, FlaskConical, AlertTriangle, Settings2,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { Input } from "@/components/ui/input";
import { CalendarRange } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { fmtCompact, fmtFull } from "@/lib/format";
import { STATION_SHORT_NAME } from "@shared/const";
import { StatCard } from "@/components/StatCard";

// ─── Stock gauge helpers (reused from Inventory page) ─────────────────────
function DashCircleGauge({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="oklch(0.22 0.014 240)" strokeWidth={7} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }} />
    </svg>
  );
}
function DashStockCard({ product, compact = false }: { product: any; compact?: boolean }) {
  const current = Number(product.currentStock ?? 0);
  const min = Number(product.reorderLevel ?? 0);
  const rawMax = Number(product.maxStockLevel ?? 0);
  const fallbackMax = product.category === 'fuel' ? 20000 : Math.max(200, min * 5, current * 1.5);
  const max = rawMax > 0 ? rawMax : fallbackMax;
  const pct = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;
  const isCritical = current <= min;
  const isLow = !isCritical && pct < 35;
  const color = isCritical ? "#ef4444" : isLow ? "#f59e0b" : "#22c55e";
  const statusText = isCritical ? "Critical" : isLow ? "Low" : "Good";
  const statusBg = isCritical ? "bg-red-500/10 text-red-400 border-red-500/20" : isLow ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-green-500/10 text-green-400 border-green-500/20";
  const size = compact ? 52 : 64;
  return (
    <div className={`rounded-xl border p-3 flex flex-col items-center gap-1.5 bg-card/50 ${
      isCritical ? 'border-red-500/30' : 'border-border/40'
    }`}>
      <div className="relative" style={{ width: size, height: size }}>
        <DashCircleGauge pct={pct} color={color} size={size} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-bold tabular-nums leading-none" style={{ color, fontSize: compact ? 11 : 13 }}>{Math.round(pct)}%</span>
        </div>
      </div>
      <p className={`font-semibold text-center leading-tight ${compact ? 'text-[10px]' : 'text-xs'}`}>{product.name}</p>
      <p className={`font-bold tabular-nums ${compact ? 'text-sm' : 'text-base'}`}>{current.toLocaleString("en-IN")}</p>
      <p className="text-[9px] text-muted-foreground -mt-1">{product.unit}</p>
      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${statusBg}`}>{statusText}</span>
      <div className="w-full flex justify-between text-[9px] text-muted-foreground pt-1 border-t border-border/20">
        <span>Min {min.toLocaleString("en-IN")}</span>
        <span>₹{Number(product.sellingPrice).toLocaleString("en-IN")}/{product.unit}</span>
      </div>
    </div>
  );
}
// ───────────────────────────────────────────────────────────────────────────

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

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

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
  const { data: allProducts } = trpc.inventory.list.useQuery();
  const { data: topCustomers } = trpc.customers.topByOutstanding.useQuery();
  const { data: expenseBreakdown } = trpc.dashboard.expenseBreakdown.useQuery({ startDate, endDate });
  const { data: fuelIntel } = trpc.fuelIntelligence.getIntelligence.useQuery({ startDate, endDate });

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

  // Low-stock items: products below their reorderLevel
  const lowStockItems = useMemo(() => {
    if (!allProducts) return [];
    return (allProducts as any[]).filter((p: any) => {
      const stock = Number(p.currentStock ?? 0);
      const min = Number(p.reorderLevel ?? 0);
      return stock < min;
    });
  }, [allProducts]);

  return (
    <div className="space-y-6">
      {/* Real-time low-stock alert banner */}
      {lowStockItems.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-400 mb-1.5">
              {lowStockItems.length} product{lowStockItems.length > 1 ? 's' : ''} below minimum stock level
            </p>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map((p: any) => (
                <span key={p.id} className="inline-flex items-center gap-1 text-xs bg-red-500/15 border border-red-500/25 text-red-300 rounded-full px-2.5 py-0.5">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-red-400/60">·</span>
                  <span>{Number(p.currentStock ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} / {Number(p.reorderLevel ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} {p.unit}</span>
                </span>
              ))}
            </div>
          </div>
          <a href="/inventory" className="text-xs text-red-400 hover:text-red-300 underline underline-offset-2 shrink-0 mt-0.5 whitespace-nowrap">View Inventory →</a>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Good morning, Kranthi</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-muted-foreground">{format(new Date(latestDataDate + 'T00:00:00'), "EEEE, d MMMM yyyy")} · {STATION_SHORT_NAME}</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <StatCard label="Total Sales" value={isLoading ? "—" : fmtCompact(totalSales)} rawValue={isLoading ? undefined : totalSales} sub={period === "today" ? "31 Mar 2026" : period === "week" ? "25–31 Mar 2026" : period === "ytd" ? "Apr 2025 – Mar 2026" : period === "custom" ? `${appliedFrom} – ${appliedTo}` : "Mar 2026"} icon={IndianRupee} trend="up" trendVal="+8.2%" colorClass="text-primary bg-primary/10 border-primary/20" />
        <StatCard label="Gross Profit" value={isLoading ? "—" : fmtCompact(grossProfit)} rawValue={isLoading ? undefined : grossProfit} sub={`Fuel margin earned`} icon={TrendingUp} colorClass="text-teal-400 bg-teal-500/10 border-teal-500/20" />
        <StatCard label="Expenses" value={isLoading ? "—" : fmtCompact(totalExpenses)} rawValue={isLoading ? undefined : totalExpenses} sub="Operating costs" icon={Package} trend={totalExpenses > grossProfit * 0.5 ? "down" : undefined} colorClass="text-red-400 bg-red-500/10 border-red-500/20" />
        <StatCard label="Net Profit" value={isLoading ? "—" : fmtCompact(netProfit)} rawValue={isLoading ? undefined : netProfit} sub={`Margin: ${netMargin}% • Gross − Expenses`} icon={TrendingUp} trend={netProfit >= 0 ? "up" : "down"} trendVal={`${netMargin}%`} colorClass={netProfit >= 0 ? "text-green-400 bg-green-500/10 border-green-500/20" : "text-red-400 bg-red-500/10 border-red-500/20"} />
        <StatCard label="Outstanding" value={isLoading ? "—" : fmtCompact(totalReceivables)} rawValue={isLoading ? undefined : totalReceivables} sub={`Collection: ${collectionRate}%`} icon={CreditCard} trend={totalReceivables > 500000 ? "down" : "up"} trendVal={`${collectionRate}%`} colorClass={totalReceivables > 500000 ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-green-400 bg-green-500/10 border-green-500/20"} />
      </div>

      {/* ─── Dynamic Fuel Intelligence ─────────────────────────────────────── */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Fuel className="w-4 h-4 text-primary" /> Fuel Intelligence
              {fuelIntel?.dataQuality.hasDipReadings
                ? <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/20">Dip Readings Active</span>
                : <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400 border border-teal-500/20">Estimated Stock</span>
              }
            </CardTitle>
            <a href="/nozzle-entry" className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              <Settings2 className="w-3 h-3" /> Update Dip
            </a>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4 space-y-3">
          {(["petrol", "diesel"] as const).map((ft) => {
            const d = ft === "petrol" ? fuelIntel?.petrol : fuelIntel?.diesel;
            const color = ft === "petrol" ? "teal" : "blue";
            const grossM = d?.grossMarginPerL ?? (ft === "petrol" ? 3.95 : 2.49);
            const effM = d?.effectiveMarginPerL ?? grossM;
            const evapL = d?.evaporationLitres ?? 0;
            const evapV = d?.evaporationValue ?? 0;
            const stockL = d?.latestDipLitres ?? null;
            const stockV = d?.stockValue ?? 0;
            const stockPct = d?.stockPct ?? 0;
            const dipDate = d?.latestDipDate ?? null;
            const retailP = d?.retailPrice ?? (ft === "petrol" ? 103.41 : 89.14);
            const costP = d?.wacpCostPrice ?? (ft === "petrol" ? 99.46 : 86.65);
            const marginPct = d?.grossMarginPct ?? 0;
            const opexPerL = d?.opexPerLitre ?? 0;
            const netM = d?.netMarginPerL ?? grossM;
            const netMPct = d?.netMarginPct ?? 0;
            const allocOpEx = d?.allocatedOpEx ?? 0;
            const netProfit = d?.netProfit ?? 0;
            const revShare = d?.revenueSharePct ?? 0;
            const opexBreakdown = d?.opexBreakdown ?? [];
            return (
              <div key={ft} className={`p-3 rounded-lg border ${
                color === "teal" ? "border-teal-500/20 bg-teal-500/5" : "border-blue-500/20 bg-blue-500/5"
              }`}>
                {/* Header row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Fuel className={`w-4 h-4 ${color === "teal" ? "text-teal-400" : "text-blue-400"}`} />
                    <span className={`text-sm font-semibold capitalize ${color === "teal" ? "text-teal-400" : "text-blue-400"}`}>{ft}</span>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="text-right">
                        <p className="text-[10px] tabular-nums text-muted-foreground line-through">₹{grossM.toFixed(2)}/L</p>
                        <p className="text-[9px] text-muted-foreground/60">Gross</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-base font-bold tabular-nums ${netM >= 0 ? (color === "teal" ? "text-teal-400" : "text-blue-400") : "text-red-400"}`}>₹{netM.toFixed(2)}/L</p>
                        <p className="text-[10px] text-muted-foreground">Net margin</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Price breakdown */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="text-center p-1.5 rounded bg-card/50">
                    <p className="text-[10px] text-muted-foreground">Retail Price</p>
                    <p className="text-xs font-semibold tabular-nums">₹{retailP.toFixed(2)}/L</p>
                  </div>
                  <div className="text-center p-1.5 rounded bg-card/50">
                    <p className="text-[10px] text-muted-foreground">Cost (WACP)</p>
                    <p className="text-xs font-semibold tabular-nums">₹{costP.toFixed(2)}/L</p>
                  </div>
                  <div className="text-center p-1.5 rounded bg-card/50">
                    <p className="text-[10px] text-muted-foreground">Margin %</p>
                    <p className={`text-xs font-semibold tabular-nums ${color === "teal" ? "text-teal-400" : "text-blue-400"}`}>{marginPct.toFixed(2)}%</p>
                  </div>
                </div>
                {/* OpEx deduction row */}
                <div className="flex items-center justify-between px-2 py-1.5 rounded bg-red-500/5 border border-red-500/10 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-red-400/80 font-medium">− OpEx Allocated</span>
                    <span className="text-[9px] text-muted-foreground/50">({revShare.toFixed(0)}% rev share)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] tabular-nums text-red-400/80">₹{opexPerL.toFixed(2)}/L</span>
                    <span className="text-[10px] tabular-nums text-muted-foreground">({fmtCompact(allocOpEx)} total)</span>
                  </div>
                </div>
                {/* Net profit summary */}
                <div className="flex items-center justify-between px-2 py-1 rounded bg-card/30 mb-2">
                  <span className="text-[10px] text-muted-foreground">Net Profit ({ft})</span>
                  <span className={`text-xs font-semibold tabular-nums ${netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>{fmtCompact(netProfit)} <span className="text-[9px] font-normal text-muted-foreground">({netMPct.toFixed(1)}%)</span></span>
                </div>
                {/* Stock & Evaporation */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-1.5 rounded bg-card/50">
                    <Droplets className="w-3 h-3 text-cyan-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground truncate">Stock{dipDate ? ` (${dipDate})` : " (est.)"}</p>
                      {stockL !== null
                        ? <p className="text-xs font-semibold tabular-nums">{stockL.toFixed(0)}L <span className="text-muted-foreground font-normal">({fmtCompact(stockV)})</span></p>
                        : <p className="text-xs text-muted-foreground">No dip reading</p>
                      }
                      {stockL !== null && (
                        <div className="mt-0.5 h-1 rounded-full bg-muted/30 overflow-hidden">
                          <div className={`h-full rounded-full ${color === "teal" ? "bg-teal-400/60" : "bg-blue-400/60"}`} style={{ width: `${Math.min(100, stockPct)}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded bg-card/50">
                    <FlaskConical className="w-3 h-3 text-orange-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Evaporation <span className="text-[9px] text-muted-foreground/50">(ref only)</span></p>
                      {evapL > 0.01
                        ? <p className="text-xs tabular-nums text-muted-foreground">{evapL.toFixed(1)}L <span className="text-muted-foreground/60">({fmtCompact(evapV)})</span></p>
                        : <p className="text-xs text-muted-foreground">— (no data yet)</p>
                      }
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {/* Total OpEx + Net Profit summary */}
          {fuelIntel && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-border/50 bg-card/50">
              <div>
                <p className="text-[10px] text-muted-foreground">Total OpEx (period)</p>
                <p className="text-xs font-semibold tabular-nums text-red-400">− {fmtCompact(fuelIntel.totalOpEx)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Gross Profit</p>
                <p className="text-xs font-semibold tabular-nums">{fmtCompact(fuelIntel.totalGrossProfit)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Net Profit (fuel)</p>
                <p className={`text-sm font-bold tabular-nums ${fuelIntel.totalNetProfit >= 0 ? "text-green-400" : "text-red-400"}`}>{fmtCompact(fuelIntel.totalNetProfit)}</p>
              </div>
            </div>
          )}
          {/* Lubricants */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-green-500/20 bg-green-500/5">
            <div className="flex items-center gap-2">
              <Fuel className="w-4 h-4 text-green-400" />
              <span className="text-sm font-semibold text-green-400">Lubricants</span>
            </div>
            <span className="text-xs text-muted-foreground">Variable margin — see P&L Reports</span>
          </div>
          {/* Data quality notice */}
          {!fuelIntel?.dataQuality.hasDipReadings && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg border border-teal-500/20 bg-teal-500/5">
              <AlertTriangle className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-teal-400/80">No dip readings recorded for this period. Stock values are estimated. Enter daily dip readings via <a href="/nozzle-entry" className="underline hover:text-teal-300">Nozzle Entry</a> for accurate stock valuation.</p>
            </div>
          )}
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
              <div className="group p-4 rounded-lg border border-teal-500/20 bg-teal-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-teal-400">
                    <Fuel className="w-4 h-4" />
                    <span className="text-sm font-semibold">Petrol (MS)</span>
                  </div>
                  {totalPurchasePetrolQty > 0 && (
                    <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                      {(totalPurchasePetrolQty/1000).toFixed(1)}KL
                    </span>
                  )}
                </div>
                <p className="text-xl font-bold tabular-nums text-teal-400">{fmtCompact(totalPurchasePetrol)}</p>
                <p className="text-[11px] tabular-nums text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors duration-150">{fmtFull(totalPurchasePetrol)}</p>
                <div className="w-full bg-muted/30 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-teal-400/70" style={{ width: `${Math.min(100,(totalPurchasePetrol/totalPurchase)*100).toFixed(1)}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground">{((totalPurchasePetrol/totalPurchase)*100).toFixed(1)}% of total</p>
              </div>
              {/* Diesel */}
              <div className="group p-4 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-2">
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
                <p className="text-[11px] tabular-nums text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors duration-150">{fmtFull(totalPurchaseDiesel)}</p>
                <div className="w-full bg-muted/30 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-blue-400/70" style={{ width: `${Math.min(100,(totalPurchaseDiesel/totalPurchase)*100).toFixed(1)}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground">{((totalPurchaseDiesel/totalPurchase)*100).toFixed(1)}% of total</p>
              </div>
              {/* Lubricants */}
              <div className="group p-4 rounded-lg border border-green-500/20 bg-green-500/5 space-y-2">
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
                {totalPurchaseLubricants > 0 && <p className="text-[11px] tabular-nums text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors duration-150">{fmtFull(totalPurchaseLubricants)}</p>}
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
                <Package className="w-4 h-4 text-teal-400" /> Stock Overview
              </CardTitle>
              {lowStock && lowStock.length > 0 && (
                <Badge className="bg-red-500/15 text-red-400 border-red-500/20 text-[10px]">{lowStock.length} low stock</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {allProducts && allProducts.filter((p: any) => p.category === 'fuel').length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Droplets className="w-3 h-3" /> Fuel
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allProducts.filter((p: any) => p.category === 'fuel').map((product: any) => (
                    <DashStockCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )}
            {allProducts && allProducts.filter((p: any) => p.category === 'lubricant').length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <FlaskConical className="w-3 h-3" /> Lubricants
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {allProducts.filter((p: any) => p.category === 'lubricant').map((product: any) => (
                    <DashStockCard key={product.id} product={product} compact />
                  ))}
                </div>
              </div>
            )}
            {!allProducts && (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">Loading stock...</div>
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
            {topCustomers && topCustomers.length > 0 ? [...topCustomers].sort((a: any, b: any) => Number(b.outstanding ?? b.outstandingBalance ?? 0) - Number(a.outstanding ?? a.outstandingBalance ?? 0)).filter((c: any) => Number(c.outstanding ?? c.outstandingBalance ?? 0) > 0).slice(0, 5).map((c: any, i: number) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">Limit: {fmt(Number(c.creditLimit ?? 0))}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-red-400">{fmt(Number(c.outstanding ?? c.outstandingBalance ?? 0))}</p>
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
