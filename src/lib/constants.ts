import type { Kind, ChoiceKey } from "./mockDb";

export const kindLabels: Record<Kind, string> = {
  standard: "Standard",
  pretest: "Pre-test",
  posttest: "Post-test",
};

// Tonal chip classes per kind (mirrors web-quizmosa kindColors).
export const kindChipClass: Record<Kind, string> = {
  standard: "bg-primary/12 text-primary",
  pretest: "bg-info/12 text-info",
  posttest: "bg-success/15 text-success",
};

export const kindOptions = (Object.keys(kindLabels) as Kind[]).map((value) => ({
  value,
  label: kindLabels[value],
}));

export const CHOICE_KEYS: ChoiceKey[] = ["A", "B", "C", "D"];

export const SECONDS_MIN = 5;
export const SECONDS_MAX = 600;
export const SECONDS_DEFAULT = 15;
export const POINTS_DEFAULT = 1000;

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}
