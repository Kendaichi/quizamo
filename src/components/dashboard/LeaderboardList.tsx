import { cn } from "@/lib/cn";
import type { LeaderboardEntry } from "@/lib/mockDb";

const medal = ["🥇", "🥈", "🥉"];

export function LeaderboardList({
  rows,
  limit,
  className,
}: {
  rows: LeaderboardEntry[];
  limit?: number;
  className?: string;
}) {
  const visible = limit ? rows.slice(0, limit) : rows;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {visible.map((row) => (
        <div
          key={row.participantId}
          className="flex items-center gap-4 rounded-xl bg-foreground/5 px-4 py-2.5"
        >
          <span className="w-8 shrink-0 text-center font-bold text-primary">
            {medal[row.rank - 1] ?? `#${row.rank}`}
          </span>
          <span className="min-w-0 flex-1 truncate font-medium">{row.name}</span>
          <span className="font-bold tabular-nums">{row.score.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
