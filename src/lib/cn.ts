// Tiny class joiner — avoids pulling in clsx for a few lines.
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
