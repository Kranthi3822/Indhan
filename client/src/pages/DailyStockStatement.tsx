import { trpc } from "@/lib/trpc";
import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Droplets, TrendingDown, TrendingUp, AlertTriangle,
  CheckCircle, Info, FlaskConical, Save, Pencil,
} from "lucide-react";

const fmtL = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const fmtLShort = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** Dip Variance = (Opening + PO Receipts) − Dip Reading
 *  Positive = stock loss/shrinkage; Negative = stock gain */
function VarianceBadge({ variance }: { variance: number | null }) {
  if (variance === null) return <span className="text-muted-foreground text-xs italic">No dip</span>;
  const abs = Math.abs(variance);
  if (abs < 10) return <span className="text-green-500 text-xs font-semibold">±{fmtLShort(abs)} L ✓</span>;
  if (variance > 0) return (
    <span className="flex items-center gap-1 text-red-400 text-xs font-semibold">
      <TrendingDown className="w-3 h-3" />−{fmtLShort(abs)} L loss
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-blue-400 text-xs font-semibold">
      <TrendingUp className="w-3 h-3" />+{fmtLShort(abs)} L gain
    </span>
  );
}

/** Inline editable dip cell — shows current value or input field when editing */
function DipCell({
  date,
  fuelType,
  currentDip,
  openingStock,
  poReceipts,
  onSaved,
}: {
  date: string;
  fuelType: "petrol" | "diesel";
  currentDip: number | null;
  openingStock: number;
  poReceipts: number;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentDip != null ? String(currentDip) : "");
  const utils = trpc.useUtils();

  const saveDip = trpc.fuelIntelligence.saveDipReading.useMutation({
    onSuccess: () => {
      toast.success(`${fuelType === "petrol" ? "Petrol" : "Diesel"} dip for ${date} saved.`);
      setEditing(false);
      onSaved();
      utils.inventory.dailyStockStatement.invalidate();
    },
    onError: (err) => {
      toast.error(`Save failed: ${err.message}`);
    },
  });

  const handleSave = useCallback(() => {
    const litres = parseFloat(value);
    if (isNaN(litres) || litres < 0) {
      toast.error("Enter a valid litre reading.");
      return;
    }
    saveDip.mutate({ readingDate: date, fuelType, dipLitres: litres });
  }, [value, date, fuelType, saveDip]);

  // Compute live preview variance while editing
  const previewVariance = editing && value !== ""
    ? (openingStock + poReceipts) - parseFloat(value)
    : null;

  if (editing) {
    return (
      <div className="flex flex-col items-end gap-1 min-w-[110px]">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            className="h-6 text-xs w-24 px-2 bg-secondary border-amber-500/50 focus:border-amber-500"
            placeholder="Litres"
            autoFocus
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-amber-400 hover:text-amber-300"
            onClick={handleSave}
            disabled={saveDip.isPending}
          >
            <Save className="w-3 h-3" />
          </Button>
        </div>
        {previewVariance !== null && !isNaN(previewVariance) && (
          <span className={`text-[10px] ${previewVariance > 0 ? "text-red-400" : previewVariance < 0 ? "text-blue-400" : "text-green-500"}`}>
            Var: {previewVariance > 0 ? "−" : previewVariance < 0 ? "+" : "±"}{fmtLShort(Math.abs(previewVariance))} L
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-end gap-1 cursor-pointer group"
      onClick={() => { setValue(currentDip != null ? String(currentDip) : ""); setEditing(true); }}
      title="Click to enter/edit dip reading"
    >
      {currentDip != null
        ? <span className="tabular-nums text-amber-400 font-medium">{fmtL(currentDip)}</span>
        : <span className="text-muted-foreground italic text-[10px]">Enter dip</span>
      }
      <Pencil className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

export default function DailyStockStatement() {
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [preset, setPreset] = useState<"7" | "14" | "30">("14");
  const [fromDate, setFromDate] = useState("2026-03-01");
  const [toDate, setToDate] = useState("2026-03-31");
  const [applied, setApplied] = useState({ fromDate: undefined as string | undefined, toDate: undefined as string | undefined, days: 14 });
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: rows, isLoading } = trpc.inventory.dailyStockStatement.useQuery(applied);

  const summary = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const totalPetrolSales = rows.reduce((s, r) => s + r.petrol.meterSales, 0);
    const totalDieselSales = rows.reduce((s, r) => s + r.diesel.meterSales, 0);
    // Period-boundary formula: Implied Receipts = Closing(last) − Opening(first) + Total Sales
    const sortedRows = [...rows].sort((a, b) => a.date.localeCompare(b.date));
    const firstRow = sortedRows[0];
    const lastRow = sortedRows[sortedRows.length - 1];
    const totalPetrolReceipts = Math.max(0,
      lastRow.petrol.reportedClosing - firstRow.petrol.openingStock + totalPetrolSales
    );
    const totalDieselReceipts = Math.max(0,
      lastRow.diesel.reportedClosing - firstRow.diesel.openingStock + totalDieselSales
    );
    const dipsEntered = rows.filter(r => r.petrol.dipReading !== null || r.diesel.dipReading !== null).length;
    return { totalPetrolSales, totalDieselSales, totalPetrolReceipts, totalDieselReceipts, dipsEntered };
  }, [rows, refreshKey]);

  function applyPreset(p: "7" | "14" | "30") {
    setPreset(p);
    setMode("preset");
    setApplied({ fromDate: undefined, toDate: undefined, days: parseInt(p) });
  }

  function applyCustom() {
    setMode("custom");
    setApplied({ fromDate, toDate, days: 30 });
  }

  const hasDips = rows?.some(r => r.petrol.dipReading !== null || r.diesel.dipReading !== null);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-lg font-bold">Daily Stock Statement</h2>
          <p className="text-xs text-muted-foreground">
            Opening − Sales + Receipts = Closing · Click any <span className="text-amber-400 font-medium">Dip Reading</span> cell to enter a manual measurement
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["7", "14", "30"] as const).map(d => (
            <Button
              key={d}
              size="sm"
              variant={mode === "preset" && preset === d ? "default" : "outline"}
              className="h-7 text-xs px-3"
              onClick={() => applyPreset(d)}
            >
              {d === "7" ? "Last 7 Days" : d === "14" ? "Last 14 Days" : "Last 30 Days"}
            </Button>
          ))}
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="h-7 text-xs w-32 bg-secondary border-border/50"
              min="2025-04-01" max="2026-03-31"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="h-7 text-xs w-32 bg-secondary border-border/50"
              min="2025-04-01" max="2026-03-31"
            />
            <Button size="sm" variant={mode === "custom" ? "default" : "outline"} className="h-7 text-xs px-3" onClick={applyCustom}>
              Apply
            </Button>
          </div>
        </div>
      </div>

      {/* SOP Info banner */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-primary/5 border border-primary/15 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold text-foreground">SOP Formula: </span>
          Closing = Opening − Meter Sales + Receipts.
          {" "}<span className="font-semibold text-amber-400">Dip Variance</span> = (Opening + Purchased Receipts) − Manual Dip Reading.
          {" "}A <span className="text-red-400 font-semibold">positive variance</span> means stock loss/shrinkage; a <span className="text-blue-400 font-semibold">negative variance</span> means stock gain.
          {" "}Click any amber <span className="text-amber-400 font-semibold">Dip Reading</span> cell to enter or update a manual dip measurement.
        </div>
      </div>

      {/* Summary strip */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card className="bg-card border-border/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Droplets className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Petrol Sales</span>
              </div>
              <p className="text-lg font-bold tabular-nums">{fmtLShort(summary.totalPetrolSales)} L</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Diesel Sales</span>
              </div>
              <p className="text-lg font-bold tabular-nums">{fmtLShort(summary.totalDieselSales)} L</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Implied Receipts (Petrol)</span>
              </div>
              <p className="text-lg font-bold tabular-nums">{fmtLShort(summary.totalPetrolReceipts)} L</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Implied Receipts (Diesel)</span>
              </div>
              <p className="text-lg font-bold tabular-nums">{fmtLShort(summary.totalDieselReceipts)} L</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-amber-500/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Dip Readings</span>
              </div>
              <p className="text-lg font-bold tabular-nums text-amber-400">{summary.dipsEntered} <span className="text-xs text-muted-foreground font-normal">/ {rows?.length ?? 0} days</span></p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main table */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            Daily Stock Register
            {rows && <Badge variant="outline" className="text-[10px] ml-auto">{rows.length} days</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading...</div>
          ) : !rows || rows.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">No data for selected period</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium w-24">Date</th>
                    <th className="text-right px-3 py-2 text-teal-400 font-semibold" colSpan={6}>
                      <div className="flex items-center justify-end gap-1">
                        <Droplets className="w-3 h-3" />Petrol (MS)
                      </div>
                    </th>
                    <th className="text-right px-3 py-2 text-blue-400 font-semibold" colSpan={6}>
                      <div className="flex items-center justify-end gap-1">
                        <Droplets className="w-3 h-3" />Diesel (HSD)
                      </div>
                    </th>
                  </tr>
                  <tr className="border-b border-border/30 bg-muted/20">
                    <th className="text-left px-4 py-1.5 text-muted-foreground font-medium"></th>
                    {/* Petrol sub-headers */}
                    <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">Opening</th>
                    <th className="text-right px-3 py-1.5 text-red-400 font-medium">− Sales</th>
                    <th className="text-right px-3 py-1.5 text-green-400 font-medium">+ Receipts</th>
                    <th className="text-right px-3 py-1.5 text-foreground font-semibold">= Closing</th>
                    <th className="text-right px-3 py-1.5 text-amber-400 font-medium">Dip Reading</th>
                    <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">Dip Var.</th>
                    {/* Diesel sub-headers */}
                    <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">Opening</th>
                    <th className="text-right px-3 py-1.5 text-red-400 font-medium">− Sales</th>
                    <th className="text-right px-3 py-1.5 text-green-400 font-medium">+ Receipts</th>
                    <th className="text-right px-3 py-1.5 text-foreground font-semibold">= Closing</th>
                    <th className="text-right px-3 py-1.5 text-amber-400 font-medium">Dip Reading</th>
                    <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">Dip Var.</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const isLatest = i === 0;
                    return (
                      <tr key={row.date} className={`border-b border-border/20 hover:bg-muted/10 transition-colors ${isLatest ? "bg-primary/5" : ""}`}>
                        <td className="px-4 py-2 font-medium">
                          <div className="flex items-center gap-1.5">
                            {isLatest && <CheckCircle className="w-3 h-3 text-primary shrink-0" />}
                            <span>{row.date}</span>
                          </div>
                        </td>
                        {/* Petrol */}
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmtL(row.petrol.openingStock)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-red-400">{fmtL(row.petrol.meterSales)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-green-500">
                          {row.petrol.impliedReceipts > 0 ? `+${fmtL(row.petrol.impliedReceipts)}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtL(row.petrol.reportedClosing)}</td>
                        <td className="px-3 py-2 text-right">
                          <DipCell
                            date={row.date}
                            fuelType="petrol"
                            currentDip={row.petrol.dipReading}
                            openingStock={row.petrol.openingStock}
                            poReceipts={row.petrol.poReceipts}
                            onSaved={() => setRefreshKey(k => k + 1)}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <VarianceBadge variance={row.petrol.dipVariance} />
                        </td>
                        {/* Diesel */}
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmtL(row.diesel.openingStock)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-red-400">{fmtL(row.diesel.meterSales)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-green-500">
                          {row.diesel.impliedReceipts > 0 ? `+${fmtL(row.diesel.impliedReceipts)}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtL(row.diesel.reportedClosing)}</td>
                        <td className="px-3 py-2 text-right">
                          <DipCell
                            date={row.date}
                            fuelType="diesel"
                            currentDip={row.diesel.dipReading}
                            openingStock={row.diesel.openingStock}
                            poReceipts={row.diesel.poReceipts}
                            onSaved={() => setRefreshKey(k => k + 1)}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <VarianceBadge variance={row.diesel.dipVariance} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals footer */}
                {summary && (
                  <tfoot>
                    <tr className="border-t-2 border-border/50 bg-muted/30 font-semibold">
                      <td className="px-4 py-2 text-xs font-bold">TOTAL</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">—</td>
                      <td className="px-3 py-2 text-right tabular-nums text-red-400">{fmtL(summary.totalPetrolSales)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-green-500">+{fmtL(summary.totalPetrolReceipts)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">—</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">—</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">—</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">—</td>
                      <td className="px-3 py-2 text-right tabular-nums text-red-400">{fmtL(summary.totalDieselSales)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-green-500">+{fmtL(summary.totalDieselReceipts)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">—</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">—</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">—</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dip reading note */}
      {!hasDips && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-muted-foreground">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold text-amber-400">No Dip Readings Entered Yet: </span>
            Click any <span className="font-semibold text-amber-400">Dip Reading</span> cell in the table above to enter a manual dip measurement for that day.
            The <span className="font-semibold text-foreground">Dip Variance</span> column will automatically calculate{" "}
            <span className="font-semibold">(Opening + Purchased Receipts) − Dip Reading</span> to show stock loss or gain.
          </div>
        </div>
      )}
    </div>
  );
}
