/**
 * FuelPrices.tsx
 * Daily Fuel Price Entry — staff log today's petrol/diesel retail and cost prices.
 * These override the static product table in Fuel Intelligence calculations.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Fuel, TrendingUp, TrendingDown, Minus, CalendarDays, CheckCircle2, AlertCircle, History } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { fmtCompact } from "@/lib/format";
import { format } from "date-fns";
import { toast } from "sonner";

const today = new Date().toISOString().slice(0, 10);

function PriceEntryCard({
  fuelType,
  color,
  label,
  onSaved,
}: {
  fuelType: "petrol" | "diesel";
  color: "teal" | "blue";
  label: string;
  onSaved: () => void;
}) {
  const [priceDate, setPriceDate] = useState(today);
  const [retailPrice, setRetailPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();
  const saveMutation = trpc.fuelPrices.saveDailyPrice.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.fuelPrices.getDailyPrices.invalidate();
      utils.fuelIntelligence.getIntelligence.invalidate();
      onSaved();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const retail = parseFloat(retailPrice);
  const cost = parseFloat(costPrice);
  const margin = !isNaN(retail) && !isNaN(cost) && cost > 0 ? retail - cost : null;
  const marginPct = margin !== null && retail > 0 ? ((margin / retail) * 100).toFixed(2) : null;

  const colorClasses = {
    teal: {
      border: "border-teal-500/30",
      bg: "bg-teal-500/5",
      text: "text-teal-400",
      badge: "bg-teal-500/15 text-teal-400 border-teal-500/30",
      btn: "bg-teal-600 hover:bg-teal-700 text-white",
    },
    blue: {
      border: "border-blue-500/30",
      bg: "bg-blue-500/5",
      text: "text-blue-400",
      badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      btn: "bg-blue-500 hover:bg-blue-600 text-white",
    },
  }[color];

  return (
    <Card className={`border ${colorClasses.border} ${colorClasses.bg}`}>
      <CardHeader className="pb-3 pt-4 px-5">
        <CardTitle className={`text-sm font-semibold flex items-center gap-2 ${colorClasses.text}`}>
          <Fuel className="w-4 h-4" /> {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-4">
        {/* Date */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Price Date</Label>
          <Input
            type="date"
            value={priceDate}
            onChange={e => setPriceDate(e.target.value)}
            max={today}
            className="h-9 text-sm"
          />
        </div>

        {/* Retail Price */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Retail Selling Price (₹/L) <span className="text-red-400">*</span></Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
            <Input
              type="number"
              step="0.01"
              min="50"
              max="300"
              placeholder="e.g. 108.83"
              value={retailPrice}
              onChange={e => setRetailPrice(e.target.value)}
              className="pl-7 h-9 text-sm"
            />
          </div>
        </div>

        {/* Cost Price */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Purchase Cost Price (₹/L) <span className="text-muted-foreground/50">optional</span></Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
            <Input
              type="number"
              step="0.01"
              min="40"
              max="280"
              placeholder="e.g. 104.88"
              value={costPrice}
              onChange={e => setCostPrice(e.target.value)}
              className="pl-7 h-9 text-sm"
            />
          </div>
        </div>

        {/* Live margin preview */}
        {margin !== null && (
          <div className={`flex items-center justify-between p-2.5 rounded-lg border ${colorClasses.border} ${colorClasses.bg}`}>
            <span className="text-xs text-muted-foreground">Calculated Margin</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold tabular-nums ${margin >= 0 ? colorClasses.text : "text-red-400"}`}>
                ₹{margin.toFixed(2)}/L
              </span>
              {marginPct && (
                <span className={`text-xs px-1.5 py-0.5 rounded border ${colorClasses.badge}`}>
                  {marginPct}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
          <Input
            placeholder="e.g. Price revision effective today"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="h-9 text-sm"
          />
        </div>

        <Button
          className={`w-full h-9 text-sm font-semibold ${colorClasses.btn}`}
          disabled={!retailPrice || isNaN(retail) || retail < 50 || saveMutation.isPending}
          onClick={() => saveMutation.mutate({
            priceDate,
            fuelType,
            retailPrice: retail,
            costPrice: !isNaN(cost) && cost > 0 ? cost : undefined,
            notes: notes || undefined,
          })}
        >
          {saveMutation.isPending ? "Saving..." : `Save ${label} Price`}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function FuelPrices() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: history, isLoading } = trpc.fuelPrices.getDailyPrices.useQuery({
    limit: 60,
  });

  const petrolHistory = history?.filter(h => h.fuelType === "petrol") ?? [];
  const dieselHistory = history?.filter(h => h.fuelType === "diesel") ?? [];

  function getMarginTrend(current: number | null, previous: number | null) {
    if (!current || !previous) return null;
    const diff = current - previous;
    if (Math.abs(diff) < 0.01) return { dir: "flat", diff: 0 };
    return { dir: diff > 0 ? "up" : "down", diff };
  }

  const latestPetrol = petrolHistory[0];
  const latestDiesel = dieselHistory[0];
  const prevPetrol = petrolHistory[1];
  const prevDiesel = dieselHistory[1];

  const petrolTrend = getMarginTrend(latestPetrol?.margin ?? null, prevPetrol?.margin ?? null);
  const dieselTrend = getMarginTrend(latestDiesel?.margin ?? null, prevDiesel?.margin ?? null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold tracking-tight">Daily Fuel Prices</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Log today's retail selling price and purchase cost. These update the Fuel Intelligence margins in real time.
        </p>
      </div>

      {/* Current Price Summary */}
      {(latestPetrol || latestDiesel) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { data: latestPetrol, trend: petrolTrend, label: "Petrol (MS)", color: "teal" as const },
            { data: latestDiesel, trend: dieselTrend, label: "Diesel (HSD)", color: "blue" as const },
          ].map(({ data, trend, label, color }) => {
            if (!data) return null;
            const colorCls = color === "teal"
              ? { text: "text-teal-400", border: "border-teal-500/20", bg: "bg-teal-500/5" }
              : { text: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-500/5" };
            return (
              <Card key={label} className={`border ${colorCls.border} ${colorCls.bg}`}>
                <CardContent className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Fuel className={`w-4 h-4 ${colorCls.text}`} />
                    <span className={`text-sm font-semibold ${colorCls.text}`}>{label}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{data.priceDate}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Retail</p>
                      <p className={`text-lg font-bold tabular-nums ${colorCls.text}`}>₹{data.retailPrice.toFixed(2)}</p>
                    </div>
                    {data.costPrice && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">Cost</p>
                        <p className="text-lg font-bold tabular-nums">₹{data.costPrice.toFixed(2)}</p>
                      </div>
                    )}
                    {data.margin !== null && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">Margin</p>
                        <div className="flex items-center gap-1">
                          <p className={`text-lg font-bold tabular-nums ${colorCls.text}`}>₹{data.margin.toFixed(2)}</p>
                          {trend && trend.dir !== "flat" && (
                            trend.dir === "up"
                              ? <TrendingUp className="w-3 h-3 text-green-400" />
                              : <TrendingDown className="w-3 h-3 text-red-400" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    {data.source === "receipt_scan"
                      ? <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-green-500/30 text-green-400">Receipt Scan</Badge>
                      : <Badge variant="outline" className="text-[10px] h-4 px-1.5">Manual Entry</Badge>
                    }
                    {data.recordedBy && <span className="text-[10px] text-muted-foreground">by {data.recordedBy}</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Entry Forms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PriceEntryCard fuelType="petrol" color="teal" label="Petrol (MS)" onSaved={() => setRefreshKey(k => k + 1)} />
        <PriceEntryCard fuelType="diesel" color="blue" label="Diesel (HSD)" onSaved={() => setRefreshKey(k => k + 1)} />
      </div>

      {/* Price History Table */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-primary" /> Price History (Last 60 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : !history || history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No price history yet. Enter today's prices above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[480px]">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Date</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Fuel</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Retail ₹/L</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Cost ₹/L</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Margin ₹/L</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Margin %</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Source</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">By</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => {
                    const marginPct = row.margin !== null && row.retailPrice > 0
                      ? ((row.margin / row.retailPrice) * 100).toFixed(2)
                      : null;
                    const isPositive = row.margin !== null && row.margin >= 0;
                    return (
                      <tr key={row.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                        <td className="py-2 px-2 tabular-nums">{row.priceDate}</td>
                        <td className="py-2 px-2">
                          <span className={`font-medium capitalize ${row.fuelType === "petrol" ? "text-teal-400" : "text-blue-400"}`}>
                            {row.fuelType}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums font-semibold">₹{row.retailPrice.toFixed(2)}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                          {row.costPrice ? `₹${row.costPrice.toFixed(2)}` : "—"}
                        </td>
                        <td className={`py-2 px-2 text-right tabular-nums font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}>
                          {row.margin !== null ? `₹${row.margin.toFixed(2)}` : "—"}
                        </td>
                        <td className={`py-2 px-2 text-right tabular-nums ${isPositive ? "text-green-400" : "text-red-400"}`}>
                          {marginPct ? `${marginPct}%` : "—"}
                        </td>
                        <td className="py-2 px-2">
                          {row.source === "receipt_scan"
                            ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">Scan</span>
                            : <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground border border-border/30">Manual</span>
                          }
                        </td>
                        <td className="py-2 px-2 text-muted-foreground truncate max-w-[100px]">{row.recordedBy ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
