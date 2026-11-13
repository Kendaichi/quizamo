"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Pencil, Plus, RotateCcw, Shuffle, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassButton } from "@/components/glass/GlassButton";
import { KindChip } from "@/components/common/KindChip";
import { QueryState } from "@/components/common/QueryState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { CHOICE_KEYS } from "@/lib/constants";
import {
  useDeleteQuestion,
  useQuestionnaireQuery,
  useQuestionsQuery,
  useReorderQuestions,
} from "@/lib/questionnaires";
import type { Question } from "@/lib/mockDb";
import { QuestionFormDialog } from "./QuestionFormDialog";

export default function QuestionnaireDetailPage() {
  const id = Number(useParams().id);

  const questionnaireQuery = useQuestionnaireQuery(id);
  const { data: questions, isPending, error, refetch } = useQuestionsQuery(id);
  const deleteQuestion = useDeleteQuestion(id);
  const reorder = useReorderQuestions(id);

  const [editing, setEditing] = useState<Question | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Question | null>(null);

  const questionnaire = questionnaireQuery.data;
  const canReorder = (questions?.length ?? 0) > 1;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (q: Question) => {
    setEditing(q);
    setFormOpen(true);
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    await deleteQuestion.mutateAsync(deleting.id);
    setDeleting(null);
  };

  const onShuffle = () => {
    if (!questions) return;
    const ids = questions.map((q) => q.id);
    // Fisher-Yates, so every order is equally likely.
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    reorder.mutate(ids);
  };
  // Ids only grow, so sorting by id restores the order questions were added in.
  const onReset = () => {
    if (!questions) return;
    reorder.mutate([...questions].sort((a, b) => a.id - b.id).map((q) => q.id));
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/questionnaires"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to questionnaires
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold">{questionnaire?.name ?? "…"}</h1>
            {questionnaire && (
              <div className="mt-1.5 flex items-center gap-3">
                <KindChip kind={questionnaire.kind} />
                <span className="text-sm text-muted">
                  {questionnaire.secondsPerQuestion} seconds per question
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-3">
            <GlassButton onClick={openCreate}>
              <Plus className="size-4" />
              New question
            </GlassButton>
            <div className="flex gap-2">
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={onReset}
                disabled={!canReorder || reorder.isPending}
              >
                <RotateCcw className="size-4" />
                Reset
              </GlassButton>
              <GlassButton
                variant="glass"
                size="sm"
                onClick={onShuffle}
                loading={reorder.isPending}
                disabled={!canReorder}
              >
                <Shuffle className="size-4" />
                Shuffle
              </GlassButton>
            </div>
          </div>
        </div>
      </div>

      <QueryState
        loading={isPending}
        error={error}
        empty={questions?.length === 0}
        emptyTitle="No questions yet"
        emptyText="Add questions one by one to build out this quiz."
        onRetry={() => refetch()}
      >
        <div className="flex flex-col gap-3">
          {questions?.map((q, index) => (
            <GlassCard key={q.id} className="!p-4 sm:!p-5">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-bold">
                    {index + 1}. {q.prompt}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {CHOICE_KEYS.filter((key) => q.choices[key]).map((key) => {
                      const correct = q.correct === key;
                      return (
                        <span
                          key={key}
                          className={
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold " +
                            (correct
                              ? "bg-success/15 text-success"
                              : "bg-foreground/5 text-muted")
                          }
                        >
                          {correct && <Check className="size-3.5" />}
                          {key}. {q.choices[key]}
                        </span>
                      );
                    })}
                  </div>

                  <div className="mt-3 text-xs text-muted">
                    {q.points} points
                    {q.secondsOverride ? ` · ${q.secondsOverride} seconds` : ""}
                  </div>
                </div>

                <div className="whitespace-nowrap">
                  <button
                    onClick={() => openEdit(q)}
                    aria-label="Edit question"
                    className="rounded-lg p-2 text-muted hover:bg-foreground/5 hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => setDeleting(q)}
                    aria-label="Delete question"
                    className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </QueryState>

      <QuestionFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        questionnaireId={id}
        question={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteQuestion.isPending}
        title="Delete question"
        text="Delete this question? This cannot be undone."
      />
    </div>
  );
}
