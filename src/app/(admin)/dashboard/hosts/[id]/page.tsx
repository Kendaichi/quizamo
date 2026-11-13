"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import { KindChip } from "@/components/common/KindChip";
import { QueryState } from "@/components/common/QueryState";
import { BarChart } from "@/components/common/BarChart";
import { LeaderboardList } from "@/components/dashboard/LeaderboardList";
import { formatDate, formatPercent } from "@/lib/constants";
import { useSessionQuery } from "@/lib/sessions";
import { useSessionReportQuery } from "@/lib/dashboard";

export default function HostResultsPage() {
  const id = Number(useParams().id);
  const sessionQuery = useSessionQuery(id);
  const reportQuery = useSessionReportQuery(id);

  const session = sessionQuery.data;
  const report = reportQuery.data;
  const questions = report?.questions ?? [];

  const tiles = [
    { label: "Participants", value: report ? String(report.participantCount) : "–" },
    { label: "Average score", value: report ? report.averageScore.toLocaleString() : "–" },
    { label: "Average accuracy", value: formatPercent(report?.averageAccuracy) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>

      {session && (
        <div>
          <h1 className="text-3xl font-extrabold">{session.questionnaire?.name ?? "Results"}</h1>
          <div className="mt-1.5 flex items-center gap-3">
            {session.questionnaire && <KindChip kind={session.questionnaire.kind} />}
            {session.finishedAt && (
              <span className="text-sm text-muted">{formatDate(session.finishedAt)}</span>
            )}
          </div>
        </div>
      )}

      <QueryState
        loading={reportQuery.isPending}
        error={reportQuery.error}
        empty={questions.length === 0}
        emptyTitle="No results yet"
        emptyText="Run this host through at least one question to see results."
        onRetry={() => reportQuery.refetch()}
      >
        {report && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {tiles.map((t) => (
                <GlassCard key={t.label} className="!p-5">
                  <span className="text-sm font-medium text-muted">{t.label}</span>
                  <div className="mt-1 text-3xl font-extrabold tabular-nums">{t.value}</div>
                </GlassCard>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <GlassCard className="!p-5">
                <span className="text-sm font-semibold uppercase tracking-widest text-muted">
                  Leaderboard
                </span>
                {report.leaderboard.length > 0 ? (
                  <LeaderboardList className="mt-3" rows={report.leaderboard} />
                ) : (
                  <p className="mt-3 text-sm text-muted">No participants.</p>
                )}
              </GlassCard>

              <GlassCard className="!p-5">
                <span className="text-sm font-semibold uppercase tracking-widest text-muted">
                  Accuracy per question
                </span>
                <BarChart
                  className="mt-4"
                  format={(v) => `${v}%`}
                  data={questions.map((q) => ({
                    label: `Q${q.position}`,
                    value: Math.round((q.accuracy ?? 0) * 100),
                  }))}
                />
              </GlassCard>
            </div>

            <GlassCard className="!p-2 sm:!p-2">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-foreground/10 text-left text-muted">
                      <th className="px-4 py-3 font-semibold">Question</th>
                      <th className="px-4 py-3 text-right font-semibold">Answered</th>
                      <th className="px-4 py-3 text-right font-semibold">Correct</th>
                      <th className="px-4 py-3 text-right font-semibold">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q) => (
                      <tr key={q.questionId} className="border-b border-foreground/5 last:border-0">
                        <td className="px-4 py-3">
                          Q{q.position}. {q.prompt}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{q.answered}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{q.correct}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatPercent(q.accuracy)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </>
        )}
      </QueryState>
    </div>
  );
}
