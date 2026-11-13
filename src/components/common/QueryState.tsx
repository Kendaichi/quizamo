import { AlertCircle, Loader2 } from "lucide-react";
import { GlassButton } from "@/components/glass/GlassButton";

type QueryStateProps = {
  loading: boolean;
  error: unknown;
  empty?: boolean;
  emptyTitle?: string;
  emptyText?: string;
  onRetry?: () => void;
  children: React.ReactNode;
};

// Loading / error / empty gate around query-backed content. Mirrors
// web-quizmosa QueryState.vue.
export function QueryState({
  loading,
  error,
  empty,
  emptyTitle = "Nothing here yet",
  emptyText,
  onRetry,
  children,
}: QueryStateProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted">
        <Loader2 className="size-6 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <AlertCircle className="size-7 text-danger" />
        <p className="font-semibold text-foreground">Something went wrong</p>
        <p className="max-w-sm text-sm text-muted">
          {error instanceof Error ? error.message : "Could not load this content."}
        </p>
        {onRetry && (
          <GlassButton variant="glass" size="sm" onClick={onRetry}>
            Try again
          </GlassButton>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="flex flex-col items-center gap-2 py-14 text-center">
        <p className="text-lg font-bold text-foreground">{emptyTitle}</p>
        {emptyText && <p className="max-w-sm text-sm text-muted">{emptyText}</p>}
      </div>
    );
  }

  return <>{children}</>;
}
