import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "glass" | "ghost";
type Size = "sm" | "md" | "lg";

type GlassButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-13 px-8 text-base",
};

const variants: Record<Variant, string> = {
  // Brand orange, with a glassy top sheen.
  primary:
    "bg-primary text-on-primary shadow-[0_8px_24px_-8px_rgba(224,68,29,0.6)] " +
    "hover:bg-primary-600 active:translate-y-px " +
    "before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:rounded-t-full " +
    "before:bg-gradient-to-b before:from-white/30 before:to-transparent before:pointer-events-none",
  glass:
    "glass !rounded-full text-foreground hover:brightness-105 active:translate-y-px",
  ghost:
    "text-muted hover:text-foreground hover:bg-foreground/5",
};

export function GlassButton({
  variant = "primary",
  size = "md",
  block,
  loading,
  className,
  children,
  disabled,
  ...rest
}: GlassButtonProps) {
  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-bold",
        "transition-[background-color,transform,filter] duration-150",
        "disabled:cursor-not-allowed disabled:opacity-55",
        sizes[size],
        variants[variant],
        block && "w-full",
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
