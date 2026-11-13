"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CountdownRing } from "@/components/common/CountdownRing";
import { useCountdown } from "@/lib/sessions";
import {
  useMyAnswerQuery,
  usePlayLeaderboardQuery,
  usePlayQuestionQuery,
  usePlayStateQuery,
  useQuestionTotalQuery,
  useRevealQuery,
  useSubmitAnswer,
} from "@/lib/play";
import { PlayChoices } from "./PlayChoices";
import { PlayReveal } from "./PlayReveal";
import { PlayFinal } from "./PlayFinal";
import type { ChoiceKey, DemoQuestion } from "./demoQuiz";

const NAME_KEY = "quizamo:display-name";
const SESSION_KEY = "quizamo:session";
const KEYS: ChoiceKey[] = ["A", "B", "C", "D"];

const STEPS = [
  { title: "Watch this screen", text: "Questions appear here when the host starts. Keep this page open." },
  { title: "Tap your answer", text: "Choose before the timer ends. Your first tap is final." },
  { title: "Be quick", text: "Correct answers earn more points the faster you tap. Wrong answers earn 0." },
  { title: "Check your points", text: "Your points appear when each question is revealed." },
];

export default function PlayPage() {
  const { code } = useParams<{ code: string }>();
  const room = (code ?? "").toUpperCase();
  const router = useRouter();

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState(0);

  // Name + session id are set by the join page; without them you never joined.
  useEffect(() => {
    let name = "";
    let raw = "";
    try {
      name = localStorage.getItem(NAME_KEY) ?? "";
      raw = localStorage.getItem(SESSION_KEY) ?? "";
    } catch {}
    const [savedRoom, savedId] = raw.split(":");
    if (name && savedRoom === room && savedId) {
      setDisplayName(name);
      setSessionId(Number(savedId));
    } else {
      router.replace(`/join/${room}`);
    }
  }, [room, router]);

  const { data: state } = usePlayStateQuery(sessionId);
  const status = state?.status ?? "lobby";
  const questionId =
    status === "question" || status === "reveal" ? state?.currentQuestionId ?? null : null;

  const { data: question } = usePlayQuestionQuery(questionId);
  const { data: myAnswer } = useMyAnswerQuery(sessionId, status === "question" ? questionId : null);
  const { data: reveal } = useRevealQuery(sessionId, questionId, status === "reveal");
  const { data: leaderboard = [] } = usePlayLeaderboardQuery(sessionId, status === "finished");
  const { data: total = 0 } = useQuestionTotalQuery(sessionId, status === "finished");
  const submit = useSubmitAnswer(sessionId);

  const { seconds, percent } = useCountdown(
    state?.questionStartedAt ?? null,
    state?.questionEndsAt ?? null,
  );

  if (!displayName || !sessionId) return null;

  if (state?.isKicked) {
    return (
      <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">
        <div className="glass flex flex-col items-center gap-2 p-8">
          <h1 className="text-2xl font-extrabold">Removed from the quiz</h1>
          <p className="text-muted">The host removed you from this room.</p>
        </div>
        <Link
          href="/"
          className="text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          Back home
        </Link>
      </div>
    );
  }

  const inQuestion = status === "question" || status === "reveal";
  const locked = status === "question" && !!myAnswer;
  const onAnswer = (choice: ChoiceKey) => {
    if (questionId && !myAnswer) submit.mutate({ questionId, choice });
  };

  // Reshape the reveal into PlayReveal's question/vote props.
  const revealQuestion: DemoQuestion | null =
    status === "reveal" && question && reveal
      ? { prompt: question.prompt, choices: question.choices, correct: reveal.correct ?? "A", votes: reveal.counts }
      : null;

  const myCorrect = leaderboard.find((r) => r.name === displayName)?.correctCount ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col gap-4 px-4 py-8">
      {status === "lobby" && (
        <>
          <div className="glass flex flex-col items-center gap-2 p-8 text-center">
            <span className="relative flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-3 rounded-full bg-primary" />
            </span>
            <h1 className="text-2xl font-extrabold">You&apos;re in, {displayName}!</h1>
            <p className="text-muted">Waiting for the host to start…</p>
          </div>

          <div className="glass p-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-muted">How to play</p>
            <ol className="mt-4 flex flex-col gap-4">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="font-extrabold text-primary">{i + 1}</span>
                  <div>
                    <p className="font-bold">{step.title}</p>
                    <p className="text-sm text-muted">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}

      {inQuestion && question && (
        <>
          <div className="flex items-center justify-end text-sm font-semibold text-muted">
            <span className="glass !rounded-full px-3 py-1 font-mono tracking-widest text-foreground">
              {room}
            </span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <h1 className="min-w-0 text-xl font-extrabold leading-snug">{question.prompt}</h1>
            {status === "question" && <CountdownRing seconds={seconds} percent={percent} />}
          </div>

          {status === "reveal" && revealQuestion ? (
            <PlayReveal
              question={revealQuestion}
              myChoice={reveal?.myChoice ?? null}
              points={reveal?.points ?? null}
              pointsSoFar={reveal?.pointsSoFar ?? 0}
            />
          ) : (
            <>
              <PlayChoices
                choices={KEYS.filter((k) => question.choices[k]).map((k) => ({
                  key: k,
                  text: question.choices[k],
                }))}
                selected={myAnswer ?? null}
                disabled={locked || submit.isPending}
                onAnswer={onAnswer}
              />
              {locked && (
                <p className="text-center text-base font-bold">
                  Answer locked — waiting for the reveal…
                </p>
              )}
            </>
          )}
        </>
      )}

      {status === "finished" && (
        <PlayFinal
          leaderboard={leaderboard.map((r) => ({
            name: r.name,
            score: r.score,
            you: r.name === displayName,
          }))}
          correctCount={myCorrect}
          total={total}
        />
      )}
    </div>
  );
}
