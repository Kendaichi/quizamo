"use client";

// React-query hooks for the quizzer play screen, ported from web-quizmosa's
// quizzers store. The host's lobby → question → reveal → finished changes reach
// the player's phone via Supabase realtime, with a slow refetch as a fallback
// for when a sleeping phone drops the channel.

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as db from "./mockDb";
import { supabase } from "./supabase";
import type { ChoiceKey } from "./mockDb";

export const playKeys = {
  session: (code: string) => ["play", code, "session"] as const,
  participant: (code: string) => ["play", code, "participant"] as const,
  progress: (code: string) => ["play", code, "progress"] as const,
  question: (code: string, q: number | null) => ["play", code, "question", q] as const,
  answer: (code: string, q: number | null) => ["play", code, "answer", q] as const,
  reveal: (code: string, q: number | null) => ["play", code, "reveal", q] as const,
  leaderboard: (code: string) => ["play", code, "leaderboard"] as const,
};

export function usePlaySessionQuery(code: string) {
  return useQuery({
    queryKey: playKeys.session(code),
    queryFn: () => db.getPlaySession(code),
    // Realtime delivers host changes instantly; this is only a fallback for a
    // dropped channel. Kept short so a question still appears within ~2.5s even
    // if realtime lags, instead of the player losing most of the countdown.
    refetchInterval: 2_500,
    refetchOnWindowFocus: true,
  });
}

export function usePlayParticipantQuery(code: string, sessionId: number) {
  return useQuery({
    queryKey: playKeys.participant(code),
    queryFn: () => db.getPlayParticipant(sessionId),
    enabled: sessionId > 0,
  });
}

export function useMyProgressQuery(code: string, sessionId: number) {
  return useQuery({
    queryKey: playKeys.progress(code),
    queryFn: () => db.getMyProgress(sessionId),
    enabled: sessionId > 0,
  });
}

export function usePlayQuestionQuery(code: string, questionId: number | null) {
  return useQuery({
    queryKey: playKeys.question(code, questionId),
    queryFn: () => db.getPlayQuestion(questionId as number),
    enabled: questionId !== null,
  });
}

export function useMyAnswerQuery(code: string, sessionId: number, questionId: number | null) {
  return useQuery({
    queryKey: playKeys.answer(code, questionId),
    queryFn: () => db.getMyAnswer(sessionId, questionId as number),
    enabled: sessionId > 0 && questionId !== null,
  });
}

export function useRevealQuery(
  code: string,
  sessionId: number,
  questionId: number | null,
  isReveal: boolean,
) {
  return useQuery({
    queryKey: playKeys.reveal(code, questionId),
    queryFn: () => db.getReveal(sessionId, questionId as number),
    enabled: isReveal && sessionId > 0 && questionId !== null,
  });
}

export function useFinalLeaderboardQuery(code: string, sessionId: number, isFinished: boolean) {
  return useQuery({
    queryKey: playKeys.leaderboard(code),
    queryFn: () => db.getPlayLeaderboard(sessionId),
    enabled: isFinished && sessionId > 0,
  });
}

export function useSubmitAnswer(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { sessionId: number; questionId: number; choice: ChoiceKey }) =>
      db.submitAnswer(v.sessionId, v.questionId, v.choice),
    onSettled: (_d, _e, v) =>
      qc.invalidateQueries({ queryKey: playKeys.answer(code, v.questionId) }),
  });
}

export function useNextQuestion(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) => db.nextQuestion(sessionId),
    onSettled: () => qc.invalidateQueries({ queryKey: playKeys.progress(code) }),
  });
}

// Subscribe to this session + participant; invalidate on change (and on connect,
// to catch anything missed before the channel was ready).
export function usePlayRealtime(code: string, sessionId: number, participantId: number) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!sessionId || !participantId) return;

    const catchUp = () => {
      qc.invalidateQueries({ queryKey: playKeys.session(code) });
      qc.invalidateQueries({ queryKey: playKeys.participant(code) });
      qc.invalidateQueries({ queryKey: playKeys.progress(code) });
    };

    const channel = supabase
      .channel(`play-${sessionId}-${participantId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        () => qc.invalidateQueries({ queryKey: playKeys.session(code) }),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "participants", filter: `id=eq.${participantId}` },
        () => {
          qc.invalidateQueries({ queryKey: playKeys.participant(code) });
          qc.invalidateQueries({ queryKey: playKeys.progress(code) });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") catchUp();
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, sessionId, participantId, qc]);
}
