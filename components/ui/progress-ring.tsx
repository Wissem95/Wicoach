import { clamp } from "@/lib/utils";

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  /** CSS color (e.g. "hsl(var(--primary))"). */
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
  /** Turn the track red when value exceeds max (calories/carbs). */
  warnOver?: boolean;
}

// Dependency-free circular progress. Renders fine in Server Components.
export function ProgressRing({
  value,
  max,
  size = 92,
  stroke = 9,
  color = "hsl(var(--primary))",
  trackColor = "hsl(var(--secondary))",
  label,
  sublabel,
  warnOver,
}: ProgressRingProps) {
  const ratio = max > 0 ? clamp(value / max, 0, 1) : 0;
  const exceeded = warnOver && value > max;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * ratio;
  const ringColor = exceeded ? "hsl(var(--destructive))" : color;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">
        {label && <span className="text-sm font-bold tabular-nums">{label}</span>}
        {sublabel && <span className="text-[10px] text-muted-foreground">{sublabel}</span>}
      </div>
    </div>
  );
}
