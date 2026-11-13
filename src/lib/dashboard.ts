"use client";

// React-query hooks for dashboard history + per-session results, over the mock
// store. Port of web-quizmosa/src/stores/dashboard.ts (get_history,
// get_session_report, get_leaderboard). Swap mockDb bodies for Supabase RPCs.

import { useQuery } from "@tanstack/react-query";
import * as db from "./mockDb";
import { sessionKeys } from "./sessions";

export function useHistoryQuery() {
  return useQuery({ queryKey: ["history"], queryFn: () => db.listHistory() });
}

export function useSessionReportQuery(sessionId: number, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: [...sessionKeys.detail(sessionId), "report"],
    queryFn: () => db.getSessionReport(sessionId),
    refetchInterval: options?.refetchInterval,
  });
}

export function useAnswerDistributionQuery(
  sessionId: number,
  questionId: number | null,
  options?: { refetchInterval?: number },
) {
  return useQuery({
    queryKey: [...sessionKeys.detail(sessionId), "dist", questionId],
    queryFn: () => db.getAnswerDistribution(sessionId, questionId as number),
    enabled: questionId !== null,
    refetchInterval: options?.refetchInterval,
  });
}

export function useParticipantsOverviewQuery() {
  return useQuery({
    queryKey: ["participants-overview"],
    queryFn: () => db.listParticipantsOverview(),
  });
}
