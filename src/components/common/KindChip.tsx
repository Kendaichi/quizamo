import { cn } from "@/lib/cn";
import { kindChipClass, kindLabels } from "@/lib/constants";
import type { Kind } from "@/lib/mockDb";

export function KindChip({ kind, className }: { kind: Kind; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        kindChipClass[kind],
        className,
      )}
    >
      {kindLabels[kind]}
    </span>
  );
}
