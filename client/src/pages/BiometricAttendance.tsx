/**
 * Admin — Biometric Attendance & Payroll Management
 * Shows today's check-in overview, employee attendance scores, payroll requests
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Users, CheckCircle2, Clock, AlertCircle, Banknote,
  Shield, RefreshCw, ChevronDown, ChevronUp, ExternalLink
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const EMPLOYEES = [
  { id: 30001, name: "Mahesh" },
  { id: 30002, name: "Ashok" },
  { id: 30003, name: "Kiran" },
  { id: 30004, name: "Parandhamulu" },
  { id: 30005, name: "Anjaiah" },
];

export default function BiometricAttendance() {
  
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; requestId: number; empName: string; amount: string } | null>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected' | 'paid'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [paymentMode, setPaymentMode] = useState<'bank' | 'cash'>('bank');
  const [expandedEmp, setExpandedEmp] = useState<number | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.substring(0, 7) + '-01';

  // Queries
  const todayOverview = trpc.attendance.getTodayOverview.useQuery(undefined, { refetchInterval: 60000 });
  const pendingPayroll = trpc.attendance.listPayrollRequests.useQuery({ status: 'pending' });
  const allPayroll = trpc.attendance.listPayrollRequests.useQuery({ status: 'all' });
  const generateSlotsMut = trpc.attendance.generateTodaySlots.useMutation();
  const reviewPayrollMut = trpc.attendance.reviewPayrollRequest.useMutation();

  // Per-employee score query (only when expanded)
  const empScore = trpc.attendance.getAttendanceScore.useQuery(
    { employeeId: expandedEmp ?? 0, fromDate: monthStart, toDate: today },
    { enabled: !!expandedEmp }
  );

  const handleGenerateSlots = async () => {
    try {
      const result = await generateSlotsMut.mutateAsync();
      toast.success("Slots Generated: ${result.slotsGenerated} check-in slots created for today.");
      todayOverview.refetch();
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    }
  };

  const handleReview = async () => {
    if (!reviewDialog) return;
    try {
      await reviewPayrollMut.mutateAsync({
        requestId: reviewDialog.requestId,
        action: reviewAction,
        notes: reviewNotes,
        paymentMode: reviewAction === 'paid' ? paymentMode : undefined,
      });
      toast.success(`Request ${reviewAction}: Payment for ${reviewDialog.empName} has been ${reviewAction}.`);
      setReviewDialog(null);
      setReviewNotes('');
      pendingPayroll.refetch();
      allPayroll.refetch();
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-teal-400';
    return 'text-red-400';
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-teal-900/50 text-teal-300 border-teal-700',
      approved: 'bg-blue-900/50 text-blue-300 border-blue-700',
      paid: 'bg-green-900/50 text-green-300 border-green-700',
      rejected: 'bg-red-900/50 text-red-300 border-red-700',
    };
    return map[status] || 'bg-muted/50 text-foreground/80';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Biometric Attendance</h1>
          <p className="text-muted-foreground text-sm">Face recognition + geo-fence check-ins</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/staff', '_blank')}
            className="gap-2"
          >
            <ExternalLink size={14} /> Staff Portal
          </Button>
          <Button
            size="sm"
            onClick={handleGenerateSlots}
            disabled={generateSlotsMut.isPending}
            className="gap-2 bg-teal-600 hover:bg-teal-500 text-white"
          >
            <RefreshCw size={14} className={generateSlotsMut.isPending ? 'animate-spin' : ''} />
            Generate Today's Slots
          </Button>
        </div>
      </div>

      {/* Today's Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} className="text-blue-400" />
              <span className="text-xs text-muted-foreground">Active Staff</span>
            </div>
            <p className="text-2xl font-bold">{todayOverview.data?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={16} className="text-green-400" />
              <span className="text-xs text-muted-foreground">Verified Today</span>
            </div>
            <p className="text-2xl font-bold text-green-400">
              {todayOverview.data?.reduce((s: number, e: any) => s + e.verified, 0) ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-teal-400" />
              <span className="text-xs text-muted-foreground">Pending Slots</span>
            </div>
            <p className="text-2xl font-bold text-teal-400">
              {todayOverview.data?.reduce((s: number, e: any) => s + e.pending, 0) ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Banknote size={16} className="text-purple-400" />
              <span className="text-xs text-muted-foreground">Pending Payroll</span>
            </div>
            <p className="text-2xl font-bold text-purple-400">
              {pendingPayroll.data?.length ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today's Check-ins</TabsTrigger>
          <TabsTrigger value="scores">Monthly Scores</TabsTrigger>
          <TabsTrigger value="payroll">
            Payroll Requests
            {(pendingPayroll.data?.length ?? 0) > 0 && (
              <span className="ml-2 bg-teal-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {pendingPayroll.data?.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="setup">Setup PINs</TabsTrigger>
        </TabsList>

        {/* Today's Check-ins */}
        <TabsContent value="today" className="space-y-3 mt-4">
          {todayOverview.isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (todayOverview.data?.length ?? 0) === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock size={40} className="mx-auto mb-3 opacity-30" />
              <p>No slots generated yet for today.</p>
              <p className="text-sm mt-1">Click "Generate Today's Slots" to create check-in windows.</p>
            </div>
          ) : (
            todayOverview.data?.map((emp: any) => (
              <Card key={emp.employee.id} className="bg-card border-border">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold">
                      {emp.employee.name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{emp.employee.name}</p>
                        <span className={`text-lg font-bold ${getScoreColor(emp.score)}`}>
                          {emp.score.toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="text-green-400">✓ {emp.verified}</span>
                        <span className="text-red-400">✗ {emp.missed}</span>
                        <span className="text-teal-400">⏳ {emp.pending}</span>
                        <span>of {emp.slots} slots</span>
                      </div>
                      <Progress value={emp.score} className="h-1.5 mt-2" />
                    </div>
                  </div>
                  {emp.lastVerified && (
                    <p className="text-xs text-muted-foreground mt-2 ml-13">
                      Last verified: {new Date(emp.lastVerified).toLocaleTimeString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Monthly Scores */}
        <TabsContent value="scores" className="space-y-3 mt-4">
          <p className="text-sm text-muted-foreground">Month: {monthStart} → {today}</p>
          {EMPLOYEES.map(emp => (
            <Card key={emp.id} className="bg-card border-border">
              <CardContent className="pt-4">
                <button
                  className="w-full flex items-center gap-3"
                  onClick={() => setExpandedEmp(expandedEmp === emp.id ? null : emp.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold">
                    {emp.name[0]}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">Click to view details</p>
                  </div>
                  {expandedEmp === emp.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {expandedEmp === emp.id && (
                  <div className="mt-4 border-t border-border pt-4">
                    {empScore.isLoading ? (
                      <p className="text-muted-foreground text-sm">Loading...</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="bg-muted/30 rounded-lg p-3 text-center">
                            <p className={`text-2xl font-bold ${getScoreColor(empScore.data?.summary.overallScore ?? 0)}`}>
                              {empScore.data?.summary.overallScore?.toFixed(1) ?? '—'}%
                            </p>
                            <p className="text-xs text-muted-foreground">Score</p>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-blue-400">{empScore.data?.summary.presentDays ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Days Present</p>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-3 text-center">
                            <p className={`text-2xl font-bold ${(empScore.data?.summary.overallScore ?? 0) >= 90 ? 'text-green-400' : 'text-red-400'}`}>
                              {(empScore.data?.summary.overallScore ?? 0) >= 90 ? '✓' : '✗'}
                            </p>
                            <p className="text-xs text-muted-foreground">Eligible</p>
                          </div>
                        </div>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {empScore.data?.scores.slice(0, 10).map((s: any) => (
                            <div key={s.id} className="flex items-center justify-between text-xs py-1 border-b border-border/50">
                              <span className="text-muted-foreground">{s.scoreDate}</span>
                              <span>{s.verifiedSlots}/{s.totalSlots} slots</span>
                              <Badge className={
                                s.dayStatus === 'present' ? 'bg-green-900/50 text-green-300 text-xs' :
                                s.dayStatus === 'partial' ? 'bg-teal-900/50 text-teal-300 text-xs' :
                                'bg-red-900/50 text-red-300 text-xs'
                              }>
                                {s.dayStatus}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Payroll Requests */}
        <TabsContent value="payroll" className="space-y-3 mt-4">
          {(allPayroll.data?.length ?? 0) === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Banknote size={40} className="mx-auto mb-3 opacity-30" />
              <p>No payroll requests yet.</p>
            </div>
          ) : (
            allPayroll.data?.map((item: any) => (
              <Card key={item.request.id} className="bg-card border-border">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold shrink-0">
                        {item.employee.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold">{item.employee.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {item.request.requestType} • {item.request.periodStart} → {item.request.periodEnd}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Attendance: {parseFloat(item.request.attendanceScore).toFixed(1)}% •
                          {item.request.eligibleDays} days
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-lg">₹{parseFloat(item.request.netAmount).toLocaleString('en-IN')}</p>
                      <Badge className={getStatusBadge(item.request.status)}>
                        {item.request.status}
                      </Badge>
                    </div>
                  </div>

                  {item.request.status === 'pending' && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setReviewDialog({
                          open: true,
                          requestId: item.request.id,
                          empName: item.employee.name,
                          amount: parseFloat(item.request.netAmount).toLocaleString('en-IN'),
                        })}
                        className="bg-green-700 hover:bg-green-600 text-white"
                      >
                        Review
                      </Button>
                    </div>
                  )}

                  {item.request.reviewNotes && (
                    <p className="text-xs text-muted-foreground mt-2 italic">Note: {item.request.reviewNotes}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Setup PINs */}
        <TabsContent value="setup" className="mt-4">
          <SetupPins />
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog?.open} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Payroll Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              <span className="font-semibold">{reviewDialog?.empName}</span> — ₹{reviewDialog?.amount}
            </p>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Action</label>
              <Select value={reviewAction} onValueChange={(v: any) => setReviewAction(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approve</SelectItem>
                  <SelectItem value="paid">Mark as Paid</SelectItem>
                  <SelectItem value="rejected">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {reviewAction === 'paid' && (
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Payment Mode</label>
                <Select value={paymentMode} onValueChange={(v: any) => setPaymentMode(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Notes (optional)</label>
              <Textarea
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                placeholder="Add a note..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>Cancel</Button>
            <Button
              onClick={handleReview}
              disabled={reviewPayrollMut.isPending}
              className={reviewAction === 'rejected' ? 'bg-red-700 hover:bg-red-600' : 'bg-green-700 hover:bg-green-600'}
            >
              {reviewPayrollMut.isPending ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Setup PINs sub-component ──────────────────────────────────────────────────
function SetupPins() {
  
  const [pins, setPins] = useState<Record<number, string>>({});
  const setPin = trpc.attendance.setEmployeePin.useMutation();
  const empAuth = trpc.attendance.getEmployeesWithAuth.useQuery();

  const handleSetPin = async (empId: number) => {
    const pin = pins[empId];
    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      toast.error("Invalid PIN: PIN must be exactly 6 digits.");
      return;
    }
    try {
      await setPin.mutateAsync({ employeeId: empId, pin });
      toast.success("PIN Set: Employee PIN updated successfully.");
      setPins(p => ({ ...p, [empId]: '' }));
      empAuth.refetch();
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-4 flex gap-3">
        <Shield className="text-teal-400 shrink-0 mt-0.5" size={18} />
        <div className="text-sm">
          <p className="font-semibold text-teal-400">Admin Action Required</p>
          <p className="text-muted-foreground mt-1">
            Set a 6-digit PIN for each employee. They will use this PIN to log in to the Staff Portal
            at <code className="bg-muted px-1 rounded">/staff</code> and verify their identity before face enrolment.
          </p>
        </div>
      </div>

      {empAuth.isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        empAuth.data?.map((item: any) => (
          <Card key={item.employee.id} className="bg-card border-border">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold">
                  {item.employee.name[0]}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{item.employee.name}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge className={item.auth?.pinSet ? 'bg-green-900/50 text-green-300 text-xs' : 'bg-muted/50 text-muted-foreground text-xs'}>
                      {item.auth?.pinSet ? '✓ PIN Set' : '✗ No PIN'}
                    </Badge>
                    <Badge className={item.auth?.faceEnrolled ? 'bg-green-900/50 text-green-300 text-xs' : 'bg-muted/50 text-muted-foreground text-xs'}>
                      {item.auth?.faceEnrolled ? '✓ Face Enrolled' : '✗ No Face'}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit PIN"
                  value={pins[item.employee.id] ?? ''}
                  onChange={e => setPins(p => ({ ...p, [item.employee.id]: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                  className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm font-mono tracking-widest"
                />
                <Button
                  size="sm"
                  onClick={() => handleSetPin(item.employee.id)}
                  disabled={setPin.isPending}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-bold"
                >
                  Set PIN
                </Button>
              </div>
              {item.auth?.lastLoginAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  Last login: {new Date(item.auth.lastLoginAt).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
