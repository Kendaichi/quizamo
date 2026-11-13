"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CountdownRing } from "@/components/common/CountdownRing";
import { GlassButton } from "@/components/glass/GlassButton";
import { useCountdown } from "@/lib/sessions";
import {
  useFinalLeaderboardQuery,
  useMyAnswerQuery,
  useMyProgressQuery,
  useNextQuestion,
  usePlayParticipantQuery,
  usePlayQuestionQuery,
  usePlayRealtime,
  usePlaySessionQuery,
  useRevealQuery,
  useSubmitAnswer,
} from "@/lib/play";
import { PlayChoices } from "./PlayChoices";
import { PlayReveal } from "./PlayReveal";
import { PlayFinal } from "./PlayFinal";
import type { ChoiceKey, DemoQuestion } from "./demoQuiz";

const KEYS: ChoiceKey[] = ["A", "B", "C", "D"];

// Worded to hold for every kind: a pre-test never shows the correct answer.
const selfPacedSteps = [
  { title: "Wait for the host", text: "A Start button appears here when the host opens the quiz." },
  { title: "Tap your answer", text: "Choose before the timer ends. Your first tap is final." },
  { title: "Go at your own pace", text: "Tap Next question when you're ready. Each question has its own timer." },
  { title: "See your rank", text: "Your rank shows when the host finishes." },
];
const hostPacedSteps = [
  { title: "Watch this screen", text: "Questions appear here when the host starts. Keep this page open." },
  { title: "Tap your answer", text: "Choose before the timer ends. Your first tap is final." },
  { title: "Be quick", text: "Correct answers earn more points the faster you tap. Wrong answers earn 0." },
  { title: "Check your points", text: "Your points appear when the host reveals each question." },
];

