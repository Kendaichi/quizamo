"use client";

import Link from "next/link";
import { ListChecks } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassButton } from "@/components/glass/GlassButton";
import { useAuth } from "@/components/providers/AuthProvider";

// shortcut: dashboard home is a hub, not yet the history/charts view from
// web-quizmosa (HistoryView). That lands with the hosts/sessions slice.
export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">Admin</span>
        <h1 className="text-3xl font-extrabold">Dashboard</h1>
        <p className="mt-1 text-muted">
          Signed in as <span className="font-semibold text-foreground">{user?.email}</span>
        </p>
      </div>

      <GlassCard className="flex flex-col items-start gap-3">
        <ListChecks className="size-8 text-primary" />
        <h2 className="text-xl font-bold">Questionnaires</h2>
        <p className="text-muted">
          Build the quizzes you&apos;ll host — add questions, set choices and points.
        </p>
        <Link href="/questionnaires">
          <GlassButton>Manage questionnaires</GlassButton>
        </Link>
      </GlassCard>

      <GlassCard>
        <p className="text-muted">
          Hosting live sessions and results history are the next vertical slices.
        </p>
      </GlassCard>
    </div>
  );
}
