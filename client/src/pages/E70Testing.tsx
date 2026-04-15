/**
 * E70Testing.tsx — Pre-Shift Quality Testing Module
 * Workflow: Draw 5L per nozzle → test quality → return to tank → record result
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { FlaskConical, Plus, CheckCircle, XCircle, Droplets, TrendingDown } from "lucide-react";

const today = new Date().toISOString().slice(0, 10);

export default function E70Testing() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(today);
  const [filterResult, setFilterResult] = useState<"all" | "pass" | "fail">("all");
  const [addOpen, setAddOpen] = useState(false);

  const [form, setForm] = useState({
    testDate: today,
    nozzleId: "",
    fuelType: "diesel" as "petrol" | "diesel",
    drawnQty: "5",
    returnedQty: "5",
    meterReadingBefore: "",
    meterReadingAfter: "",
    colourCheck: "clear" as "clear" | "yellow" | "amber" | "contaminated",
    colourPass: true,
    densityReading: "",
    densityPass: true,
    waterContent: false,
    flashPoint: "",
    flashPointPass: true,
    testResult: "pass" as "pass" | "fail",
    remarks: "",
    testedByName: "",
  });

  const nozzlesQuery = trpc.nozzle.getNozzles.useQuery();
  const listQuery = trpc.e70.list.useQuery({ startDate, endDate, result: filterResult });
  const summaryQuery = trpc.e70.getSummary.useQuery({ startDate, endDate });

  const nozzles = nozzlesQuery.data ?? [];
  const tests = listQuery.data ?? [];
  const summary = summaryQuery.data as any ?? {};

  const nozzleOptions = useMemo(() =>
    nozzles.map((n: any) => ({
      id: n.id,
      label: `Nozzle ${n.nozzleNumber} (${n.fuelType?.toUpperCase()})`,
      fuelType: n.fuelType,
    })), [nozzles]);

  const addMutation = trpc.e70.record.useMutation({
    onSuccess: () => {
      toast.success("E70 test recorded");
      setAddOpen(false);
      listQuery.refetch();
      summaryQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.e70.delete.useMutation({
    onSuccess: () => { toast.success("Record deleted"); listQuery.refetch(); summaryQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  function handleNozzleChange(nozzleId: string) {
    const n = nozzleOptions.find(x => x.id === Number(nozzleId));
    setForm(f => ({ ...f, nozzleId, fuelType: (n?.fuelType as "petrol" | "diesel") ?? "diesel" }));
  }

  function handleSubmit() {
    if (!form.nozzleId) { toast.error("Please select a nozzle"); return; }
    const n = nozzleOptions.find(x => x.id === Number(form.nozzleId));
    addMutation.mutate({
      testDate: form.testDate,
      nozzleId: Number(form.nozzleId),
      nozzleLabel: n?.label,
      fuelType: form.fuelType,
      drawnQty: Number(form.drawnQty) || 5,
      returnedQty: form.returnedQty ? Number(form.returnedQty) : undefined,
      meterReadingBefore: form.meterReadingBefore ? Number(form.meterReadingBefore) : undefined,
      meterReadingAfter: form.meterReadingAfter ? Number(form.meterReadingAfter) : undefined,
      colourCheck: form.colourCheck,
      colourPass: form.colourPass,
      densityReading: form.densityReading ? Number(form.densityReading) : undefined,
      densityPass: form.densityPass,
      waterContent: form.waterContent,
      flashPoint: form.flashPoint ? Number(form.flashPoint) : undefined,
      flashPointPass: form.flashPointPass,
      testResult: form.testResult,
      remarks: form.remarks || undefined,
      testedByName: form.testedByName || undefined,
    });
  }

  const netLoss = Number(summary.netLoss ?? 0);
  const petrolLoss = Number(summary.petrolLoss ?? 0);
  const dieselLoss = Number(summary.dieselLoss ?? 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">E70 Testing</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pre-shift quality testing — draw 5 L per nozzle, test, return to tank, record result
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Record E70 Test
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-muted-foreground">Total Tests</span>
            </div>
            <div className="text-2xl font-bold mt-1">{summary.totalTests ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm text-muted-foreground">Passed</span>
            </div>
            <div className="text-2xl font-bold mt-1 text-green-600">{summary.passed ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-muted-foreground">Failed</span>
            </div>
            <div className="text-2xl font-bold mt-1 text-red-600">{summary.failed ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-amber-600" />
              <span className="text-sm text-muted-foreground">Net Loss (L)</span>
            </div>
            <div className="text-2xl font-bold mt-1">{netLoss.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              MS: {petrolLoss.toFixed(1)} · HSD: {dieselLoss.toFixed(1)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Result</Label>
          <Select value={filterResult} onValueChange={(v: any) => setFilterResult(v)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pass">Pass</SelectItem>
              <SelectItem value="fail">Fail</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tests Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">E70 Test Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {listQuery.isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : tests.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <FlaskConical className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No E70 tests recorded for this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    {["Date", "Nozzle", "Fuel", "Drawn (L)", "Returned (L)", "Net Loss", "Colour", "Density", "Result", "Tested By", ""].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tests.map((t: any) => {
                    const drawn = Number(t.drawnQty ?? 5);
                    const returned = Number(t.returnedQty ?? 0);
                    const loss = drawn - returned;
                    return (
                      <tr key={t.id} className="border-b hover:bg-muted/20">
                        <td className="px-3 py-2 font-mono text-xs">{t.testDate}</td>
                        <td className="px-3 py-2 text-xs">{t.nozzleLabel ?? `Nozzle #${t.nozzleId}`}</td>
                        <td className="px-3 py-2 uppercase text-xs font-medium">{t.fuelType}</td>
                        <td className="px-3 py-2 text-right font-mono">{drawn.toFixed(1)}</td>
                        <td className="px-3 py-2 text-right font-mono">{returned.toFixed(1)}</td>
                        <td className="px-3 py-2 text-right font-mono text-amber-600">{loss.toFixed(1)}</td>
                        <td className="px-3 py-2 text-xs capitalize">{t.colourCheck ?? "—"}</td>
                        <td className="px-3 py-2 text-xs">{t.densityReading ? `${t.densityReading} kg/m³` : "—"}</td>
                        <td className="px-3 py-2">
                          <Badge variant={t.testResult === "pass" ? "default" : "destructive"}>
                            {t.testResult}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-xs">{t.testedByName ?? "—"}</td>
                        <td className="px-3 py-2">
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                            onClick={() => { if (confirm("Delete this test record?")) deleteMutation.mutate({ id: t.id }); }}>
                            Delete
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add E70 Test Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" /> Record E70 Test
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Test Date *</Label>
                <Input type="date" value={form.testDate} onChange={e => setForm(f => ({ ...f, testDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Nozzle *</Label>
                <Select value={form.nozzleId} onValueChange={handleNozzleChange}>
                  <SelectTrigger><SelectValue placeholder="Select nozzle" /></SelectTrigger>
                  <SelectContent>
                    {nozzleOptions.map(n => (
                      <SelectItem key={n.id} value={String(n.id)}>{n.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Drawn Qty (L)</Label>
                <Input type="number" value={form.drawnQty} onChange={e => setForm(f => ({ ...f, drawnQty: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Returned Qty (L)</Label>
                <Input type="number" value={form.returnedQty} onChange={e => setForm(f => ({ ...f, returnedQty: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Meter Before</Label>
                <Input type="number" value={form.meterReadingBefore} onChange={e => setForm(f => ({ ...f, meterReadingBefore: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Meter After</Label>
                <Input type="number" value={form.meterReadingAfter} onChange={e => setForm(f => ({ ...f, meterReadingAfter: e.target.value }))} />
              </div>
            </div>

            <div className="border-t pt-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quality Checks</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Colour</Label>
                  <Select value={form.colourCheck} onValueChange={(v: any) => setForm(f => ({ ...f, colourCheck: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clear">Clear</SelectItem>
                      <SelectItem value="yellow">Yellow (normal)</SelectItem>
                      <SelectItem value="amber">Amber</SelectItem>
                      <SelectItem value="contaminated">Contaminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Switch checked={form.colourPass} onCheckedChange={v => setForm(f => ({ ...f, colourPass: v }))} />
                  <Label>Colour Pass</Label>
                </div>
                <div className="space-y-1">
                  <Label>Density (kg/m³)</Label>
                  <Input type="number" value={form.densityReading} onChange={e => setForm(f => ({ ...f, densityReading: e.target.value }))} placeholder="e.g. 820" />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Switch checked={form.densityPass} onCheckedChange={v => setForm(f => ({ ...f, densityPass: v }))} />
                  <Label>Density Pass</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.waterContent} onCheckedChange={v => setForm(f => ({ ...f, waterContent: v }))} />
                  <Label>Water Content Found</Label>
                </div>
              </div>
            </div>

            <div className="border-t pt-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Result</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Test Result *</Label>
                  <Select value={form.testResult} onValueChange={(v: any) => setForm(f => ({ ...f, testResult: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pass">Pass</SelectItem>
                      <SelectItem value="fail">Fail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Tested By</Label>
                  <Input value={form.testedByName} onChange={e => setForm(f => ({ ...f, testedByName: e.target.value }))} placeholder="Staff name" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Remarks</Label>
                <Textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} rows={2} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={addMutation.isPending} className="gap-2">
              <Droplets className="h-4 w-4" />
              {addMutation.isPending ? "Saving..." : "Record Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
