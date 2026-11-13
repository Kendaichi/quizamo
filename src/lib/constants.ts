import type { Kind, ChoiceKey, SessionStatus } from "./mockDb";

export const kindLabels: Record<Kind, string> = {
  standard: "Standard",
  pretest: "Pre-test",
  posttest: "Post-test",
};

// Tonal chip classes per kind. Light = berry/sapphire on faint fills;
// dark = the reference's muted-burgundy + rose / sapphire + lavender-blue.
export const kindChipClass: Record<Kind, string> = {
  standard: "bg-[#8d1b42]/12 text-[#8d1b42] dark:bg-[#4a1222]/50 dark:text-[#e57399]",
  pretest: "bg-[#1a2a4a]/10 text-[#3c5288] dark:bg-[#1a2a4a]/55 dark:text-[#a1b5e8]",
  posttest: "bg-success/15 text-[#0b7a4f] dark:text-success",
};

export const kindOptions = (Object.keys(kindLabels) as Kind[]).map((value) => ({
  value,
  label: kindLabels[value],
}));

export const statusLabels: Record<SessionStatus, string> = {
  lobby: "Lobby",
  question: "Live",
  reveal: "Reveal",
  finished: "Finished",
};

export const statusChipClass: Record<SessionStatus, string> = {
  lobby: "bg-[#1a2a4a]/10 text-[#3c5288] dark:bg-[#1a2a4a]/55 dark:text-[#a1b5e8]",
  question: "bg-[#8d1b42]/12 text-[#8d1b42] dark:bg-[#4a1222]/55 dark:text-[#e57399]",
  reveal: "bg-warning/18 text-[#9a5a1f] dark:text-warning",
  finished: "bg-foreground/8 text-muted",
};

export const CHOICE_KEYS: ChoiceKey[] = ["A", "B", "C", "D"];

export const SECONDS_MIN = 5;
export const SECONDS_MAX = 600;
export const SECONDS_DEFAULT = 15;
export const POINTS_DEFAULT = 1000;

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

export function formatPercent(value: number | null | undefined) {
  return value == null ? "–" : `${Math.round(value * 100)}%`;
}
