"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CountdownRing } from "@/components/common/CountdownRing";
import { usePlaySession } from "./usePlaySession";
import { PlayChoices } from "./PlayChoices";
import { PlayReveal } from "./PlayReveal";
import { PlayFinal } from "./PlayFinal";

const NAME_KEY = "quizamo:display-name";

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
  useEffect(() => {
    let name = "";
    try {
      name = localStorage.getItem(NAME_KEY) ?? "";
    } catch {}
    if (name) setDisplayName(name);
    else router.replace(`/join/${room}`); // no name = never joined this room
  }, [room, router]);

  const game = usePlaySession(displayName ?? "");

  if (!displayName) return null;

  const { screen } = game;
  const inQuestion = screen === "question" || screen === "locked" || screen === "reveal";

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col gap-4 px-4 py-8">
      {screen === "lobby" && (
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

      {inQuestion && (
        <>
          <div className="flex items-center justify-between gap-2 text-sm font-semibold text-muted">
            <span>
              Question {game.index + 1} of {game.total}
            </span>
            <span className="glass !rounded-full px-3 py-1 font-mono tracking-widest text-foreground">
              {room}
            </span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <h1 className="min-w-0 text-xl font-extrabold leading-snug">{game.question.prompt}</h1>
            {screen !== "reveal" && <CountdownRing seconds={game.seconds} percent={game.percent} />}
          </div>

          {screen === "reveal" ? (
            <PlayReveal
              question={game.question}
              myChoice={game.myAnswer?.choice ?? null}
              points={game.myAnswer?.points ?? null}
              pointsSoFar={game.score}
            />
          ) : (
            <>
              <PlayChoices
                choices={game.choices}
                selected={game.myAnswer?.choice ?? null}
                disabled={screen === "locked"}
                onAnswer={game.answer}
              />
              {screen === "locked" && (
                <p className="text-center text-base font-bold">
                  Answer locked — waiting for the reveal…
                </p>
              )}
            </>
          )}
        </>
      )}

      {screen === "finished" && (
        <PlayFinal
          leaderboard={game.leaderboard}
          correctCount={game.correctCount}
          total={game.total}
        />
      )}
    </div>
  );
}
