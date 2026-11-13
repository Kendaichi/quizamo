"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/common/Modal";
import { GlassButton } from "@/components/glass/GlassButton";
import { kindLabels } from "@/lib/constants";
import { useQuestionnairesQuery } from "@/lib/questionnaires";
import { useCreateSession } from "@/lib/sessions";

export function HostFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { data: questionnaires } = useQuestionnairesQuery();
  const create = useCreateSession();

  const [questionnaireId, setQuestionnaireId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Only questionnaires with questions can be hosted.
  const options = (questionnaires ?? []).filter((q) => q.questionCount > 0);

  useEffect(() => {
    if (!open) return;
    setQuestionnaireId("");
    setError(null);
  }, [open]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionnaireId) return setError("Pick a questionnaire");
    try {
      const id = await create.mutateAsync(Number(questionnaireId));
      onClose();
      router.push(`/hosts/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create host");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New host" className="max-w-md">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="host-qn" className="text-sm font-semibold text-foreground">
            Questionnaire
          </label>
          <div className="glass-input flex items-center px-4">
            <select
              id="host-qn"
              value={questionnaireId}
              onChange={(e) => setQuestionnaireId(e.target.value)}
              className="h-12 w-full bg-transparent text-foreground outline-none"
            >
              <option value="" disabled>
                Choose a questionnaire…
              </option>
              {options.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name} ({kindLabels[q.kind]})
                </option>
              ))}
            </select>
          </div>
          {options.length === 0 && (
            <p className="text-sm text-muted">
              No questionnaire has questions yet. Add some first.
            </p>
          )}
        </div>

        {error && <p className="text-sm font-medium text-danger">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <GlassButton type="button" variant="glass" onClick={onClose} disabled={create.isPending}>
            Cancel
          </GlassButton>
          <GlassButton type="submit" loading={create.isPending} disabled={options.length === 0}>
            Create host
          </GlassButton>
        </div>
      </form>
    </Modal>
  );
}
