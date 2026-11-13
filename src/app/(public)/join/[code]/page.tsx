"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassInput } from "@/components/glass/GlassInput";
import { GlassButton } from "@/components/glass/GlassButton";
import { joinSession } from "@/lib/mockDb";

const NAME_KEY = "quizamo:display-name";

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const room = (code ?? "").toUpperCase();
  const router = useRouter();

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Remember the name between quizzes, like the reference's useJoinView.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAME_KEY);
      if (saved) setName(saved);
    } catch {}
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = name.trim();
    if (!value) return setError("Display name is required");
    if (value.length > 40) return setError("Keep it under 40 characters");

    setBusy(true);
    setError(null);
    try {
      await joinSession(room, value);
      try {
        localStorage.setItem(NAME_KEY, value);
      } catch {}
      router.push(`/play/${room}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join this quiz");
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <GlassCard className="w-full max-w-md">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Almost in</p>
        <h1 className="mt-1 text-2xl font-extrabold">Join the quiz</h1>
        <p className="mt-1 text-sm text-muted">
          Joining room{" "}
          <span className="font-mono font-bold tracking-widest text-foreground">{room}</span>
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-5">
          <GlassInput
            label="Display name"
            name="display-name"
            placeholder="What should we call you?"
            autoComplete="off"
            maxLength={40}
            value={name}
            error={error}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
          />
          <GlassButton type="submit" size="lg" block loading={busy}>
            Join
            <ArrowRight className="size-5" />
          </GlassButton>
        </form>
      </GlassCard>

      <Link
        href="/"
        className="text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
      >
        Back home
      </Link>
    </div>
  );
}
