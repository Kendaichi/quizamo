"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { QUESTIONS, choiceList, type ChoiceKey } from "../play/[code]/demoQuiz";
import { PlayChoices } from "../play/[code]/PlayChoices";

// Self-paced preview of the quizzer flow: tap an answer, see right/wrong at once,
// then advance yourself. No host, no timer — unlike the real /play/[code] session.
export default function DemoPage() {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<ChoiceKey | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);

  const question = QUESTIONS[index];
  const isLast = index === QUESTIONS.length - 1;
  const answered = picked !== null;
  const isCorrect = picked === question.correct;

  const pick = (key: ChoiceKey) => {
    if (picked) return;
    setPicked(key);
    if (key === question.correct) setCorrectCount((c) => c + 1);
  };

  const next = () => {
    if (isLast) return setDone(true);
    setIndex((i) => i + 1);
    setPicked(null);
  };

  const restart = () => {
    setIndex(0);
    setPicked(null);
    setCorrectCount(0);
    setDone(false);
  };

  if (done) {
    return (
      <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
        <div className="glass flex flex-col items-center gap-1 p-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted">Demo complete</p>
          <p className="text-5xl font-extrabold text-primary">
            {correctCount}/{QUESTIONS.length}
          </p>
          <p className="text-muted">correct</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={restart}
            className="glass inline-flex items-center gap-2 !rounded-full px-5 py-3 font-bold transition hover:brightness-105"
          >
            <RotateCcw className="size-4" /> Try again
          </button>
          <Link
            href="/"
            className="glass inline-flex items-center gap-2 !rounded-full px-5 py-3 font-bold text-primary transition hover:brightness-105"
          >
            Join a real quiz <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col gap-4 px-4 py-8">
      <div className="flex items-center justify-between text-sm font-semibold text-muted">
        <span>
          Demo · Question {index + 1} of {QUESTIONS.length}
        </span>
        <Link href="/" className="underline-offset-4 hover:text-foreground hover:underline">
          Exit
        </Link>
      </div>

      <h1 className="text-xl font-extrabold leading-snug">{question.prompt}</h1>

      <PlayChoices
        choices={choiceList(question)}
        selected={picked}
        disabled={false}
        reveal={answered ? question.correct : null}
        onAnswer={pick}
      />

      {answered && (
        <div className="flex flex-col gap-3">
          <p
            className={cn(
              "flex items-center justify-center gap-2 text-lg font-extrabold",
              isCorrect ? "text-success" : "text-danger",
            )}
          >
            {isCorrect ? (
              <>
                <Check className="size-5" /> Correct!
              </>
            ) : (
              <>
                <X className="size-5" /> Not quite
              </>
            )}
          </p>
          <button
            type="button"
            onClick={next}
            className="glass inline-flex items-center justify-center gap-2 !rounded-full px-6 py-3 font-bold text-primary transition hover:brightness-105"
          >
            {isLast ? "See results" : "Next question"} <ArrowRight className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
