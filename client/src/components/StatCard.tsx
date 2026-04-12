/**
 * StatCard — Reusable KPI card with:
 *   • Compact primary value  (e.g. ₹1.00Cr or 271.1KL)
 *   • Full exact secondary   (e.g. ₹1,00,03,078.05 or 2,71,051.35 L)  — dims until hover
 *   • Optional trend badge
 *   • Optional icon
 */
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { fmtFull, fmtVolFull } from "@/lib/format";

interface StatCardProps {
  /** Compact display value, e.g. "₹1.00Cr" or "271.1KL" */
  value: string;
  /** Raw numeric value — used to render the full exact monetary amount below */
  rawValue?: number;
  /** Whether rawValue is a monetary amount (adds ₹ formatting). Default true. */
  isCurrency?: boolean;
  /** Raw volume in litres — shows full Indian-formatted volume as subtitle (e.g. 2,71,051.35 L) */
  rawVolume?: number;
  /** Card label, e.g. "Total Sales" */
  label: string;
  /** Sub-label, e.g. "Mar 2026" */
  sub?: string;
  /** Lucide icon component */
  icon?: React.ElementType;
  /** Trend direction for badge */
  trend?: "up" | "down";
  /** Trend badge text, e.g. "+8.2%" */
  trendVal?: string;
  /** Tailwind colour classes for icon box: text + bg + border */
  colorClass?: string;
  /** Inline colour for icon (alternative to colorClass) */
  color?: string;
}

export function StatCard({
  value,
  rawValue,
  isCurrency = true,
  rawVolume,
  label,
  sub,
  icon: Icon,
  trend,
  trendVal,
  colorClass,
  color,
}: StatCardProps) {
  const fullAmt =
    rawValue !== undefined && isCurrency
      ? fmtFull(rawValue)
      : rawVolume !== undefined
      ? fmtVolFull(rawVolume)
      : null;

  const iconStyle = color
    ? { background: `${color}20`, border: `1px solid ${color}40` }
    : undefined;
  const iconColorStyle = color ? { color } : undefined;

  return (
    <Card className="group bg-card border-border/50 cursor-default">
      <CardContent className="p-5">
        {/* Top row: icon + trend badge */}
        <div className="flex items-start justify-between mb-3">
          {Icon ? (
            <div
              className={`w-9 h-9 rounded-lg border flex items-center justify-center ${colorClass ?? ""}`}
              style={iconStyle}
            >
              <Icon className="w-4 h-4" style={iconColorStyle} />
            </div>
          ) : (
            <div />
          )}
          {trend && trendVal && (
            <div
              className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                trend === "up"
                  ? "text-green-400 bg-green-500/10"
                  : "text-red-400 bg-red-500/10"
              }`}
            >
              {trend === "up" ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {trendVal}
            </div>
          )}
        </div>

        {/* Primary compact value */}
        <p className="text-2xl font-bold tabular-nums tracking-tight">
          {value}
        </p>

        {/* Full exact amount — faint, brightens on card hover */}
        {fullAmt && (
          <p className="text-[11px] tabular-nums text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors duration-150 mt-0.5">
            {fullAmt}
          </p>
        )}

        {/* Label */}
        <p className="text-xs font-medium text-foreground mt-0.5">{label}</p>

        {/* Sub-label */}
        {sub && (
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}
