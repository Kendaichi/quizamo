"use client";

// React-query hooks over the mock session store — port of
// web-quizmosa/src/stores/sessions.ts (minus Supabase realtime; the mock has
// no live quizzers). Only mockDb's bodies change when the backend lands.

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as db from "./mockDb";
import { questionnaireKeys } from "./questionnaires";

export const sessionKeys = {
  all: ["sessions"] as const,
  detail: (id: number) => ["sessions", id] as const,
  participants: (id: number) => ["sessions", id, "participants"] as const,
};

export function useSessionsQuery() {
  return useQuery({ queryKey: sessionKeys.all, queryFn: () => db.listSessions() });
}

export function useSessionQuery(id: number, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: () => db.getSession(id),
    refetchInterval: options?.refetchInterval,
  });
}

export function useParticipantsQuery(sessionId: number, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: sessionKeys.participants(sessionId),
    queryFn: () => db.listParticipants(sessionId),
    refetchInterval: options?.refetchInterval,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questionnaireId: number) => db.createSession(questionnaireId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sessionKeys.all });
      qc.invalidateQueries({ queryKey: questionnaireKeys.all });
    },
  });
}

// Host controls all change the session row, so they share one refresh.
function useSessionControl<T>(sessionId: number, run: (input: T) => Promise<void>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) }),
  });
}

export function useStartQuestion(sessionId: number) {
  return useSessionControl(sessionId, (questionId: number) =>
    db.startQuestion(sessionId, questionId),
  );
}

export function useRevealQuestion(sessionId: number) {
  return useSessionControl<void>(sessionId, () => db.revealQuestion(sessionId));
}

export function useFinishSession(sessionId: number) {
  return useSessionControl<void>(sessionId, () => db.finishSession(sessionId));
}

export function useReturnToLobby(sessionId: number) {
  return useSessionControl<void>(sessionId, () => db.returnToLobby(sessionId));
}

export function useOpenPretest(sessionId: number) {
  return useSessionControl<void>(sessionId, () => db.openPretest(sessionId));
}

export function useKickParticipant(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (participantId: number) => db.kickParticipant(participantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sessionKeys.participants(sessionId) });
      qc.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
    },
  });
}

// Display-only countdown derived from question_ends_at (local clock; the mock
// has no server to sync against).
export function useCountdown(startedAt: string | null, endsAt: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  const ends = endsAt ? new Date(endsAt).getTime() : 0;
  const starts = startedAt ? new Date(startedAt).getTime() : 0;
  const remainingMs = ends ? Math.max(0, ends - now) : 0;
  const totalMs = ends && starts ? ends - starts : 0;

  return {
    seconds: Math.ceil(remainingMs / 1000),
    percent: totalMs > 0 ? (remainingMs / totalMs) * 100 : 0,
    isOver: remainingMs === 0,
  };
}
