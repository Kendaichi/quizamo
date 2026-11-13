"use client";

import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { KindChip } from "@/components/common/KindChip";
import { StatusChip } from "@/components/common/StatusChip";
import { QueryState } from "@/components/common/QueryState";
import { BarChart } from "@/components/common/BarChart";
import { formatDate, formatPercent } from "@/lib/constants";
import { useQuestionnairesQuery } from "@/lib/questionnaires";
import { useSessionsQuery } from "@/lib/sessions";
import { useHistoryQuery } from "@/lib/dashboard";

export default function DashboardPage() {
  const questionnaires = useQuestionnairesQuery();
  const sessions = useSessionsQuery();
  const history = useHistoryQuery();

  const running = (sessions.data ?? []).filter((s) => s.status !== "finished");
  const participants = (sessions.data ?? []).reduce((sum, s) => sum + s.participantCount, 0);
  const rows = history.data ?? [];

  const tiles = [
    { label: "Questionnaires", value: questionnaires.data?.length ?? 0 },
    { label: "Hosts", value: sessions.data?.length ?? 0 },
    { label: "Participants", value: participants },
    { label: "Finished", value: rows.length },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">Overview</span>
        <h1 className="text-3xl font-extrabold">Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map((t) => (
          <GlassCard key={t.label} className="!p-5">
            <span className="text-sm font-medium text-muted">{t.label}</span>
            <div className="mt-1 text-3xl font-extrabold tabular-nums">{t.value}</div>
          </GlassCard>
        ))}
      </div>

      {running.length > 0 && (
        <GlassCard className="!p-5">
          <span className="text-sm font-semibold uppercase tracking-widest text-muted">
            Running now
          </span>
          <div className="mt-3 flex flex-col gap-2">
            {running.map((s) => (
              <Link
                key={s.id}
                href={`/hosts/${s.id}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-foreground/5 px-4 py-2.5 hover:bg-foreground/10"
              >
                <span className="min-w-0">
                  <span className="font-semibold">{s.questionnaire?.name ?? "—"}</span>
                  <span className="ml-2 font-mono text-sm text-muted">{s.joinCode}</span>
                </span>
                <StatusChip status={s.status} />
              </Link>
            ))}
          </div>
        </GlassCard>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">History</h2>
        <QueryState
          loading={history.isPending}
          error={history.error}
          empty={rows.length === 0}
          emptyTitle="No history to show"
          emptyText="Finished hosts show up here with their results."
          onRetry={() => history.refetch()}
        >
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <GlassCard className="!p-5">
                <span className="text-sm font-semibold uppercase tracking-widest text-muted">
                  Participants per host
                </span>
                <BarChart
                  className="mt-4"
                  data={[...rows].reverse().map((r) => ({ label: r.joinCode, value: r.participantCount }))}
                />
              </GlassCard>
              <GlassCard className="!p-5">
                <span className="text-sm font-semibold uppercase tracking-widest text-muted">
                  Average accuracy per host
                </span>
                <BarChart
                  className="mt-4"
                  format={(v) => `${v}%`}
                  data={[...rows].reverse().map((r) => ({
                    label: r.joinCode,
                    value: Math.round((r.averageAccuracy ?? 0) * 100),
                  }))}
                />
              </GlassCard>
            </div>

            <GlassCard className="!p-2 sm:!p-2">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-foreground/10 text-left text-muted">
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Join code</th>
                      <th className="px-4 py-3 font-semibold">Questionnaire</th>
                      <th className="px-4 py-3 font-semibold">Kind</th>
                      <th className="px-4 py-3 text-right font-semibold">Players</th>
                      <th className="px-4 py-3 text-right font-semibold">Avg score</th>
                      <th className="px-4 py-3 text-right font-semibold">Avg accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.sessionId} className="border-b border-foreground/5 last:border-0">
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/hosts/${r.sessionId}`}
                            className="font-semibold text-primary hover:underline"
                          >
                            {formatDate(r.endedAt)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-mono text-muted">{r.joinCode}</td>
                        <td className="px-4 py-3">{r.questionnaireName}</td>
                        <td className="px-4 py-3">
                          <KindChip kind={r.kind} />
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{r.participantCount}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{r.averageScore.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatPercent(r.averageAccuracy)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        </QueryState>
      </div>
    </div>
  );
}
