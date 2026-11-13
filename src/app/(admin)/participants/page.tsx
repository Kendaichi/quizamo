"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassInput } from "@/components/glass/GlassInput";
import { KindChip } from "@/components/common/KindChip";
import { QueryState } from "@/components/common/QueryState";
import { formatDate, kindOptions } from "@/lib/constants";
import { useParticipantsOverviewQuery } from "@/lib/dashboard";
import type { Kind } from "@/lib/mockDb";

export default function ParticipantsPage() {
  const { data, isPending, error, refetch } = useParticipantsOverviewQuery();

  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<Kind | "">("");
  const [sessionId, setSessionId] = useState<string>("");

  const all = useMemo(() => data ?? [], [data]);

  // Unique hosts present in the data, for the filter.
  const hostOptions = useMemo(() => {
    const hosts = new Map<number, string>();
    for (const row of all) hosts.set(row.sessionId, `${row.joinCode} · ${row.questionnaireName}`);
    return [...hosts].map(([value, label]) => ({ value, label }));
  }, [all]);

  const rows = all.filter(
    (row) =>
      (!kind || row.kind === kind) &&
      (!sessionId || row.sessionId === Number(sessionId)) &&
      (!search.trim() || row.displayName.toLowerCase().includes(search.trim().toLowerCase())),
  );

  const selectClass =
    "glass-input h-11 px-3 bg-transparent text-foreground outline-none [&>option]:text-foreground";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">
          Everyone who joined
        </span>
        <h1 className="text-3xl font-extrabold">Participants</h1>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <GlassInput
          label="Search"
          placeholder="Display name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          wrapperClassName="w-full sm:w-72"
          trailing={<Search className="size-4 text-muted" />}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="p-kind" className="text-sm font-semibold text-foreground">
            Kind
          </label>
          <select
            id="p-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as Kind | "")}
            className={selectClass}
          >
            <option value="">All kinds</option>
            {kindOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="p-host" className="text-sm font-semibold text-foreground">
            Host
          </label>
          <select
            id="p-host"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className={selectClass}
          >
            <option value="">All hosts</option>
            {hostOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <GlassCard className="!p-2 sm:!p-2">
        <QueryState
          loading={isPending}
          error={error}
          empty={rows.length === 0}
          emptyTitle="No participants yet"
          emptyText="People appear here after they join a host."
          onRetry={() => refetch()}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-foreground/10 text-left text-muted">
                  <th className="px-4 py-3 font-semibold">Display name</th>
                  <th className="px-4 py-3 font-semibold">Host</th>
                  <th className="px-4 py-3 font-semibold">Questionnaire</th>
                  <th className="px-4 py-3 font-semibold">Kind</th>
                  <th className="px-4 py-3 text-right font-semibold">Score</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.participantId}
                    className="border-b border-foreground/5 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <span className={row.isKicked ? "opacity-50" : ""}>{row.displayName}</span>
                      {row.isKicked && (
                        <span className="ml-2 rounded-full bg-foreground/10 px-2 py-0.5 text-xs text-muted">
                          Kicked
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted">{row.joinCode}</td>
                    <td className="px-4 py-3">{row.questionnaireName}</td>
                    <td className="px-4 py-3">
                      <KindChip kind={row.kind} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.score.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDate(row.joinedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </GlassCard>
    </div>
  );
}
