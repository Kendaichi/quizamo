"use client";

import { useEffect, useMemo, useState } from "react";
import {
  QUESTIONS,
  QUESTION_MS,
  REVEAL_MS,
  choiceList,
  scoreAnswer,
  buildLeaderboard,
  type ChoiceKey,
} from "./demoQuiz";

type Phase = "lobby" | "question" | "reveal" | "finished";
type Answer = { choice: ChoiceKey; points: number; correct: boolean };

type State = {
  phase: Phase;
  index: number;
  endsAt: number;
  answers: (Answer | null)[];
};

// What the player screen shows. "locked" is a question you've already answered.
export type PlayScreen = "lobby" | "question" | "locked" | "reveal" | "finished";

const initial = (): State => ({
  phase: "lobby",
  index: 0,
  endsAt: Infinity, // no auto-start: wait in the lobby until the host (real backend) starts
  answers: Array<Answer | null>(QUESTIONS.length).fill(null),
});

// The mock "host": once a question is live, each reveals on its deadline and
// each reveal advances to the next (or the final once they run out). The lobby
// no longer auto-starts — a real host/backend will set phase to "question".
function advance(prev: State): State {
  const now = Date.now();
  switch (prev.phase) {
    case "question":
      return { ...prev, phase: "reveal", endsAt: now + REVEAL_MS };
    case "reveal":
      return prev.index < QUESTIONS.length - 1
        ? { ...prev, phase: "question", index: prev.index + 1, endsAt: now + QUESTION_MS }
        : { ...prev, phase: "finished", endsAt: Infinity };
    default:
      return prev;
  }
}

export function usePlaySession(displayName: string) {
  const [state, setState] = useState<State>(initial);
  const [now, setNow] = useState(() => Date.now());

  // One ticking clock drives both the countdown and the phase transitions.
  useEffect(() => {
    if (state.phase === "lobby" || state.phase === "finished") return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [state.phase]);

  // Same-reference return on a no-op lets React bail out of the re-render.
  useEffect(() => {
    setState((prev) => (Date.now() < prev.endsAt ? prev : advance(prev)));
  }, [now]);

  const answer = (choice: ChoiceKey) =>
    setState((prev) => {
      if (prev.phase !== "question" || prev.answers[prev.index]) return prev;
      const remaining = prev.endsAt - Date.now();
      const correct = choice === QUESTIONS[prev.index].correct;
      const answers = prev.answers.slice();
      answers[prev.index] = { choice, points: scoreAnswer(correct, remaining), correct };
      return { ...prev, answers };
    });

  const question = QUESTIONS[state.index];
  const myAnswer = state.answers[state.index];
  const score = state.answers.reduce((sum, a) => sum + (a?.points ?? 0), 0);
  const correctCount = state.answers.filter((a) => a?.correct).length;

  const screen: PlayScreen =
    state.phase === "question" ? (myAnswer ? "locked" : "question") : state.phase;

  const remaining = Math.max(0, state.endsAt - now);
  const seconds = state.phase === "question" ? Math.ceil(remaining / 1000) : 0;
  const percent = state.phase === "question" ? (remaining / QUESTION_MS) * 100 : 0;

  const leaderboard = useMemo(
    () => (state.phase === "finished" ? buildLeaderboard(displayName, score) : []),
    [state.phase, displayName, score],
  );

  return {
    screen,
    index: state.index,
    total: QUESTIONS.length,
    question,
    choices: choiceList(question),
    myAnswer,
    seconds,
    percent,
    score,
    correctCount,
    leaderboard,
    answer,
  };
}
