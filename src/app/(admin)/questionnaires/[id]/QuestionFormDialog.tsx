"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/common/Modal";
import { GlassInput } from "@/components/glass/GlassInput";
import { GlassButton } from "@/components/glass/GlassButton";
import { CHOICE_KEYS, POINTS_DEFAULT } from "@/lib/constants";
import { useSaveQuestion } from "@/lib/questionnaires";
import type { ChoiceKey, Question } from "@/lib/mockDb";

type Props = {
  open: boolean;
  onClose: () => void;
  questionnaireId: number;
  question: Question | null;
};

const emptyChoices = (): Record<ChoiceKey, string> => ({ A: "", B: "", C: "", D: "" });

export function QuestionFormDialog({ open, onClose, questionnaireId, question }: Props) {
  const save = useSaveQuestion(questionnaireId);
  const [prompt, setPrompt] = useState("");
  const [choices, setChoices] = useState<Record<ChoiceKey, string>>(emptyChoices);
  const [correct, setCorrect] = useState<ChoiceKey>("A");
  const [points, setPoints] = useState(String(POINTS_DEFAULT));
  const [secondsOverride, setSecondsOverride] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPrompt(question?.prompt ?? "");
    setChoices(question ? { ...question.choices } : emptyChoices());
    setCorrect(question?.correct ?? "A");
    setPoints(String(question?.points ?? POINTS_DEFAULT));
    setSecondsOverride(question?.secondsOverride != null ? String(question.secondsOverride) : "");
    setError(null);
  }, [open, question]);

  const setChoice = (key: ChoiceKey, value: string) =>
    setChoices((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed: Record<ChoiceKey, string> = {
      A: choices.A.trim(),
      B: choices.B.trim(),
      C: choices.C.trim(),
      D: choices.D.trim(),
    };
    const pointsNum = Number(points);
    const secondsNum = secondsOverride.trim() === "" ? null : Number(secondsOverride);

    if (!prompt.trim()) return setError("Question prompt is required");
    if (!trimmed.A || !trimmed.B) return setError("Choices A and B are required");
    if (!trimmed[correct]) return setError("The correct answer must be a filled-in choice");
    if (!Number.isFinite(pointsNum) || pointsNum <= 0) return setError("Points must be a positive number");
    if (secondsNum !== null && (!Number.isFinite(secondsNum) || secondsNum <= 0))
      return setError("Seconds override must be a positive number");

    try {
      await save.mutateAsync({
        id: question?.id ?? null,
        questionnaireId,
        prompt: prompt.trim(),
        choices: trimmed,
        correct,
        points: pointsNum,
        secondsOverride: secondsNum,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={question ? "Edit question" : "New question"}
      className="max-w-xl"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="q-prompt" className="text-sm font-semibold text-foreground">
            Question <span className="text-danger">*</span>
          </label>
          <div className="glass-input px-4 py-2">
            <textarea
              id="q-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              className="w-full resize-y bg-transparent text-foreground outline-none"
              autoFocus
            />
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold text-foreground">
            Choices <span className="text-muted">— pick the correct one</span>
          </legend>
          {CHOICE_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2" aria-label={`Mark ${key} correct`}>
                <input
                  type="radio"
                  name="correct"
                  checked={correct === key}
                  onChange={() => setCorrect(key)}
                  className="size-4 accent-[var(--success)]"
                />
                <span className="w-4 text-sm font-bold text-muted">{key}</span>
              </label>
              <div className="glass-input flex flex-1 items-center px-3">
                <input
                  value={choices[key]}
                  onChange={(e) => setChoice(key, e.target.value)}
                  placeholder={key === "C" || key === "D" ? "Optional" : "Required"}
                  className="h-11 w-full bg-transparent text-foreground placeholder:text-muted/70 outline-none"
                />
              </div>
            </div>
          ))}
        </fieldset>

        <div className="flex gap-4">
          <GlassInput
            label="Points"
            type="number"
            min={1}
            required
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            wrapperClassName="flex-1"
          />
          <GlassInput
            label="Seconds override"
            type="number"
            min={1}
            placeholder="Default"
            value={secondsOverride}
            onChange={(e) => setSecondsOverride(e.target.value)}
            wrapperClassName="flex-1"
          />
        </div>

        {error && <p className="text-sm font-medium text-danger">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <GlassButton type="button" variant="glass" onClick={onClose} disabled={save.isPending}>
            Cancel
          </GlassButton>
          <GlassButton type="submit" loading={save.isPending}>
            {question ? "Save" : "Add question"}
          </GlassButton>
        </div>
      </form>
    </Modal>
  );
}
