/**
 * NozzleEntry.tsx — Staff Nozzle Sales & Cash Collection Entry + Daily Activity Report
 * Tab 1 (Entry): Mobile-optimised step-by-step workflow for shift entry
 * Tab 2 (Activity Report): Auto-populated daily report from nozzle sessions
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Fuel, IndianRupee, CheckCircle2, AlertCircle, Clock,
  ChevronRight, ChevronLeft, Plus, Trash2, ArrowRight,
  Gauge, Wallet, BarChart3, ClipboardCheck, User,
  ClipboardList, Droplets, CreditCard, Smartphone, ChevronDown,
  TrendingUp, ArrowLeft,
} from "lucide-react";
import { format, subDays, addDays } from "date-fns";
import { fmtCompact, fmtFull } from "@/lib/format";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

// ─── Daily Activity Helpers ────────────────────────────────────────────────────
const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const fmtL = (n: number) => `${n.toFixed(1)}L`;
const DIGITAL_LABELS: Record<string, string> = {
  upi: "UPI", phonepe: "PhonePe", card: "Card", bank_transfer: "Bank", bhim: "BHIM"
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TODAY = format(new Date(), "yyyy-MM-dd");
const PETROL_PRICE = 103.41;
const DIESEL_PRICE = 89.14;

const fuelColor = (type: string) =>
  type === "petrol"
    ? { bg: "bg-teal-500/10", border: "border-teal-500/30", text: "text-teal-400", badge: "bg-teal-500/20 text-teal-300" }
    : { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", badge: "bg-blue-500/20 text-blue-300" };

const modeColor = (mode: string) => {
  if (mode === "cash")    return "text-green-400 bg-green-500/10 border-green-500/20";
  if (mode === "digital") return "text-blue-400 bg-blue-500/10 border-blue-500/20";
  if (mode === "credit")  return "text-orange-400 bg-orange-500/10 border-orange-500/20";
  return "text-muted-foreground bg-muted/10 border-border/20";
};

const modeLabel = (mode: string, sub?: string | null) => {
  if (mode === "cash") return "Cash";
  if (mode === "credit") return "Credit";
  if (mode === "digital") {
    const labels: Record<string, string> = { upi: "UPI", phonepe: "PhonePe", card: "Card", bank_transfer: "Bank", bhim: "BHIM" };
    return sub ? labels[sub] ?? "Digital" : "Digital";
  }
  return mode;
};

// ─── Step indicator ───────────────────────────────────────────────────────────
const STEPS = [
  { label: "Staff & Shift", icon: User },
  { label: "Opening Readings", icon: Gauge },
  { label: "Closing Readings", icon: Gauge },
  { label: "Collections", icon: Wallet },
  { label: "Summary & Close", icon: ClipboardCheck },
];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center gap-1 shrink-0">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all
              ${active ? "bg-primary text-primary-foreground" : done ? "bg-green-500/20 text-green-400" : "bg-muted/40 text-muted-foreground"}`}>
              {done ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </div>
            {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NozzleEntry() {
  const [step, setStep] = useState(0);
  const [shiftDate, setShiftDate] = useState(TODAY);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [shiftLabel, setShiftLabel] = useState<"morning" | "evening" | "full_day">("full_day");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [openingReadings, setOpeningReadings] = useState<Record<number, string>>({});
  const [closingReadings, setClosingReadings] = useState<Record<number, string>>({});
  const [testingQty, setTestingQty] = useState<Record<number, string>>({}); // per-nozzle testing qty
  // Collection form state
  const [collAmount, setCollAmount] = useState("");
  const [collMode, setCollMode] = useState<"cash" | "digital" | "credit">("cash");
  const [collDigitalSub, setCollDigitalSub] = useState<"upi" | "phonepe" | "card" | "bank_transfer" | "bhim">("upi");
  const [collNozzle, setCollNozzle] = useState<string>("");   // mandatory — no default
  const [collCustomer, setCollCustomer] = useState("");
  const [collNotes, setCollNotes] = useState("");

  // Data queries
  const { data: staffList } = trpc.nozzle.getStaffList.useQuery();
  const { data: nozzles } = trpc.nozzle.getNozzles.useQuery();
  // Previous shift closing readings — shown on Opening Readings step for reference
  const { data: prevClosingReadings } = trpc.nozzle.getPreviousClosingReadings.useQuery(
    { shiftDate },
    { enabled: step >= 1 }
  );
  const prevClosingMap = useMemo(() => {
    if (!prevClosingReadings) return {} as Record<number, { reading: number | null; date: string | null }>;
    return Object.fromEntries(
      prevClosingReadings.map(r => [r.nozzleId, { reading: r.previousClosingReading, date: r.previousShiftDate }])
    );
  }, [prevClosingReadings]);
  const { data: collections, refetch: refetchCollections } = trpc.nozzle.getCollections.useQuery(
    { sessionId: sessionId! },
    { enabled: sessionId !== null }
  );
  const { data: summary, refetch: refetchSummary } = trpc.nozzle.getSessionSummary.useQuery(
    { sessionId: sessionId! },
    { enabled: sessionId !== null && step === 4 }
  );

  const utils = trpc.useUtils();

  // Mutations
  const startShift = trpc.nozzle.startShift.useMutation({
    onSuccess: (session) => {
      setSessionId(session.id);
      setStep(1);
      toast.success("Shift started successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const saveReading = trpc.nozzle.saveReading.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const addCollection = trpc.nozzle.addCollection.useMutation({
    onSuccess: () => {
      refetchCollections();
      setCollAmount("");
      setCollNotes("");
      setCollCustomer("");
      toast.success("Collection recorded");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteCollection = trpc.nozzle.deleteCollection.useMutation({
    onSuccess: () => refetchCollections(),
    onError: (e) => toast.error(e.message),
  });

  const closeShift = trpc.nozzle.closeShift.useMutation({
    onSuccess: () => {
      toast.success("Shift closed — daily report updated automatically");
      utils.nozzle.getSessionsForDate.invalidate({ shiftDate });
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Step handlers ────────────────────────────────────────────────────────
  const handleStartShift = () => {
    if (!selectedEmployee) return toast.error("Please select a staff member");
    const staff = staffList?.find(s => s.id === selectedEmployee);
    startShift.mutate({
      shiftDate,
      employeeId: selectedEmployee,
      staffName: staff?.name ?? "Staff",
      shiftLabel,
    });
  };

  const handleSaveOpeningReadings = async () => {
    if (!sessionId || !nozzles) return;
    // Opening readings are auto-populated from previous shift closing — save them directly
    let allSaved = true;
    for (const nozzle of nozzles) {
      const prev = prevClosingMap[nozzle.id];
      const reading = prev?.reading ?? 0; // default to 0 if no previous record
      await saveReading.mutateAsync({
        sessionId,
        nozzleId: nozzle.id,
        readingType: "opening",
        meterReading: reading,
      }).catch(() => { allSaved = false; });
    }
    if (allSaved) {
      toast.success("Opening readings confirmed — enter closing meter readings");
      setStep(2);
    }
  };

  const handleAddCollection = () => {
    if (!sessionId) return;
    if (!collAmount || isNaN(Number(collAmount)) || Number(collAmount) <= 0) {
      return toast.error("Enter a valid amount");
    }
    if (!collNozzle) {
      return toast.error("Please select a nozzle");
    }
    addCollection.mutate({
      sessionId,
      nozzleId: Number(collNozzle),
      amount: Number(collAmount),
      paymentMode: collMode,
      digitalSubType: collMode === "digital" ? collDigitalSub : undefined,
      customerName: collCustomer || undefined,
      notes: collNotes || undefined,
    });
  };

  const handleSaveClosingReadings = async () => {
    if (!sessionId || !nozzles) return;
    let allSaved = true;
    for (const nozzle of nozzles) {
      const val = closingReadings[nozzle.id];
      const opening = Number(openingReadings[nozzle.id] ?? 0);
      const tQty = Number(testingQty[nozzle.id] ?? 0);
      if (!val || isNaN(Number(val))) {
        toast.error(`Enter closing reading for ${nozzle.label}`);
        allSaved = false;
        break;
      }
      if (Number(val) < opening) {
        toast.error(`Closing reading for ${nozzle.label} cannot be less than opening (${opening.toLocaleString("en-IN")} L)`);
        allSaved = false;
        break;
      }
      if (tQty < 0) {
        toast.error(`Testing qty for ${nozzle.label} cannot be negative`);
        allSaved = false;
        break;
      }
      await saveReading.mutateAsync({
        sessionId,
        nozzleId: nozzle.id,
        readingType: "closing",
        meterReading: Number(val),
        testingQty: tQty,
      });
    }
      if (allSaved) {
      toast.success("Closing readings saved — now log collections");
      setStep(3);
    }
  };

  const handleCloseShift = () => {
    if (!sessionId) return;
    closeShift.mutate({ sessionId });
  };

  // ── Derived values ───────────────────────────────────────────────────────
  const collectionTotals = useMemo(() => {
    if (!collections) return { cash: 0, digital: 0, credit: 0, total: 0 };
    return collections.reduce((acc: any, c: any) => {
      acc[c.paymentMode] = (acc[c.paymentMode] ?? 0) + Number(c.amount);
      acc.total += Number(c.amount);
      return acc;
    }, { cash: 0, digital: 0, credit: 0, total: 0 });
  }, [collections]);

  const liveVolumes = useMemo(() => {
    if (!nozzles) return { petrol: 0, diesel: 0, petrolTesting: 0, dieselTesting: 0 };
    let petrol = 0, diesel = 0, petrolTesting = 0, dieselTesting = 0;
    for (const n of nozzles) {
      const o = Number(openingReadings[n.id] ?? 0);
      const c = Number(closingReadings[n.id] ?? 0);
      const tQty = Number(testingQty[n.id] ?? 0);
      const gross = Math.max(0, c - o);
      const sold = Math.max(0, gross - tQty);
      if (n.fuelType === "petrol") { petrol += sold; petrolTesting += tQty; }
      else { diesel += sold; dieselTesting += tQty; }
    }
    return { petrol, diesel, petrolTesting, dieselTesting };
  }, [nozzles, openingReadings, closingReadings, testingQty]);

  const expectedValue = liveVolumes.petrol * PETROL_PRICE + liveVolumes.diesel * DIESEL_PRICE;
  const variance = collectionTotals.total - expectedValue;

  // ── Daily Activity state ───────────────────────────────────────────────────────────────────────────────────────
  const [activityDate, setActivityDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());
  const { data: activityReport, isLoading: activityLoading } = trpc.nozzle.getDailyActivityReport.useQuery(
    { reportDate: activityDate },
    { refetchInterval: 30_000 }
  );
  const { data: recentData } = trpc.nozzle.getRecentDailyActivity.useQuery({ days: 14 });
  const chartData = useMemo(() => {
    if (!recentData) return [];
    return recentData.map((d: any) => ({
      date: d.date.slice(5),
      petrol: Number(d.totalPetrol.toFixed(1)),
      diesel: Number(d.totalDiesel.toFixed(1)),
      collected: d.totalCollected,
    }));
  }, [recentData]);
  function toggleSession(id: number) {
    setExpandedSessions(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  function prevActivityDay() { setActivityDate(d => format(subDays(new Date(d), 1), "yyyy-MM-dd")); }
  function nextActivityDay() { const next = addDays(new Date(activityDate), 1); if (next <= new Date()) setActivityDate(format(next, "yyyy-MM-dd")); }
  const isActivityToday = activityDate === format(new Date(), "yyyy-MM-dd");
  const hasActivityData = activityReport && activityReport.sessionCount > 0;

  // ── Render ───────────────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 w-full max-w-3xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
            <Fuel className="w-5 h-5 text-primary" /> Nozzle Entry & Daily Activity
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Shift entry · Meter readings · Collections · Daily activity report</p>
        </div>
        {sessionId && (
          <Badge variant="outline" className="text-green-400 border-green-500/30 bg-green-500/10 text-xs">
            Session #{sessionId} Active
          </Badge>
        )}
      </div>

      {/* ===== SECTION 1: NOZZLE ENTRY ===== */}
      <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Log meter readings & collections — {shiftDate && /^\d{4}-\d{2}-\d{2}$/.test(shiftDate) ? format(new Date(shiftDate + "T00:00:00"), "dd MMM yyyy") : "—"}
            </p>
          </div>
          <StepBar current={step} />

          {/* ── Step 0: Staff & Shift ───────────────────────────────────────────────────── */}
          {step === 0 && (
            <Card className="bg-card border-border/50">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Select Staff & Shift
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Shift Date</Label>
              <Input
                type="date"
                value={shiftDate}
                onChange={e => setShiftDate(e.target.value || TODAY)}
                className="bg-secondary border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Staff Member</Label>
              <Select
                value={selectedEmployee ? String(selectedEmployee) : ""}
                onValueChange={v => setSelectedEmployee(Number(v))}
              >
                <SelectTrigger className="bg-secondary border-border/50">
                  <SelectValue placeholder="Select staff member..." />
                </SelectTrigger>
                <SelectContent>
                  {staffList?.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name} <span className="text-muted-foreground ml-1 text-xs">({s.role})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Shift</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["morning", "full_day", "evening"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setShiftLabel(s)}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all
                      ${shiftLabel === s ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border/50 text-muted-foreground hover:border-primary/50"}`}
                  >
                    {s === "morning" ? "☀️ Morning" : s === "evening" ? "🌙 Evening" : "🔄 Full Day"}
                  </button>
                ))}
              </div>
            </div>
            <Button
              className="w-full mt-2"
              onClick={handleStartShift}
              disabled={startShift.isPending || !selectedEmployee}
            >
              {startShift.isPending ? "Starting..." : "Start Shift"} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Step 1: Opening Readings (READ-ONLY — auto from previous shift closing) ── */}
      {step === 1 && nozzles && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gauge className="w-4 h-4 text-primary" /> Opening Meter Readings
            </CardTitle>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
                <CheckCircle2 className="w-3 h-3" /> Auto-filled from previous shift
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Opening readings are carried over automatically from the previous shift's closing. No entry needed.</p>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            {nozzles.map(nozzle => {
              const c = fuelColor(nozzle.fuelType);
              const prev = prevClosingMap[nozzle.id];
              const hasPrev = prev?.reading != null;
              return (
                <div key={nozzle.id} className={`p-4 rounded-xl border ${c.bg} ${c.border}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Fuel className={`w-4 h-4 ${c.text}`} />
                      <span className="text-sm font-semibold">{nozzle.label}</span>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.badge}`}>
                      {nozzle.fuelType.toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Opening Reading (Litres)</p>
                    <div className="flex items-center justify-between">
                      {hasPrev ? (
                        <p className="text-xl font-bold tabular-nums">
                          {prev.reading!.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <span className="text-sm font-normal text-muted-foreground ml-1">L</span>
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No previous record — will default to 0</p>
                      )}
                      {hasPrev && prev.date && (
                        <span className="text-[10px] text-muted-foreground/60 bg-muted/30 px-2 py-0.5 rounded-full">
                          from {prev.date}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveOpeningReadings}
                disabled={saveReading.isPending}
              >
                {saveReading.isPending ? "Confirming..." : "Confirm & Continue"} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* ── Step 3: Collections ───────────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Live totals bar — 3 modes */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Cash", value: collectionTotals.cash, color: "text-green-400 bg-green-500/10 border-green-500/20" },
              { label: "Digital", value: collectionTotals.digital, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
              { label: "Credit", value: collectionTotals.credit, color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
            ].map(item => (
              <div key={item.label} className={`p-3 rounded-xl border text-center ${item.color}`}>
                <p className="text-[10px] font-medium mb-0.5">{item.label}</p>
                <p className="text-sm font-bold tabular-nums">{fmtCompact(item.value)}</p>
                <p className="text-[9px] text-muted-foreground/60 tabular-nums">{fmtFull(item.value)}</p>
              </div>
            ))}
          </div>

          {/* Add collection form */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> Add Collection Entry
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-3">

              {/* Nozzle selection — mandatory tap buttons */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nozzle <span className="text-red-400">*</span></Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {nozzles?.map(n => {
                    const c = fuelColor(n.fuelType);
                    return (
                      <button
                        key={n.id}
                        onClick={() => setCollNozzle(String(n.id))}
                        className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5
                          ${collNozzle === String(n.id) ? `${c.bg} ${c.border} ${c.text}` : "bg-secondary border-border/50 text-muted-foreground hover:border-primary/40"}`}
                      >
                        <Fuel className="w-3 h-3" />{n.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label className="text-xs">Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={collAmount}
                  onChange={e => setCollAmount(e.target.value)}
                  className="bg-secondary border-border/50 tabular-nums text-lg font-semibold"
                />
              </div>

              {/* Payment mode — 3 large tap buttons */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Payment Mode</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { mode: "cash" as const, label: "Cash", icon: "💵" },
                    { mode: "digital" as const, label: "Digital", icon: "📱" },
                    { mode: "credit" as const, label: "Credit", icon: "📋" },
                  ]).map(({ mode, label, icon }) => (
                    <button
                      key={mode}
                      onClick={() => setCollMode(mode)}
                      className={`py-3 px-2 rounded-xl border text-xs font-semibold transition-all flex flex-col items-center gap-1
                        ${collMode === mode ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border/50 text-muted-foreground hover:border-primary/40"}`}
                    >
                      <span className="text-base">{icon}</span>{label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Digital sub-type — shown only when Digital is selected */}
              {collMode === "digital" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Digital Payment Type</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1">
                    {([
                      { sub: "upi" as const, label: "UPI" },
                      { sub: "phonepe" as const, label: "PhonePe" },
                      { sub: "card" as const, label: "Card" },
                      { sub: "bank_transfer" as const, label: "Bank" },
                      { sub: "bhim" as const, label: "BHIM" },
                    ]).map(({ sub, label }) => (
                      <button
                        key={sub}
                        onClick={() => setCollDigitalSub(sub)}
                        className={`py-1.5 px-1 rounded-lg border text-[10px] font-medium transition-all
                          ${collDigitalSub === sub ? "bg-blue-500/20 text-blue-300 border-blue-500/40" : "bg-secondary border-border/50 text-muted-foreground hover:border-blue-500/30"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {collMode === "credit" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Customer Name</Label>
                  <Input
                    placeholder="Customer name..."
                    value={collCustomer}
                    onChange={e => setCollCustomer(e.target.value)}
                    className="bg-secondary border-border/50"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Notes (optional)</Label>
                <Input
                  placeholder="Any notes..."
                  value={collNotes}
                  onChange={e => setCollNotes(e.target.value)}
                  className="bg-secondary border-border/50"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleAddCollection}
                disabled={addCollection.isPending}
              >
                <Plus className="w-4 h-4 mr-1" />
                {addCollection.isPending ? "Adding..." : "Add Collection"}
              </Button>
            </CardContent>
          </Card>

          {/* Collection log */}
          {collections && collections.length > 0 && (
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>Collection Log ({collections.length})</span>
                  <span className="text-primary font-bold tabular-nums">{fmtCompact(collectionTotals.total)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-2 max-h-64 overflow-y-auto">
                {collections.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${modeColor(c.paymentMode)}`}>
                          {modeLabel(c.paymentMode, c.digitalSubType)}
                        </span>
                        {c.nozzleId && nozzles && (
                          <span className="text-[9px] text-muted-foreground/60 px-1">
                            {nozzles.find((n: any) => n.id === c.nozzleId)?.label ?? ""}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold tabular-nums">
                          ₹{Number(c.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                        {c.customerName && <p className="text-[10px] text-muted-foreground">{c.customerName}</p>}
                        {c.notes && <p className="text-[10px] text-muted-foreground/60">{c.notes}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteCollection.mutate({ id: c.id })}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button className="flex-1" onClick={() => setStep(4)}>
              Review & Close <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Closing Readings ──────────────────────────────────────── */}
      {step === 2 && nozzles && (
        <div className="space-y-4">
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Gauge className="w-4 h-4 text-primary" /> Closing Meter Readings
              </CardTitle>
              <p className="text-xs text-muted-foreground">Enter closing meter reading & testing quantity for each nozzle</p>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              {nozzles.map(nozzle => {
                const col = fuelColor(nozzle.fuelType);
                const opening = Number(openingReadings[nozzle.id] ?? 0);
                const closing = Number(closingReadings[nozzle.id] ?? 0);
                const tQty = Number(testingQty[nozzle.id] ?? 0);
                const gross = closing > opening ? closing - opening : 0;
                const soldQty = Math.max(0, gross - tQty);
                const rate = nozzle.fuelType === "petrol" ? PETROL_PRICE : DIESEL_PRICE;
                const salesAmt = soldQty * rate;
                return (
                  <div key={nozzle.id} className={`p-4 rounded-xl border ${col.bg} ${col.border}`}>
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Fuel className={`w-4 h-4 ${col.text}`} />
                        <span className="text-sm font-semibold">{nozzle.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase ${col.badge}`}>
                          {nozzle.fuelType}
                        </span>
                      </div>
                      {nozzle.pumpLabel && (
                        <span className="text-[10px] text-muted-foreground">{nozzle.pumpLabel}</span>
                      )}
                    </div>

                    {/* Opening (read-only) */}
                    <div className="mb-3 p-2.5 rounded-lg bg-muted/30 border border-border/30">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Opening Reading (Previous Shift Closing)</p>
                      <p className="text-base font-bold tabular-nums">{opening > 0 ? opening.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"} L</p>
                    </div>

                    {/* Closing input */}
                    <div className="space-y-1 mb-3">
                      <Label className="text-xs font-medium">Closing Meter Reading (Litres) <span className="text-destructive">*</span></Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={opening > 0 ? `Min: ${opening.toFixed(2)}` : "e.g. 125430.50"}
                        value={closingReadings[nozzle.id] ?? ""}
                        onChange={e => setClosingReadings(prev => ({ ...prev, [nozzle.id]: e.target.value }))}
                        className="bg-background/50 border-border/50 tabular-nums text-lg font-semibold h-12"
                      />
                    </div>

                    {/* Testing qty input */}
                    <div className="space-y-1 mb-3">
                      <Label className="text-xs font-medium text-muted-foreground">Testing / Calibration Quantity (Litres)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={testingQty[nozzle.id] ?? ""}
                        onChange={e => setTestingQty(prev => ({ ...prev, [nozzle.id]: e.target.value }))}
                        className="bg-background/50 border-border/50 tabular-nums"
                      />
                    </div>

                    {/* Live calculation */}
                    {closing > 0 && closing >= opening && (
                      <div className={`mt-2 p-3 rounded-lg border ${col.bg} ${col.border} grid grid-cols-3 gap-2 text-center`}>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Gross Dispensed</p>
                          <p className={`text-sm font-bold tabular-nums ${col.text}`}>{gross.toFixed(2)} L</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Sold Qty</p>
                          <p className={`text-sm font-bold tabular-nums ${col.text}`}>{soldQty.toFixed(2)} L</p>
                          {tQty > 0 && <p className="text-[9px] text-muted-foreground">−{tQty.toFixed(2)} L testing</p>}
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Sales Amount</p>
                          <p className={`text-sm font-bold tabular-nums ${col.text}`}>₹{salesAmt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                          <p className="text-[9px] text-muted-foreground">@ ₹{rate}/L</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Daily totals preview */}
          {(liveVolumes.petrol > 0 || liveVolumes.diesel > 0) && (
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-2 pt-3 px-5">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shift Totals Preview</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
                    <p className="text-[10px] text-muted-foreground">Petrol Sold</p>
                    <p className="text-lg font-bold text-teal-400 tabular-nums">{liveVolumes.petrol.toFixed(2)} L</p>
                    <p className="text-xs text-teal-300 tabular-nums">₹{(liveVolumes.petrol * PETROL_PRICE).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                    {liveVolumes.petrolTesting > 0 && <p className="text-[9px] text-muted-foreground">Testing: {liveVolumes.petrolTesting.toFixed(2)} L</p>}
                  </div>
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-[10px] text-muted-foreground">Diesel Sold</p>
                    <p className="text-lg font-bold text-blue-400 tabular-nums">{liveVolumes.diesel.toFixed(2)} L</p>
                    <p className="text-xs text-blue-300 tabular-nums">₹{(liveVolumes.diesel * DIESEL_PRICE).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                    {liveVolumes.dieselTesting > 0 && <p className="text-[9px] text-muted-foreground">Testing: {liveVolumes.dieselTesting.toFixed(2)} L</p>}
                  </div>
                </div>
                <div className={`p-3 rounded-xl border ${Math.abs(variance) < 500 ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"} flex items-center justify-between`}>
                  <div>
                    <p className="text-xs text-muted-foreground">Expected Sales</p>
                    <p className="text-base font-bold tabular-nums">{fmtCompact(expectedValue)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Collected</p>
                    <p className="text-base font-bold tabular-nums">{fmtCompact(collectionTotals.total)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Variance</p>
                    <p className={`text-base font-bold tabular-nums ${Math.abs(variance) < 500 ? "text-green-400" : "text-red-400"}`}>
                      {variance >= 0 ? "+" : ""}{fmtCompact(variance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button
              className="flex-1"
              onClick={handleSaveClosingReadings}
              disabled={saveReading.isPending}
            >
              {saveReading.isPending ? "Saving..." : "Add Collections"} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

       {/* ── Step 4: Summary & Close ─────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-4">
          {/* Per-nozzle sales breakdown */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Gauge className="w-4 h-4 text-primary" /> Nozzle-wise Sales Breakdown
              </CardTitle>
              <p className="text-xs text-muted-foreground">Sold Qty = Closing − Opening − Testing</p>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[420px]">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-2 text-muted-foreground font-medium">Nozzle</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Opening</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Closing</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Testing</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Sold Qty</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Rate</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nozzles?.map(n => {
                      const opening = Number(openingReadings[n.id] ?? 0);
                      const closing = Number(closingReadings[n.id] ?? 0);
                      const tQty = Number(testingQty[n.id] ?? 0);
                      const gross = Math.max(0, closing - opening);
                      const soldQty = Math.max(0, gross - tQty);
                      const rate = n.fuelType === "petrol" ? PETROL_PRICE : DIESEL_PRICE;
                      const amt = soldQty * rate;
                      const col = fuelColor(n.fuelType);
                      return (
                        <tr key={n.id} className="border-b border-border/20 last:border-0">
                          <td className="py-2">
                            <div className="flex items-center gap-1.5">
                              <Fuel className={`w-3 h-3 ${col.text}`} />
                              <span className="font-medium">{n.label}</span>
                            </div>
                            {n.pumpLabel && <p className="text-[10px] text-muted-foreground ml-4.5">{n.pumpLabel}</p>}
                          </td>
                          <td className="text-right tabular-nums py-2">{opening > 0 ? opening.toFixed(2) : "—"}</td>
                          <td className="text-right tabular-nums py-2">{closing > 0 ? closing.toFixed(2) : "—"}</td>
                          <td className="text-right tabular-nums py-2 text-muted-foreground">{tQty > 0 ? tQty.toFixed(2) : "—"}</td>
                          <td className={`text-right tabular-nums py-2 font-bold ${col.text}`}>{soldQty > 0 ? soldQty.toFixed(2) : "—"}</td>
                          <td className="text-right tabular-nums py-2 text-muted-foreground">₹{rate}</td>
                          <td className="text-right tabular-nums py-2 font-bold">{amt > 0 ? `₹${amt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border/50 bg-muted/20">
                      <td colSpan={4} className="py-2 font-bold text-xs">Total</td>
                      <td className="text-right tabular-nums py-2 font-bold">
                        <span className="text-teal-400">{liveVolumes.petrol.toFixed(2)}L P</span>
                        {" + "}
                        <span className="text-blue-400">{liveVolumes.diesel.toFixed(2)}L D</span>
                      </td>
                      <td />
                      <td className="text-right tabular-nums py-2 font-bold text-primary">₹{expectedValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Fuel totals by type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
              <Fuel className="w-4 h-4 text-teal-400 mb-1" />
              <p className="text-xs text-muted-foreground">Petrol Sold</p>
              <p className="text-xl font-bold text-teal-400 tabular-nums">{liveVolumes.petrol.toFixed(2)} L</p>
              <p className="text-xs text-teal-300 tabular-nums">₹{(liveVolumes.petrol * PETROL_PRICE).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
              {liveVolumes.petrolTesting > 0 && <p className="text-[10px] text-muted-foreground mt-1">Testing: {liveVolumes.petrolTesting.toFixed(2)} L</p>}
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Fuel className="w-4 h-4 text-blue-400 mb-1" />
              <p className="text-xs text-muted-foreground">Diesel Sold</p>
              <p className="text-xl font-bold text-blue-400 tabular-nums">{liveVolumes.diesel.toFixed(2)} L</p>
              <p className="text-xs text-blue-300 tabular-nums">₹{(liveVolumes.diesel * DIESEL_PRICE).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
              {liveVolumes.dieselTesting > 0 && <p className="text-[10px] text-muted-foreground mt-1">Testing: {liveVolumes.dieselTesting.toFixed(2)} L</p>}
            </div>
          </div>

          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Shift Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">

              {/* Collections — Cash / Digital / Credit */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Collections by Payment Mode</p>
                <div className="space-y-2">
                  {[
                    { label: "Cash", value: collectionTotals.cash, color: "text-green-400", icon: "💵" },
                    { label: "Digital (UPI / PhonePe / Card / Bank / BHIM)", value: collectionTotals.digital, color: "text-blue-400", icon: "📱" },
                    { label: "Credit Sales", value: collectionTotals.credit, color: "text-orange-400", icon: "📋" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <span>{item.icon}</span>{item.label}
                      </span>
                      <div className="text-right">
                        <span className={`text-sm font-semibold tabular-nums ${item.color}`}>{fmtCompact(item.value)}</span>
                        <p className="text-[10px] text-muted-foreground/50 tabular-nums">{fmtFull(item.value)}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-bold">Total Collected</span>
                    <div className="text-right">
                      <span className="text-base font-bold text-primary tabular-nums">{fmtCompact(collectionTotals.total)}</span>
                      <p className="text-[10px] text-muted-foreground/50 tabular-nums">{fmtFull(collectionTotals.total)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Per-nozzle cash breakdown */}
              {collections && collections.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cash by Nozzle</p>
                  <div className="space-y-1.5">
                    {nozzles?.map(n => {
                      const nozzleCash = collections
                        .filter((c: any) => c.nozzleId === n.id && c.paymentMode === "cash")
                        .reduce((sum: number, c: any) => sum + Number(c.amount), 0);
                      const nozzleDigital = collections
                        .filter((c: any) => c.nozzleId === n.id && c.paymentMode === "digital")
                        .reduce((sum: number, c: any) => sum + Number(c.amount), 0);
                      const nozzleCredit = collections
                        .filter((c: any) => c.nozzleId === n.id && c.paymentMode === "credit")
                        .reduce((sum: number, c: any) => sum + Number(c.amount), 0);
                      const fc = fuelColor(n.fuelType);
                      return (
                        <div key={n.id} className={`p-3 rounded-xl border ${fc.bg} ${fc.border}`}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Fuel className={`w-3.5 h-3.5 ${fc.text}`} />
                            <span className={`text-xs font-semibold ${fc.text}`}>{n.label}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-[9px] text-muted-foreground">Cash</p>
                              <p className="text-xs font-bold text-green-400 tabular-nums">{fmtCompact(nozzleCash)}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-muted-foreground">Digital</p>
                              <p className="text-xs font-bold text-blue-400 tabular-nums">{fmtCompact(nozzleDigital)}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-muted-foreground">Credit</p>
                              <p className="text-xs font-bold text-orange-400 tabular-nums">{fmtCompact(nozzleCredit)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Variance */}
              <div className={`p-4 rounded-xl border ${Math.abs(variance) < 500 ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                <div className="flex items-center gap-2 mb-2">
                  {Math.abs(variance) < 500
                    ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                    : <AlertCircle className="w-4 h-4 text-red-400" />}
                  <span className={`text-sm font-semibold ${Math.abs(variance) < 500 ? "text-green-400" : "text-red-400"}`}>
                    {Math.abs(variance) < 500 ? "Balanced" : "Discrepancy Detected"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Expected</p>
                    <p className="font-bold tabular-nums">{fmtCompact(expectedValue)}</p>
                    <p className="text-[9px] text-muted-foreground/50 tabular-nums">{fmtFull(expectedValue)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Collected</p>
                    <p className="font-bold tabular-nums">{fmtCompact(collectionTotals.total)}</p>
                    <p className="text-[9px] text-muted-foreground/50 tabular-nums">{fmtFull(collectionTotals.total)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Variance</p>
                    <p className={`font-bold tabular-nums ${Math.abs(variance) < 500 ? "text-green-400" : "text-red-400"}`}>
                      {variance >= 0 ? "+" : ""}{fmtCompact(variance)}
                    </p>
                    <p className="text-[9px] text-muted-foreground/50 tabular-nums">
                      {variance >= 0 ? "+" : ""}{fmtFull(Math.abs(variance))}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                Closing the shift will automatically update today's daily report with petrol/diesel volumes and collection figures. The Reconciliation page will be pre-filled with this data.
              </p>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleCloseShift}
                  disabled={closeShift.isPending || closeShift.isSuccess}
                >
                  {closeShift.isPending ? "Closing..." : closeShift.isSuccess ? "✓ Shift Closed" : "Close Shift & Submit"}
                </Button>
              </div>

              {closeShift.isSuccess && (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-green-400">Shift Closed Successfully</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Daily report updated. Incharge can now complete reconciliation.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setStep(0);
                      setSessionId(null);
                      setOpeningReadings({});
                      setClosingReadings({});
                      setCollAmount("");
                    }}
                  >
                    Start New Shift
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      </div>

      {/* ===== SECTION 2: DAILY ACTIVITY REPORT ===== */}
      <div className="border-t border-border/40 pt-6 space-y-4">
          {/* Date navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" /> Daily Activity Report
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Auto-populated from nozzle sessions · refreshes every 30s</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={prevActivityDay}>
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
              <Input
                type="date"
                className="bg-secondary border-border/50 h-8 text-sm w-36"
                value={activityDate}
                max={format(new Date(), "yyyy-MM-dd")}
                onChange={e => setActivityDate(e.target.value)}
              />
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={nextActivityDay} disabled={isActivityToday}>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
              {isActivityToday && <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">Today</Badge>}
            </div>
          </div>

          {/* No data state */}
          {!activityLoading && !hasActivityData && (
            <Card className="bg-card border-border/50">
              <CardContent className="py-12 text-center">
                <Fuel className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium text-muted-foreground">No nozzle sessions recorded for {activityDate}</p>
                <p className="text-xs text-muted-foreground mt-1">Data appears here automatically when staff complete nozzle entries</p>
              </CardContent>
            </Card>
          )}

          {/* KPI Strip */}
          {hasActivityData && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="bg-card border-border/50">
                  <CardContent className="p-4">
                    <div className="w-9 h-9 rounded-lg border border-teal-500/20 bg-teal-500/10 flex items-center justify-center mb-3">
                      <Droplets className="w-4 h-4 text-teal-400" />
                    </div>
                    <p className="text-lg font-bold tabular-nums text-teal-400">{fmtL(activityReport.totalPetrolLitres)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Petrol Sold</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/50">
                  <CardContent className="p-4">
                    <div className="w-9 h-9 rounded-lg border border-blue-500/20 bg-blue-500/10 flex items-center justify-center mb-3">
                      <Droplets className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-lg font-bold tabular-nums text-blue-400">{fmtL(activityReport.totalDieselLitres)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Diesel Sold</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/50">
                  <CardContent className="p-4">
                    <div className="w-9 h-9 rounded-lg border border-green-500/20 bg-green-500/10 flex items-center justify-center mb-3">
                      <Wallet className="w-4 h-4 text-green-400" />
                    </div>
                    <p className="text-lg font-bold tabular-nums text-green-400">{fmtCompact(activityReport.totalCash)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Cash Collected</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/50">
                  <CardContent className="p-4">
                    <div className="w-9 h-9 rounded-lg border border-primary/20 bg-primary/10 flex items-center justify-center mb-3">
                      <TrendingUp className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-lg font-bold tabular-nums text-primary">{fmtCompact(activityReport.totalCollected)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Total Collected</p>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Breakdown + Sessions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="bg-card border-border/50">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-semibold">Payment Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2">
                    <div className="flex items-center justify-between py-1.5 border-b border-border/20">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                          <Wallet className="w-3.5 h-3.5 text-green-400" />
                        </div>
                        <span className="text-sm">Cash</span>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-green-400">{fmtINR(activityReport.totalCash)}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-border/20">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                          <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <span className="text-sm">Digital</span>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-blue-400">{fmtINR(activityReport.totalDigital)}</span>
                    </div>
                    {Object.entries(activityReport.digitalBreakdown ?? {}).filter(([, v]) => (v as number) > 0).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between pl-9 py-0.5">
                        <span className="text-xs text-muted-foreground">{DIGITAL_LABELS[k] ?? k}</span>
                        <span className="text-xs tabular-nums text-blue-300">{fmtINR(v as number)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                          <CreditCard className="w-3.5 h-3.5 text-orange-400" />
                        </div>
                        <span className="text-sm">Credit</span>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-orange-400">{fmtINR(activityReport.totalCredit)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border/50">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-semibold">Sessions</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-3 rounded-lg bg-secondary/40">
                        <p className="text-xl font-bold tabular-nums">{activityReport.sessionCount}</p>
                        <p className="text-[10px] text-muted-foreground">Total</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-green-500/10">
                        <p className="text-2xl font-bold text-green-400">{activityReport.closedSessions}</p>
                        <p className="text-[10px] text-muted-foreground">Closed</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-teal-500/10">
                        <p className="text-2xl font-bold text-teal-400">{activityReport.openSessions}</p>
                        <p className="text-[10px] text-muted-foreground">Open</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Total Litres Dispensed</span>
                        <span className="font-semibold">{fmtL(activityReport.totalLitres)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Petrol</span>
                        <span className="font-semibold text-teal-400">{fmtL(activityReport.totalPetrolLitres)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Diesel</span>
                        <span className="font-semibold text-blue-400">{fmtL(activityReport.totalDieselLitres)}</span>
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
                  {activityReport.sessions.map((session: any) => {
                    const isExpanded = expandedSessions.has(session.sessionId);
                    return (
                      <div key={session.sessionId} className="rounded-lg border border-border/40 overflow-hidden">
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
                            <p className="text-xs font-bold tabular-nums">{fmtINR(session.totalCollected)}</p>
                            <p className="text-[10px] text-muted-foreground">{fmtL(session.totalPetrolLitres + session.totalDieselLitres)}</p>
                          </div>
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                        </button>
                        {isExpanded && (
                          <div className="border-t border-border/30 bg-secondary/20 px-3 py-3 space-y-2">
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
                              </div>
                            ))}
                            <div className="flex justify-between text-xs pt-1 border-t border-border/20">
                              <span className="text-muted-foreground">Session Total</span>
                              <div className="flex gap-3">
                                <span className="text-green-400">Cash: {fmtINR(session.totalCash)}</span>
                                <span className="text-blue-400">Digital: {fmtINR(session.totalDigital)}</span>
                                {session.totalCredit > 0 && <span className="text-orange-400">Credit: {fmtINR(session.totalCredit)}</span>}
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
                  <TrendingUp className="w-4 h-4 text-primary" /> 14-Day Volume Trend
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
    </div>
  );
}
