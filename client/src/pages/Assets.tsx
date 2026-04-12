import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Wrench, AlertTriangle, CheckCircle2, Clock, Plus, Calendar,
  Upload, FileText, Image, Trash2, ChevronDown, ChevronRight,
  Gauge, Shield, Zap, Truck, Building, Camera, Bell, RefreshCw,
  Activity, Package, Settings
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, any> = {
  fuel_dispenser: Gauge,
  underground_tank: Package,
  generator: Zap,
  compressor: Activity,
  weighbridge: Truck,
  fire_safety: Shield,
  cctv_security: Camera,
  vehicle: Truck,
  electrical: Zap,
  civil: Building,
  tools_equipment: Wrench,
  it_equipment: Settings,
  other: Package,
};

const CATEGORY_LABELS: Record<string, string> = {
  fuel_dispenser: "Fuel Dispenser",
  underground_tank: "Underground Tank",
  generator: "Generator",
  compressor: "Compressor",
  weighbridge: "Weighbridge",
  fire_safety: "Fire Safety",
  cctv_security: "CCTV/Security",
  vehicle: "Vehicle",
  electrical: "Electrical",
  civil: "Civil/Structure",
  tools_equipment: "Tools & Equipment",
  it_equipment: "IT Equipment",
  other: "Other",
};

const STATUS_CONFIG = {
  operational:       { label: "Operational",       color: "bg-emerald-600", dot: "bg-emerald-400" },
  under_maintenance: { label: "Under Maintenance",  color: "bg-teal-600",  dot: "bg-teal-400" },
  faulty:            { label: "Faulty",             color: "bg-red-600",    dot: "bg-red-400" },
  decommissioned:    { label: "Decommissioned",     color: "bg-zinc-600",   dot: "bg-zinc-400" },
  standby:           { label: "Standby",            color: "bg-blue-600",   dot: "bg-blue-400" },
};

const FREQ_LABELS: Record<string, string> = {
  daily: "Daily", weekly: "Weekly", monthly: "Monthly",
  quarterly: "Quarterly", half_yearly: "Half-Yearly", annual: "Annual", as_needed: "As Needed",
};

function fmt(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  if (v >= 100000) return `₹${(v/100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v/1000).toFixed(1)}K`;
  return `₹${v.toFixed(0)}`;
}

function daysUntil(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

function HealthBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-teal-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold w-8 text-right">{score}%</span>
    </div>
  );
}

