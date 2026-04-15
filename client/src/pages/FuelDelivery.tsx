/**
 * FuelDelivery.tsx — Fuel Delivery Quality Check Workflow
 * Steps: Log Tanker Arrival → Quality Check → Approve/Reject → Confirm Unload
 */
import { useState } from "react";
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
import { Truck, FlaskConical, CheckCircle, XCircle, Clock, Plus, ChevronRight, AlertTriangle } from "lucide-react";

const today = new Date().toISOString().slice(0, 10);

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending_qc: { label: "Pending QC", variant: "secondary" },
    qc_passed: { label: "QC Passed", variant: "default" },
    qc_failed: { label: "QC Failed", variant: "destructive" },
    unloaded: { label: "Unloaded", variant: "default" },
    rejected: { label: "Rejected", variant: "destructive" },
  };
  const s = map[status] ?? { label: status, variant: "outline" };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export default function FuelDelivery() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(today);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending_qc" | "qc_passed" | "qc_failed" | "unloaded" | "rejected">("all");

  // Dialogs
  const [logOpen, setLogOpen] = useState(false);
  const [qcOpen, setQcOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Log delivery form
  const [logForm, setLogForm] = useState({
    deliveryDate: today, deliveryTime: "", invoiceNumber: "", supplierName: "",
    vehicleNumber: "", driverName: "", fuelType: "diesel" as "petrol" | "diesel" | "lubricant",
    orderedQty: "", deliveredQty: "", invoiceRate: "", invoiceAmount: "", notes: "",
  });

  // QC form
  const [qcForm, setQcForm] = useState({
    densityReading: "", densityPass: true,
    colourCheck: "clear" as "clear" | "yellow" | "amber" | "contaminated", colourPass: true,
    waterContamination: false, sedimentCheck: false, sealIntact: true, documentMatch: true,
    dipstickReading: "", overallResult: "pass" as "pass" | "fail" | "conditional", remarks: "",
  });

  // Decision form
  const [decisionForm, setDecisionForm] = useState({
    decision: "approve_unload" as "approve_unload" | "reject_tanker",
    unloadedQty: "", decisionRemarks: "",
  });

  const listQuery = trpc.fuelDelivery.list.useQuery({ startDate, endDate, status: filterStatus });
  const summaryQuery = trpc.fuelDelivery.getSummary.useQuery({ startDate, endDate });
  const detailQuery = trpc.fuelDelivery.getById.useQuery(
    { id: selectedId! },
    { enabled: selectedId !== null && (qcOpen || decisionOpen) }
  );

  const logMutation = trpc.fuelDelivery.logDelivery.useMutation({
    onSuccess: () => { toast.success("Tanker arrival logged"); setLogOpen(false); listQuery.refetch(); summaryQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const qcMutation = trpc.fuelDelivery.recordQualityCheck.useMutation({
    onSuccess: () => { toast.success("Quality check recorded"); setQcOpen(false); listQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const decisionMutation = trpc.fuelDelivery.makeDecision.useMutation({
    onSuccess: (data) => {
      toast.success(data.newStatus === "unloaded" ? "Fuel unloaded successfully" : "Tanker rejected");
      setDecisionOpen(false); listQuery.refetch(); summaryQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const deliveries = listQuery.data ?? [];
  const summary = summaryQuery.data as any ?? {};

  function openQc(id: number) { setSelectedId(id); setQcOpen(true); }
  function openDecision(id: number) { setSelectedId(id); setDecisionOpen(true); }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fuel Delivery & Quality Check</h1>
          <p className="text-muted-foreground text-sm mt-1">Log tanker arrivals, record quality checks, and approve/reject unloading</p>
        </div>
        <Button onClick={() => setLogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Log Tanker Arrival
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Deliveries", value: summary.totalDeliveries ?? 0, icon: Truck, color: "text-blue-600" },
          { label: "Unloaded", value: summary.unloaded ?? 0, icon: CheckCircle, color: "text-green-600" },
          { label: "Rejected", value: summary.rejected ?? 0, icon: XCircle, color: "text-red-600" },
          { label: "Pending QC", value: summary.pendingQc ?? 0, icon: Clock, color: "text-amber-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${color}`} />
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
              <div className="text-2xl font-bold mt-1">{value}</div>
            </CardContent>
          </Card>
        ))}
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
          <Label className="text-xs">Status</Label>
          <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["all", "pending_qc", "qc_passed", "qc_failed", "unloaded", "rejected"].map(s => (
                <SelectItem key={s} value={s}>{s === "all" ? "All" : s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Deliveries Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Delivery Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {listQuery.isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : deliveries.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Truck className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No deliveries found for this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    {["Date", "Supplier", "Vehicle", "Fuel Type", "Qty (L)", "Invoice", "Status", "QC Result", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-2 font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((d: any) => (
                    <tr key={d.id} className="border-b hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs">{d.deliveryDate}</td>
                      <td className="px-4 py-3">{d.supplierName ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{d.vehicleNumber ?? "—"}</td>
                      <td className="px-4 py-3 capitalize">{d.fuelType}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {d.deliveredQty ? Number(d.deliveredQty).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3">{d.invoiceNumber ?? "—"}</td>
                      <td className="px-4 py-3">{statusBadge(d.status)}</td>
                      <td className="px-4 py-3">
                        {d.qcResult ? (
                          <Badge variant={d.qcResult === "pass" ? "default" : d.qcResult === "conditional" ? "secondary" : "destructive"}>
                            {d.qcResult}
                          </Badge>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {d.status === "pending_qc" && (
                            <Button size="sm" variant="outline" onClick={() => openQc(d.id)} className="gap-1 text-xs">
                              <FlaskConical className="h-3 w-3" /> QC
                            </Button>
                          )}
                          {(d.status === "qc_passed" || d.status === "qc_failed") && (
                            <Button size="sm" variant="outline" onClick={() => openDecision(d.id)} className="gap-1 text-xs">
                              <ChevronRight className="h-3 w-3" /> Decide
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Log Tanker Dialog ── */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Log Tanker Arrival</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1">
              <Label>Delivery Date *</Label>
              <Input type="date" value={logForm.deliveryDate} onChange={e => setLogForm(f => ({ ...f, deliveryDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Arrival Time</Label>
              <Input type="time" value={logForm.deliveryTime} onChange={e => setLogForm(f => ({ ...f, deliveryTime: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Fuel Type *</Label>
              <Select value={logForm.fuelType} onValueChange={(v: any) => setLogForm(f => ({ ...f, fuelType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="petrol">Petrol (MS)</SelectItem>
                  <SelectItem value="diesel">Diesel (HSD)</SelectItem>
                  <SelectItem value="lubricant">Lubricant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Invoice Number</Label>
              <Input value={logForm.invoiceNumber} onChange={e => setLogForm(f => ({ ...f, invoiceNumber: e.target.value }))} placeholder="INV-XXXX" />
            </div>
            <div className="space-y-1">
              <Label>Supplier Name</Label>
              <Input value={logForm.supplierName} onChange={e => setLogForm(f => ({ ...f, supplierName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Vehicle Number</Label>
              <Input value={logForm.vehicleNumber} onChange={e => setLogForm(f => ({ ...f, vehicleNumber: e.target.value }))} placeholder="TS 01 AB 1234" />
            </div>
            <div className="space-y-1">
              <Label>Driver Name</Label>
              <Input value={logForm.driverName} onChange={e => setLogForm(f => ({ ...f, driverName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Ordered Qty (L)</Label>
              <Input type="number" value={logForm.orderedQty} onChange={e => setLogForm(f => ({ ...f, orderedQty: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Delivered Qty (L)</Label>
              <Input type="number" value={logForm.deliveredQty} onChange={e => setLogForm(f => ({ ...f, deliveredQty: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Invoice Rate (₹/L)</Label>
              <Input type="number" value={logForm.invoiceRate} onChange={e => setLogForm(f => ({ ...f, invoiceRate: e.target.value }))} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Notes</Label>
              <Textarea value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogOpen(false)}>Cancel</Button>
            <Button onClick={() => logMutation.mutate({
              deliveryDate: logForm.deliveryDate,
              deliveryTime: logForm.deliveryTime || undefined,
              invoiceNumber: logForm.invoiceNumber || undefined,
              supplierName: logForm.supplierName || undefined,
              vehicleNumber: logForm.vehicleNumber || undefined,
              driverName: logForm.driverName || undefined,
              fuelType: logForm.fuelType,
              orderedQty: logForm.orderedQty ? Number(logForm.orderedQty) : undefined,
              deliveredQty: logForm.deliveredQty ? Number(logForm.deliveredQty) : undefined,
              invoiceRate: logForm.invoiceRate ? Number(logForm.invoiceRate) : undefined,
              notes: logForm.notes || undefined,
            })} disabled={logMutation.isPending}>
              {logMutation.isPending ? "Saving..." : "Log Arrival"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Quality Check Dialog ── */}
      <Dialog open={qcOpen} onOpenChange={setQcOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Quality Check — Delivery #{selectedId}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Density Reading (kg/m³)</Label>
                <Input type="number" value={qcForm.densityReading} onChange={e => setQcForm(f => ({ ...f, densityReading: e.target.value }))} placeholder="e.g. 820" />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch checked={qcForm.densityPass} onCheckedChange={v => setQcForm(f => ({ ...f, densityPass: v }))} />
                <Label>Density Pass</Label>
              </div>
              <div className="space-y-1">
                <Label>Colour Check</Label>
                <Select value={qcForm.colourCheck} onValueChange={(v: any) => setQcForm(f => ({ ...f, colourCheck: v }))}>
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
                <Switch checked={qcForm.colourPass} onCheckedChange={v => setQcForm(f => ({ ...f, colourPass: v }))} />
                <Label>Colour Pass</Label>
              </div>
              <div className="space-y-1">
                <Label>Dipstick Reading (L)</Label>
                <Input type="number" value={qcForm.dipstickReading} onChange={e => setQcForm(f => ({ ...f, dipstickReading: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Overall Result *</Label>
                <Select value={qcForm.overallResult} onValueChange={(v: any) => setQcForm(f => ({ ...f, overallResult: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="conditional">Conditional Pass</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "waterContamination", label: "Water Contamination Found", invert: true },
                { key: "sedimentCheck", label: "Sediment Found", invert: true },
                { key: "sealIntact", label: "Seal Intact", invert: false },
                { key: "documentMatch", label: "Documents Match", invert: false },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Switch
                    checked={(qcForm as any)[key]}
                    onCheckedChange={v => setQcForm(f => ({ ...f, [key]: v }))}
                  />
                  <Label className="text-sm">{label}</Label>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <Label>Remarks</Label>
              <Textarea value={qcForm.remarks} onChange={e => setQcForm(f => ({ ...f, remarks: e.target.value }))} rows={2} />
            </div>
            {qcForm.overallResult === "fail" && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-200 dark:border-red-800">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">QC Failed — Incharge will need to reject the tanker in the next step.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQcOpen(false)}>Cancel</Button>
            <Button onClick={() => qcMutation.mutate({
              deliveryId: selectedId!,
              densityReading: qcForm.densityReading ? Number(qcForm.densityReading) : undefined,
              densityPass: qcForm.densityPass,
              colourCheck: qcForm.colourCheck,
              colourPass: qcForm.colourPass,
              waterContamination: qcForm.waterContamination,
              sedimentCheck: qcForm.sedimentCheck,
              sealIntact: qcForm.sealIntact,
              documentMatch: qcForm.documentMatch,
              dipstickReading: qcForm.dipstickReading ? Number(qcForm.dipstickReading) : undefined,
              overallResult: qcForm.overallResult,
              remarks: qcForm.remarks || undefined,
            })} disabled={qcMutation.isPending}>
              {qcMutation.isPending ? "Saving..." : "Submit QC"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Incharge Decision Dialog ── */}
      <Dialog open={decisionOpen} onOpenChange={setDecisionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Incharge Decision — Delivery #{selectedId}</DialogTitle></DialogHeader>
          {detailQuery.data && (
            <div className="p-3 bg-muted/40 rounded-md text-sm space-y-1 mb-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Fuel Type</span><span className="capitalize font-medium">{(detailQuery.data as any).fuelType}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Delivered Qty</span><span className="font-medium">{(detailQuery.data as any).deliveredQty ? `${Number((detailQuery.data as any).deliveredQty).toLocaleString()} L` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">QC Result</span><span>{(detailQuery.data as any).qcResult ? <Badge variant={(detailQuery.data as any).qcResult === "pass" ? "default" : "destructive"}>{(detailQuery.data as any).qcResult}</Badge> : "—"}</span></div>
            </div>
          )}
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Decision *</Label>
              <Select value={decisionForm.decision} onValueChange={(v: any) => setDecisionForm(f => ({ ...f, decision: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve_unload">Approve Unloading</SelectItem>
                  <SelectItem value="reject_tanker">Reject Tanker</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {decisionForm.decision === "approve_unload" && (
              <div className="space-y-1">
                <Label>Actual Unloaded Qty (L)</Label>
                <Input type="number" value={decisionForm.unloadedQty} onChange={e => setDecisionForm(f => ({ ...f, unloadedQty: e.target.value }))} />
              </div>
            )}
            <div className="space-y-1">
              <Label>Remarks</Label>
              <Textarea value={decisionForm.decisionRemarks} onChange={e => setDecisionForm(f => ({ ...f, decisionRemarks: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionOpen(false)}>Cancel</Button>
            <Button
              variant={decisionForm.decision === "reject_tanker" ? "destructive" : "default"}
              onClick={() => decisionMutation.mutate({
                deliveryId: selectedId!,
                decision: decisionForm.decision,
                unloadedQty: decisionForm.unloadedQty ? Number(decisionForm.unloadedQty) : undefined,
                decisionRemarks: decisionForm.decisionRemarks || undefined,
              })}
              disabled={decisionMutation.isPending}
            >
              {decisionMutation.isPending ? "Saving..." : decisionForm.decision === "approve_unload" ? "Confirm Unload" : "Reject Tanker"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
