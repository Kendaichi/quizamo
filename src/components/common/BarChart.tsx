import { cn } from "@/lib/cn";

type Bar = { label: string; value: number };

type BarChartProps = {
  data: Bar[];
  format?: (value: number) => string;
  height?: number;
  className?: string;
};

// Minimal div-based bar chart — avoids a charting dependency for a few bars.
// Bars use the berry accent; labels/values use theme tokens.
export function BarChart({ data, format = String, height = 160, className }: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className={cn("flex items-stretch gap-2", className)} style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <span className="text-xs font-semibold tabular-nums text-foreground">
            {format(d.value)}
          </span>
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md bg-primary transition-[height] duration-300"
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 3 : 0 }}
              role="img"
              aria-label={`${d.label}: ${format(d.value)}`}
            />
          </div>
          <span className="w-full truncate text-center text-xs text-muted" title={d.label}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}
