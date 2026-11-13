import { cn } from "@/lib/cn";

type Props = {
  seconds: number;
  /** Fraction of time remaining, 0–100. The ring depletes as it drops. */
  percent: number;
  size?: number;
  width?: number;
  className?: string;
};

/** SVG countdown ring — glass-friendly port of web-quizmosa's CountdownRing. */
export function CountdownRing({ seconds, percent, size = 72, width = 8, className }: Props) {
  const r = (size - width) / 2;
  const circumference = 2 * Math.PI * r;
  const danger = seconds <= 5;
  const offset = circumference * (1 - Math.max(0, Math.min(100, percent)) / 100);
  const center = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="timer"
      aria-label={`${seconds} seconds left`}
      className={cn("shrink-0", className)}
    >
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        strokeWidth={width}
        style={{ stroke: "color-mix(in srgb, var(--foreground) 12%, transparent)" }}
      />
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
        style={{
          stroke: danger ? "var(--danger)" : "var(--primary)",
          transition: "stroke-dashoffset 0.2s linear",
        }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fill: "var(--foreground)", fontSize: size / 3, fontWeight: 700 }}
      >
        {seconds}
      </text>
    </svg>
  );
}
