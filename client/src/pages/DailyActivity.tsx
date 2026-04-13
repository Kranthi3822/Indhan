/**
 * DailyActivity.tsx — Daily Activity Report
 * All data is auto-populated from nozzle sessions. No manual entry required.
 * Data flows: Nozzle Entry → Session Close → autoPopulateDailyReport → here
 */
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ClipboardList, Droplets, Wallet, CreditCard, Smartphone, ChevronDown, ChevronRight,
  CheckCircle2, Clock, TrendingUp, Calendar, Fuel, ArrowLeft, ArrowRight
} from "lucide-react";
import { format, subDays, addDays } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const fmtL = (n: number) => `${n.toFixed(1)}L`;

const fmtCompact = (n: number) => {
  if (Math.abs(n) >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (Math.abs(n) >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (Math.abs(n) >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
};

const DIGITAL_LABELS: Record<string, string> = {
  upi: "UPI", phonepe: "PhonePe", card: "Card", bank_transfer: "Bank", bhim: "BHIM"
};

export default function DailyActivity() {
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());

  const { data: report, isLoading } = trpc.nozzle.getDailyActivityReport.useQuery(
    { reportDate: selectedDate },
    { refetchInterval: 30_000 } // auto-refresh every 30s
  );

  const { data: recentData } = trpc.nozzle.getRecentDailyActivity.useQuery({ days: 14 });

  function toggleSession(id: number) {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function prevDay() {
    setSelectedDate(d => format(subDays(new Date(d), 1), "yyyy-MM-dd"));
  }
  function nextDay() {
    const next = addDays(new Date(selectedDate), 1);
    if (next <= new Date()) setSelectedDate(format(next, "yyyy-MM-dd"));
  }

  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");

  // Chart data from recent activity
  const chartData = useMemo(() => {
    if (!recentData) return [];
    return recentData.map((d: any) => ({
      date: d.date.slice(5), // MM-DD
      petrol: Number(d.totalPetrol.toFixed(1)),
      diesel: Number(d.totalDiesel.toFixed(1)),
      collected: d.totalCollected,
    }));
  }, [recentData]);

  const hasData = report && report.sessionCount > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Daily Activity Report
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Auto-populated from nozzle sessions · refreshes every 30s</p>
        </div>
        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={prevDay}>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
          <Input
            type="date"
            className="bg-secondary border-border/50 h-8 text-sm w-36"
            value={selectedDate}
            max={format(new Date(), "yyyy-MM-dd")}
            onChange={e => setSelectedDate(e.target.value)}
          />
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={nextDay} disabled={isToday}>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
          {isToday && <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">Today</Badge>}
        </div>
      </div>

      {/* No data state */}
      {!isLoading && !hasData && (
        <Card className="bg-card border-border/50">
          <CardContent className="py-12 text-center">
            <Fuel className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium text-muted-foreground">No nozzle sessions recorded for {selectedDate}</p>
            <p className="text-xs text-muted-foreground mt-1">Data appears here automatically when staff complete nozzle entries</p>
          </CardContent>
        </Card>
      )}

      {/* KPI Strip */}
      {hasData && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Petrol Volume */}
            <Card className="bg-card border-border/50">
              <CardContent className="p-4">
                <div className="w-9 h-9 rounded-lg border border-teal-500/20 bg-teal-500/10 flex items-center justify-center mb-3">
                  <Droplets className="w-4 h-4 text-teal-400" />
                </div>
                <p className="text-lg font-bold tabular-nums text-teal-400">{fmtL(report.totalPetrolLitres)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Petrol Sold</p>
              </CardContent>
            </Card>
            {/* Diesel Volume */}
            <Card className="bg-card border-border/50">
              <CardContent className="p-4">
                <div className="w-9 h-9 rounded-lg border border-blue-500/20 bg-blue-500/10 flex items-center justify-center mb-3">
                  <Droplets className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-lg font-bold tabular-nums text-blue-400">{fmtL(report.totalDieselLitres)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Diesel Sold</p>
              </CardContent>
            </Card>
            {/* Cash */}
            <Card className="bg-card border-border/50">
              <CardContent className="p-4">
                <div className="w-9 h-9 rounded-lg border border-green-500/20 bg-green-500/10 flex items-center justify-center mb-3">
                  <Wallet className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-lg font-bold tabular-nums text-green-400">{fmtCompact(report.totalCash)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Cash Collected</p>
              </CardContent>
            </Card>
            {/* Total Collected */}
            <Card className="bg-card border-border/50">
              <CardContent className="p-4">
                <div className="w-9 h-9 rounded-lg border border-primary/20 bg-primary/10 flex items-center justify-center mb-3">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <p className="text-lg font-bold tabular-nums text-primary">{fmtCompact(report.totalCollected)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Total Collected</p>
              </CardContent>
            </Card>
          </div>

          {/* Payment Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">Payment Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {/* Cash */}
                <div className="flex items-center justify-between py-1.5 border-b border-border/20">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                      <Wallet className="w-3.5 h-3.5 text-green-400" />
                    </div>
                    <span className="text-sm">Cash</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-green-400">{fmt(report.totalCash)}</span>
                </div>
                {/* Digital */}
                <div className="flex items-center justify-between py-1.5 border-b border-border/20">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <span className="text-sm">Digital</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-blue-400">{fmt(report.totalDigital)}</span>
                </div>
                {/* Digital sub-types */}
                {Object.entries(report.digitalBreakdown ?? {}).filter(([, v]) => (v as number) > 0).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between pl-9 py-0.5">
                    <span className="text-xs text-muted-foreground">{DIGITAL_LABELS[k] ?? k}</span>
                    <span className="text-xs tabular-nums text-blue-300">{fmt(v as number)}</span>
                  </div>
                ))}
                {/* Credit */}
                <div className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      <CreditCard className="w-3.5 h-3.5 text-orange-400" />
                    </div>
                    <span className="text-sm">Credit</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-orange-400">{fmt(report.totalCredit)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Session Status */}
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">Sessions</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-3 rounded-lg bg-secondary/40">
                    <p className="text-xl font-bold tabular-nums">{report.sessionCount}</p>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-green-500/10">
                    <p className="text-2xl font-bold text-green-400">{report.closedSessions}</p>
                    <p className="text-[10px] text-muted-foreground">Closed</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-teal-500/10">
                    <p className="text-2xl font-bold text-teal-400">{report.openSessions}</p>
                    <p className="text-[10px] text-muted-foreground">Open</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total Litres Dispensed</span>
                    <span className="font-semibold">{fmtL(report.totalLitres)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Petrol</span>
                    <span className="font-semibold text-teal-400">{fmtL(report.totalPetrolLitres)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Diesel</span>
                    <span className="font-semibold text-blue-400">{fmtL(report.totalDieselLitres)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Session Details */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Session Details</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {report.sessions.map((session: any) => {
                const isExpanded = expandedSessions.has(session.sessionId);
                return (
                  <div key={session.sessionId} className="rounded-lg border border-border/40 overflow-hidden">
                    {/* Session header */}
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/40 transition-colors text-left"
                      onClick={() => toggleSession(session.sessionId)}
                    >
                      {session.status === "closed"
                        ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                        : <Clock className="w-4 h-4 text-teal-400 shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{session.staffName}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{session.shiftLabel?.replace("_", " ")} · {session.status}</p>
                      </div>
                      <div className="text-right mr-2">
                        <p className="text-xs font-bold tabular-nums">{fmt(session.totalCollected)}</p>
                        <p className="text-[10px] text-muted-foreground">{fmtL(session.totalPetrolLitres + session.totalDieselLitres)}</p>
                      </div>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                    </button>

                    {/* Expanded nozzle details */}
                    {isExpanded && (
                      <div className="border-t border-border/30 bg-secondary/20 px-3 py-3 space-y-2">
                        {/* Per-nozzle breakdown */}
                        {session.nozzleSummaries?.map((ns: any) => (
                          <div key={ns.nozzleId} className="flex items-center gap-3 rounded-lg bg-card/60 px-3 py-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${ns.fuelType === "petrol" ? "bg-teal-500/10 border border-teal-500/20" : "bg-blue-500/10 border border-blue-500/20"}`}>
                              <Droplets className={`w-3.5 h-3.5 ${ns.fuelType === "petrol" ? "text-teal-400" : "text-blue-400"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium">{ns.label ?? `Nozzle #${ns.nozzleId}`}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{ns.fuelType}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold tabular-nums">{ns.dispensed !== null ? fmtL(ns.dispensed) : "—"}</p>
                              <p className="text-[10px] text-muted-foreground">{ns.opening?.toFixed(1)} → {ns.closing?.toFixed(1)}</p>
                            </div>
                            {ns.payments && (
                              <div className="text-right text-[10px] space-y-0.5 min-w-[70px]">
                                <p className="text-green-400">₹{ns.payments.cash.toFixed(0)} cash</p>
                                <p className="text-blue-400">₹{ns.payments.digital.toFixed(0)} dig</p>
                                {ns.payments.credit > 0 && <p className="text-orange-400">₹{ns.payments.credit.toFixed(0)} cr</p>}
                              </div>
                            )}
                          </div>
                        ))}
                        {/* Session totals */}
                        <div className="flex justify-between text-xs pt-1 border-t border-border/20">
                          <span className="text-muted-foreground">Session Total</span>
                          <div className="flex gap-3">
                            <span className="text-green-400">Cash: {fmt(session.totalCash)}</span>
                            <span className="text-blue-400">Digital: {fmt(session.totalDigital)}</span>
                            {session.totalCredit > 0 && <span className="text-orange-400">Credit: {fmt(session.totalCredit)}</span>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}

      {/* 14-day trend chart */}
      {chartData.length > 1 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              14-Day Volume Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}L`} width={40} />
                <Tooltip
                  formatter={(v: any, name: string) => [`${Number(v).toFixed(1)}L`, name === "petrol" ? "Petrol" : "Diesel"]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="petrol" name="Petrol" fill="#17897e" radius={[2, 2, 0, 0]} />
                <Bar dataKey="diesel" name="Diesel" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
