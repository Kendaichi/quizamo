"use client";

// React-query hooks for the quizzer play screen. The session state polls so the
// host's lobby → question → reveal → finished changes show up on the player's
// phone. Bodies live in mockDb (real Supabase).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as db from "./mockDb";
import type { ChoiceKey } from "./mockDb";

const POLL = 1500;

export const playKeys = {
  state: (id: number) => ["play", "state", id] as const,
  question: (id: number | null) => ["play", "question", id] as const,
  answer: (s: number, q: number | null) => ["play", "answer", s, q] as const,
  reveal: (s: number, q: number | null) => ["play", "reveal", s, q] as const,
  leaderboard: (id: number) => ["play", "leaderboard", id] as const,
  total: (id: number) => ["play", "total", id] as const,
};

export function usePlayStateQuery(sessionId: number) {
  return useQuery({
    queryKey: playKeys.state(sessionId),
    queryFn: () => db.getPlayState(sessionId),
    enabled: sessionId > 0,
    // Stop polling once the quiz ends — "finished" is terminal.
    refetchInterval: (query) => (query.state.data?.status === "finished" ? false : POLL),
  });
}

export function usePlayQuestionQuery(questionId: number | null) {
  return useQuery({
    queryKey: playKeys.question(questionId),
    queryFn: () => db.getPlayQuestion(questionId as number),
    enabled: !!questionId,
  });
}

export function useMyAnswerQuery(sessionId: number, questionId: number | null) {
  return useQuery({
    queryKey: playKeys.answer(sessionId, questionId),
    queryFn: () => db.getMyAnswer(sessionId, questionId as number),
    enabled: sessionId > 0 && !!questionId,
  });
}

export function useRevealQuery(sessionId: number, questionId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: playKeys.reveal(sessionId, questionId),
    queryFn: () => db.getReveal(sessionId, questionId as number),
    enabled: enabled && sessionId > 0 && !!questionId,
  });
}

export function usePlayLeaderboardQuery(sessionId: number, enabled: boolean) {
  return useQuery({
    queryKey: playKeys.leaderboard(sessionId),
    queryFn: () => db.getPlayLeaderboard(sessionId),
    enabled: enabled && sessionId > 0,
  });
}

export function useQuestionTotalQuery(sessionId: number, enabled: boolean) {
  return useQuery({
    queryKey: playKeys.total(sessionId),
    queryFn: () => db.getQuestionTotal(sessionId),
    enabled: enabled && sessionId > 0,
  });
}

export function useSubmitAnswer(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { questionId: number; choice: ChoiceKey }) =>
      db.submitAnswer(sessionId, v.questionId, v.choice),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: playKeys.answer(sessionId, v.questionId) }),
  });
}
