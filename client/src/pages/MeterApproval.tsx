/**
 * MeterApproval.tsx — Incharge Meter Reading Approval
 * Incharge reviews closed shift sessions, checks meter readings vs collections, then approves or rejects.
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
import { toast } from "sonner";
import { CheckCircle, XCircle, Eye, Clock, User, Calendar } from "lucide-react";

const today = new Date().toISOString().slice(0, 10);

function approvalBadge(status: string) {
  if (status === "approved") return <Badge variant="default" className="bg-green-600">Approved</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="secondary">Pending Approval</Badge>;
}

export default function MeterApproval() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 14); return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(today);
  const [filterStatus, setFilterStatus] = useState<"pending_approval" | "approved" | "rejected" | "all">("pending_approval");

  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [remarks, setRemarks] = useState("");

  const pendingQuery = trpc.nozzle.listPendingApproval.useQuery({});
  const historyQuery = trpc.nozzle.getApprovalHistory.useQuery({
    startDate, endDate, status: filterStatus,
  });
  const sessionDetailQuery = trpc.nozzle.getSessionForApproval.useQuery(
    { sessionId: selectedId! },
    { enabled: selectedId !== null && reviewOpen }
  );

  const approveMutation = trpc.nozzle.approveSession.useMutation({
    onSuccess: (data) => {
      toast.success(data.decision === "approved" ? "Session approved" : "Session rejected");
      setReviewOpen(false);
      setRemarks("");
      pendingQuery.refetch();
      historyQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  function openReview(id: number) {
    setSelectedId(id);
    setRemarks("");
    setReviewOpen(true);
  }

  const pending = pendingQuery.data ?? [];
  const history = historyQuery.data ?? [];
  const detail = sessionDetailQuery.data as any;

  // Compute session summary from detail
  const closingReadings = detail?.readings?.filter((r: any) => r.readingType === "closing" || r.reading_type === "closing") ?? [];
  const openingReadings = detail?.readings?.filter((r: any) => r.readingType === "opening" || r.reading_type === "opening") ?? [];
  const totalCollected = detail?.collections?.reduce((sum: number, c: any) => sum + Number(c.amount ?? 0), 0) ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Meter Reading Approval</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review and approve or reject pump attendant shift submissions
        </p>
      </div>

      {/* Pending Approval Banner */}
      {pending.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <Clock className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">
              {pending.length} session{pending.length > 1 ? "s" : ""} awaiting your approval
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400">Review and approve to finalise the shift accounts</p>
          </div>
        </div>
      )}

      {/* Pending Sessions */}
      {pending.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" /> Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    {["Shift Date", "Staff", "Shift", "Readings", "Status", "Action"].map(h => (
                      <th key={h} className="text-left px-4 py-2 font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pending.map((s: any) => (
                    <tr key={s.id} className="border-b hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs">{s.shiftDate}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {s.staffName ?? "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize">{s.shiftLabel ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.readingCount ?? 0} readings</td>
                      <td className="px-4 py-3">{approvalBadge(s.approvalStatus ?? "pending_approval")}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" onClick={() => openReview(s.id)} className="gap-1 text-xs">
                          <Eye className="h-3 w-3" /> Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Filters */}
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
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending_approval">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Approval History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {historyQuery.isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    {["Shift Date", "Staff", "Shift", "Status", "Approved By", "Approved At", "Remarks"].map(h => (
                      <th key={h} className="text-left px-4 py-2 font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((s: any) => (
                    <tr key={s.id} className="border-b hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs">{s.shiftDate}</td>
                      <td className="px-4 py-3">{s.staffName ?? "—"}</td>
                      <td className="px-4 py-3 capitalize">{s.shiftLabel ?? "—"}</td>
                      <td className="px-4 py-3">{approvalBadge(s.approvalStatus ?? "pending_approval")}</td>
                      <td className="px-4 py-3">{s.approvedByName ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {s.approvedAt ? new Date(s.approvedAt).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate">{s.approvalRemarks ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Review Dialog ── */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Session #{selectedId}</DialogTitle>
          </DialogHeader>

          {sessionDetailQuery.isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading session details...</div>
          ) : detail ? (
            <div className="space-y-4">
              {/* Session info */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-muted/40 rounded-md text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Staff</p>
                  <p className="font-medium">{detail.session?.staff_name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Shift</p>
                  <p className="font-medium capitalize">{detail.session?.shift_label ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium font-mono">{detail.session?.shift_date ?? "—"}</p>
                </div>
              </div>

              {/* Meter Readings */}
              {closingReadings.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Meter Readings</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border rounded-md overflow-hidden">
                      <thead className="bg-muted/30 border-b">
                        <tr>
                          {["Pump", "Nozzle", "Fuel", "Opening", "Closing", "Sold (L)"].map(h => (
                            <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {closingReadings.map((r: any, i: number) => {
                          const opening = openingReadings.find((o: any) => (o.nozzleId ?? o.nozzle_id) === (r.nozzleId ?? r.nozzle_id));
                          const openVal = Number(opening?.reading ?? 0);
                          const closeVal = Number(r.reading ?? 0);
                          const sold = closeVal - openVal;
                          return (
                            <tr key={i} className="border-b last:border-0">
                              <td className="px-3 py-2 text-xs">P{r.pumpNumber ?? "?"}</td>
                              <td className="px-3 py-2 text-xs">N{r.nozzleNumber ?? "?"}</td>
                              <td className="px-3 py-2 text-xs uppercase font-medium">{r.fuelType ?? "—"}</td>
                              <td className="px-3 py-2 font-mono text-xs">{openVal.toFixed(3)}</td>
                              <td className="px-3 py-2 font-mono text-xs">{closeVal.toFixed(3)}</td>
                              <td className={`px-3 py-2 font-mono text-xs font-medium ${sold < 0 ? "text-red-600" : ""}`}>
                                {sold < 0 ? <span className="text-red-600">⚠ {sold.toFixed(3)}</span> : sold.toFixed(3)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Collections */}
              {detail.collections?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Cash Handover — Total: ₹{totalCollected.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                  <div className="space-y-1">
                    {detail.collections.map((c: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm px-3 py-1.5 bg-muted/20 rounded">
                        <span className="capitalize text-muted-foreground">{c.payment_type ?? c.paymentType}</span>
                        <span className="font-mono font-medium">₹{Number(c.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div className="space-y-1">
                <Label>Remarks (optional)</Label>
                <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} placeholder="Add any notes for this decision..." />
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">Session not found</div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => approveMutation.mutate({ sessionId: selectedId!, decision: "rejected", remarks: remarks || undefined })}
              disabled={approveMutation.isPending}
              className="gap-1"
            >
              <XCircle className="h-4 w-4" /> Reject
            </Button>
            <Button
              onClick={() => approveMutation.mutate({ sessionId: selectedId!, decision: "approved", remarks: remarks || undefined })}
              disabled={approveMutation.isPending}
              className="gap-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
