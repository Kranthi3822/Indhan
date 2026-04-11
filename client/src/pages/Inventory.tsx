import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Package, AlertTriangle, Plus, TrendingDown, ShoppingCart, Fuel } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function StockBar({ current, min, max }: { current: number; min: number; max: number }) {
  const pct = Math.min(100, Math.max(0, ((current - min) / (max - min)) * 100));
  const color = pct < 20 ? "bg-red-500" : pct < 40 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="w-full bg-secondary rounded-full h-1.5 mt-1">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

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
    onSuccess: () => { toast.success("Purchase order created"); setPoOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const categoryColors: Record<string, string> = {
    fuel: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    lubricant: "text-green-400 bg-green-500/10 border-green-500/20",
    other: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  };

  const fuelProducts = products?.filter((p: any) => p.category === "fuel") ?? [];
  const lubricants = products?.filter((p: any) => p.category === "lubricant") ?? [];
  const others = products?.filter((p: any) => p.category === "other") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventory Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time stock levels, alerts, and purchase orders</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={poOpen} onOpenChange={setPoOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ShoppingCart className="w-4 h-4" /> Purchase Order
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border/50">
              <DialogHeader>
                <DialogTitle>New Purchase Order</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                  <p className="font-medium text-primary">Supplier: Indian Oil Corporation</p>
                  <p className="text-xs text-muted-foreground mt-0.5">All fuel purchases are sourced from IOC</p>
                </div>
                <div className="space-y-2">
                  <Label>Product</Label>
                  <Select onValueChange={v => setPoForm(f => ({ ...f, productId: v }))}>
                    <SelectTrigger className="bg-secondary border-border/50">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input placeholder="e.g. 5000" className="bg-secondary border-border/50" value={poForm.quantityOrdered} onChange={e => setPoForm(f => ({ ...f, quantityOrdered: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Price (₹)</Label>
                    <Input placeholder="e.g. 95.50" className="bg-secondary border-border/50" value={poForm.unitPrice} onChange={e => setPoForm(f => ({ ...f, unitPrice: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input placeholder="Optional notes" className="bg-secondary border-border/50" value={poForm.notes} onChange={e => setPoForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <Button className="w-full" onClick={() => {
                  if (!poForm.productId || !poForm.quantityOrdered || !poForm.unitPrice) { toast.error("Fill all required fields"); return; }
                  const qty = parseFloat(poForm.quantityOrdered);
                  const price = parseFloat(poForm.unitPrice);
                  createPO.mutate({
                    productId: parseInt(poForm.productId),
                    quantityOrdered: poForm.quantityOrdered,
                    unitPrice: poForm.unitPrice,
                    totalAmount: String(qty * price),
                    orderDate: new Date().toISOString().split("T")[0],
                    supplier: "Indian Oil Corporation",
                    notes: poForm.notes || undefined,
                  });
                }} disabled={createPO.isPending}>
                  {createPO.isPending ? "Creating..." : "Create Purchase Order"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border/50">
              <DialogHeader>
                <DialogTitle>Add Product</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2 col-span-2">
                    <Label>Product Name</Label>
                    <Input placeholder="e.g. Petrol" className="bg-secondary border-border/50" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select defaultValue="fuel" onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger className="bg-secondary border-border/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fuel">Fuel</SelectItem>
                        <SelectItem value="lubricant">Lubricant</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select defaultValue="L" onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                      <SelectTrigger className="bg-secondary border-border/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L">Litres (L)</SelectItem>
                        <SelectItem value="Kg">Kilograms (Kg)</SelectItem>
                        <SelectItem value="Units">Units</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Current Stock</Label>
                    <Input placeholder="0" className="bg-secondary border-border/50" value={form.currentStock} onChange={e => setForm(f => ({ ...f, currentStock: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Stock Level</Label>
                    <Input placeholder="0" className="bg-secondary border-border/50" value={form.minStockLevel} onChange={e => setForm(f => ({ ...f, minStockLevel: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cost Price (₹)</Label>
                    <Input placeholder="0" className="bg-secondary border-border/50" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Selling Price (₹)</Label>
                    <Input placeholder="0" className="bg-secondary border-border/50" value={form.sellingPrice} onChange={e => setForm(f => ({ ...f, sellingPrice: e.target.value }))} />
                  </div>
                </div>
                <Button className="w-full" onClick={() => {
                  if (!form.name) { toast.error("Product name required"); return; }
                  addProduct.mutate({
                    name: form.name,
                    category: form.category as any,
                    unit: form.unit,
                    currentStock: form.currentStock || "0",
                    minStockLevel: form.minStockLevel || "0",
                    maxStockLevel: form.maxStockLevel || "10000",
                    costPrice: form.costPrice || "0",
                    sellingPrice: form.sellingPrice || "0",
                  });
                }} disabled={addProduct.isPending}>
                  {addProduct.isPending ? "Adding..." : "Add Product"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStock && lowStock.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/8">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-400">{lowStock.length} product{lowStock.length > 1 ? "s" : ""} below minimum stock level</p>
            <p className="text-xs text-muted-foreground">{lowStock.map((p: any) => p.name).join(", ")}</p>
          </div>
          <Button variant="outline" size="sm" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs">
            Order Now
          </Button>
        </div>
      )}

      {/* Fuel Products */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Fuel className="w-4 h-4 text-amber-400" /> Fuel Products
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {fuelProducts.length > 0 ? fuelProducts.map((p: any) => (
            <Card key={p.id} className="bg-card border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-sm">{p.name}</h4>
                    <p className="text-xs text-muted-foreground">{p.category}</p>
                  </div>
                  <Badge className={`text-[10px] ${Number(p.currentStock) <= Number(p.minStockLevel) ? "bg-red-500/15 text-red-400 border-red-500/20" : "bg-green-500/15 text-green-400 border-green-500/20"}`}>
                    {Number(p.currentStock) <= Number(p.minStockLevel) ? "Low Stock" : "In Stock"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Current</span>
                    <span className="font-bold tabular-nums">{p.currentStock} {p.unit}</span>
                  </div>
                  <StockBar current={Number(p.currentStock)} min={Number(p.minStockLevel)} max={Number(p.maxStockLevel ?? 10000)} />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>Min: {p.minStockLevel} {p.unit}</span>
                    <span>Sell: {fmt(Number(p.sellingPrice))}/{p.unit}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )) : (
            <Card className="bg-card border-border/50 border-dashed col-span-3">
              <CardContent className="p-8 text-center">
                <Fuel className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No fuel products added yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Lubricants */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Package className="w-4 h-4 text-green-400" /> Lubricants
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {lubricants.length > 0 ? lubricants.map((p: any) => (
            <Card key={p.id} className="bg-card border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-sm">{p.name}</h4>
                  <Badge className={`text-[10px] ${Number(p.currentStock) <= Number(p.minStockLevel) ? "bg-red-500/15 text-red-400 border-red-500/20" : "bg-green-500/15 text-green-400 border-green-500/20"}`}>
                    {Number(p.currentStock) <= Number(p.minStockLevel) ? "Low" : "OK"}
                  </Badge>
                </div>
                <p className="text-xl font-bold tabular-nums">{p.currentStock} <span className="text-sm font-normal text-muted-foreground">{p.unit}</span></p>
                <StockBar current={Number(p.currentStock)} min={Number(p.minStockLevel)} max={Number(p.maxStockLevel ?? 100)} />
                <p className="text-[10px] text-muted-foreground mt-1">Min: {p.minStockLevel} {p.unit}</p>
              </CardContent>
            </Card>
          )) : (
            <Card className="bg-card border-border/50 border-dashed col-span-4">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">No lubricants added yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Recent Purchase Orders */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" /> Recent Purchase Orders
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {purchaseOrders && purchaseOrders.length > 0 ? (
            <div className="space-y-2">
              {purchaseOrders.slice(0, 5).map((po: any) => (
                <div key={po.id} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{po.productName ?? "Product"}</p>
                    <p className="text-xs text-muted-foreground">{po.supplier} · {po.orderDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{po.quantityOrdered} units</p>
                    <Badge className={`text-[10px] mt-0.5 ${po.status === "delivered" ? "bg-green-500/15 text-green-400 border-green-500/20" : po.status === "ordered" ? "bg-blue-500/15 text-blue-400 border-blue-500/20" : "bg-amber-500/15 text-amber-400 border-amber-500/20"}`}>
                      {po.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <ShoppingCart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No purchase orders yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
