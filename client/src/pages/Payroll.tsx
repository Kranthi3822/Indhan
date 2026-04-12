import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Users, Calendar, IndianRupee, CheckCircle2, XCircle, Clock,
  Plus, Play, Download, ChevronLeft, ChevronRight, UserCheck,
  Building2, CreditCard, AlertCircle, TrendingUp
} from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function fmt(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  if (v >= 100000) return `₹${(v/100000).toFixed(2)}L`;
  if (v >= 1000) return `₹${(v/1000).toFixed(1)}K`;
  return `₹${v.toFixed(0)}`;
}

function fmtFull(n: number | string | null | undefined) {
  return `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_CONFIG = {
  present:  { label: "P",  color: "bg-emerald-500", text: "text-white", full: "Present" },
  absent:   { label: "A",  color: "bg-red-500",     text: "text-white", full: "Absent" },
  half_day: { label: "H",  color: "bg-teal-400",   text: "text-white", full: "Half Day" },
  leave:    { label: "L",  color: "bg-blue-400",     text: "text-white", full: "Leave" },
  holiday:  { label: "HO", color: "bg-purple-400",  text: "text-white", full: "Holiday" },
};

// ─── Add Employee Dialog ──────────────────────────────────────────────────────
function AddEmployeeDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", role: "Pump Attendant", department: "Operations",
    joinDate: "2025-04-01", basicSalary: 8000, hra: 1000, otherAllowances: 500,
    pfApplicable: true, esiApplicable: true, ptApplicable: true,
    monthlyWorkingDays: 26, phone: "", bankAccount: "", ifscCode: "",
  });
  const create = trpc.hr.createEmployee.useMutation({
    onSuccess: () => { toast.success("Employee added"); setOpen(false); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="w-4 h-4 mr-1" /> Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="col-span-2 sm:col-span-2">
            <Label>Full Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Mahesh Kumar" />
          </div>
          <div>
            <Label>Role</Label>
            <Input value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))} />
          </div>
          <div>
            <Label>Department</Label>
            <Select value={form.department} onValueChange={v => setForm(f => ({...f, department: v}))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Operations","Finance","Management","Security","Maintenance"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Join Date</Label>
            <Input type="date" value={form.joinDate} onChange={e => setForm(f => ({...f, joinDate: e.target.value}))} />
          </div>
          <div>
            <Label>Working Days/Month</Label>
            <Input type="number" value={form.monthlyWorkingDays} onChange={e => setForm(f => ({...f, monthlyWorkingDays: Number(e.target.value)}))} />
          </div>
          <div>
            <Label>Basic Salary (₹)</Label>
            <Input type="number" value={form.basicSalary} onChange={e => setForm(f => ({...f, basicSalary: Number(e.target.value)}))} />
          </div>
          <div>
            <Label>HRA (₹)</Label>
            <Input type="number" value={form.hra} onChange={e => setForm(f => ({...f, hra: Number(e.target.value)}))} />
          </div>
          <div>
            <Label>Other Allowances (₹)</Label>
            <Input type="number" value={form.otherAllowances} onChange={e => setForm(f => ({...f, otherAllowances: Number(e.target.value)}))} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="9XXXXXXXXX" />
          </div>
          <div className="col-span-2 flex gap-4 text-xs">
            {[["pfApplicable","PF (12%)"],["esiApplicable","ESI (0.75%)"],["ptApplicable","PT (Telangana)"]].map(([k,l]) => (
              <label key={k} className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={(form as any)[k]} onChange={e => setForm(f => ({...f, [k]: e.target.checked}))} />
                {l}
              </label>
            ))}
          </div>
        </div>
        <Button className="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => create.mutate(form as any)} disabled={create.isPending || !form.name}>
          {create.isPending ? "Adding..." : "Add Employee"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ─── Payslip Modal ────────────────────────────────────────────────────────────
function PayslipModal({ employeeId, employeeName, month, year }: { employeeId: number; employeeName: string; month: number; year: number }) {
  const [open, setOpen] = useState(false);
  const { data: slip } = trpc.hr.getPayslip.useQuery({ employeeId, month, year }, { enabled: open });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-teal-400 hover:text-teal-300">
          <Download className="w-3 h-3 mr-1" /> Payslip
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Payslip — {MONTH_NAMES[month-1]} {year}</DialogTitle>
        </DialogHeader>
        {!slip ? <div className="text-center text-sm text-muted-foreground py-4">No payslip generated yet</div> : (
          <div className="text-sm space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <div>
                <div className="font-semibold">{slip.employeeName}</div>
                <div className="text-xs text-muted-foreground">{slip.role} · {slip.department}</div>
              </div>
              <Badge className={slip.paymentStatus === 'paid' ? 'bg-emerald-600' : 'bg-teal-600'}>
                {slip.paymentStatus?.toUpperCase()}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">Attendance: {Number(slip.daysPresent).toFixed(1)} / {slip.workingDays} days</div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Earnings</div>
              {[["Basic",slip.basicSalary],["HRA",slip.hra],["Other Allowances",slip.otherAllowances]].map(([l,v]) => (
                <div key={l as string} className="flex justify-between"><span className="text-muted-foreground">{l}</span><span>{fmtFull(v)}</span></div>
              ))}
              <div className="flex justify-between font-semibold border-t pt-1"><span>Gross Earned</span><span className="text-emerald-400">{fmtFull(slip.grossEarned)}</span></div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-red-400 uppercase tracking-wide">Deductions</div>
              {[["PF (Employee 12%)",slip.pfEmployee],["ESI (Employee 0.75%)",slip.esiEmployee],["Professional Tax",slip.professionalTax]].map(([l,v]) => (
                <div key={l as string} className="flex justify-between"><span className="text-muted-foreground">{l}</span><span className="text-red-400">-{fmtFull(v)}</span></div>
              ))}
              <div className="flex justify-between font-semibold border-t pt-1"><span>Total Deductions</span><span className="text-red-400">-{fmtFull(slip.totalDeductions)}</span></div>
            </div>
            <div className="flex justify-between text-base font-bold border-t pt-2">
              <span>Net Pay</span><span className="text-teal-400">{fmtFull(slip.netPay)}</span>
            </div>
            <div className="text-xs text-muted-foreground border-t pt-2">
              <div className="font-semibold mb-1">Employer Cost (not deducted)</div>
              {[["PF Employer (3.67%+8.33%)",slip.pfEmployer],["ESI Employer (3.25%)",slip.esiEmployer]].map(([l,v]) => (
                <div key={l as string} className="flex justify-between"><span>{l}</span><span>{fmtFull(v)}</span></div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Payroll() {
  const today = new Date();
  const [month, setMonth] = useState(3); // March 2026 (latest data)
  const [year, setYear] = useState(2026);
  const [tab, setTab] = useState("attendance");

  const utils = trpc.useUtils();
  const { data: employees = [], isLoading: empLoading } = trpc.hr.listEmployees.useQuery({ activeOnly: false });
  const { data: attendance = [] } = trpc.hr.getMonthAttendance.useQuery({ month, year });
  const { data: payrollRun } = trpc.hr.getPayrollRun.useQuery({ month, year });
  const { data: payslips = [] } = trpc.hr.getPayslips.useQuery(
    { runId: payrollRun?.id ?? 0 },
    { enabled: !!payrollRun?.id }
  );

  const markAttendance = trpc.hr.markAttendance.useMutation({
    onSuccess: () => utils.hr.getMonthAttendance.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const processPayroll = trpc.hr.processPayroll.useMutation({
    onSuccess: (data) => {
      toast.success(`Payroll processed — ${data.payslipCount} payslips generated`);
      utils.hr.getPayrollRun.invalidate();
      utils.hr.getPayslips.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const markPaid = trpc.hr.markPayrollPaid.useMutation({
    onSuccess: () => {
      toast.success("Payroll marked as paid");
      utils.hr.getPayrollRun.invalidate();
      utils.hr.getPayslips.invalidate();
    },
  });

  // Build attendance map: employeeId → date → status
  const attendanceMap = useMemo(() => {
    const map: Record<number, Record<string, string>> = {};
    for (const a of attendance) {
      if (!map[a.employeeId]) map[a.employeeId] = {};
      map[a.employeeId][a.attendanceDate] = a.status;
    }
    return map;
  }, [attendance]);

  // Days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Summary stats
  const totalEmployees = employees.filter(e => e.isActive).length;
  const todayStr = `${year}-${String(month).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`;

  const runStatusColor = {
    draft: "bg-zinc-600", processed: "bg-blue-600", approved: "bg-teal-600", paid: "bg-emerald-600"
  };

  return (
    <div className="p-6 space-y-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-400" /> HR & Payroll
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Attendance · Payroll · Compliance</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Month navigator */}
          <Button variant="ghost" size="icon" onClick={() => { if (month === 1) { setMonth(12); setYear(y => y-1); } else setMonth(m => m-1); }}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium w-28 text-center">{MONTH_NAMES[month-1]} {year}</span>
          <Button variant="ghost" size="icon" onClick={() => { if (month === 12) { setMonth(1); setYear(y => y+1); } else setMonth(m => m+1); }}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <AddEmployeeDialog onSuccess={() => utils.hr.listEmployees.invalidate()} />
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: "Active Staff", value: totalEmployees, color: "text-teal-400" },
          { icon: UserCheck, label: "Payroll Status", value: payrollRun ? (payrollRun.status ?? 'draft').toUpperCase() : "NOT RUN", color: "text-blue-400" },
          { icon: IndianRupee, label: "Net Pay", value: payrollRun ? fmt(payrollRun.totalNetPay) : "—", color: "text-emerald-400" },
          { icon: Building2, label: "Employer Cost", value: payrollRun ? fmt(Number(payrollRun.totalPfEmployer) + Number(payrollRun.totalEsiEmployer)) : "—", color: "text-purple-400" },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted/50"><Icon className={`w-4 h-4 ${color}`} /></div>
              <div>
                <div className={`text-lg font-bold ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card">
          <TabsTrigger value="attendance"><Calendar className="w-3.5 h-3.5 mr-1" />Attendance</TabsTrigger>
          <TabsTrigger value="payroll"><IndianRupee className="w-3.5 h-3.5 mr-1" />Payroll</TabsTrigger>
          <TabsTrigger value="employees"><Users className="w-3.5 h-3.5 mr-1" />Employees</TabsTrigger>
        </TabsList>

        {/* ── Attendance Tab ── */}
        <TabsContent value="attendance">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Attendance Register — {MONTH_NAMES[month-1]} {year}</CardTitle>
                <div className="flex gap-1 text-xs">
                  {Object.entries(STATUS_CONFIG).map(([k,v]) => (
                    <span key={k} className={`px-1.5 py-0.5 rounded ${v.color} ${v.text}`}>{v.label}={v.full}</span>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {empLoading ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
              ) : employees.filter(e => e.isActive).length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No active employees. Add employees to start marking attendance.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 pl-4 font-medium text-muted-foreground sticky left-0 bg-card min-w-32">Employee</th>
                        {days.map(d => {
                          const dow = new Date(year, month-1, d).getDay();
                          const isSun = dow === 0;
                          return (
                            <th key={d} className={`p-1 text-center font-medium min-w-7 ${isSun ? 'text-red-400' : 'text-muted-foreground'}`}>
                              {d}
                            </th>
                          );
                        })}
                        <th className="p-2 text-center font-medium text-muted-foreground">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.filter(e => e.isActive).map(emp => {
                        const empAtt = attendanceMap[emp.id] ?? {};
                        const daysPresent = Object.values(empAtt).reduce((s, st) =>
                          s + (st === 'present' ? 1 : st === 'half_day' ? 0.5 : 0), 0);
                        return (
                          <tr key={emp.id} className="border-b border-border/50 hover:bg-muted/50/30">
                            <td className="p-2 pl-4 sticky left-0 bg-card">
                              <div className="font-medium">{emp.name}</div>
                              <div className="text-muted-foreground">{emp.role}</div>
                            </td>
                            {days.map(d => {
                              const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                              const status = empAtt[dateStr];
                              const cfg = status ? STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] : null;
                              const dow = new Date(year, month-1, d).getDay();
                              const isSun = dow === 0;
                              return (
                                <td key={d} className="p-0.5 text-center">
                                  <button
                                    onClick={() => {
                                      const next = !status ? 'present' : status === 'present' ? 'absent' : status === 'absent' ? 'half_day' : status === 'half_day' ? 'leave' : 'present';
                                      markAttendance.mutate({ employeeId: emp.id, attendanceDate: dateStr, status: next as any });
                                    }}
                                    className={`w-6 h-6 rounded text-xs font-bold transition-all hover:scale-110 ${cfg ? `${cfg.color} ${cfg.text}` : isSun ? 'bg-muted/50 text-red-400/50' : 'bg-muted/50 text-zinc-600 hover:bg-muted'}`}
                                    title={cfg?.full ?? (isSun ? 'Sunday' : 'Click to mark')}
                                  >
                                    {cfg ? cfg.label : isSun ? '—' : '·'}
                                  </button>
                                </td>
                              );
                            })}
                            <td className="p-2 text-center font-bold text-teal-400">{daysPresent.toFixed(1)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Payroll Tab ── */}
        <TabsContent value="payroll">
          <div className="space-y-4">
            {/* Payroll run controls */}
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">Payroll Run — {MONTH_NAMES[month-1]} {year}</div>
                  {payrollRun ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={runStatusColor[payrollRun.status as keyof typeof runStatusColor] ?? 'bg-zinc-600'}>
                        {(payrollRun.status ?? 'draft').toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Net: {fmtFull(payrollRun.totalNetPay)} · Gross: {fmtFull(payrollRun.totalGross)}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground mt-1">Not yet processed</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => processPayroll.mutate({ month, year, approvedBy: "Admin" })}
                    disabled={processPayroll.isPending || payrollRun?.status === 'paid'}
                  >
                    <Play className="w-3.5 h-3.5 mr-1" />
                    {processPayroll.isPending ? "Processing..." : payrollRun ? "Re-process" : "Process Payroll"}
                  </Button>
                  {payrollRun && payrollRun.status !== 'paid' && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => markPaid.mutate({ runId: payrollRun.id, paymentDate: todayStr })}
                      disabled={markPaid.isPending}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Paid
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Statutory summary */}
            {payrollRun && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Gross Payable", value: payrollRun.totalGross, color: "text-teal-400" },
                  { label: "PF (Employee)", value: payrollRun.totalPfEmployee, color: "text-red-400" },
                  { label: "ESI (Employee)", value: payrollRun.totalEsiEmployee, color: "text-red-400" },
                  { label: "Prof. Tax", value: payrollRun.totalPt, color: "text-red-400" },
                  { label: "Net Pay", value: payrollRun.totalNetPay, color: "text-emerald-400" },
                  { label: "PF (Employer)", value: payrollRun.totalPfEmployer, color: "text-purple-400" },
                  { label: "ESI (Employer)", value: payrollRun.totalEsiEmployer, color: "text-purple-400" },
                  { label: "Total Employer Cost", value: Number(payrollRun.totalGross) + Number(payrollRun.totalPfEmployer) + Number(payrollRun.totalEsiEmployer), color: "text-blue-400" },
                ].map(({ label, value, color }) => (
                  <Card key={label} className="bg-card border-border">
                    <CardContent className="p-3">
                      <div className={`text-base font-bold ${color}`}>{fmtFull(value)}</div>
                      <div className="text-xs text-muted-foreground">{label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Payslip table */}
            {payslips.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Individual Payslips</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left p-3">Employee</th>
                        <th className="text-right p-3">Days</th>
                        <th className="text-right p-3">Gross</th>
                        <th className="text-right p-3">PF</th>
                        <th className="text-right p-3">ESI</th>
                        <th className="text-right p-3">PT</th>
                        <th className="text-right p-3">Net Pay</th>
                        <th className="text-center p-3">Status</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {payslips.map((slip: any) => (
                        <tr key={slip.id} className="border-b border-border/50 hover:bg-muted/50/30">
                          <td className="p-3">
                            <div className="font-medium">{slip.employeeName}</div>
                            <div className="text-xs text-muted-foreground">{slip.role}</div>
                          </td>
                          <td className="p-3 text-right text-muted-foreground">{Number(slip.daysPresent).toFixed(1)}/{slip.workingDays}</td>
                          <td className="p-3 text-right">{fmt(slip.grossEarned)}</td>
                          <td className="p-3 text-right text-red-400">-{fmt(slip.pfEmployee)}</td>
                          <td className="p-3 text-right text-red-400">-{fmt(slip.esiEmployee)}</td>
                          <td className="p-3 text-right text-red-400">-{fmt(slip.professionalTax)}</td>
                          <td className="p-3 text-right font-bold text-teal-400">{fmt(slip.netPay)}</td>
                          <td className="p-3 text-center">
                            <Badge className={slip.paymentStatus === 'paid' ? 'bg-emerald-600 text-xs' : 'bg-teal-600 text-xs'}>
                              {slip.paymentStatus?.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <PayslipModal employeeId={slip.employeeId} employeeName={slip.employeeName} month={month} year={year} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {!payrollRun && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <IndianRupee className="w-10 h-10 mx-auto mb-3 opacity-30" />
                Mark attendance first, then click "Process Payroll" to auto-compute PF, ESI & PT.
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Employees Tab ── */}
        <TabsContent value="employees">
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              {employees.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No employees yet. Click "Add Employee" to get started.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="text-left p-3">Name</th>
                      <th className="text-left p-3">Role</th>
                      <th className="text-left p-3">Dept</th>
                      <th className="text-right p-3">Basic</th>
                      <th className="text-right p-3">Gross CTC</th>
                      <th className="text-center p-3">PF</th>
                      <th className="text-center p-3">ESI</th>
                      <th className="text-center p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => {
                      const gross = Number(emp.basicSalary) + Number(emp.hra ?? 0) + Number(emp.otherAllowances ?? 0);
                      return (
                        <tr key={emp.id} className="border-b border-border/50 hover:bg-muted/50/30">
                          <td className="p-3">
                            <div className="font-medium">{emp.name}</div>
                            <div className="text-xs text-muted-foreground">{emp.phone}</div>
                          </td>
                          <td className="p-3 text-muted-foreground">{emp.role}</td>
                          <td className="p-3 text-muted-foreground">{emp.department}</td>
                          <td className="p-3 text-right">{fmt(emp.basicSalary)}</td>
                          <td className="p-3 text-right font-medium text-teal-400">{fmt(gross)}</td>
                          <td className="p-3 text-center">
                            {emp.pfApplicable ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /> : <XCircle className="w-4 h-4 text-zinc-600 mx-auto" />}
                          </td>
                          <td className="p-3 text-center">
                            {emp.esiApplicable ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /> : <XCircle className="w-4 h-4 text-zinc-600 mx-auto" />}
                          </td>
                          <td className="p-3 text-center">
                            <Badge className={emp.isActive ? 'bg-emerald-600 text-xs' : 'bg-zinc-600 text-xs'}>
                              {emp.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
