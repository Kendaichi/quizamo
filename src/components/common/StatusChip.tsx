import { cn } from "@/lib/cn";
import { statusChipClass, statusLabels } from "@/lib/constants";
import type { SessionStatus } from "@/lib/mockDb";

export function StatusChip({ status, className }: { status: SessionStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        statusChipClass[status],
        className,
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
