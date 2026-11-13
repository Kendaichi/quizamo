"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassButton } from "@/components/glass/GlassButton";
import { KindChip } from "@/components/common/KindChip";
import { StatusChip } from "@/components/common/StatusChip";
import { QueryState } from "@/components/common/QueryState";
import { formatDate } from "@/lib/constants";
import { useSessionsQuery } from "@/lib/sessions";
import { HostFormDialog } from "./HostFormDialog";

export default function HostsPage() {
  const { data, isPending, error, refetch } = useSessionsQuery();
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">
            Live quizzes
          </span>
          <h1 className="text-3xl font-extrabold">Hosts</h1>
        </div>
        <GlassButton onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          New host
        </GlassButton>
      </div>

      <GlassCard className="!p-2 sm:!p-2">
        <QueryState
          loading={isPending}
          error={error}
          empty={data?.length === 0}
          emptyTitle="No hosts yet"
          emptyText="Create a host from a questionnaire to get a join code."
          onRetry={() => refetch()}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-foreground/10 text-left text-muted">
                  <th className="px-4 py-3 font-semibold">Join code</th>
                  <th className="px-4 py-3 font-semibold">Questionnaire</th>
                  <th className="px-4 py-3 font-semibold">Kind</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Players</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((s) => (
                  <tr key={s.id} className="border-b border-foreground/5 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/hosts/${s.id}`}
                        className="font-mono font-bold tracking-wider text-primary hover:underline"
                      >
                        {s.joinCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{s.questionnaire?.name ?? "—"}</td>
                    <td className="px-4 py-3">{s.questionnaire && <KindChip kind={s.questionnaire.kind} />}</td>
                    <td className="px-4 py-3">
                      <StatusChip status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{s.participantCount}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </GlassCard>

      <HostFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
