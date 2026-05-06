import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Activity, CheckCircle2, Clock, XCircle, AlertTriangle,
  RefreshCw, User, Fuel, IndianRupee, Camera,
  ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Droplets, Zap
} from "lucide-react";
import { format } from "date-fns";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const fmtL = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n) + " L";

function getStatusBadge(status: string, approvalStatus?: string | null) {
  if (approvalStatus === "approved") return { label: "Approved", color: "bg-green-500/15 text-green-400 border-green-500/30" };
  if (approvalStatus === "rejected") return { label: "Rejected", color: "bg-red-500/15 text-red-400 border-red-500/30" };
  if (approvalStatus === "pending_approval") return { label: "Pending Review", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  if (status === "open") return { label: "In Progress", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" };
  if (status === "closed") return { label: "Closed", color: "bg-slate-500/15 text-slate-400 border-slate-500/30" };
  return { label: status, color: "bg-secondary text-muted-foreground border-border/50" };
}

function getStatusIcon(status: string, approvalStatus?: string | null) {
  if (approvalStatus === "approved") return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (approvalStatus === "rejected") return <XCircle className="w-4 h-4 text-red-400" />;
  if (approvalStatus === "pending_approval") return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  if (status === "open") return <Activity className="w-4 h-4 text-blue-400 animate-pulse" />;
  return <Clock className="w-4 h-4 text-slate-400" />;
}

function ShiftCard({ shift, onApprove, onReject }: {
  shift: any;
  onApprove: (sessionId: number) => void;
  onReject: (sessionId: number, remarks: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [remarks, setRemarks] = useState("");

  const badge = getStatusBadge(shift.status, shift.approvalStatus);
  const icon = getStatusIcon(shift.status, shift.approvalStatus);
  const canApprove = shift.approvalStatus === "pending_approval";

  const totalCollected = Number(shift.totalCollected ?? 0);
  const expectedSales = Number(shift.expectedSalesValue ?? 0);
  const variance = totalCollected - expectedSales;
  const petrolL = Number(shift.totalPetrolLitres ?? 0);
  const dieselL = Number(shift.totalDieselLitres ?? 0);
  const photosUploaded = Number(shift.photosUploaded ?? 0);
  const nozzleCount = Number(shift.nozzleCount ?? 0);

  return (
    <Card className={`bg-card border-border/50 transition-all ${canApprove ? "ring-1 ring-amber-500/40" : ""}`}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 rounded-xl bg-secondary/60 border border-border/40 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm truncate">{shift.staffName ?? "Unknown"}</span>
              <Badge className={`text-[10px] px-2 py-0 h-5 border ${badge.color}`}>{badge.label}</Badge>
              {canApprove && (
                <Badge className="text-[10px] px-2 py-0 h-5 bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse">
                  Action Required
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
              <span>{shift.shiftLabel ?? "Shift"}</span>
              <span className="text-border/60">·</span>
              <span>Session #{shift.sessionId}</span>
              {shift.updatedAt && (
                <>
                  <span className="text-border/60">·</span>
                  <span>Updated {format(new Date(shift.updatedAt), "HH:mm")}</span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-8 h-8 rounded-lg bg-secondary/40 flex items-center justify-center hover:bg-secondary transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-0 border-t border-border/30">
          <div className="p-3 text-center border-r border-border/30">
            <p className="text-xs text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
              <Droplets className="w-3 h-3 text-green-400" />Petrol
            </p>
            <p className="text-sm font-bold tabular-nums text-green-400">{fmtL(petrolL)}</p>
          </div>
          <div className="p-3 text-center border-r border-border/30">
            <p className="text-xs text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
              <Zap className="w-3 h-3 text-yellow-400" />Diesel
            </p>
            <p className="text-sm font-bold tabular-nums text-yellow-400">{fmtL(dieselL)}</p>
          </div>
          <div className="p-3 text-center border-r border-border/30">
            <p className="text-xs text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
              <IndianRupee className="w-3 h-3 text-primary" />Collected
            </p>
            <p className="text-sm font-bold tabular-nums text-primary">{fmt(totalCollected)}</p>
          </div>
          <div className="p-3 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Variance</p>
            <p className={`text-sm font-bold tabular-nums ${
              Math.abs(variance) < 100 ? "text-green-400" : variance > 0 ? "text-blue-400" : "text-red-400"
            }`}>
              {variance >= 0 ? "+" : ""}{fmt(variance)}
            </p>
          </div>
        </div>

        {/* Photos + nozzle count */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border/30 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Camera className="w-3.5 h-3.5" />
            {photosUploaded}/{nozzleCount} photos
          </span>
          <span className="flex items-center gap-1">
            <Fuel className="w-3.5 h-3.5" />
            {nozzleCount} nozzles active
          </span>
          {shift.approvedByName && (
            <span className="flex items-center gap-1 ml-auto">
              <User className="w-3.5 h-3.5" />
              {shift.approvalStatus === "approved" ? "Approved" : "Reviewed"} by {shift.approvedByName}
            </span>
          )}
        </div>

        {/* Expanded nozzle breakdown */}
        {expanded && shift.nozzleSummaries && shift.nozzleSummaries.length > 0 && (
          <div className="border-t border-border/30 px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Nozzle Breakdown</p>
            {shift.nozzleSummaries.map((ns: any) => (
              <div key={ns.nozzleId} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 border border-border/30">
                <div className={`w-2 h-2 rounded-full ${ns.fuelType === "petrol" ? "bg-green-400" : "bg-yellow-400"}`} />
                <span className="text-xs font-medium flex-1">{ns.nozzleLabel ?? `Nozzle ${ns.nozzleId}`}</span>
                <span className="text-xs text-muted-foreground">{fmtL(ns.litresSold ?? 0)}</span>
                <span className="text-xs font-semibold tabular-nums">{fmt(ns.salesValue ?? 0)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Approval remarks */}
        {shift.approvalRemarks && (
          <div className="border-t border-border/30 px-4 py-2.5">
            <p className="text-xs text-muted-foreground">
              Remarks: <span className="text-foreground">{shift.approvalRemarks}</span>
            </p>
          </div>
        )}

        {/* Approve / Reject actions */}
        {canApprove && (
          <div className="border-t border-border/30 p-3 flex gap-2">
            <Button
              size="sm"
              className="flex-1 h-8 bg-green-600 hover:bg-green-500 text-white gap-1.5 text-xs"
              onClick={() => onApprove(shift.sessionId)}
            >
              <ThumbsUp className="w-3.5 h-3.5" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 border-red-500/40 text-red-400 hover:bg-red-500/10 gap-1.5 text-xs"
              onClick={() => setRejectOpen(true)}
            >
              <ThumbsDown className="w-3.5 h-3.5" /> Reject
            </Button>
          </div>
        )}
      </CardContent>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="bg-card border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Reject Shift — Add Remarks</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <Input
              placeholder="Reason for rejection (optional)"
              className="bg-secondary border-border/50 h-9 text-sm"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => setRejectOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 h-8 text-xs bg-red-600 hover:bg-red-500 text-white"
                onClick={() => { onReject(shift.sessionId, remarks); setRejectOpen(false); setRemarks(""); }}
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function ShiftMonitor() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: shifts, isLoading, refetch } = trpc.nozzle.getActiveShifts.useQuery(
    { date },
    { refetchInterval: 30_000 }
  );

  const approveSession = trpc.nozzle.approveSession.useMutation({
    onSuccess: () => { toast.success("Decision saved"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    const interval = setInterval(() => setLastRefresh(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  function handleApprove(sessionId: number) {
    approveSession.mutate({ sessionId, decision: "approved", remarks: "" });
  }

  function handleReject(sessionId: number, remarks: string) {
    approveSession.mutate({ sessionId, decision: "rejected", remarks });
  }

  function handleManualRefresh() {
    refetch();
    setLastRefresh(new Date());
    toast.success("Refreshed");
  }

  const totalShifts = shifts?.length ?? 0;
  const openShifts = shifts?.filter((s: any) => s.status === "open").length ?? 0;
  const pendingApproval = shifts?.filter((s: any) => s.approvalStatus === "pending_approval").length ?? 0;
  const approvedShifts = shifts?.filter((s: any) => s.approvalStatus === "approved").length ?? 0;
  const totalRevenue = shifts?.reduce((s: number, sh: any) => s + Number(sh.totalCollected ?? 0), 0) ?? 0;
  const totalPetrol = shifts?.reduce((s: number, sh: any) => s + Number(sh.totalPetrolLitres ?? 0), 0) ?? 0;
  const totalDiesel = shifts?.reduce((s: number, sh: any) => s + Number(sh.totalDieselLitres ?? 0), 0) ?? 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Shift Monitor
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time view · Auto-refreshes every 30s · Last: {format(lastRefresh, "HH:mm:ss")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="bg-secondary border-border/50 h-8 text-xs w-36"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleManualRefresh}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-muted-foreground">Active Shifts</span>
            </div>
            <p className="text-2xl font-bold text-blue-400 tabular-nums">{openShifts}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{totalShifts} total today</p>
          </CardContent>
        </Card>
        <Card className={`bg-card border-border/50 ${pendingApproval > 0 ? "ring-1 ring-amber-500/40" : ""}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-muted-foreground">Pending Review</span>
            </div>
            <p className="text-2xl font-bold text-amber-400 tabular-nums">{pendingApproval}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{approvedShifts} approved</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <IndianRupee className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Revenue</span>
            </div>
            <p className="text-xl font-bold text-primary tabular-nums">{fmt(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">across all shifts</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Fuel className="w-4 h-4 text-teal-400" />
              <span className="text-xs text-muted-foreground">Fuel Sold</span>
            </div>
            <p className="text-sm font-bold text-green-400 tabular-nums">
              {fmtL(totalPetrol)} <span className="text-xs font-normal text-muted-foreground">Petrol</span>
            </p>
            <p className="text-sm font-bold text-yellow-400 tabular-nums">
              {fmtL(totalDiesel)} <span className="text-xs font-normal text-muted-foreground">Diesel</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending approval alert */}
      {pendingApproval > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300">
            <strong>{pendingApproval} shift{pendingApproval > 1 ? "s" : ""}</strong> waiting for your review.
          </p>
        </div>
      )}

      {/* Shift cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-card border-border/50">
              <CardContent className="p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-secondary rounded w-1/3" />
                  <div className="h-3 bg-secondary rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !shifts || shifts.length === 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="p-10 text-center">
            <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No shifts found for {date}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Shifts will appear here once pump attendants start their sessions
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {shifts
            .filter((s: any) => s.approvalStatus === "pending_approval")
            .map((shift: any) => (
              <ShiftCard key={shift.sessionId} shift={shift} onApprove={handleApprove} onReject={handleReject} />
            ))}
          {shifts
            .filter((s: any) => s.status === "open" && s.approvalStatus !== "pending_approval")
            .map((shift: any) => (
              <ShiftCard key={shift.sessionId} shift={shift} onApprove={handleApprove} onReject={handleReject} />
            ))}
          {shifts
            .filter((s: any) => s.status !== "open" && s.approvalStatus !== "pending_approval")
            .map((shift: any) => (
              <ShiftCard key={shift.sessionId} shift={shift} onApprove={handleApprove} onReject={handleReject} />
            ))}
        </div>
      )}
    </div>
  );
}
