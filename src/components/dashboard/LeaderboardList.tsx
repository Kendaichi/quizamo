import { cn } from "@/lib/cn";
import type { LeaderboardEntry } from "@/lib/mockDb";

const medal = ["🥇", "🥈", "🥉"];

export function LeaderboardList({
  rows,
  limit,
  className,
  large,
}: {
  rows: LeaderboardEntry[];
  limit?: number;
  className?: string;
  large?: boolean;
}) {
  const visible = limit ? rows.slice(0, limit) : rows;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {visible.map((row) => (
        <div
          key={row.participantId}
          className={cn(
            "flex items-center gap-4 rounded-xl bg-foreground/5",
            large ? "gap-6 px-6 py-4 text-2xl sm:text-3xl" : "px-4 py-2.5",
          )}
        >
          <span
            className={cn(
              "shrink-0 text-center font-bold text-primary",
              large ? "w-12" : "w-8",
            )}
          >
            {medal[row.rank - 1] ?? `#${row.rank}`}
          </span>
          <span className="min-w-0 flex-1 truncate font-medium">{row.name}</span>
          <span className="font-bold tabular-nums">{row.score.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
