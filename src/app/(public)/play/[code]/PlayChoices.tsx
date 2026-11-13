import { cn } from "@/lib/cn";
import type { ChoiceKey } from "./demoQuiz";

type Props = {
  choices: { key: ChoiceKey; text: string }[];
  selected: ChoiceKey | null;
  disabled: boolean;
  onAnswer: (key: ChoiceKey) => void;
  // When set, the answer is in: mark the correct tile, and a wrong pick as wrong.
  reveal?: ChoiceKey | null;
};

/** Glass answer tiles — your first tap selects, then the set locks. */
export function PlayChoices({ choices, selected, disabled, onAnswer, reveal }: Props) {
  const locked = disabled || reveal != null;
  return (
    <div className="flex flex-col gap-3">
      {choices.map(({ key, text }) => {
        const isSelected = selected === key;
        const isCorrect = reveal != null && key === reveal;
        const isWrongPick = reveal != null && isSelected && key !== reveal;
        return (
          <button
            key={key}
            type="button"
            // Keep the picked tile interactive-looking (full opacity) once locked.
            disabled={locked && !isSelected}
            onClick={() => !locked && onAnswer(key)}
            aria-pressed={isSelected}
            className={cn(
              "glass flex items-center gap-4 !rounded-2xl px-5 py-4 text-left transition",
              "enabled:hover:brightness-105 enabled:active:translate-y-px",
              isSelected && reveal == null && "!border-primary ring-2 ring-primary",
              isCorrect && "!border-success ring-2 ring-success",
              isWrongPick && "!border-danger ring-2 ring-danger",
              locked && !isSelected && !isCorrect && "opacity-45",
            )}
          >
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-xl font-extrabold",
                isCorrect
                  ? "bg-success text-on-primary"
                  : isWrongPick
                    ? "bg-danger text-on-primary"
                    : isSelected
                      ? "bg-primary text-on-primary"
                      : "bg-foreground/8 text-foreground",
              )}
            >
              {key}
            </span>
            <span className="text-base font-semibold">{text}</span>
          </button>
        );
      })}
    </div>
  );
}
