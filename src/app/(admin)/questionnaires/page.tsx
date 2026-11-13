"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassButton } from "@/components/glass/GlassButton";
import { KindChip } from "@/components/common/KindChip";
import { QueryState } from "@/components/common/QueryState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { formatDate } from "@/lib/constants";
import { useDeleteQuestionnaire, useQuestionnairesQuery } from "@/lib/questionnaires";
import type { QuestionnaireWithCounts } from "@/lib/mockDb";
import { QuestionnaireFormDialog } from "./QuestionnaireFormDialog";

export default function QuestionnairesPage() {
  const { data, isPending, error, refetch } = useQuestionnairesQuery();
  const deleteQuestionnaire = useDeleteQuestionnaire();

  const [editing, setEditing] = useState<QuestionnaireWithCounts | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<QuestionnaireWithCounts | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (q: QuestionnaireWithCounts) => {
    setEditing(q);
    setFormOpen(true);
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    await deleteQuestionnaire.mutateAsync(deleting.id);
    setDeleting(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">Library</span>
          <h1 className="text-3xl font-extrabold">Questionnaires</h1>
        </div>
        <GlassButton onClick={openCreate}>
          <Plus className="size-4" />
          New questionnaire
        </GlassButton>
      </div>

      <GlassCard className="!p-2 sm:!p-2">
        <QueryState
          loading={isPending}
          error={error}
          empty={data?.length === 0}
          emptyTitle="No questionnaires yet"
          emptyText="Create your first questionnaire to start hosting."
          onRetry={() => refetch()}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-foreground/10 text-left text-muted">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Kind</th>
                  <th className="px-4 py-3 text-right font-semibold">Questions</th>
                  <th className="px-4 py-3 text-right font-semibold">Seconds</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data?.map((q) => (
                  <tr key={q.id} className="border-b border-foreground/5 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/questionnaires/${q.id}`}
                        className="font-bold text-primary hover:underline"
                      >
                        {q.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <KindChip kind={q.kind} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{q.questionCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{q.secondsPerQuestion}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(q.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(q)}
                        aria-label={`Edit ${q.name}`}
                        className="rounded-lg p-2 text-muted hover:bg-foreground/5 hover:text-foreground"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(q)}
                        aria-label={`Delete ${q.name}`}
                        className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </GlassCard>

      <QuestionnaireFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        questionnaire={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteQuestionnaire.isPending}
        title="Delete questionnaire"
        text={`Delete “${deleting?.name}” and all its questions? This cannot be undone.`}
      />
    </div>
  );
}
