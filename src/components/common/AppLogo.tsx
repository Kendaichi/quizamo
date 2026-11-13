import { cn } from "@/lib/cn";

/** The "chismosa" speech-bubble mark: orange bubble, tail, three gossip dots. */
export function LogoMark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 170 170"
      className={cn("text-primary", className)}
      style={style}
      role="img"
      aria-label="Quizamo"
    >
      <circle cx="80" cy="80" r="80" fill="currentColor" />
      <path d="M152 115 168 168 117 150Z" fill="currentColor" />
      <circle cx="46" cy="80" r="12" fill="#fff" />
      <circle cx="80" cy="80" r="12" fill="#fff" />
      <circle cx="114" cy="80" r="12" fill="#fff" />
    </svg>
  );
}

/** Full logo: mark + "quiz"·"amo" wordmark. Wordmark scales with the mark height. */
export function AppLogo({
  size = 32,
  withWordmark = true,
  className,
}: {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark style={{ height: size, width: "auto" }} />
      {withWordmark && (
        <span
          className="font-extrabold leading-none tracking-tight"
          style={{ fontSize: size * 0.82 }}
        >
          <span className="text-foreground">quiz</span>
          <span className="text-primary dark:text-[#e57399]">amo</span>
        </span>
      )}
    </span>
  );
}
