"use client";

// React-query hooks over the mock store — a near 1:1 port of
// web-quizmosa/src/stores/questionnaires.ts. Keep this layer; only mockDb's
// function bodies change when Supabase is wired.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as db from "./mockDb";
import type { QuestionInput, QuestionnaireInput } from "./mockDb";

export const questionnaireKeys = {
  all: ["questionnaires"] as const,
  detail: (id: number) => ["questionnaires", id] as const,
  questions: (id: number) => ["questionnaires", id, "questions"] as const,
};

export function useQuestionnairesQuery() {
  return useQuery({
    queryKey: questionnaireKeys.all,
    queryFn: () => db.listQuestionnaires(),
  });
}

export function useQuestionnaireQuery(id: number) {
  return useQuery({
    queryKey: questionnaireKeys.detail(id),
    queryFn: () => db.getQuestionnaire(id),
  });
}

export function useQuestionsQuery(questionnaireId: number) {
  return useQuery({
    queryKey: questionnaireKeys.questions(questionnaireId),
    queryFn: () => db.listQuestions(questionnaireId),
  });
}

export function useSaveQuestionnaire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: QuestionnaireInput) => db.saveQuestionnaire(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: questionnaireKeys.all }),
  });
}

export function useDeleteQuestionnaire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => db.deleteQuestionnaire(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: questionnaireKeys.all }),
  });
}

export function useSaveQuestion(questionnaireId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: QuestionInput) => db.saveQuestion(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: questionnaireKeys.questions(questionnaireId) });
      qc.invalidateQueries({ queryKey: questionnaireKeys.all }); // counts
    },
  });
}

export function useDeleteQuestion(questionnaireId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => db.deleteQuestion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: questionnaireKeys.questions(questionnaireId) });
      qc.invalidateQueries({ queryKey: questionnaireKeys.all });
    },
  });
}

export function useReorderQuestions(questionnaireId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => db.reorderQuestions(ids),
    // Runs after success and failure, so the list snaps back to the saved order.
    onSettled: () =>
      qc.invalidateQueries({ queryKey: questionnaireKeys.questions(questionnaireId) }),
  });
}