export default function PlayPage() {
  const { code } = useParams<{ code: string }>();
  const room = (code ?? "").toUpperCase();

  const sessionQuery = usePlaySessionQuery(room);
  const session = sessionQuery.data;

  // Kept after a kick, when the session can no longer be read.
  const [sessionId, setSessionId] = useState(0);
  useEffect(() => {
    if (session) setSessionId(session.id);
  }, [session]);

  const progressQuery = useMyProgressQuery(room, sessionId);
  const progress = progressQuery.data;
  const isSelfPaced = progress?.kind === "pretest";

  const status = session?.status;
  const questionId = isSelfPaced
    ? progress?.questionId ?? null
    : session?.currentQuestionId ?? null;
  const isReveal = status === "reveal";
  const isFinished = status === "finished";

  const participantQuery = usePlayParticipantQuery(room, sessionId);
  const participant = participantQuery.data;
  const questionQuery = usePlayQuestionQuery(room, questionId);
  const question = questionQuery.data;
  const answerQuery = useMyAnswerQuery(room, sessionId, questionId);
  const myAnswer = answerQuery.data ?? null;
  const revealQuery = useRevealQuery(room, sessionId, questionId, isReveal);
  const reveal = revealQuery.data ?? null;
  const leaderboardQuery = useFinalLeaderboardQuery(room, sessionId, isFinished);
  const submit = useSubmitAnswer(room);
  const next = useNextQuestion(room);

  usePlayRealtime(room, sessionId, participant?.id ?? 0);

  const { seconds, percent, isOver } = useCountdown(
    (isSelfPaced ? progress?.questionStartedAt : session?.questionStartedAt) ?? null,
    (isSelfPaced ? progress?.questionEndsAt : session?.questionEndsAt) ?? null,
  );

  const [notice, setNotice] = useState("");

  const screen = participant?.isKicked
    ? "kicked"
    : sessionQuery.isPending
      ? "loading"
      : sessionQuery.isError
        ? "error"
        : !session
          ? "missing"
          : status === "lobby"
            ? "lobby"
            : status === "finished"
              ? "finished"
              : isSelfPaced && progress?.finishedAt
                ? "done"
                : isSelfPaced && questionId === null
                  ? "ready"
                  : status === "reveal"
                    ? "reveal"
                    : myAnswer
                      ? "locked"
                      : isOver
                        ? "timeup"
                        : "question";

  const onAnswer = async (choice: ChoiceKey) => {
    if (!sessionId || questionId === null || submit.isPending) return;
    try {
      const saved = await submit.mutateAsync({ sessionId, questionId, choice });
      if (!saved) setNotice("You already answered this question.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const onNext = async () => {
    if (!sessionId || next.isPending) return;
    try {
      await next.mutateAsync(sessionId);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const myResult = leaderboardQuery.data?.find((r) => r.participantId === participant?.id);
  const revealQuestion: DemoQuestion | null =
    question && reveal
      ? { prompt: question.prompt, choices: question.choices, correct: reveal.correct ?? "A", votes: reveal.counts }
      : null;
  const steps = isSelfPaced ? selfPacedSteps : hostPacedSteps;

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col gap-4 px-4 py-8">
      {screen === "loading" && <p className="py-12 text-center text-muted">Loading…</p>}

      {screen === "error" && (
        <div className="glass flex flex-col items-center gap-3 p-8 text-center">
          <h1 className="text-xl font-extrabold">Could not load this quiz</h1>
          <p className="text-muted">Check your connection and try again.</p>
          <GlassButton size="sm" onClick={() => sessionQuery.refetch()}>
            Retry
          </GlassButton>
        </div>
      )}

      {screen === "kicked" && (
        <div className="glass flex flex-col items-center gap-2 p-8 text-center">
          <h1 className="text-2xl font-extrabold">You were removed</h1>
          <p className="text-muted">The host removed you from this quiz.</p>
        </div>
      )}

      {screen === "missing" && (
        <div className="glass flex flex-col items-center gap-3 p-8 text-center">
          <h1 className="text-xl font-extrabold">Quiz not available</h1>
          <p className="text-muted">You have not joined this quiz, or you can no longer access it.</p>
          <Link href={`/join/${room}`} className="font-bold text-primary underline-offset-4 hover:underline">
            Go to join
          </Link>
        </div>
      )}

      {screen === "lobby" && (
        <>
          <div className="glass flex flex-col items-center gap-2 p-8 text-center">
            <span className="relative flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-3 rounded-full bg-primary" />
            </span>
            <h1 className="text-2xl font-extrabold">
              You&apos;re in, {participant?.displayName ?? "friend"}!
            </h1>
            <p className="text-muted">Waiting for the host to start…</p>
          </div>
          <div className="glass p-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-muted">How to play</p>
            <ol className="mt-4 flex flex-col gap-4">
              {steps.map((step, i) => (
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

      {screen === "ready" && (
        <div className="glass flex flex-col items-center gap-4 p-8 text-center">
          <h1 className="text-2xl font-extrabold">The quiz is open</h1>
          <p className="text-muted">Go at your own pace. Each question has its own timer.</p>
          <GlassButton size="lg" loading={next.isPending} onClick={onNext}>
            Start
          </GlassButton>
        </div>
      )}

      {screen === "done" && (
        <div className="glass flex flex-col items-center gap-2 p-8 text-center">
          <h1 className="text-2xl font-extrabold">All done!</h1>
          <p className="text-muted">Your answers are in. Your rank shows when the host finishes.</p>
        </div>
      )}

      {screen === "finished" && (
        <PlayFinal
          result={myResult}
          players={leaderboardQuery.data?.length ?? 0}
          loading={leaderboardQuery.isPending}
        />
      )}

      {(screen === "question" || screen === "locked" || screen === "timeup" || screen === "reveal") &&
        question && (
          <>
            {isSelfPaced && progress && (
              <span className="text-sm font-semibold text-muted">
                Question {progress.served} of {progress.total}
              </span>
            )}

            <div className="flex items-start justify-between gap-4">
              <h1 className="min-w-0 text-xl font-extrabold leading-snug">{question.prompt}</h1>
              {screen !== "reveal" && <CountdownRing seconds={seconds} percent={percent} />}
            </div>

            {screen === "reveal" && revealQuestion ? (
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
                  selected={myAnswer}
                  disabled={screen !== "question" || submit.isPending}
                  onAnswer={onAnswer}
                />

                {screen === "locked" && (
                  <p className="text-center text-base font-bold">Answer locked</p>
                )}
                {screen === "timeup" && (
                  <p className="text-center text-base font-bold">Time&apos;s up</p>
                )}

                {isSelfPaced && (screen === "locked" || screen === "timeup") && (
                  <GlassButton block size="lg" loading={next.isPending} onClick={onNext}>
                    {progress && progress.served < progress.total ? "Next question" : "Finish"}
                  </GlassButton>
                )}
              </>
            )}
          </>
        )}

      {(screen === "question" || screen === "locked" || screen === "timeup" || screen === "reveal") &&
        !question && <p className="py-12 text-center text-muted">Loading…</p>}

      {notice && (
        <div
          role="status"
          className="glass fixed inset-x-4 bottom-4 mx-auto max-w-[488px] p-4 text-center text-sm font-semibold"
          onClick={() => setNotice("")}
        >
          {notice}
        </div>
      )}
    </div>
  );
}
