import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, ShoppingCart, AlertTriangle, Droplets, Package, CheckCircle, Clock, Truck } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

// Circular gauge SVG component
function CircleGauge({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="oklch(0.22 0.014 240)" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
}

function StockGaugeCard({ product }: { product: any }) {
  const current = Number(product.currentStock ?? 0);
  const min = Number(product.minStockLevel ?? 0);
  const max = Number(product.maxStockLevel ?? 10000);
  const pct = max > min ? Math.min(100, Math.max(0, ((current - min) / (max - min)) * 100)) : 0;
  const isCritical = pct < 15;
  const isLow = pct < 35;
  const color = isCritical ? "#ef4444" : isLow ? "#f59e0b" : "#22c55e";
  const statusText = isCritical ? "Critical" : isLow ? "Low" : "Good";
  const statusBg = isCritical ? "bg-red-500/10 text-red-400 border-red-500/20" : isLow ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-green-500/10 text-green-400 border-green-500/20";

  return (
    <Card className={`bg-card border-border/50 ${isCritical ? "border-red-500/40" : ""}`}>
      <CardContent className="p-4 flex flex-col items-center gap-2">
        <div className="relative w-20 h-20">
          <CircleGauge pct={pct} color={color} size={80} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold tabular-nums leading-none" style={{ color }}>{Math.round(pct)}%</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold leading-tight">{product.name}</p>
          <p className="text-xl font-bold tabular-nums mt-0.5">{current.toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-muted-foreground">{product.unit}</p>
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusBg}`}>{statusText}</span>
        <div className="w-full flex justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
          <span>Min {min.toLocaleString("en-IN")}</span>
          <span>{fmt(Number(product.sellingPrice))}/{product.unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}

const PO_STATUS_META: Record<string, { icon: any; color: string; bg: string }> = {
  delivered: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10" },
  ordered:   { icon: Truck,       color: "text-blue-400",  bg: "bg-blue-500/10"  },
  pending:   { icon: Clock,       color: "text-amber-400", bg: "bg-amber-500/10" },
};

export default function Inventory() {
  const [addOpen, setAddOpen] = useState(false);
  const [poOpen, setPoOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "fuel", unit: "L", currentStock: "", minStockLevel: "", maxStockLevel: "", costPrice: "", sellingPrice: "" });
  const [poForm, setPoForm] = useState({ productId: "", quantityOrdered: "", unitPrice: "", notes: "" });

  const { data: products, refetch } = trpc.inventory.list.useQuery();
  const { data: lowStock } = trpc.inventory.lowStock.useQuery();
  const { data: purchaseOrders } = trpc.inventory.purchaseOrders.useQuery();

  const addProduct = trpc.inventory.addProduct.useMutation({
    onSuccess: () => { toast.success("Product added"); setAddOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const createPO = trpc.inventory.createPurchaseOrder.useMutation({
    onSuccess: () => { toast.success("PO created"); setPoOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const fuelProducts = products?.filter((p: any) => p.category === "fuel") ?? [];
  const lubricants = products?.filter((p: any) => p.category === "lubricant") ?? [];
  const others = products?.filter((p: any) => p.category === "other") ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {lowStock && lowStock.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-semibold text-red-400">{lowStock.length} low stock</span>
            </div>
          )}
          <span className="text-xs text-muted-foreground">{products?.length ?? 0} products</span>
        </div>
        <div className="flex gap-2">
          <Dialog open={poOpen} onOpenChange={setPoOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                <ShoppingCart className="w-3.5 h-3.5" /> PO
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border/50">
              <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="px-3 py-2 rounded-lg bg-primary/5 border border-primary/15 text-xs">
                  <p className="font-semibold text-primary">Indian Oil Corporation</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Product</Label>
                  <Select onValueChange={v => setPoForm(f => ({ ...f, productId: v }))}>
                    <SelectTrigger className="bg-secondary border-border/50 h-8 text-sm"><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>{products?.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Quantity</Label>
                    <Input placeholder="5000" className="bg-secondary border-border/50 h-8 text-sm" value={poForm.quantityOrdered} onChange={e => setPoForm(f => ({ ...f, quantityOrdered: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Unit Price (₹)</Label>
                    <Input placeholder="95.50" className="bg-secondary border-border/50 h-8 text-sm" value={poForm.unitPrice} onChange={e => setPoForm(f => ({ ...f, unitPrice: e.target.value }))} />
                  </div>
                </div>
                <Button className="w-full h-9" onClick={() => {
                  if (!poForm.productId || !poForm.quantityOrdered || !poForm.unitPrice) { toast.error("Fill all fields"); return; }
                  createPO.mutate({
                    productId: parseInt(poForm.productId),
                    quantityOrdered: poForm.quantityOrdered,
                    unitPrice: poForm.unitPrice,
                    totalAmount: String(parseFloat(poForm.quantityOrdered) * parseFloat(poForm.unitPrice)),
                    orderDate: "2026-03-31",
                    supplier: "Indian Oil Corporation",
                    notes: poForm.notes || undefined,
                  });
                }} disabled={createPO.isPending}>
                  {createPO.isPending ? "Creating..." : "Create PO"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 h-8 text-xs"><Plus className="w-3.5 h-3.5" /> Add</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border/50">
              <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs">Name</Label>
                    <Input placeholder="e.g. Petrol" className="bg-secondary border-border/50 h-8 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Category</Label>
                    <Select defaultValue="fuel" onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger className="bg-secondary border-border/50 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fuel">Fuel</SelectItem>
                        <SelectItem value="lubricant">Lubricant</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Unit</Label>
                    <Select defaultValue="L" onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                      <SelectTrigger className="bg-secondary border-border/50 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L">Litres</SelectItem>
                        <SelectItem value="Kg">Kg</SelectItem>
                        <SelectItem value="Units">Units</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">Current Stock</Label><Input placeholder="0" className="bg-secondary border-border/50 h-8 text-sm" value={form.currentStock} onChange={e => setForm(f => ({ ...f, currentStock: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Min Level</Label><Input placeholder="0" className="bg-secondary border-border/50 h-8 text-sm" value={form.minStockLevel} onChange={e => setForm(f => ({ ...f, minStockLevel: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Cost (₹)</Label><Input placeholder="0" className="bg-secondary border-border/50 h-8 text-sm" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Sell Price (₹)</Label><Input placeholder="0" className="bg-secondary border-border/50 h-8 text-sm" value={form.sellingPrice} onChange={e => setForm(f => ({ ...f, sellingPrice: e.target.value }))} /></div>
                </div>
                <Button className="w-full h-9" onClick={() => {
                  if (!form.name) { toast.error("Name required"); return; }
                  addProduct.mutate({ name: form.name, category: form.category as any, unit: form.unit, currentStock: form.currentStock || "0", minStockLevel: form.minStockLevel || "0", maxStockLevel: form.maxStockLevel || "10000", costPrice: form.costPrice || "0", sellingPrice: form.sellingPrice || "0" });
                }} disabled={addProduct.isPending}>
                  {addProduct.isPending ? "Adding..." : "Add Product"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Fuel Products — large gauge cards */}
      {fuelProducts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Droplets className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fuel</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {fuelProducts.map((p: any) => <StockGaugeCard key={p.id} product={p} />)}
          </div>
        </div>
      )}

      {/* Lubricants */}
      {lubricants.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-green-400" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lubricants</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {lubricants.map((p: any) => <StockGaugeCard key={p.id} product={p} />)}
          </div>
        </div>
      )}

      {/* Others */}
      {others.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Other</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {others.map((p: any) => <StockGaugeCard key={p.id} product={p} />)}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!products || products.length === 0) && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Package className="w-12 h-12 opacity-20" />
          <p className="text-sm">No products yet</p>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}><Plus className="w-3.5 h-3.5 mr-1.5" /> Add first product</Button>
        </div>
      )}

      {/* Purchase Orders */}
      {purchaseOrders && purchaseOrders.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Purchase Orders</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {purchaseOrders.slice(0, 6).map((po: any) => {
              const meta = PO_STATUS_META[po.status] ?? PO_STATUS_META.pending;
              const Icon = meta.icon;
              return (
                <Card key={po.id} className="bg-card border-border/50">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{po.productName ?? "Product"}</p>
                      <p className="text-[10px] text-muted-foreground">{po.orderDate} · {Number(po.quantityOrdered).toLocaleString('en-IN')} {po.productUnit ?? 'units'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold tabular-nums">{fmt(Number(po.totalAmount ?? 0))}</p>
                      <span className={`text-[10px] font-medium ${meta.color}`}>{po.status}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
