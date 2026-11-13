"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Radio, Smartphone, Trophy } from "lucide-react";
import { AppLogo } from "@/components/common/AppLogo";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassInput } from "@/components/glass/GlassInput";
import { GlassButton } from "@/components/glass/GlassButton";

const CODE_RE = /^[A-Za-z0-9]{6}$/;

const features = [
  { icon: Smartphone, label: "Answer from your phone" },
  { icon: Radio, label: "Server-timed countdown" },
  { icon: Trophy, label: "Live leaderboard" },
];

export default function HomePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = code.trim();
    if (!value) return setError("Enter your join code");
    if (!CODE_RE.test(value)) return setError("Join codes have 6 letters or numbers");
    setError(null);
    router.push(`/join/${value.toUpperCase()}`);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <AppLogo size={62} />
        <p className="text-lg font-medium text-muted">Live quizzes. Spill the answers.</p>
      </div>

      <GlassCard className="w-full max-w-md">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <GlassInput
            label="Join code"
            name="join-code"
            placeholder="ABC123"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={6}
            inputMode="text"
            value={code}
            error={error}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (error) setError(null);
            }}
            className="font-mono text-2xl font-bold uppercase tracking-[0.35em] placeholder:tracking-[0.35em]"
          />
          <GlassButton type="submit" size="lg" block>
            Join a quiz
            <ArrowRight className="size-5" />
          </GlassButton>
        </form>
      </GlassCard>

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {features.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="glass inline-flex items-center gap-2 !rounded-full px-4 py-2 text-sm font-medium text-muted"
          >
            <Icon className="size-4 text-primary" />
            {label}
          </span>
        ))}
      </div>

      <Link
        href="/demo"
        className="glass inline-flex items-center gap-2 !rounded-full px-5 py-2.5 text-sm font-bold text-primary transition hover:brightness-105"
      >
        New here? Try a quick demo
        <ArrowRight className="size-4" />
      </Link>

      <Link
        href="/login"
        className="text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
      >
        Admin login
      </Link>
    </div>
  );
}
