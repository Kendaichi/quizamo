"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Copy, Flag, Undo2, Play, UserX } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassButton } from "@/components/glass/GlassButton";
import { KindChip } from "@/components/common/KindChip";
import { StatusChip } from "@/components/common/StatusChip";
import { QueryState } from "@/components/common/QueryState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { CountdownRing } from "@/components/common/CountdownRing";
import { CHOICE_KEYS } from "@/lib/constants";
import { useQuestionsQuery } from "@/lib/questionnaires";
import {
  useCountdown,
  useFinishSession,
  useKickParticipant,
  useParticipantsQuery,
  useReturnToLobby,
  useRevealQuestion,
  useSessionQuery,
  useStartQuestion,
} from "@/lib/sessions";
import type { Participant, Question } from "@/lib/mockDb";

export default function HostControlPage() {
  const id = Number(useParams().id);

  const sessionQuery = useSessionQuery(id);
  const participantsQuery = useParticipantsQuery(id);
  const session = sessionQuery.data;
  const questionsQuery = useQuestionsQuery(session?.questionnaireId ?? 0);

  const startQuestion = useStartQuestion(id);
  const revealQuestion = useRevealQuestion(id);
  const finishSession = useFinishSession(id);
  const returnToLobby = useReturnToLobby(id);
  const kick = useKickParticipant(id);

  const { seconds, percent } = useCountdown(
    session?.questionStartedAt ?? null,
    session?.questionEndsAt ?? null,
  );

  const [kicking, setKicking] = useState<Participant | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);

  const questions = questionsQuery.data ?? [];
  const participants = participantsQuery.data ?? [];
  const active = participants.filter((p) => !p.isKicked);

  const answeredCount = (questionId: number) => session?.answered?.[questionId] ?? 0;
  const currentIndex = questions.findIndex((q) => q.id === session?.currentQuestionId);
  const currentQuestion = currentIndex >= 0 ? questions[currentIndex] : null;
  const nextQuestion = currentQuestion
    ? questions[currentIndex + 1] ?? null
    : questions.find((q) => answeredCount(q.id) === 0) ?? null;

  const isBusy =
    startQuestion.isPending ||
    revealQuestion.isPending ||
    finishSession.isPending ||
    returnToLobby.isPending;
  const isLive = !!session && session.status !== "finished";
  const isInQuestion = session?.status === "question" || session?.status === "reveal";

  const onStartNext = () => nextQuestion && startQuestion.mutate(nextQuestion.id);
  const confirmKick = async () => {
    if (kicking) await kick.mutateAsync(kicking.id);
    setKicking(null);
  };
  const confirmFinish = async () => {
    await finishSession.mutateAsync();
    setFinishOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/hosts"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to hosts
      </Link>

      <QueryState loading={sessionQuery.isPending} error={sessionQuery.error} onRetry={() => sessionQuery.refetch()}>
        {session && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-3xl font-extrabold">{session.questionnaire?.name ?? "Host"}</h1>
                <div className="mt-1.5 flex items-center gap-2">
                  {session.questionnaire && <KindChip kind={session.questionnaire.kind} />}
                  <StatusChip status={session.status} />
                </div>
              </div>

              {isLive && (
                <div className="flex flex-wrap gap-2">
                  {isInQuestion && (
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      onClick={() => returnToLobby.mutate()}
                      disabled={isBusy}
                    >
                      <Undo2 className="size-4" />
                      Lobby
                    </GlassButton>
                  )}
                  <GlassButton
                    variant="glass"
                    size="sm"
                    onClick={() => setFinishOpen(true)}
                    disabled={isBusy}
                  >
                    <Flag className="size-4" />
                    Finish
                  </GlassButton>
                  {session.status === "question" ? (
                    <GlassButton onClick={() => revealQuestion.mutate()} loading={isBusy}>
                      Reveal
                    </GlassButton>
                  ) : nextQuestion ? (
                    <GlassButton onClick={onStartNext} loading={isBusy}>
                      <Play className="size-4" />
                      {session.status === "lobby" ? "Start" : "Next question"}
                    </GlassButton>
                  ) : null}
                </div>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="flex flex-col gap-4 lg:col-span-2">
                {session.status === "lobby" && <JoinPanel code={session.joinCode} />}

                {isInQuestion && currentQuestion && (
                  <QuestionPanel
                    question={currentQuestion}
                    reveal={session.status === "reveal"}
                    index={currentIndex}
                    total={questions.length}
                    answered={answeredCount(currentQuestion.id)}
                    participants={active.length}
                    seconds={seconds}
                    percent={percent}
                  />
                )}

                {session.status === "finished" && (
                  <GlassCard className="flex flex-col items-start gap-3">
                    <span className="text-sm font-semibold uppercase tracking-widest text-muted">
                      Finished
                    </span>
                    <p className="text-lg">This host has ended.</p>
                    <Link href={`/dashboard/hosts/${id}`}>
                      <GlassButton size="sm">View results</GlassButton>
                    </Link>
                  </GlassCard>
                )}

                <GlassCard className="!p-4 sm:!p-5">
                  <span className="text-sm font-semibold uppercase tracking-widest text-muted">
                    Answers per question
                  </span>
                  <table className="mt-3 w-full text-sm">
                    <tbody>
                      {questions.map((q, i) => (
                        <tr key={q.id} className="border-b border-foreground/5 last:border-0">
                          <td className="py-2 pr-4">
                            {i + 1}. {q.prompt}
                          </td>
                          <td className="whitespace-nowrap py-2 text-right tabular-nums text-muted">
                            {answeredCount(q.id)} / {active.length}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </GlassCard>
              </div>

              <ParticipantsPanel
                participants={participants}
                loading={participantsQuery.isPending}
                error={participantsQuery.error}
                canKick={isLive}
                onKick={setKicking}
                onRetry={() => participantsQuery.refetch()}
              />
            </div>
          </>
        )}
      </QueryState>

      <ConfirmDialog
        open={!!kicking}
        onClose={() => setKicking(null)}
        onConfirm={confirmKick}
        loading={kick.isPending}
        title="Kick participant"
        confirmLabel="Kick"
        text={`Remove ${kicking?.displayName} from this host? They cannot rejoin.`}
      />

      <ConfirmDialog
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        onConfirm={confirmFinish}
        loading={finishSession.isPending}
        title="Finish host"
        confirmLabel="Finish"
        text="End this host for everyone? This cannot be undone."
      />
    </div>
  );
}

function JoinPanel({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${code}` : `/join/${code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <GlassCard className="flex flex-wrap items-center justify-between gap-6">
      <div className="min-w-0">
        <span className="text-sm font-semibold uppercase tracking-widest text-muted">Join code</span>
        <div className="font-mono text-5xl font-extrabold tracking-[0.15em] text-foreground">
          {code}
        </div>
        <p className="mt-2 truncate text-sm text-muted">{joinUrl}</p>
      </div>
      <GlassButton variant="glass" onClick={copy}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copied" : "Copy link"}
      </GlassButton>
    </GlassCard>
  );
}

function QuestionPanel({
  question,
  reveal,
  index,
  total,
  answered,
  participants,
  seconds,
  percent,
}: {
  question: Question;
  reveal: boolean;
  index: number;
  total: number;
  answered: number;
  participants: number;
  seconds: number;
  percent: number;
}) {
  // Grow the answered count across the countdown; lock to the final at reveal.
  const shown = reveal
    ? answered
    : Math.round(answered * (1 - Math.max(0, Math.min(100, percent)) / 100));

  return (
    <GlassCard>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="text-sm font-semibold uppercase tracking-widest text-muted">
            Question {index + 1} of {total}
          </span>
          <h2 className="mt-1 text-xl font-bold">{question.prompt}</h2>
        </div>
        {!reveal && <CountdownRing seconds={seconds} percent={percent} size={76} />}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {CHOICE_KEYS.filter((key) => question.choices[key]).map((key) => {
          const correct = reveal && question.correct === key;
          return (
            <div
              key={key}
              className={
                "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium " +
                (correct ? "bg-success/15 text-success" : "bg-foreground/5 text-foreground")
              }
            >
              {correct && <Check className="size-4 shrink-0" />}
              <span className="font-bold">{key}.</span> {question.choices[key]}
            </div>
          );
        })}
      </div>

      <p className="mt-4 font-bold">
        {shown} / {participants} answered
      </p>
    </GlassCard>
  );
}

function ParticipantsPanel({
  participants,
  loading,
  error,
  canKick,
  onKick,
  onRetry,
}: {
  participants: Participant[];
  loading: boolean;
  error: unknown;
  canKick: boolean;
  onKick: (p: Participant) => void;
  onRetry: () => void;
}) {
  const active = participants.filter((p) => !p.isKicked);

  return (
    <GlassCard className="!p-5">
      <span className="text-sm font-semibold uppercase tracking-widest text-muted">
        Participants · {active.length}
      </span>
      <div className="mt-3">
        <QueryState
          loading={loading}
          error={error}
          empty={participants.length === 0}
          emptyTitle="Nobody yet"
          emptyText="They appear here as they join."
          onRetry={onRetry}
        >
          <ul className="flex flex-col gap-1">
            {participants.map((p) => (
              <li
                key={p.id}
                className={
                  "flex items-center justify-between rounded-xl px-2 py-1.5 " +
                  (p.isKicked ? "opacity-50" : "")
                }
              >
                <span className="font-medium">
                  {p.displayName}
                  {p.isKicked && <span className="ml-2 text-xs text-muted">Kicked</span>}
                </span>
                {canKick && !p.isKicked && (
                  <button
                    onClick={() => onKick(p)}
                    aria-label={`Kick ${p.displayName}`}
                    className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                  >
                    <UserX className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </QueryState>
      </div>
    </GlassCard>
  );
}
