import { trpc } from "@/lib/trpc";
import { useState, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Droplets, TrendingDown, TrendingUp, AlertTriangle,
  CheckCircle, Info, FlaskConical, Save, Pencil, Upload, Loader2, Plus,
  PackageCheck, ArrowRight,
} from "lucide-react";

const fmtL = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const fmtLShort = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** Dip Variance = Closing Stock − Dip Reading
 *  Positive = system closing > dip (possible loss/evaporation)
 *  Negative = dip > system closing (possible gain/meter error) */
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

/** Inline editable dip cell — shows current value or input field when editing.
 * Displays both raw dip stick number and Manual Dip Reading (litres) when available. */
function DipCell({
  date,
  fuelType,
  currentDip,
  currentDipStick,
  reportedClosing,
  onSaved,
}: {
  date: string;
  fuelType: "petrol" | "diesel";
  currentDip: number | null;        // Manual Dip Reading in litres
  currentDipStick: number | null;   // Raw dip stick number (unitless)
  reportedClosing: number;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [litresVal, setLitresVal] = useState(currentDip != null ? String(currentDip) : "");
  const [stickVal, setStickVal] = useState(currentDipStick != null ? String(currentDipStick) : "");
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
    const litres = parseFloat(litresVal);
    if (isNaN(litres) || litres < 0) {
      toast.error("Enter a valid litre reading.");
      return;
    }
    const stick = stickVal !== "" ? parseFloat(stickVal) : null;
    saveDip.mutate({
      readingDate: date,
      fuelType,
      dipLitres: litres,
      dipStickReading: stick && !isNaN(stick) ? stick : null,
    });
  }, [litresVal, stickVal, date, fuelType, saveDip]);

  // Compute live preview variance while editing: Closing Stock − Dip Reading
  const previewVariance = editing && litresVal !== ""
    ? reportedClosing - parseFloat(litresVal)
    : null;

  if (editing) {
    return (
      <div className="flex flex-col items-end gap-1 min-w-[130px]">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={stickVal}
            onChange={e => setStickVal(e.target.value)}
            className="h-6 text-xs w-14 px-2 bg-secondary border-border/50"
            placeholder="Stick"
            title="Raw dip stick number"
          />
          <Input
            type="number"
            value={litresVal}
            onChange={e => setLitresVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            className="h-6 text-xs w-20 px-2 bg-secondary border-amber-500/50 focus:border-amber-500"
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
      className="flex flex-col items-end gap-0.5 cursor-pointer group"
      onClick={() => {
        setLitresVal(currentDip != null ? String(currentDip) : "");
        setStickVal(currentDipStick != null ? String(currentDipStick) : "");
        setEditing(true);
      }}
      title="Click to enter/edit dip reading"
    >
      {currentDip != null ? (
        <>
          <span className="tabular-nums text-amber-400 font-medium">{fmtL(currentDip)} L</span>
          {currentDipStick != null && (
            <span className="text-[9px] text-muted-foreground tabular-nums">↑{currentDipStick}</span>
          )}
        </>
      ) : (
        <span className="text-muted-foreground italic text-[10px]">Enter dip</span>
      )}
      <Pencil className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

/** Dialog for entering today's closing stock (both fuels at once).
 *  Opening = yesterday's closing (auto-fetched from server).
 *  Receipts = delivered POs for the date (auto-fetched).
 *  Sales = Opening + Receipts − Closing (calculated by server).
 */
function AddClosingStockDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [petrolClosing, setPetrolClosing] = useState("");
  const [dieselClosing, setDieselClosing] = useState("");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<{
    openingStockPetrol: number; openingStockDiesel: number;
    closingStockPetrol: number; closingStockDiesel: number;
    receiptsP: number; receiptsD: number;
    calculatedSalesP: number; calculatedSalesD: number;
  } | null>(null);
  const utils = trpc.useUtils();

  const saveClosing = trpc.reconciliation.saveClosingStock.useMutation({
    onSuccess: (result) => {
      setPreview(result);
      toast.success(`Closing stock saved for ${result.reportDate}`);
      utils.inventory.dailyStockStatement.invalidate();
      onSaved();
    },
    onError: (err) => toast.error(`Save failed: ${err.message}`),
  });

  // Fetch yesterday's closing to show preview before saving
  const prevDate = useMemo(() => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }, [date]);
  const { data: prevReport } = trpc.reconciliation.byDate.useQuery({ reportDate: prevDate }, { enabled: open });

  const openP = prevReport ? Number(prevReport.closingStockPetrol ?? 0) : null;
  const openD = prevReport ? Number(prevReport.closingStockDiesel ?? 0) : null;

  const handleSave = useCallback(() => {
    const closingP = parseFloat(petrolClosing);
    const closingD = parseFloat(dieselClosing);
    if (isNaN(closingP) || closingP < 0) { toast.error("Enter a valid Petrol closing stock (litres)."); return; }
    if (isNaN(closingD) || closingD < 0) { toast.error("Enter a valid Diesel closing stock (litres)."); return; }
    if (!date) { toast.error("Select a date."); return; }
    saveClosing.mutate({
      reportDate: date,
      closingStockPetrol: closingP,
      closingStockDiesel: closingD,
      notes: notes.trim() || undefined,
    });
  }, [date, petrolClosing, dieselClosing, notes, saveClosing]);

  const handleClose = () => {
    onOpenChange(false);
    // Reset after close animation
    setTimeout(() => {
      setDate(today); setPetrolClosing(""); setDieselClosing(""); setNotes(""); setPreview(null);
    }, 200);
  };

  // Live preview of derived sales (before saving)
  const liveCalcP = openP !== null && petrolClosing !== "" ? Math.max(0, openP - parseFloat(petrolClosing)) : null;
  const liveCalcD = openD !== null && dieselClosing !== "" ? Math.max(0, openD - parseFloat(dieselClosing)) : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border/50 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-green-400" />
            Enter Closing Stock
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={e => { setDate(e.target.value); setPreview(null); }}
              className="bg-secondary border-border/50 h-8 text-sm"
              min="2025-04-01"
              max="2026-03-31"
            />
          </div>

          {/* Opening balance carry-over banner */}
          <div className={`rounded-lg border p-3 text-xs ${openP !== null && openD !== null ? 'bg-green-500/5 border-green-500/25' : 'bg-amber-500/5 border-amber-500/20'}`}>
            {openP !== null && openD !== null ? (
              <>
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  <span className="font-semibold text-green-400">Opening balance auto-carried from {prevDate}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-md bg-teal-500/10 border border-teal-500/20">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Petrol Opening</p>
                    <p className="font-bold text-teal-400 tabular-nums text-sm">{fmtL(openP)} L</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">← {prevDate} closing</p>
                  </div>
                  <div className="p-2 rounded-md bg-blue-500/10 border border-blue-500/20">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Diesel Opening</p>
                    <p className="font-bold text-blue-400 tabular-nums text-sm">{fmtL(openD)} L</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">← {prevDate} closing</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>No closing record for {prevDate} — opening will default to 0. Enter yesterday's closing first.</span>
              </div>
            )}
          </div>

          {/* Petrol closing */}
          <div className="space-y-2 p-3 rounded-lg border border-teal-500/20 bg-teal-500/5">
            <div className="flex items-center gap-2">
              <Droplets className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-xs font-semibold text-teal-400">Petrol (MS) — Closing Stock</span>
            </div>
            <Input
              type="number"
              value={petrolClosing}
              onChange={e => { setPetrolClosing(e.target.value); setPreview(null); }}
              placeholder="Enter closing litres e.g. 6500.000"
              className="bg-secondary border-teal-500/30 h-9 text-sm"
              min="0"
              step="0.001"
            />
            {liveCalcP !== null && !isNaN(liveCalcP) && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <ArrowRight className="w-3 h-3" />
                Implied Sales ≈ <span className="font-semibold text-red-400 tabular-nums">{fmtL(liveCalcP)} L</span>
                <span className="text-[9px]">(Opening − Closing; receipts added after save)</span>
              </div>
            )}
          </div>

          {/* Diesel closing */}
          <div className="space-y-2 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
            <div className="flex items-center gap-2">
              <Droplets className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-semibold text-blue-400">Diesel (HSD) — Closing Stock</span>
            </div>
            <Input
              type="number"
              value={dieselClosing}
              onChange={e => { setDieselClosing(e.target.value); setPreview(null); }}
              placeholder="Enter closing litres e.g. 8200.000"
              className="bg-secondary border-blue-500/30 h-9 text-sm"
              min="0"
              step="0.001"
            />
            {liveCalcD !== null && !isNaN(liveCalcD) && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <ArrowRight className="w-3 h-3" />
                Implied Sales ≈ <span className="font-semibold text-red-400 tabular-nums">{fmtL(liveCalcD)} L</span>
                <span className="text-[9px]">(Opening − Closing; receipts added after save)</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Notes (optional)</Label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Tanker delivery received at 3pm"
              className="bg-secondary border-border/50 h-8 text-sm"
            />
          </div>

          {/* Post-save result summary */}
          {preview && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-semibold text-green-400 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Saved — Reconciliation Summary
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Petrol summary */}
                  <div className="p-2 rounded-md bg-teal-500/5 border border-teal-500/20 space-y-1">
                    <p className="font-semibold text-teal-400 text-[10px] uppercase tracking-wide">Petrol (MS)</p>
                    <div className="flex justify-between"><span className="text-muted-foreground">Opening</span><span className="tabular-nums">{fmtL(preview.openingStockPetrol)} L</span></div>
                    <div className="flex justify-between"><span className="text-green-400">+ Receipts</span><span className="tabular-nums text-green-400">{fmtL(preview.receiptsP)} L</span></div>
                    <div className="flex justify-between"><span className="text-red-400">− Sales</span><span className="tabular-nums text-red-400">{fmtL(preview.calculatedSalesP)} L</span></div>
                    <div className="flex justify-between font-semibold border-t border-teal-500/20 pt-1"><span>= Closing</span><span className="tabular-nums">{fmtL(preview.closingStockPetrol)} L</span></div>
                  </div>
                  {/* Diesel summary */}
                  <div className="p-2 rounded-md bg-blue-500/5 border border-blue-500/20 space-y-1">
                    <p className="font-semibold text-blue-400 text-[10px] uppercase tracking-wide">Diesel (HSD)</p>
                    <div className="flex justify-between"><span className="text-muted-foreground">Opening</span><span className="tabular-nums">{fmtL(preview.openingStockDiesel)} L</span></div>
                    <div className="flex justify-between"><span className="text-green-400">+ Receipts</span><span className="tabular-nums text-green-400">{fmtL(preview.receiptsD)} L</span></div>
                    <div className="flex justify-between"><span className="text-red-400">− Sales</span><span className="tabular-nums text-red-400">{fmtL(preview.calculatedSalesD)} L</span></div>
                    <div className="flex justify-between font-semibold border-t border-blue-500/20 pt-1"><span>= Closing</span><span className="tabular-nums">{fmtL(preview.closingStockDiesel)} L</span></div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2">
            <Button
              className="flex-1 h-9 gap-2 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleSave}
              disabled={saveClosing.isPending}
            >
              {saveClosing.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saveClosing.isPending ? "Saving..." : "Save Closing Stock"}
            </Button>
            <Button variant="outline" className="h-9 px-4" onClick={handleClose}>
              Close
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground px-1">
            <span className="font-semibold text-foreground">Formula: </span>
            Sales = Opening + Receipts − Closing. Opening is auto-fetched from yesterday's closing. Receipts are pulled from delivered purchase orders.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Dialog for adding / editing dip readings for a specific date (both fuels at once) */
function AddDipDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [petrolStick, setPetrolStick] = useState("");
  const [petrolLitres, setPetrolLitres] = useState("");
  const [dieselStick, setDieselStick] = useState("");
  const [dieselLitres, setDieselLitres] = useState("");
  const utils = trpc.useUtils();

  const saveDip = trpc.fuelIntelligence.saveDipReading.useMutation();

  const handleSave = useCallback(async () => {
    const hasPetrol = petrolLitres.trim() !== "";
    const hasDiesel = dieselLitres.trim() !== "";
    if (!hasPetrol && !hasDiesel) {
      toast.error("Enter at least one dip reading (Petrol or Diesel).");
      return;
    }
    if (!date) { toast.error("Select a date."); return; }

    const saves: Promise<any>[] = [];

    if (hasPetrol) {
      const litres = parseFloat(petrolLitres);
      if (isNaN(litres) || litres < 0) { toast.error("Invalid Petrol litres value."); return; }
      const stick = petrolStick !== "" ? parseFloat(petrolStick) : null;
      saves.push(saveDip.mutateAsync({
        readingDate: date,
        fuelType: "petrol",
        dipLitres: litres,
        dipStickReading: stick && !isNaN(stick) ? stick : null,
      }));
    }

    if (hasDiesel) {
      const litres = parseFloat(dieselLitres);
      if (isNaN(litres) || litres < 0) { toast.error("Invalid Diesel litres value."); return; }
      const stick = dieselStick !== "" ? parseFloat(dieselStick) : null;
      saves.push(saveDip.mutateAsync({
        readingDate: date,
        fuelType: "diesel",
        dipLitres: litres,
        dipStickReading: stick && !isNaN(stick) ? stick : null,
      }));
    }

    try {
      await Promise.all(saves);
      toast.success(`Dip readings saved for ${date}`);
      utils.inventory.dailyStockStatement.invalidate();
      onSaved();
      onOpenChange(false);
      // Reset form
      setDate(today);
      setPetrolStick(""); setPetrolLitres("");
      setDieselStick(""); setDieselLitres("");
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    }
  }, [date, petrolStick, petrolLitres, dieselStick, dieselLitres, saveDip, utils, onSaved, onOpenChange, today]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/50 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-amber-400" />
            Add / Update Dip Reading
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="bg-secondary border-border/50 h-8 text-sm"
              min="2025-04-01"
              max="2026-03-31"
            />
          </div>

          {/* Petrol section */}
          <div className="space-y-2 p-3 rounded-lg border border-teal-500/20 bg-teal-500/5">
            <div className="flex items-center gap-2 mb-1">
              <Droplets className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-xs font-semibold text-teal-400">Petrol (MS)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Dip Stick (unitless)</Label>
                <Input
                  type="number"
                  value={petrolStick}
                  onChange={e => setPetrolStick(e.target.value)}
                  placeholder="e.g. 76.0"
                  className="bg-secondary border-border/50 h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Manual Dip Reading (Litres)</Label>
                <Input
                  type="number"
                  value={petrolLitres}
                  onChange={e => setPetrolLitres(e.target.value)}
                  placeholder="e.g. 7059.77"
                  className="bg-secondary border-amber-500/30 h-8 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Diesel section */}
          <div className="space-y-2 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
            <div className="flex items-center gap-2 mb-1">
              <Droplets className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-semibold text-blue-400">Diesel (HSD)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Dip Stick (unitless)</Label>
                <Input
                  type="number"
                  value={dieselStick}
                  onChange={e => setDieselStick(e.target.value)}
                  placeholder="e.g. 82.5"
                  className="bg-secondary border-border/50 h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Manual Dip Reading (Litres)</Label>
                <Input
                  type="number"
                  value={dieselLitres}
                  onChange={e => setDieselLitres(e.target.value)}
                  placeholder="e.g. 13146.20"
                  className="bg-secondary border-amber-500/30 h-8 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground px-1">
            <span className="font-semibold text-amber-400">Dip Variance</span> = Closing Stock − Manual Dip Reading.
            Leave a fuel section blank to skip it.
          </div>

          <Button
            className="w-full h-9 gap-2"
            onClick={handleSave}
            disabled={saveDip.isPending}
          >
            {saveDip.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saveDip.isPending ? "Saving..." : "Save Dip Readings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DailyStockStatement() {
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [preset, setPreset] = useState<"7" | "14" | "30">("14");
  const [fromDate, setFromDate] = useState("2026-03-01");
  const [toDate, setToDate] = useState("2026-03-31");
  const [applied, setApplied] = useState({ fromDate: undefined as string | undefined, toDate: undefined as string | undefined, days: 14 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [addDipOpen, setAddDipOpen] = useState(false);
  // addClosingOpen removed — closing stock now comes from Nozzle Entry

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

  // ── Inline Excel dip import ──────────────────────────────────────────────────
  const dipFileRef = useRef<HTMLInputElement>(null);
  const [dipImporting, setDipImporting] = useState(false);
  const utils = trpc.useUtils();

  const handleDipExcelUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Please upload an Excel (.xlsx/.xls) file"); return;
    }
    setDipImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import/excel", { method: "POST", body: formData });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? "Import failed"); }
      const data = await res.json();
      const dipCount = Object.entries(data.breakdown ?? {})
        .filter(([k]) => k.toLowerCase().includes("dip"))
        .reduce((s, [, v]) => s + (v as number), 0);
      if (dipCount > 0) {
        toast.success(`${dipCount} dip readings imported successfully`);
        utils.inventory.dailyStockStatement.invalidate();
      } else {
        toast.warning("No dip readings found. Ensure the file has a 'Daily Stock Statement' sheet with Dip and Manual Dip Reading columns.");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Import failed");
    } finally {
      setDipImporting(false);
      if (dipFileRef.current) dipFileRef.current.value = "";
    }
  }, [utils]);

  return (
    <div className="space-y-4">
      {/* Closing Stock Dialog removed — closing stock now comes from Nozzle Entry */}
      {/* Add Dip Reading Dialog */}
      <AddDipDialog
        open={addDipOpen}
        onOpenChange={setAddDipOpen}
        onSaved={() => setRefreshKey(k => k + 1)}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
        <div>
          <h2 className="text-base font-bold">Daily Stock Register</h2>
          <p className="text-xs text-muted-foreground">
            Opening + Receipts − Sales = Closing · Tap any <span className="text-amber-400 font-medium">Dip Reading</span> cell to update
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Enter Closing Stock removed — closing stock now comes from Nozzle Entry */}
          {/* Add Dip Reading button — secondary action */}
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            onClick={() => setAddDipOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Dip Reading
          </Button>
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
          {" "}<span className="font-semibold text-amber-400">Dip Variance</span> = Closing Stock − Manual Dip Reading.
          {" "}A <span className="text-red-400 font-semibold">positive variance</span> means system closing &gt; dip (possible loss/evaporation); a <span className="text-blue-400 font-semibold">negative variance</span> means dip &gt; system closing (possible meter error).
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
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 ml-2"
              onClick={() => setAddDipOpen(true)}
            >
              <Plus className="w-3 h-3" /> Dip Entry
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading...</div>
          ) : !rows || rows.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">No data for selected period</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[900px]">
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
                            currentDipStick={(row.petrol as any).dipStickReading ?? null}
                            reportedClosing={row.petrol.reportedClosing}
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
                            currentDipStick={(row.diesel as any).dipStickReading ?? null}
                            reportedClosing={row.diesel.reportedClosing}
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

      {/* Dip reading note — only shown when no dips exist for the current view */}
      {!hasDips && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-muted-foreground">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <div>
              <span className="font-semibold text-amber-400">No Dip Readings Entered Yet. </span>
              You have two options:
            </div>
            <div>
              <span className="font-semibold text-foreground">Option 1 — Manual entry:</span> Click the{" "}
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] gap-1 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 inline-flex px-2 py-0"
                onClick={() => setAddDipOpen(true)}
              >
                <Plus className="w-2.5 h-2.5" /> Add Dip Reading
              </Button>
              {" "}button above, or click any amber{" "}
              <span className="font-semibold text-amber-400">Dip Reading</span> cell in the table.
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground">Option 2 — Bulk import from Excel:</span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 w-fit"
                disabled={dipImporting}
                onClick={() => dipFileRef.current?.click()}
              >
                {dipImporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {dipImporting ? "Importing dip readings..." : "Upload BEES Excel File"}
              </Button>
              <input
                ref={dipFileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleDipExcelUpload(f); }}
              />
              <span className="text-muted-foreground">
                The importer reads the <span className="font-semibold text-amber-400">Dip</span> and{" "}
                <span className="font-semibold text-amber-400">Manual Dip Reading</span> columns from the{" "}
                <span className="font-semibold">Daily Stock Statement</span> sheet automatically.
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground/70">
              Dip Variance = Closing Stock − Manual Dip Reading. Positive = system closing &gt; dip (possible loss). Negative = dip &gt; closing (possible gain/meter error).
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
