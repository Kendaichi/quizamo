import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { choiceList, type ChoiceKey, type DemoQuestion } from "./demoQuiz";

type Props = {
  question: DemoQuestion;
  myChoice: ChoiceKey | null;
  points: number | null;
  pointsSoFar: number;
};

/** Post-timer reveal: your result, then the correct answer + vote tally. */
export function PlayReveal({ question, myChoice, points, pointsSoFar }: Props) {
  const correct = myChoice === question.correct;
  const headline = !myChoice ? "No answer" : correct ? "Correct!" : "Not this time";

  return (
    <div className="flex flex-col gap-3">
      <div className="glass flex flex-col items-center gap-1 p-6 text-center">
        <p
          className={cn(
            "text-2xl font-extrabold",
            correct ? "text-success" : myChoice ? "text-danger" : "text-muted",
          )}
        >
          {headline}
        </p>
        {myChoice && <p className="text-base font-semibold">+{points ?? 0} points</p>}
        <p className="mt-1 text-sm font-medium text-muted">{pointsSoFar} points so far</p>
      </div>

      <ul className="flex flex-col gap-2">
        {choiceList(question).map(({ key, text }) => {
          const isCorrect = key === question.correct;
          const isMine = key === myChoice;
          const count = question.votes[key] + (isMine ? 1 : 0);
          return (
            <li
              key={key}
              className={cn(
                "glass flex items-center gap-3 !rounded-xl px-4 py-3",
                isCorrect && "!border-success",
                !isCorrect && isMine && "!border-danger",
              )}
            >
              <span
                className={cn(
                  "font-extrabold",
                  isCorrect ? "text-success" : isMine ? "text-danger" : "text-foreground",
                )}
              >
                {key}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{text}</span>
              {isCorrect && <Check className="size-4 text-success" aria-label="Correct answer" />}
              <span className="text-sm font-bold tabular-nums text-muted">{count}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