// ─── Add Asset Dialog ─────────────────────────────────────────────────────────
function AddAssetDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "fuel_dispenser", make: "", model: "", serialNo: "",
    location: "Forecourt", purchaseDate: "", purchaseCost: 0,
    warrantyExpiry: "", insuranceExpiry: "", status: "operational",
    healthScore: 100, notes: "",
  });
  const create = trpc.assets.create.useMutation({
    onSuccess: () => { toast.success("Asset added"); setOpen(false); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-black">
          <Plus className="w-4 h-4 mr-1" /> Add Asset
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Asset</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm max-h-[70vh] overflow-y-auto pr-1">
          <div className="col-span-2 sm:col-span-2">
            <Label>Asset Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Petrol Dispenser #1" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({...f, category: v}))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Make</Label><Input value={form.make} onChange={e => setForm(f => ({...f, make: e.target.value}))} placeholder="e.g. Tokheim" /></div>
          <div><Label>Model</Label><Input value={form.model} onChange={e => setForm(f => ({...f, model: e.target.value}))} /></div>
          <div><Label>Serial No.</Label><Input value={form.serialNo} onChange={e => setForm(f => ({...f, serialNo: e.target.value}))} /></div>
          <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} /></div>
          <div><Label>Purchase Date</Label><Input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({...f, purchaseDate: e.target.value}))} /></div>
          <div><Label>Purchase Cost (₹)</Label><Input type="number" value={form.purchaseCost} onChange={e => setForm(f => ({...f, purchaseCost: Number(e.target.value)}))} /></div>
          <div><Label>Warranty Expiry</Label><Input type="date" value={form.warrantyExpiry} onChange={e => setForm(f => ({...f, warrantyExpiry: e.target.value}))} /></div>
          <div><Label>Insurance Expiry</Label><Input type="date" value={form.insuranceExpiry} onChange={e => setForm(f => ({...f, insuranceExpiry: e.target.value}))} /></div>
          <div className="col-span-2">
            <Label>Health Score: {form.healthScore}%</Label>
            <input type="range" min={0} max={100} value={form.healthScore} onChange={e => setForm(f => ({...f, healthScore: Number(e.target.value)}))} className="w-full accent-teal-500" />
          </div>
          <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} /></div>
        </div>
        <Button className="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-black" onClick={() => create.mutate(form as any)} disabled={create.isPending || !form.name}>
          {create.isPending ? "Adding..." : "Add Asset"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Maintenance Log Dialog ───────────────────────────────────────────────
function AddLogDialog({ assetId, onSuccess }: { assetId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    doneDate: new Date().toISOString().slice(0,10),
    maintenanceType: "Routine Service",
    description: "", cost: 0, technician: "", vendor: "",
    invoiceNo: "", status: "completed", nextServiceDate: "", notes: "",
  });
  const create = trpc.assets.createLog.useMutation({
    onSuccess: () => { toast.success("Maintenance log added"); setOpen(false); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-xs h-7">
          <Plus className="w-3 h-3 mr-1" /> Log Maintenance
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Log Maintenance</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><Label>Date *</Label><Input type="date" value={form.doneDate} onChange={e => setForm(f => ({...f, doneDate: e.target.value}))} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Type *</Label><Input value={form.maintenanceType} onChange={e => setForm(f => ({...f, maintenanceType: e.target.value}))} /></div>
          <div className="col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} /></div>
          <div><Label>Cost (₹)</Label><Input type="number" value={form.cost} onChange={e => setForm(f => ({...f, cost: Number(e.target.value)}))} /></div>
          <div><Label>Technician</Label><Input value={form.technician} onChange={e => setForm(f => ({...f, technician: e.target.value}))} /></div>
          <div><Label>Vendor</Label><Input value={form.vendor} onChange={e => setForm(f => ({...f, vendor: e.target.value}))} /></div>
          <div><Label>Invoice No.</Label><Input value={form.invoiceNo} onChange={e => setForm(f => ({...f, invoiceNo: e.target.value}))} /></div>
          <div className="col-span-2"><Label>Next Service Date</Label><Input type="date" value={form.nextServiceDate} onChange={e => setForm(f => ({...f, nextServiceDate: e.target.value}))} /></div>
        </div>
        <Button className="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-black" onClick={() => create.mutate({ assetId, ...form } as any)} disabled={create.isPending}>
          {create.isPending ? "Saving..." : "Save Log"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ─── Evidence Upload ──────────────────────────────────────────────────────────
function EvidenceUpload({ logId, assetId, onSuccess }: { logId: number; assetId: number; onSuccess: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const upload = trpc.assets.getUploadUrl.useMutation({
    onSuccess: () => { toast.success("Evidence uploaded"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10_000_000) { toast.error("File too large (max 10MB)"); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(',')[1];
        const fileType = file.type.startsWith('image/') ? 'image' : 'pdf';
        await upload.mutateAsync({ logId, assetId, fileName: file.name, fileType, fileBase64: base64, fileSizeBytes: file.size });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch { setUploading(false); }
  };

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile} />
      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => fileRef.current?.click()} disabled={uploading}>
        <Upload className="w-3 h-3 mr-1" /> {uploading ? "Uploading..." : "Upload Evidence"}
      </Button>
    </div>
  );
}

// ─── Asset Detail Panel ───────────────────────────────────────────────────────
function AssetDetail({ asset }: { asset: any }) {
  const [expanded, setExpanded] = useState(false);
  const utils = trpc.useUtils();
  const { data: logs = [] } = trpc.assets.listLogs.useQuery({ assetId: asset.id, limit: 10 }, { enabled: expanded });
  const { data: schedules = [] } = trpc.assets.listSchedules.useQuery({ assetId: asset.id }, { enabled: expanded });

  const statusCfg = STATUS_CONFIG[asset.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.operational;
  const Icon = CATEGORY_ICONS[asset.category] ?? Package;
  const warrantyDays = daysUntil(asset.warrantyExpiry);
  const insuranceDays = daysUntil(asset.insuranceExpiry);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Asset header */}
      <button
        className="w-full p-4 flex items-center gap-3 hover:bg-muted/50/30 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="p-2 rounded-lg bg-muted/50">
          <Icon className="w-4 h-4 text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{asset.name}</span>
            <div className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
            <Badge className={`${statusCfg.color} text-xs`}>{statusCfg.label}</Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {CATEGORY_LABELS[asset.category]} {asset.make && `· ${asset.make}`} {asset.model && asset.model} {asset.location && `· ${asset.location}`}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="w-24 hidden md:block">
            <HealthBar score={asset.healthScore ?? 100} />
          </div>
          {warrantyDays !== null && (
            <div className={`hidden md:block ${warrantyDays < 30 ? 'text-red-400' : warrantyDays < 90 ? 'text-teal-400' : 'text-muted-foreground'}`}>
              Warranty {warrantyDays < 0 ? 'expired' : `${warrantyDays}d`}
            </div>
          )}
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Asset info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {[
              ["Serial No.", asset.serialNo],
              ["Purchase Date", asset.purchaseDate],
              ["Purchase Cost", asset.purchaseCost ? fmt(asset.purchaseCost) : null],
              ["Current Value", asset.currentValue ? fmt(asset.currentValue) : null],
              ["Warranty Expiry", asset.warrantyExpiry ? `${asset.warrantyExpiry} ${warrantyDays !== null ? (warrantyDays < 0 ? '(EXPIRED)' : `(${warrantyDays}d)`) : ''}` : null],
              ["Insurance Expiry", asset.insuranceExpiry ? `${asset.insuranceExpiry} ${insuranceDays !== null ? (insuranceDays < 0 ? '(EXPIRED)' : `(${insuranceDays}d)`) : ''}` : null],
            ].filter(([,v]) => v).map(([l, v]) => (
              <div key={l as string}>
                <div className="text-muted-foreground">{l}</div>
                <div className={`font-medium ${(l === 'Warranty Expiry' || l === 'Insurance Expiry') && String(v).includes('EXPIRED') ? 'text-red-400' : ''}`}>{v}</div>
              </div>
            ))}
          </div>

          {/* Maintenance schedules */}
          {schedules.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Maintenance Schedules</div>
              <div className="space-y-1">
                {schedules.map((s: any) => {
                  const due = daysUntil(s.nextDueDate);
                  return (
                    <div key={s.id} className="flex items-center justify-between text-xs bg-muted/50/50 rounded p-2">
                      <span>{s.maintenanceType}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{FREQ_LABELS[s.frequency]}</Badge>
                        {due !== null && (
                          <span className={due < 0 ? 'text-red-400 font-bold' : due < 7 ? 'text-teal-400' : 'text-muted-foreground'}>
                            {due < 0 ? `${Math.abs(due)}d overdue` : due === 0 ? 'Due today' : `Due in ${due}d`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Maintenance logs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Maintenance History</div>
              <AddLogDialog assetId={asset.id} onSuccess={() => utils.assets.listLogs.invalidate({ assetId: asset.id })} />
            </div>
            {logs.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-3">No maintenance logs yet</div>
            ) : (
              <div className="space-y-2">
                {logs.map((log: any) => (
                  <LogRow key={log.id} log={log} assetId={asset.id} onUpdate={() => utils.assets.listLogs.invalidate({ assetId: asset.id })} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Log Row with Evidence ────────────────────────────────────────────────────
function LogRow({ log, assetId, onUpdate }: { log: any; assetId: number; onUpdate: () => void }) {
  const [showEvidence, setShowEvidence] = useState(false);
  const utils = trpc.useUtils();
  const { data: evidence = [] } = trpc.assets.listEvidence.useQuery({ logId: log.id }, { enabled: showEvidence });
  const deleteEvidence = trpc.assets.deleteEvidence.useMutation({
    onSuccess: () => utils.assets.listEvidence.invalidate({ logId: log.id }),
  });

  const statusColor = log.status === 'completed' ? 'text-emerald-400' : log.status === 'partial' ? 'text-teal-400' : 'text-muted-foreground';

  return (
    <div className="bg-muted/50/40 rounded p-3 text-xs space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{log.maintenanceType}</span>
            <span className={statusColor}>{log.status}</span>
            {log.cost > 0 && <span className="text-teal-400">{fmt(log.cost)}</span>}
          </div>
          <div className="text-muted-foreground mt-0.5">
            {log.doneDate} {log.technician && `· ${log.technician}`} {log.vendor && `· ${log.vendor}`}
          </div>
          {log.description && <div className="text-muted-foreground mt-1">{log.description}</div>}
        </div>
        <div className="flex gap-1 shrink-0">
          <Button
            variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground"
            onClick={() => setShowEvidence(e => !e)}
          >
            <FileText className="w-3 h-3 mr-1" /> Evidence
          </Button>
          <EvidenceUpload logId={log.id} assetId={assetId} onSuccess={() => { utils.assets.listEvidence.invalidate({ logId: log.id }); setShowEvidence(true); }} />
        </div>
      </div>
      {showEvidence && (
        <div className="border-t border-border pt-2">
          {evidence.length === 0 ? (
            <div className="text-muted-foreground text-center py-1">No evidence uploaded</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {evidence.map((ev: any) => (
                <div key={ev.id} className="flex items-center gap-1 bg-muted rounded px-2 py-1">
                  {ev.fileType === 'image' ? <Image className="w-3 h-3 text-blue-400" /> : <FileText className="w-3 h-3 text-teal-400" />}
                  <a href={ev.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline max-w-32 truncate">{ev.fileName}</a>
                  <button onClick={() => deleteEvidence.mutate({ id: ev.id })} className="text-zinc-500 hover:text-red-400 ml-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Health Dashboard ─────────────────────────────────────────────────────────
function HealthDashboard() {
  const { data: dashboard } = trpc.assets.healthDashboard.useQuery();
  if (!dashboard) return <div className="text-center text-muted-foreground py-8 text-sm">Loading health data...</div>;

  const { total, byStatus, avgHealth, criticalAssets, upcomingMaintenance } = dashboard as any;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Assets", value: total, color: "text-white" },
          { label: "Operational", value: byStatus?.operational ?? 0, color: "text-emerald-400" },
          { label: "Under Maintenance", value: byStatus?.under_maintenance ?? 0, color: "text-teal-400" },
          { label: "Faulty", value: byStatus?.faulty ?? 0, color: "text-red-400" },
          { label: "Avg Health", value: `${Math.round(avgHealth ?? 0)}%`, color: avgHealth >= 80 ? "text-emerald-400" : avgHealth >= 50 ? "text-teal-400" : "text-red-400" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Critical assets */}
      {criticalAssets?.length > 0 && (
        <Card className="bg-card border-red-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4" /> Critical Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-800">
              {criticalAssets.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{CATEGORY_LABELS[a.category]}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <HealthBar score={a.healthScore ?? 0} />
                    <Badge className={STATUS_CONFIG[a.status as keyof typeof STATUS_CONFIG]?.color ?? 'bg-zinc-600'}>
                      {STATUS_CONFIG[a.status as keyof typeof STATUS_CONFIG]?.label ?? a.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming maintenance */}
      {upcomingMaintenance?.length > 0 && (
        <Card className="bg-card border-teal-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-teal-400">
              <Calendar className="w-4 h-4" /> Upcoming Maintenance (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-800">
              {upcomingMaintenance.map((s: any) => {
                const due = daysUntil(s.nextDueDate);
                return (
                  <div key={s.id} className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <div className="font-medium">{s.assetName}</div>
                      <div className="text-xs text-muted-foreground">{s.maintenanceType} · {FREQ_LABELS[s.frequency]}</div>
                    </div>
                    <div className={`text-xs font-bold ${due !== null && due < 0 ? 'text-red-400' : due !== null && due < 7 ? 'text-teal-400' : 'text-muted-foreground'}`}>
                      {due !== null ? (due < 0 ? `${Math.abs(due)}d overdue` : due === 0 ? 'Due today' : `${due}d`) : s.nextDueDate}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Notifications Panel ──────────────────────────────────────────────────────
function NotificationsPanel() {
  const utils = trpc.useUtils();
  const { data: notifications = [] } = trpc.assets.listNotifications.useQuery({ unreadOnly: false });
  const generate = trpc.assets.generateNotifications.useMutation({
    onSuccess: (data: any) => { toast.success(`${data.generated} notifications generated`); utils.assets.listNotifications.invalidate(); },
  });
  const markRead = trpc.assets.markNotificationRead.useMutation({
    onSuccess: () => utils.assets.listNotifications.invalidate(),
  });
  const dismiss = trpc.assets.dismissNotification.useMutation({
    onSuccess: () => utils.assets.listNotifications.invalidate(),
  });

  const unread = notifications.filter((n: any) => !n.isRead).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-teal-400" />
          <span className="text-sm font-medium">Maintenance Alerts</span>
          {unread > 0 && <Badge className="bg-red-600 text-xs">{unread}</Badge>}
        </div>
        <Button size="sm" variant="outline" onClick={() => generate.mutate()} disabled={generate.isPending} className="text-xs h-7">
          <RefreshCw className="w-3 h-3 mr-1" /> {generate.isPending ? "Generating..." : "Refresh"}
        </Button>
      </div>
      {notifications.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No alerts. Click Refresh to check for upcoming maintenance.
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => {
            const typeColor = n.notificationType === 'overdue' ? 'border-red-800 bg-red-950/20' :
                             n.notificationType === 'due_today' ? 'border-teal-800 bg-teal-950/20' :
                             n.notificationType === 'due_soon' ? 'border-yellow-800 bg-yellow-950/20' :
                             'border-border bg-card';
            return (
              <div key={n.id} className={`border rounded-lg p-3 text-sm ${typeColor} ${n.isRead ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-medium">{n.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{n.message}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!n.isRead && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => markRead.mutate({ id: n.id })}>
                        <CheckCircle2 className="w-3 h-3" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-zinc-500" onClick={() => dismiss.mutate({ id: n.id })}>
                      ×
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Assets() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState("health");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: assetsData, isLoading } = trpc.assets.list.useQuery({
    category: filterCategory === "all" ? undefined : filterCategory,
    status: filterStatus === "all" ? undefined : filterStatus,
  });
  const assets = assetsData?.assets ?? [];
  const { data: notifications = [] } = trpc.assets.listNotifications.useQuery({ unreadOnly: true });
  const unreadCount = notifications.length;

  const seedAssets = trpc.assets.seedPreloaded.useMutation({
    onSuccess: (data: any) => { toast.success(`${data.seeded} standard assets loaded`); utils.assets.list.invalidate(); utils.assets.healthDashboard.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Wrench className="w-5 h-5 text-teal-400" /> Assets & Equipment
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Health · Maintenance · Evidence</p>
        </div>
        <div className="flex items-center gap-2">
          {assets.length === 0 && (
            <Button size="sm" variant="outline" onClick={() => seedAssets.mutate()} disabled={seedAssets.isPending} className="text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> {seedAssets.isPending ? "Loading..." : "Load Standard Assets"}
            </Button>
          )}
          <AddAssetDialog onSuccess={() => { utils.assets.list.invalidate(); utils.assets.healthDashboard.invalidate(); }} />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card">
          <TabsTrigger value="health"><Activity className="w-3.5 h-3.5 mr-1" />Health</TabsTrigger>
          <TabsTrigger value="assets"><Package className="w-3.5 h-3.5 mr-1" />All Assets</TabsTrigger>
          <TabsTrigger value="notifications" className="relative">
            <Bell className="w-3.5 h-3.5 mr-1" />Alerts
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-xs flex items-center justify-center">{unreadCount}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <HealthDashboard />
        </TabsContent>

        <TabsContent value="assets">
          {/* Filters */}
          <div className="flex gap-2 mb-4">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground self-center ml-2">{assets.length} assets</span>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading assets...</div>
          ) : assets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              No assets found. Click "Load Standard Assets" to pre-populate a standard gas station asset list, or add manually.
            </div>
          ) : (
            <div className="space-y-2">
              {assets.map((asset: any) => <AssetDetail key={asset.id} asset={asset} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
