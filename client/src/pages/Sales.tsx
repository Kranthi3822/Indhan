import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Fuel, TrendingUp, IndianRupee, Droplets,
  CreditCard, Wallet, Smartphone, Users,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { fmtCompact, fmtVol, fmtFull } from "@/lib/format";
import { StatCard } from "@/components/StatCard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAYMENT_COLORS = {
  Cash:   "oklch(0.78 0.15 65)",
  Card:   "oklch(0.65 0.18 250)",
  Credit: "oklch(0.60 0.22 25)",
  Online: "oklch(0.72 0.18 145)",
};

// ─── Period Presets ───────────────────────────────────────────────────────────

const PRESETS = [
  { label: "Mar 2026", start: "2026-03-01", end: "2026-03-31" },
  { label: "Feb 2026", start: "2026-02-01", end: "2026-02-28" },
  { label: "Jan 2026", start: "2026-01-01", end: "2026-01-31" },
  { label: "Q4 FY26",  start: "2026-01-01", end: "2026-03-31" },
  { label: "FY 25-26", start: "2025-04-01", end: "2026-03-31" },
];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/50 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold mb-1 text-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.fill || p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">
            {p.name.includes("Vol") || p.name.includes("Qty") ? fmtVol(p.value) : fmtCompact(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Payment Mini-Card ────────────────────────────────────────────────────────

function PaymentCard({
  icon: Icon, label, amount, color,
}: {
  icon: any; label: string; amount: number; color: string;
}) {
  const fullAmt = fmtFull(amount);
  return (
    <Card className="group bg-card border-border/50 cursor-default">
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${color}20`, border: `1px solid ${color}40` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold tabular-nums leading-tight">{fmtCompact(amount)}</p>
          <p className="text-[11px] tabular-nums text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors duration-150 leading-tight truncate">
            {fullAmt}
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Sales() {
  const [preset, setPreset] = useState(0);
  const [customFrom, setCustomFrom] = useState("2026-03-01");
  const [customTo, setCustomTo] = useState("2026-03-31");
  const [appliedFrom, setAppliedFrom] = useState("2026-03-01");
  const [appliedTo, setAppliedTo] = useState("2026-03-31");
  const [showCustom, setShowCustom] = useState(false);

  const startDate = showCustom ? appliedFrom : PRESETS[preset]?.start ?? "2026-03-01";
  const endDate   = showCustom ? appliedTo   : PRESETS[preset]?.end   ?? "2026-03-31";

  // Data from daily_reports
  const { data: trend } = trpc.dashboard.trendByRange.useQuery({ startDate, endDate });
  const { data: kpis }  = trpc.dashboard.kpis.useQuery({ startDate, endDate });

  // ─── Aggregated KPIs ─────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    if (!trend || trend.length === 0) return null;
    let totalSales = 0, petrolQty = 0, dieselQty = 0;
    let cash = 0, card = 0, credit = 0, online = 0;
    trend.forEach((r: any) => {
      totalSales += Number(r.totalSalesValue ?? 0);
      petrolQty  += Number(r.petrolSalesQty ?? 0);
      dieselQty  += Number(r.dieselSalesQty ?? 0);
      cash       += Number(r.cashCollected ?? 0);
      card       += Number(r.cardCollected ?? 0);
      credit     += Number(r.creditSales ?? 0);
      online     += Number(r.onlineCollected ?? 0);
    });
    return { totalSales, petrolQty, dieselQty, cash, card, credit, online };
  }, [trend]);

  // ─── Daily Bar Chart Data ─────────────────────────────────────────────────────
  const barData = useMemo(() => {
    if (!trend) return [];
    return trend.map((r: any) => {
      const date = String(r.reportDate ?? "").slice(0, 10);
      return {
        date: date.slice(5), // MM-DD
        "Petrol Vol": Number(r.petrolSalesQty ?? 0),
        "Diesel Vol": Number(r.dieselSalesQty ?? 0),
        "Sales ₹":   Number(r.totalSalesValue ?? 0),
      };
    });
  }, [trend]);

  // ─── Payment Mix Pie ──────────────────────────────────────────────────────────
  const paymentMix = useMemo(() => {
    if (!summary) return [];
    const total = summary.cash + summary.card + summary.credit + summary.online;
    if (total === 0) return [];
    return [
      { name: "Cash",   value: Math.round((summary.cash   / total) * 100), amount: summary.cash,   color: PAYMENT_COLORS.Cash },
      { name: "Card",   value: Math.round((summary.card   / total) * 100), amount: summary.card,   color: PAYMENT_COLORS.Card },
      { name: "Credit", value: Math.round((summary.credit / total) * 100), amount: summary.credit, color: PAYMENT_COLORS.Credit },
      { name: "Online", value: Math.round((summary.online / total) * 100), amount: summary.online, color: PAYMENT_COLORS.Online },
    ].filter(p => p.value > 0);
  }, [summary]);

  const periodLabel = showCustom
    ? `${appliedFrom} – ${appliedTo}`
    : PRESETS[preset]?.label ?? "Mar 2026";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Fuel className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Sales & Nozzles</h2>
            <p className="text-sm text-muted-foreground">Daily fuel sales by product and payment method</p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {PRESETS.map((p, i) => (
            <Button
              key={p.label}
              size="sm"
              variant={!showCustom && preset === i ? "default" : "outline"}
              className="h-8 text-xs px-3"
              onClick={() => { setPreset(i); setShowCustom(false); }}
            >
              {p.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant={showCustom ? "default" : "outline"}
            className="h-8 text-xs px-3"
            onClick={() => setShowCustom(v => !v)}
          >
            Custom
          </Button>
        </div>
      </div>

      {/* Custom Date Inputs */}
      {showCustom && (
        <div className="flex items-center gap-2 flex-wrap bg-card border border-border/50 rounded-lg px-4 py-3">
          <span className="text-xs text-muted-foreground">From</span>
          <input type="date" value={customFrom} min="2025-04-01" max="2026-03-31"
            onChange={e => setCustomFrom(e.target.value)}
            className="h-8 text-xs rounded-md border border-border/50 bg-background px-2 text-foreground" />
          <span className="text-xs text-muted-foreground">To</span>
          <input type="date" value={customTo} min="2025-04-01" max="2026-03-31"
            onChange={e => setCustomTo(e.target.value)}
            className="h-8 text-xs rounded-md border border-border/50 bg-background px-2 text-foreground" />
          <Button size="sm" className="h-8 text-xs"
            disabled={customFrom > customTo}
            onClick={() => { setAppliedFrom(customFrom); setAppliedTo(customTo); }}>
            Apply
          </Button>
        </div>
      )}

      {/* KPI Cards — compact + full exact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={IndianRupee}
          label="Total Sales"
          value={fmtCompact(summary?.totalSales ?? 0)}
          rawValue={summary?.totalSales ?? 0}
          sub={periodLabel}
          color="oklch(0.78 0.15 65)"
        />
        <StatCard
          icon={Droplets}
          label="Petrol Volume"
          value={fmtVol(summary?.petrolQty ?? 0)}
          isCurrency={false}
          sub="Litres dispensed"
          color="oklch(0.72 0.18 145)"
        />
        <StatCard
          icon={Fuel}
          label="Diesel Volume"
          value={fmtVol(summary?.dieselQty ?? 0)}
          isCurrency={false}
          sub="Litres dispensed"
          color="oklch(0.65 0.18 250)"
        />
        <StatCard
          icon={TrendingUp}
          label="Gross Profit"
          value={fmtCompact(Number(kpis?.grossProfit ?? 0))}
          rawValue={Number(kpis?.grossProfit ?? 0)}
          sub="Fuel margin"
          color="oklch(0.78 0.15 65)"
        />
      </div>

      {/* Payment Method Cards — compact + full exact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <PaymentCard icon={Wallet}     label="Cash"        amount={summary?.cash   ?? 0} color={PAYMENT_COLORS.Cash}   />
        <PaymentCard icon={CreditCard} label="Card / POS"  amount={summary?.card   ?? 0} color={PAYMENT_COLORS.Card}   />
        <PaymentCard icon={Users}      label="Credit Sales" amount={summary?.credit ?? 0} color={PAYMENT_COLORS.Credit} />
        <PaymentCard icon={Smartphone} label="Online / UPI" amount={summary?.online ?? 0} color={PAYMENT_COLORS.Online} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily Volume Bar Chart */}
        <Card className="lg:col-span-2 bg-card border-border/50">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Daily Fuel Volume — {periodLabel}</CardTitle>
              <Badge variant="outline" className="text-[10px] border-border/50">Litres</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.016 240)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "oklch(0.60 0.012 240)" }} axisLine={false} tickLine={false}
                    interval={barData.length > 20 ? Math.floor(barData.length / 10) : 0} />
                  <YAxis tick={{ fontSize: 9, fill: "oklch(0.60 0.012 240)" }} axisLine={false} tickLine={false}
                    tickFormatter={v => fmtVol(v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar dataKey="Petrol Vol" fill="oklch(0.72 0.18 145)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Diesel Vol" fill="oklch(0.65 0.18 250)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No data for selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Mix Donut */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Payment Mix</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {paymentMix.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={paymentMix} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                      paddingAngle={3} dataKey="value">
                      {paymentMix.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                      formatter={(v: any, name: any, props: any) => [`${v}% (${fmtCompact(props.payload.amount)})`, name]}
                      contentStyle={{ background: "oklch(0.17 0.014 240)", border: "1px solid oklch(0.26 0.016 240)", borderRadius: "8px", fontSize: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {paymentMix.map(item => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold tabular-nums">{item.value}%</span>
                        <span className="text-muted-foreground ml-1">({fmtCompact(item.amount)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">
                No data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Sales Table */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Daily Sales Register — {periodLabel}</CardTitle>
            <Badge variant="outline" className="text-[10px] border-border/50">{trend?.length ?? 0} days</Badge>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30">
                  {["Date", "Petrol (L)", "Petrol (₹)", "Diesel (L)", "Diesel (₹)", "Total Sales", "Cash", "Card", "Credit", "Online", "Status"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trend && trend.length > 0 ? [...trend].reverse().map((r: any, i: number) => {
                  const date = String(r.reportDate ?? "").slice(0, 10);
                  const status = r.reconciliationStatus ?? "pending";
                  const totalSalesVal = Number(r.totalSalesValue ?? 0);
                  const cashVal   = Number(r.cashCollected ?? 0);
                  const cardVal   = Number(r.cardCollected ?? 0);
                  const creditVal = Number(r.creditSales ?? 0);
                  const onlineVal = Number(r.onlineCollected ?? 0);
                  return (
                    <tr key={i} className="border-b border-border/20 hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-2.5 font-medium whitespace-nowrap">{date}</td>
                      <td className="px-4 py-2.5 tabular-nums text-green-400">{Number(r.petrolSalesQty ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-2.5 tabular-nums text-green-300 font-medium">
                        <span title={fmtFull(Number(r.petrolSalesAmount ?? 0))}>{fmtCompact(Number(r.petrolSalesAmount ?? 0))}</span>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-blue-400">{Number(r.dieselSalesQty ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-2.5 tabular-nums text-blue-300 font-medium">
                        <span title={fmtFull(Number(r.dieselSalesAmount ?? 0))}>{fmtCompact(Number(r.dieselSalesAmount ?? 0))}</span>
                      </td>
                      {/* Total Sales: compact + hover full */}
                      <td className="px-4 py-2.5 tabular-nums font-semibold">
                        <span title={fmtFull(totalSalesVal)}>{fmtCompact(totalSalesVal)}</span>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                        <span title={fmtFull(cashVal)}>{fmtCompact(cashVal)}</span>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                        <span title={fmtFull(cardVal)}>{fmtCompact(cardVal)}</span>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-red-400">
                        <span title={fmtFull(creditVal)}>{fmtCompact(creditVal)}</span>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                        <span title={fmtFull(onlineVal)}>{fmtCompact(onlineVal)}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge className={`text-[10px] ${
                          status === "reconciled"  ? "bg-green-500/15 text-green-400 border-green-500/20" :
                          status === "discrepancy" ? "bg-red-500/15 text-red-400 border-red-500/20" :
                          "bg-amber-500/15 text-amber-400 border-amber-500/20"
                        }`}>
                          {status}
                        </Badge>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                      No data for selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
