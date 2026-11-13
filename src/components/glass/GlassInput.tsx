import { useId } from "react";
import { cn } from "@/lib/cn";

type GlassInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  error?: string | null;
  trailing?: React.ReactNode;
  wrapperClassName?: string;
};

/** Labeled glass text field with error text and an optional trailing adornment. */
export function GlassInput({
  label,
  error,
  trailing,
  wrapperClassName,
  className,
  required,
  ...rest
}: GlassInputProps) {
  const autoId = useId();
  const id = rest.name ? `${rest.name}-${autoId}` : autoId;
  const errorId = `${id}-error`;

  return (
    <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>

      <div
        className={cn(
          "glass-input flex items-center gap-2 px-4",
          error && "!border-danger",
        )}
      >
        <input
          id={id}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "h-12 w-full bg-transparent text-foreground placeholder:text-muted/70",
            "outline-none",
            className,
          )}
          {...rest}
        />
        {trailing}
      </div>

      {error && (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
