"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/common/Modal";
import { GlassInput } from "@/components/glass/GlassInput";
import { GlassButton } from "@/components/glass/GlassButton";
import {
  SECONDS_DEFAULT,
  SECONDS_MAX,
  SECONDS_MIN,
  kindOptions,
} from "@/lib/constants";
import { useSaveQuestionnaire } from "@/lib/questionnaires";
import type { Kind, QuestionnaireWithCounts } from "@/lib/mockDb";

type Props = {
  open: boolean;
  onClose: () => void;
  questionnaire: QuestionnaireWithCounts | null;
};

export function QuestionnaireFormDialog({ open, onClose, questionnaire }: Props) {
  const save = useSaveQuestionnaire();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("standard");
  const [seconds, setSeconds] = useState(String(SECONDS_DEFAULT));
  const [error, setError] = useState<string | null>(null);

  // Reset the fields each time the dialog opens for a create or an edit.
  useEffect(() => {
    if (!open) return;
    setName(questionnaire?.name ?? "");
    setKind(questionnaire?.kind ?? "standard");
    setSeconds(String(questionnaire?.secondsPerQuestion ?? SECONDS_DEFAULT));
    setError(null);
  }, [open, questionnaire]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const secondsNum = Number(seconds);
    if (!name.trim()) return setError("Name is required");
    if (!Number.isFinite(secondsNum) || secondsNum < SECONDS_MIN || secondsNum > SECONDS_MAX)
      return setError(`Seconds must be between ${SECONDS_MIN} and ${SECONDS_MAX}`);

    try {
      await save.mutateAsync({
        id: questionnaire?.id ?? null,
        name: name.trim(),
        kind,
        secondsPerQuestion: secondsNum,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={questionnaire ? "Edit questionnaire" : "New questionnaire"}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <GlassInput
          label="Name"
          required
          value={name}
          error={error && !name.trim() ? error : null}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="qn-kind" className="text-sm font-semibold text-foreground">
            Kind
          </label>
          <div className="glass-input flex items-center px-4">
            <select
              id="qn-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind)}
              className="h-12 w-full bg-transparent text-foreground outline-none"
            >
              {kindOptions.map((o) => (
                <option key={o.value} value={o.value} className="text-foreground">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <GlassInput
          label="Seconds per question"
          type="number"
          min={SECONDS_MIN}
          max={SECONDS_MAX}
          required
          value={seconds}
          onChange={(e) => setSeconds(e.target.value)}
        />

        {error && name.trim() && <p className="text-sm font-medium text-danger">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <GlassButton type="button" variant="glass" onClick={onClose} disabled={save.isPending}>
            Cancel
          </GlassButton>
          <GlassButton type="submit" loading={save.isPending}>
            {questionnaire ? "Save" : "Create"}
          </GlassButton>
        </div>
      </form>
    </Modal>
  );
}
