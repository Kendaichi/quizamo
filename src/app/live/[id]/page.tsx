"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Check, Maximize, Minimize, SlidersHorizontal, X } from "lucide-react";
import { CountdownRing } from "@/components/common/CountdownRing";
import { KindChip } from "@/components/common/KindChip";
import { StatusChip } from "@/components/common/StatusChip";
import { LeaderboardList } from "@/components/dashboard/LeaderboardList";
import { useAuth } from "@/components/providers/AuthProvider";
import { CHOICE_KEYS } from "@/lib/constants";
import { useQuestionsQuery } from "@/lib/questionnaires";
import { useCountdown, useSessionQuery } from "@/lib/sessions";
import { useAnswerDistributionQuery, useSessionReportQuery } from "@/lib/dashboard";
import type { ChoiceKey, LeaderboardEntry, Question } from "@/lib/mockDb";

const POLL = 1500;

export default function BigScreenPage() {
  const id = Number(useParams().id);
  const router = useRouter();
  const pathname = usePathname();
  const { user, ready } = useAuth();

  const { data: session } = useSessionQuery(id, { refetchInterval: POLL });
  const { data: questions = [] } = useQuestionsQuery(session?.questionnaireId ?? 0);
  const { data: report } = useSessionReportQuery(id, { refetchInterval: POLL });

  const currentIndex = questions.findIndex((q) => q.id === session?.currentQuestionId);
  const currentQuestion = currentIndex >= 0 ? questions[currentIndex] : null;
  const inQuestion = session?.status === "question" || session?.status === "reveal";
  const reveal = session?.status === "reveal";

  const { data: dist } = useAnswerDistributionQuery(
    id,
    inQuestion ? currentQuestion?.id ?? null : null,
    { refetchInterval: 1200 },
  );
  const { seconds, percent } = useCountdown(
    session?.questionStartedAt ?? null,
    session?.questionEndsAt ?? null,
  );

  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    if (ready && !user) router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
  }, [ready, user, router, pathname]);

  if (!ready || !user) return null;

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  };

  const answered = dist ? Object.values(dist).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="flex min-h-dvh flex-col gap-8 p-6 sm:p-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold sm:text-3xl">
            {session?.questionnaire?.name ?? "Big screen"}
          </h1>
          <div className="mt-1.5 flex items-center gap-2">
            {session?.questionnaire && <KindChip kind={session.questionnaire.kind} />}
            {session && <StatusChip status={session.status} />}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="glass grid size-10 place-items-center !rounded-full text-foreground hover:brightness-105"
            aria-label={fullscreen ? "Exit full screen" : "Full screen"}
          >
            {fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
          </button>
          <Link
            href={`/hosts/${id}`}
            className="glass grid size-10 place-items-center !rounded-full text-foreground hover:brightness-105"
            aria-label="Control panel"
          >
            <SlidersHorizontal className="size-5" />
          </Link>
          <Link
            href="/dashboard"
            className="glass grid size-10 place-items-center !rounded-full text-foreground hover:brightness-105"
            aria-label="Close"
          >
            <X className="size-5" />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center">
        {inQuestion && currentQuestion ? (
          <QuestionView
            question={currentQuestion}
            index={currentIndex}
            total={questions.length}
            counts={dist ?? { A: 0, B: 0, C: 0, D: 0 }}
            answered={answered}
            participants={report?.participantCount ?? 0}
            reveal={reveal}
            seconds={seconds}
            percent={percent}
          />
        ) : (
          <Podium rows={report?.leaderboard ?? []} status={session?.status} />
        )}
      </main>
    </div>
  );
}

function QuestionView({
  question,
  index,
  total,
  counts,
  answered,
  participants,
  reveal,
  seconds,
  percent,
}: {
  question: Question;
  index: number;
  total: number;
  counts: Record<ChoiceKey, number>;
  answered: number;
  participants: number;
  reveal: boolean;
  seconds: number;
  percent: number;
}) {
  const choices = CHOICE_KEYS.filter((k) => question.choices[k]);
  const highest = Math.max(1, ...choices.map((k) => counts[k]));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted">
            Question {index + 1} of {total}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-5xl">{question.prompt}</h2>
        </div>
        {!reveal && <CountdownRing seconds={seconds} percent={percent} size={120} width={12} />}
      </div>

      <div className="flex flex-col gap-4">
        {choices.map((key) => {
          const n = counts[key];
          const correct = reveal && question.correct === key;
          return (
            <div key={key}>
              <div className="flex items-center gap-3 text-xl font-bold sm:text-2xl">
                {correct && <Check className="size-6 shrink-0 text-success" />}
                <span className="w-7">{key}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{question.choices[key]}</span>
                <span className="tabular-nums">{n}</span>
              </div>
              <div className="mt-2 h-5 overflow-hidden rounded-md bg-foreground/10">
                <div
                  className={
                    "h-full rounded-md transition-[width] duration-500 " +
                    (correct ? "bg-success" : "bg-primary")
                  }
                  style={{ width: `${(n / highest) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-2xl font-extrabold tabular-nums sm:text-3xl">
        {answered} / {participants} answered
      </p>
    </div>
  );
}

function Podium({ rows, status }: { rows: LeaderboardEntry[]; status?: string }) {
  if (rows.length === 0) {
    return (
      <div className="text-center text-2xl font-bold text-muted">Nobody on the board yet</div>
    );
  }

  // Heights keyed by place (0 = 1st = tallest); columns ordered 2nd · 1st · 3rd
  // so the winner stands in the middle.
  const heights = ["80%", "58%", "44%"];
  const podium = [1, 0, 2].flatMap((place) =>
    rows[place] ? [{ row: rows[place], height: heights[place] }] : [],
  );
  const others = rows.slice(3);

  return (
    <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
      <div>
        {status === "finished" && (
          <p className="mb-4 text-center text-xl font-bold text-primary">🏆 Final results</p>
        )}
        <div className="flex h-[52vh] items-end justify-center gap-5">
          {podium.map(({ row, height }) => (
            <div key={row.participantId} className="flex h-full min-w-0 max-w-[260px] flex-1 flex-col justify-end">
              <div className="truncate text-center text-xl font-extrabold sm:text-3xl">
                {row.name}
              </div>
              <div className="mb-3 text-center text-lg text-muted sm:text-2xl">
                {row.score.toLocaleString()}
              </div>
              <div
                className="flex items-start justify-center rounded-t-3xl bg-primary pt-4 text-3xl font-extrabold text-on-primary sm:text-5xl"
                style={{ height }}
              >
                #{row.rank}
              </div>
            </div>
          ))}
        </div>
      </div>

      {others.length > 0 && <LeaderboardList rows={others} limit={7} className="self-center" />}
    </div>
  );
}
