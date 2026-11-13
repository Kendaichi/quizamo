import { cn } from "@/lib/cn";

type GlassCardProps = React.HTMLAttributes<HTMLDivElement> & {
  as?: React.ElementType;
};

/** Frosted translucent panel. Composes the `.glass` primitive from globals.css. */
export function GlassCard({ as, className, children, ...rest }: GlassCardProps) {
  const Tag = as ?? "div";
  return (
    <Tag className={cn("glass p-6 sm:p-8", className)} {...rest}>
      {children}
    </Tag>
  );
}
