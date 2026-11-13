import { cn } from "@/lib/cn";
import type { ChoiceKey } from "./demoQuiz";

type Props = {
  choices: { key: ChoiceKey; text: string }[];
  selected: ChoiceKey | null;
  disabled: boolean;
  onAnswer: (key: ChoiceKey) => void;
};

/** Glass answer tiles — your first tap selects, then the set locks. */
export function PlayChoices({ choices, selected, disabled, onAnswer }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {choices.map(({ key, text }) => {
        const isSelected = selected === key;
        return (
          <button
            key={key}
            type="button"
            // Keep the picked tile interactive-looking (full opacity) once locked.
            disabled={disabled && !isSelected}
            onClick={() => !disabled && onAnswer(key)}
            aria-pressed={isSelected}
            className={cn(
              "glass flex items-center gap-4 !rounded-2xl px-5 py-4 text-left transition",
              "enabled:hover:brightness-105 enabled:active:translate-y-px",
              isSelected && "!border-primary ring-2 ring-primary",
              disabled && !isSelected && "opacity-45",
            )}
          >
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-xl font-extrabold",
                isSelected ? "bg-primary text-on-primary" : "bg-foreground/8 text-foreground",
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
