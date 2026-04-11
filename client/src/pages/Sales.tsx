import { Fuel } from "lucide-react";

export default function Sales() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Fuel className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Sales & Nozzles</h2>
          <p className="text-sm text-muted-foreground">Daily sales recording by nozzle, product, and payment method</p>
        </div>
      </div>
      <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
        <Fuel className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Module loading...</p>
      </div>
    </div>
  );
}
